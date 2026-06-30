using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/cohorts")]
public sealed class CohortsController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCohortRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "El nombre de la cohorte es requerido." });
        if (string.IsNullOrWhiteSpace(request.CampusName))
            return BadRequest(new { message = "El campus es requerido." });

        Guid campusId;
        await using (var findCampus = dataSource.CreateCommand("""
            select id from campuses where lower(name) = lower(@name) limit 1;
            """))
        {
            findCampus.Parameters.AddWithValue("name", request.CampusName.Trim());
            await using var r = await findCampus.ExecuteReaderAsync(cancellationToken);
            if (!await r.ReadAsync(cancellationToken))
                return BadRequest(new { message = $"Campus '{request.CampusName}' no encontrado." });
            campusId = r.GetGuid(0);
        }

        await using var cmd = dataSource.CreateCommand("""
            insert into cohorts (id, campus_id, name, created_at)
            values (@id, @campus_id, @name, now())
            returning id, name;
            """);
        cmd.Parameters.AddWithValue("id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("campus_id", campusId);
        cmd.Parameters.AddWithValue("name", request.Name.Trim());

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return StatusCode(500, new { message = "No se pudo crear la cohorte." });

        return Ok(new
        {
            id = reader.GetGuid(0),
            name = reader.GetString(1),
            campus = request.CampusName,
            clans = 0,
            coders = 0,
            status = "Preparación"
        });
    }
}

public sealed record CreateCohortRequest(string Name, string CampusName);
