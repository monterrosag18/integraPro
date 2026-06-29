using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/github-links")]
public sealed class GithubLinksController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(Guid projectId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select gl.id, gl.project_id, gl.url, gl.added_by_user_id,
                   concat_ws(' ', u.first_name, u.last_name) as added_by
            from github_links gl
            left join users u on u.id = gl.added_by_user_id
            where gl.project_id = @project_id
            order by gl.url;
            """);
        command.Parameters.AddWithValue("project_id", projectId);

        var links = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            links.Add(new
            {
                id = reader.GetGuid(0),
                projectId = reader.GetGuid(1),
                url = reader.GetString(2),
                addedByUserId = reader.GetGuid(3),
                addedBy = reader.IsDBNull(4) ? null : reader.GetString(4)
            });
        }

        return Ok(new { links });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid projectId, [FromBody] GithubLinkRequest request, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return BadRequest(new { message = "URL inválida." });

        var id = Guid.NewGuid();
        await using var command = dataSource.CreateCommand("""
            insert into github_links (id, project_id, url, added_by_user_id)
            values (@id, @project_id, @url, @added_by_user_id)
            returning id, project_id, url, added_by_user_id;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("project_id", projectId);
        command.Parameters.AddWithValue("url", request.Url);
        command.Parameters.AddWithValue("added_by_user_id", request.AddedByUserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return Ok(new
        {
            id = reader.GetGuid(0),
            projectId = reader.GetGuid(1),
            url = reader.GetString(2),
            addedByUserId = reader.GetGuid(3)
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid projectId, Guid id, [FromBody] GithubLinkRequest request, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return BadRequest(new { message = "URL inválida." });

        await using var command = dataSource.CreateCommand("""
            update github_links
            set url = @url, added_by_user_id = @added_by_user_id
            where id = @id and project_id = @project_id
            returning id, project_id, url, added_by_user_id;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("project_id", projectId);
        command.Parameters.AddWithValue("url", request.Url);
        command.Parameters.AddWithValue("added_by_user_id", request.AddedByUserId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Github link not found." });
        return Ok(new
        {
            id = reader.GetGuid(0),
            projectId = reader.GetGuid(1),
            url = reader.GetString(2),
            addedByUserId = reader.GetGuid(3)
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid id, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            delete from github_links
            where id = @id and project_id = @project_id;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("project_id", projectId);
        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected == 0 ? NotFound(new { message = "Github link not found." }) : Ok(new { deleted = id });
    }
}

public sealed record GithubLinkRequest(string Url, Guid AddedByUserId);
