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
        [FromQuery] string? clanName,
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
              and (@clan_name::text is null or clan.name = @clan_name)
            group by p.id, p.name, p.sprint_id, s.number, s.status, p.cell_id, cell.name, clan.name
            order by s.number desc, p.name;
            """);
        command.Parameters.AddWithValue("sprint_id", (object?)sprintId ?? DBNull.Value);
        command.Parameters.AddWithValue("cell_id", (object?)cellId ?? DBNull.Value);
        command.Parameters.AddWithValue("coder_id", (object?)coderId ?? DBNull.Value);
        command.Parameters.AddWithValue("clan_name", (object?)clanName ?? DBNull.Value);

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
                    priority = reader.IsDBNull(8) ? (int?)null : reader.GetInt32(8)
                });
            }
        }

        return Ok(new { project, stories });
    }

    [HttpPatch("{projectId:guid}/stories/{storyId:guid}/status")]
    public async Task<IActionResult> UpdateStoryStatus(Guid projectId, Guid storyId, [FromBody] UpdateStoryStatusRequest request, CancellationToken cancellationToken)
    {
        await using var cmd = dataSource.CreateCommand("""
            update user_stories us
            set kanban_status = @status
            from backlogs b
            where us.id = @story_id and us.backlog_id = b.id and b.project_id = @project_id
            returning us.id, us.kanban_status;
            """);
        cmd.Parameters.AddWithValue("story_id", storyId);
        cmd.Parameters.AddWithValue("project_id", projectId);
        cmd.Parameters.AddWithValue("status", request.Status);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Story not found in this project." });
        return Ok(new { id = reader.GetGuid(0), status = reader.GetString(1) });
    }

    [HttpPost("{projectId:guid}/stories")]
    public async Task<IActionResult> CreateStory(Guid projectId, [FromBody] CreateStoryRequest request, CancellationToken cancellationToken)
    {
        Guid backlogId;
        Guid boardId;

        await using (var cmd = dataSource.CreateCommand("""
            select b.id as backlog_id, bo.id as board_id
            from backlogs b
            left join boards bo on bo.project_id = b.project_id
            where b.project_id = @project_id
            limit 1;
            """))
        {
            cmd.Parameters.AddWithValue("project_id", projectId);
            await using var r = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await r.ReadAsync(cancellationToken))
            {
                backlogId = r.GetGuid(0);
                boardId = r.IsDBNull(1) ? Guid.NewGuid() : r.GetGuid(1);
            }
            else
            {
                backlogId = Guid.NewGuid();
                boardId = Guid.NewGuid();
                await r.CloseAsync();

                await using var createBacklog = dataSource.CreateCommand("""
                    insert into backlogs (id, project_id) values (@id, @project_id);
                    """);
                createBacklog.Parameters.AddWithValue("id", backlogId);
                createBacklog.Parameters.AddWithValue("project_id", projectId);
                await createBacklog.ExecuteNonQueryAsync(cancellationToken);

                await using var createBoard = dataSource.CreateCommand("""
                    insert into boards (id, project_id) values (@id, @project_id);
                    """);
                createBoard.Parameters.AddWithValue("id", boardId);
                createBoard.Parameters.AddWithValue("project_id", projectId);
                await createBoard.ExecuteNonQueryAsync(cancellationToken);
            }
        }

        var storyId = Guid.NewGuid();
        await using var storyCmd = dataSource.CreateCommand("""
            insert into user_stories (id, backlog_id, board_id, as_a, i_want, so_that, kanban_status, estimate, priority)
            values (@id, @backlog_id, @board_id, @as_a, @i_want, @so_that, 'todo', @estimate, @priority)
            returning id, i_want, kanban_status;
            """);
        storyCmd.Parameters.AddWithValue("id", storyId);
        storyCmd.Parameters.AddWithValue("backlog_id", backlogId);
        storyCmd.Parameters.AddWithValue("board_id", boardId);
        storyCmd.Parameters.AddWithValue("as_a", request.AsA ?? "Coder");
        storyCmd.Parameters.AddWithValue("i_want", request.IWant);
        storyCmd.Parameters.AddWithValue("so_that", request.SoThat ?? "");
        storyCmd.Parameters.AddWithValue("estimate", (object?)(request.Estimate ?? 3) ?? DBNull.Value);
        storyCmd.Parameters.AddWithValue("priority", (object?)(request.Priority ?? 2) ?? DBNull.Value);
        await using var storyReader = await storyCmd.ExecuteReaderAsync(cancellationToken);
        await storyReader.ReadAsync(cancellationToken);
        return Ok(new { id = storyReader.GetGuid(0), iWant = storyReader.GetString(1), status = storyReader.GetString(2) });
    }

    [HttpPatch("{projectId:guid}/stories/{storyId:guid}")]
    public async Task<IActionResult> UpdateStory(Guid projectId, Guid storyId, [FromBody] UpdateStoryRequest request, CancellationToken cancellationToken)
    {
        await using var cmd = dataSource.CreateCommand("""
            update user_stories us
            set i_want = coalesce(@i_want, i_want),
                as_a = coalesce(@as_a, as_a),
                so_that = coalesce(@so_that, so_that),
                estimate = coalesce(@estimate, estimate)
            from backlogs b
            where us.id = @story_id and us.backlog_id = b.id and b.project_id = @project_id
            returning us.id, us.as_a, us.i_want, us.so_that, us.estimate;
            """);
        cmd.Parameters.AddWithValue("story_id", storyId);
        cmd.Parameters.AddWithValue("project_id", projectId);
        cmd.Parameters.AddWithValue("i_want", (object?)request.IWant ?? DBNull.Value);
        cmd.Parameters.AddWithValue("as_a", (object?)request.AsA ?? DBNull.Value);
        cmd.Parameters.AddWithValue("so_that", (object?)request.SoThat ?? DBNull.Value);
        cmd.Parameters.AddWithValue("estimate", (object?)request.Estimate ?? DBNull.Value);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Story not found." });
        return Ok(new { id = reader.GetGuid(0), asA = reader.GetString(1), iWant = reader.GetString(2), soThat = reader.GetString(3), estimate = reader.GetInt32(4) });
    }
}

public sealed record UpdateStoryStatusRequest(string Status);
public sealed record CreateStoryRequest(string IWant, string? AsA, string? SoThat, int? Estimate, int? Priority);
public sealed record UpdateStoryRequest(string? IWant, string? AsA, string? SoThat, int? Estimate);
