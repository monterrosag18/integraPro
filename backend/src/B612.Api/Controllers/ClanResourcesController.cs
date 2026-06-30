using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/clan-resources")]
public sealed class ClanResourcesController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? clanName, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select cr.id, cr.clan_id, cr.type, cr.url, cr.label, cr.added_by_user_id,
                   concat_ws(' ', u.first_name, u.last_name) as added_by, cr.added_at
            from clan_resources cr
            left join users u on u.id = cr.added_by_user_id
            where @clan_name::text is null
               or exists (select 1 from clans cl where cl.id = cr.clan_id and cl.name = @clan_name)
            order by cr.added_at desc;
            """);
        command.Parameters.AddWithValue("clan_name", (object?)clanName ?? DBNull.Value);

        var rows = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new
            {
                id = reader.GetGuid(0),
                clanId = reader.GetGuid(1),
                type = reader.GetString(2),
                url = reader.GetString(3),
                label = reader.IsDBNull(4) ? null : reader.GetString(4),
                addedByUserId = reader.GetGuid(5),
                addedBy = reader.IsDBNull(6) ? null : reader.GetString(6),
                addedAt = reader.GetFieldValue<DateTimeOffset>(7)
            });
        }

        return Ok(new { resources = rows });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ClanResourceRequest request, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return BadRequest(new { message = "URL inválida." });

        await using var lookupCmd = dataSource.CreateCommand(
            "select id from clans where name = @name limit 1;");
        lookupCmd.Parameters.AddWithValue("name", request.ClanName);
        await using var lookupReader = await lookupCmd.ExecuteReaderAsync(cancellationToken);
        if (!await lookupReader.ReadAsync(cancellationToken))
            return NotFound(new { message = "Clan no encontrado." });
        var clanId = lookupReader.GetGuid(0);
        await lookupReader.CloseAsync();

        var id = Guid.NewGuid();
        await using var command = dataSource.CreateCommand("""
            insert into clan_resources (id, clan_id, type, url, label, added_by_user_id)
            values (@id, @clan_id, @type, @url, @label, @added_by)
            returning id, added_at;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("clan_id", clanId);
        command.Parameters.AddWithValue("type", request.Type);
        command.Parameters.AddWithValue("url", request.Url);
        command.Parameters.AddWithValue("label", (object?)request.Label ?? DBNull.Value);
        command.Parameters.AddWithValue("added_by", request.UserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return Ok(new { id = reader.GetGuid(0), addedAt = reader.GetFieldValue<DateTimeOffset>(1) });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand(
            "delete from clan_resources where id = @id;");
        command.Parameters.AddWithValue("id", id);
        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected == 0 ? NotFound(new { message = "Recurso no encontrado." }) : Ok(new { deleted = id });
    }
}

public sealed record ClanResourceRequest(string ClanName, Guid UserId, string Url, string Type, string? Label);
