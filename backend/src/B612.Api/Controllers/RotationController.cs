using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/rotation")]
public sealed class RotationController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet("cells")]
    public async Task<IActionResult> CellCoders([FromQuery] string clanName, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select ce.id as cell_id, ce.name as cell_name,
                   ca.coder_id,
                   concat_ws(' ', u.first_name, u.last_name) as coder_name,
                   lower(ca.role_in_cell) as role_in_cell,
                   cl.id as clan_id,
                   s.id as sprint_id
            from cells ce
            join clans cl on cl.id = ce.clan_id
            join sprints s on s.clan_id = cl.id and lower(s.status) = 'active'
            join cell_assignments ca on ca.cell_id = ce.id and ca.sprint_id = s.id
            join users u on u.id = ca.coder_id
            where cl.name = @clan_name
            order by ce.name, ca.role_in_cell desc, u.first_name;
            """);
        command.Parameters.AddWithValue("clan_name", clanName);

        var cellMap = new Dictionary<Guid, (string name, List<object> coders)>();
        Guid? clanId = null;
        Guid? sprintId = null;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var cellId = reader.GetGuid(0);
            var cellNameVal = reader.GetString(1);
            clanId ??= reader.GetGuid(5);
            sprintId ??= reader.GetGuid(6);
            if (!cellMap.ContainsKey(cellId)) cellMap[cellId] = (cellNameVal, []);
            cellMap[cellId].coders.Add(new
            {
                coderId = reader.GetGuid(2),
                name = reader.GetString(3),
                role = reader.GetString(4)
            });
        }

        var cells = cellMap.Select(kv => new { cellId = kv.Key, cellName = kv.Value.name, coders = kv.Value.coders }).ToList();
        return Ok(new { clanId, sprintId, cells });
    }

    [HttpPut("leader")]
    public async Task<IActionResult> ChangeLeader([FromBody] ChangeLeaderRequest request, CancellationToken cancellationToken)
    {
        await using var sprintCmd = dataSource.CreateCommand("""
            select s.id from sprints s
            join clans cl on cl.id = s.clan_id
            where cl.name = @clan_name and lower(s.status) = 'active'
            limit 1;
            """);
        sprintCmd.Parameters.AddWithValue("clan_name", request.ClanName);
        await using var sprintReader = await sprintCmd.ExecuteReaderAsync(cancellationToken);
        if (!await sprintReader.ReadAsync(cancellationToken))
            return NotFound(new { message = "No hay sprint activo para ese clan." });
        var sprintId = sprintReader.GetGuid(0);
        await sprintReader.CloseAsync();

        await using var cellCmd = dataSource.CreateCommand("""
            select ce.id from cells ce
            join clans cl on cl.id = ce.clan_id
            where ce.name = @cell_name and cl.name = @clan_name
            limit 1;
            """);
        cellCmd.Parameters.AddWithValue("cell_name", request.CellName);
        cellCmd.Parameters.AddWithValue("clan_name", request.ClanName);
        await using var cellReader = await cellCmd.ExecuteReaderAsync(cancellationToken);
        if (!await cellReader.ReadAsync(cancellationToken))
            return NotFound(new { message = "Célula no encontrada." });
        var cellId = cellReader.GetGuid(0);
        await cellReader.CloseAsync();

        await using var demoteCmd = dataSource.CreateCommand("""
            update cell_assignments set role_in_cell = 'rotator'
            where cell_id = @cell_id and sprint_id = @sprint_id
              and lower(role_in_cell) = 'leader';
            """);
        demoteCmd.Parameters.AddWithValue("cell_id", cellId);
        demoteCmd.Parameters.AddWithValue("sprint_id", sprintId);
        await demoteCmd.ExecuteNonQueryAsync(cancellationToken);

        await using var promoteCmd = dataSource.CreateCommand("""
            update cell_assignments set role_in_cell = 'leader'
            where coder_id = @coder_id and cell_id = @cell_id and sprint_id = @sprint_id
            returning coder_id;
            """);
        promoteCmd.Parameters.AddWithValue("coder_id", request.CoderId);
        promoteCmd.Parameters.AddWithValue("cell_id", cellId);
        promoteCmd.Parameters.AddWithValue("sprint_id", sprintId);

        await using var promoteReader = await promoteCmd.ExecuteReaderAsync(cancellationToken);
        if (!await promoteReader.ReadAsync(cancellationToken))
            return BadRequest(new { message = "El coder no pertenece a esa célula en el sprint activo." });

        return Ok(new { cellId, sprintId, newLeaderId = request.CoderId });
    }

    [HttpGet("health")]
    public async Task<IActionResult> Health([FromQuery] Guid? clanId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            with assignments as (
                select
                    ca.coder_id,
                    concat_ws(' ', u.first_name, u.last_name) as coder,
                    s.id as sprint_id,
                    s.number,
                    s.start_date,
                    cell.id as cell_id,
                    cell.name as cell,
                    leader.coder_id as leader_id,
                    concat_ws(' ', leader_user.first_name, leader_user.last_name) as leader,
                    lag(cell.id) over (partition by ca.coder_id order by s.start_date, s.number) as previous_cell_id,
                    lag(leader.coder_id) over (partition by ca.coder_id order by s.start_date, s.number) as previous_leader_id
                from cell_assignments ca
                join users u on u.id = ca.coder_id
                join sprints s on s.id = ca.sprint_id
                join cells cell on cell.id = ca.cell_id
                left join cell_assignments leader
                  on leader.sprint_id = ca.sprint_id
                 and leader.cell_id = ca.cell_id
                 and lower(leader.role_in_cell) = 'leader'
                left join users leader_user on leader_user.id = leader.coder_id
                where (@clan_id::uuid is null or s.clan_id = @clan_id)
            )
            select coder_id, coder, sprint_id, number, cell, leader,
                   (previous_cell_id = cell_id) as repeated_cell,
                   (previous_leader_id = leader_id) as repeated_leader
            from assignments
            where previous_cell_id is not null
            order by number desc, coder
            limit 200;
            """);
        command.Parameters.AddWithValue("clan_id", (object?)clanId ?? DBNull.Value);

        var issues = new List<object>();
        var repeatedCells = 0;
        var repeatedLeaders = 0;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var repeatedCell = reader.GetBoolean(6);
            var repeatedLeader = reader.GetBoolean(7);
            if (repeatedCell) repeatedCells++;
            if (repeatedLeader) repeatedLeaders++;
            if (repeatedCell || repeatedLeader)
            {
                issues.Add(new
                {
                    coderId = reader.GetGuid(0),
                    coder = reader.GetString(1),
                    sprintId = reader.GetGuid(2),
                    sprint = reader.GetInt32(3),
                    cell = reader.GetString(4),
                    leader = reader.IsDBNull(5) ? null : reader.GetString(5),
                    repeatedCell,
                    repeatedLeader
                });
            }
        }

        return Ok(new
        {
            policy = "strict-first; relax leader before cell when no valid route exists",
            repeatedCells,
            repeatedLeaders,
            issues
        });
    }
}

public sealed record ChangeLeaderRequest(string ClanName, string CellName, Guid CoderId);
