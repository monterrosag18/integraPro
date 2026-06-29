using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/rotation")]
public sealed class RotationController(NpgsqlDataSource dataSource) : ControllerBase
{
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
