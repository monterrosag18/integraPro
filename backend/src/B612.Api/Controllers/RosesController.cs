using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/roses")]
public sealed class RosesController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet("leaderboard")]
    public async Task<IActionResult> Leaderboard(CancellationToken cancellationToken)
    {
        var cells = new List<object>();
        await using (var command = dataSource.CreateCommand("""
            select c.id, c.name, cl.name as clan, count(distinct r.id) as roses
            from cells c
            join clans cl on cl.id = c.clan_id
            left join roses r on r.cell_id = c.id
            group by c.id, c.name, cl.name
            order by roses desc, c.name
            limit 10;
            """))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                cells.Add(new { id = reader.GetGuid(0), cell = reader.GetString(1), clan = reader.GetString(2), roses = reader.GetInt64(3) });
            }
        }

        var coders = new List<object>();
        await using (var command = dataSource.CreateCommand("""
            select u.id, concat_ws(' ', u.first_name, u.last_name) as name, u.email, count(cr.id) as roses
            from users u
            join coders c on c.user_id = u.id
            left join coder_roses cr on cr.coder_id = u.id
            group by u.id, u.first_name, u.last_name, u.email
            order by roses desc, name
            limit 10;
            """))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                coders.Add(new { id = reader.GetGuid(0), name = reader.GetString(1), email = reader.GetString(2), roses = reader.GetInt64(3) });
            }
        }

        return Ok(new { cells, coders });
    }

    [HttpPost("award")]
    public async Task<IActionResult> Award([FromBody] AwardRoseRequest request, CancellationToken cancellationToken)
    {
        var roseId = Guid.NewGuid();
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var command = new NpgsqlCommand("""
            insert into roses (id, sprint_id, cell_id)
            values (@id, @sprint_id, @cell_id);
            """, connection, transaction))
        {
            command.Parameters.AddWithValue("id", roseId);
            command.Parameters.AddWithValue("sprint_id", request.SprintId);
            command.Parameters.AddWithValue("cell_id", request.CellId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        var coderIds = new List<Guid>();
        await using (var command = new NpgsqlCommand("""
            select distinct ca.coder_id
            from cell_assignments ca
            where ca.sprint_id = @sprint_id and ca.cell_id = @cell_id;
            """, connection, transaction))
        {
            command.Parameters.AddWithValue("sprint_id", request.SprintId);
            command.Parameters.AddWithValue("cell_id", request.CellId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken)) coderIds.Add(reader.GetGuid(0));
        }

        var codersAwarded = 0;
        foreach (var coderId in coderIds)
        {
            await using var command = new NpgsqlCommand("""
                insert into coder_roses (id, coder_id, rose_id)
                values (@id, @coder_id, @rose_id);
                """, connection, transaction);
            command.Parameters.AddWithValue("id", Guid.NewGuid());
            command.Parameters.AddWithValue("coder_id", coderId);
            command.Parameters.AddWithValue("rose_id", roseId);
            codersAwarded += await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return Ok(new { roseId, request.SprintId, request.CellId, codersAwarded });
    }
}

public sealed record AwardRoseRequest(Guid SprintId, Guid CellId, Guid? GrantedByUserId);
