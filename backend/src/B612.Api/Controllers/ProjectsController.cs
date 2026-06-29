using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? sprintId,
        [FromQuery] Guid? cellId,
        [FromQuery] Guid? coderId,
        CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select
                p.id,
                p.name,
                p.sprint_id,
                s.number as sprint_number,
                s.status as sprint_status,
                p.cell_id,
                cell.name as cell,
                clan.name as clan,
                count(distinct us.id) as stories,
                count(distinct us.id) filter (where lower(us.kanban_status) = 'done') as done_stories,
                coalesce(sum(us.estimate), 0) as total_points,
                coalesce(sum(us.estimate) filter (where lower(us.kanban_status) = 'done'), 0) as done_points,
                count(distinct gl.id) as github_links,
                count(distinct ce.id) as ceremonies
            from projects p
            join sprints s on s.id = p.sprint_id
            join cells cell on cell.id = p.cell_id
            join clans clan on clan.id = cell.clan_id
            left join backlogs b on b.project_id = p.id
            left join user_stories us on us.backlog_id = b.id
            left join github_links gl on gl.project_id = p.id
            left join ceremonies ce on ce.project_id = p.id
            where (@sprint_id::uuid is null or p.sprint_id = @sprint_id)
              and (@cell_id::uuid is null or p.cell_id = @cell_id)
              and (
                  @coder_id::uuid is null
                  or exists (
                      select 1
                      from cell_assignments ca
                      where ca.sprint_id = p.sprint_id
                        and ca.cell_id = p.cell_id
                        and ca.coder_id = @coder_id
                  )
              )
            group by p.id, p.name, p.sprint_id, s.number, s.status, p.cell_id, cell.name, clan.name
            order by s.number desc, p.name;
            """);
        command.Parameters.AddWithValue("sprint_id", (object?)sprintId ?? DBNull.Value);
        command.Parameters.AddWithValue("cell_id", (object?)cellId ?? DBNull.Value);
        command.Parameters.AddWithValue("coder_id", (object?)coderId ?? DBNull.Value);

        var rows = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var stories = reader.GetInt64(8);
            var doneStories = reader.GetInt64(9);
            var totalPoints = reader.GetInt64(10);
            var donePoints = reader.GetInt64(11);

            rows.Add(new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                sprintId = reader.GetGuid(2),
                sprint = reader.GetInt32(3),
                sprintStatus = reader.GetString(4),
                cellId = reader.GetGuid(5),
                cell = reader.GetString(6),
                clan = reader.GetString(7),
                stories,
                doneStories,
                totalPoints,
                donePoints,
                progress = stories == 0 ? 0 : Math.Round(doneStories * 100m / stories, 1),
                pointsProgress = totalPoints == 0 ? 0 : Math.Round(donePoints * 100m / totalPoints, 1),
                githubLinks = reader.GetInt64(12),
                ceremonies = reader.GetInt64(13)
            });
        }

        return Ok(new { projects = rows });
    }

    [HttpGet("{projectId:guid}")]
    public async Task<IActionResult> Details(Guid projectId, CancellationToken cancellationToken)
    {
        object? project = null;
        await using (var command = dataSource.CreateCommand("""
            select p.id, p.name, p.sprint_id, s.number, s.status, p.cell_id, cell.name, clan.name
            from projects p
            join sprints s on s.id = p.sprint_id
            join cells cell on cell.id = p.cell_id
            join clans clan on clan.id = cell.clan_id
            where p.id = @project_id;
            """))
        {
            command.Parameters.AddWithValue("project_id", projectId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Project not found." });
            project = new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                sprintId = reader.GetGuid(2),
                sprint = reader.GetInt32(3),
                sprintStatus = reader.GetString(4),
                cellId = reader.GetGuid(5),
                cell = reader.GetString(6),
                clan = reader.GetString(7)
            };
        }

        var stories = new List<object>();
        await using (var command = dataSource.CreateCommand("""
            select us.id, us.as_a, us.i_want, us.so_that, us.kanban_status, us.assignee_coder_id,
                   concat_ws(' ', u.first_name, u.last_name) as assignee,
                   us.estimate, us.priority
            from user_stories us
            join backlogs b on b.id = us.backlog_id
            left join users u on u.id = us.assignee_coder_id
            where b.project_id = @project_id
            order by
                case lower(us.kanban_status)
                    when 'todo' then 1
                    when 'in_progress' then 2
                    when 'review' then 3
                    when 'done' then 4
                    else 5
                end,
                us.priority desc,
                us.id;
            """))
        {
            command.Parameters.AddWithValue("project_id", projectId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                stories.Add(new
                {
                    id = reader.GetGuid(0),
                    asA = reader.GetString(1),
                    iWant = reader.GetString(2),
                    soThat = reader.GetString(3),
                    status = reader.GetString(4),
                    assigneeCoderId = reader.IsDBNull(5) ? (Guid?)null : reader.GetGuid(5),
                    assignee = reader.IsDBNull(6) ? null : reader.GetString(6),
                    estimate = reader.IsDBNull(7) ? 0 : reader.GetInt32(7),
                    priority = reader.IsDBNull(8) ? null : reader.GetString(8)
                });
            }
        }

        return Ok(new { project, stories });
    }
}
