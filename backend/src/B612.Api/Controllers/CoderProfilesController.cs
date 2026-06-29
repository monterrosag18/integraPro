using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/coders")]
public sealed class CoderProfilesController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet("{coderId:guid}/profile")]
    public async Task<IActionResult> Profile(Guid coderId, CancellationToken cancellationToken)
    {
        object? coder = null;
        await using (var command = dataSource.CreateCommand("""
            select u.id, concat_ws(' ', u.first_name, u.last_name) as name, u.email,
                   coalesce(camp.name, 'Sin campus') as campus,
                   coalesce(co.name, 'Sin cohorte') as cohort,
                   coalesce(cl.name, 'Sin clan') as clan
            from users u
            join coders c on c.user_id = u.id
            left join campuses camp on camp.id = u.campus_id
            left join cohorts co on co.id = c.cohort_id
            left join clans cl on cl.id = c.clan_id
            where u.id = @coder_id;
            """))
        {
            command.Parameters.AddWithValue("coder_id", coderId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Coder not found." });
            coder = new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                email = reader.GetString(2),
                campus = reader.GetString(3),
                cohort = reader.GetString(4),
                clan = reader.GetString(5)
            };
        }

        var history = new List<object>();
        await using (var command = dataSource.CreateCommand("""
            select s.id as sprint_id, s.number, s.start_date, s.end_date, s.status,
                   cell.name as cell,
                   ca.role_in_cell,
                   concat_ws(' ', leader_user.first_name, leader_user.last_name) as leader
            from cell_assignments ca
            join sprints s on s.id = ca.sprint_id
            join cells cell on cell.id = ca.cell_id
            left join cell_assignments leader_assignment
              on leader_assignment.sprint_id = ca.sprint_id
             and leader_assignment.cell_id = ca.cell_id
             and lower(leader_assignment.role_in_cell) = 'leader'
            left join users leader_user on leader_user.id = leader_assignment.coder_id
            where ca.coder_id = @coder_id
            order by s.start_date desc, s.number desc;
            """))
        {
            command.Parameters.AddWithValue("coder_id", coderId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                history.Add(new
                {
                    sprintId = reader.GetGuid(0),
                    sprint = reader.GetInt32(1),
                    startDate = reader.GetFieldValue<DateOnly>(2),
                    endDate = reader.GetFieldValue<DateOnly>(3),
                    status = reader.GetString(4),
                    cell = reader.GetString(5),
                    role = reader.GetString(6),
                    leader = reader.IsDBNull(7) ? null : reader.GetString(7)
                });
            }
        }

        await using var metricsCommand = dataSource.CreateCommand("""
            select
                count(distinct cr.id) as roses,
                count(distinct ca.id) filter (where lower(ca.role_in_cell) = 'leader') as leader_runs,
                count(distinct us.id) as assigned_stories,
                count(distinct us.id) filter (where lower(us.kanban_status) = 'done') as done_stories,
                coalesce(sum(us.estimate) filter (where lower(us.kanban_status) = 'done'), 0) as done_points,
                coalesce(round(avg(es.score)::numeric, 2), 0) as avg_score
            from users u
            left join coder_roses cr on cr.coder_id = u.id
            left join cell_assignments ca on ca.coder_id = u.id
            left join user_stories us on us.assignee_coder_id = u.id
            left join evaluations ev on ev.user_id = u.id
            left join evaluation_scores es on es.evaluation_id = ev.id
            where u.id = @coder_id
            group by u.id;
            """);
        metricsCommand.Parameters.AddWithValue("coder_id", coderId);

        await using var metricsReader = await metricsCommand.ExecuteReaderAsync(cancellationToken);
        await metricsReader.ReadAsync(cancellationToken);
        var metrics = new
        {
            roses = metricsReader.GetInt64(0),
            leaderRuns = metricsReader.GetInt64(1),
            assignedStories = metricsReader.GetInt64(2),
            doneStories = metricsReader.GetInt64(3),
            donePoints = metricsReader.GetInt64(4),
            averageEvaluation = metricsReader.GetDecimal(5)
        };

        return Ok(new { coder, metrics, history });
    }
}
