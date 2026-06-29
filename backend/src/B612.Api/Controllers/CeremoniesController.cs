using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class CeremoniesController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet("projects/{projectId:guid}/ceremonies")]
    public async Task<IActionResult> ListByProject(Guid projectId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select id, project_id, ceremony_type, date, status
            from ceremonies
            where project_id = @project_id
            order by date, ceremony_type;
            """);
        command.Parameters.AddWithValue("project_id", projectId);

        var ceremonies = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            ceremonies.Add(new
            {
                id = reader.GetGuid(0),
                projectId = reader.GetGuid(1),
                type = reader.GetString(2),
                date = reader.GetFieldValue<DateTimeOffset>(3),
                status = reader.GetString(4)
            });
        }

        return Ok(new { ceremonies });
    }

    [HttpPost("ceremonies")]
    public async Task<IActionResult> Create([FromBody] CeremonyRequest request, CancellationToken cancellationToken)
    {
        var id = Guid.NewGuid();
        await using var command = dataSource.CreateCommand("""
            insert into ceremonies (id, project_id, ceremony_type, date, status)
            values (@id, @project_id, @ceremony_type, @date, @status)
            returning id, project_id, ceremony_type, date, status;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("project_id", request.ProjectId);
        command.Parameters.AddWithValue("ceremony_type", request.Type);
        command.Parameters.AddWithValue("date", request.Date);
        command.Parameters.AddWithValue("status", request.Status);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return Ok(new
        {
            id = reader.GetGuid(0),
            projectId = reader.GetGuid(1),
            type = reader.GetString(2),
            date = reader.GetFieldValue<DateTimeOffset>(3),
            status = reader.GetString(4)
        });
    }

    [HttpPatch("ceremonies/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCeremonyRequest request, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            update ceremonies
            set date = coalesce(@date, date),
                status = coalesce(@status, status)
            where id = @id
            returning id, project_id, ceremony_type, date, status;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("date", (object?)request.Date ?? DBNull.Value);
        command.Parameters.AddWithValue("status", (object?)request.Status ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Ceremony not found." });
        return Ok(new
        {
            id = reader.GetGuid(0),
            projectId = reader.GetGuid(1),
            type = reader.GetString(2),
            date = reader.GetFieldValue<DateTimeOffset>(3),
            status = reader.GetString(4)
        });
    }
}

public sealed record CeremonyRequest(Guid ProjectId, string Type, DateTimeOffset Date, string Status);
public sealed record UpdateCeremonyRequest(DateTimeOffset? Date, string? Status);
