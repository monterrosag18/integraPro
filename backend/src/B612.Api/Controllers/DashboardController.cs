using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select
                (select count(*) from campuses) as campuses,
                (select count(*) from cohorts) as cohorts,
                (select count(*) from clans) as clans,
                (select count(*) from cells) as cells,
                (select count(*) from coders) as coders,
                (select count(*) from users where lower(role) = 'tl') as tls,
                (select count(*) from sprints where lower(status) = 'active') as active_sprints,
                (select count(*) from projects) as projects,
                (select count(*) from user_stories) as stories;
            """);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        return Ok(new
        {
            campuses = reader.GetInt64(0),
            cohorts = reader.GetInt64(1),
            clans = reader.GetInt64(2),
            cells = reader.GetInt64(3),
            coders = reader.GetInt64(4),
            tls = reader.GetInt64(5),
            activeSprints = reader.GetInt64(6),
            projects = reader.GetInt64(7),
            stories = reader.GetInt64(8)
        });
    }

    [HttpGet("cells")]
    public async Task<IActionResult> Cells(CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select
                cells.id,
                cells.name,
                clans.name as clan,
                coalesce(count(distinct ca.coder_id), 0) as coders
            from cells
            join clans on clans.id = cells.clan_id
            left join cell_assignments ca on ca.cell_id = cells.id
            group by cells.id, cells.name, clans.name
            order by clans.name, cells.name;
            """);

        var cells = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            cells.Add(new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                clan = reader.GetString(2),
                theme = "B612",
                coders = reader.GetInt64(3)
            });
        }

        return Ok(cells);
    }

    [HttpGet("admin-overview")]
    public async Task<IActionResult> AdminOverview(CancellationToken cancellationToken)
    {
        var cohorts = new List<object>();

        await using (var command = dataSource.CreateCommand("""
            select
                co.name as cohort,
                ca.name as campus,
                count(distinct cl.id) as clans,
                count(distinct coder.user_id) as coders,
                case when count(distinct s.id) filter (where lower(s.status) = 'active') > 0 then 'Activa' else 'Preparación' end as status
            from cohorts co
            join campuses ca on ca.id = co.campus_id
            left join clans cl on cl.cohort_id = co.id
            left join coders coder on coder.cohort_id = co.id
            left join sprints s on s.clan_id = cl.id
            group by co.id, co.name, ca.name
            order by co.name
            limit 8;
            """))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                cohorts.Add(new
                {
                    cohort = reader.GetString(0),
                    campus = reader.GetString(1),
                    clans = reader.GetInt64(2),
                    coders = reader.GetInt64(3),
                    status = reader.GetString(4)
                });
            }
        }

        return Ok(new { cohorts });
    }

    [HttpGet("talent-passport")]
    public async Task<IActionResult> TalentPassport(CancellationToken cancellationToken)
    {
        var coders = new List<object>();
        var cells = new List<object>();

        await using (var command = dataSource.CreateCommand("""
            with latest_assignment as (
                select distinct on (ca.coder_id)
                    ca.coder_id,
                    ca.cell_id,
                    ca.role_in_cell,
                    s.number as sprint_number,
                    s.start_date
                from cell_assignments ca
                join sprints s on s.id = ca.sprint_id
                order by ca.coder_id, s.start_date desc, s.number desc
            ),
            story_points as (
                select assignee_coder_id as coder_id,
                    coalesce(sum(case when lower(kanban_status) = 'done' then coalesce(estimate, 1) else 0 end), 0) as done_points,
                    count(*) filter (where lower(kanban_status) = 'done') as done_stories
                from user_stories
                where assignee_coder_id is not null
                group by assignee_coder_id
            ),
            score_rows as (
                select
                    u.id,
                    concat_ws(' ', u.first_name, u.last_name) as name,
                    u.email,
                    coalesce(cell.name, 'Sin célula') as cell,
                    coalesce(cl.name, 'Sin clan') as clan,
                    coalesce(count(distinct cr.id), 0) as roses,
                    coalesce(count(distinct ca_lead.id), 0) as leader_runs,
                    coalesce(max(sp.done_points), 0) as done_points,
                    coalesce(max(sp.done_stories), 0) as done_stories,
                    coalesce(avg(es.score), 0) as avg_eval
                from users u
                join coders coder on coder.user_id = u.id
                left join clans cl on cl.id = coder.clan_id
                left join latest_assignment la on la.coder_id = u.id
                left join cells cell on cell.id = la.cell_id
                left join cell_assignments ca_lead on ca_lead.coder_id = u.id and lower(ca_lead.role_in_cell) = 'leader'
                left join coder_roses cr on cr.coder_id = u.id
                left join story_points sp on sp.coder_id = u.id
                left join evaluations ev on ev.user_id = u.id
                left join evaluation_scores es on es.evaluation_id = ev.id
                where lower(u.role) = 'coder'
                group by u.id, u.first_name, u.last_name, u.email, cell.name, cl.name
            )
            select
                row_number() over (order by score desc, roses desc, name) as rank,
                id,
                name,
                email,
                cell,
                clan,
                score,
                case when score >= 75 then 'Alto' when score >= 45 then 'Medio' else 'Bajo' end as tier,
                technical,
                delivery,
                collaboration,
                professional,
                achievements,
                continuous
            from (
                select *,
                    least(100, round((avg_eval * 12) + (roses * 16) + (done_points * 1.2) + (leader_runs * 4), 1)) as score,
                    least(100, round(done_points * 5 + avg_eval * 8, 0)) as technical,
                    least(100, round(done_stories * 12 + done_points * 2, 0)) as delivery,
                    least(100, round(roses * 28 + leader_runs * 8, 0)) as collaboration,
                    least(100, round(avg_eval * 20, 0)) as professional,
                    least(100, round(roses * 35 + done_stories * 4, 0)) as achievements,
                    least(100, round(leader_runs * 18 + done_points * 1.5, 0)) as continuous
                from score_rows
            ) ranked
            order by rank
            limit 250;
            """))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                coders.Add(new
                {
                    rank = reader.GetInt64(0),
                    id = reader.GetGuid(1),
                    name = reader.GetString(2),
                    email = reader.GetString(3),
                    cell = reader.GetString(4),
                    clan = reader.GetString(5),
                    score = reader.GetDecimal(6),
                    tier = reader.GetString(7),
                    dims = new
                    {
                        technical = reader.GetDecimal(8),
                        delivery = reader.GetDecimal(9),
                        collaboration = reader.GetDecimal(10),
                        professional = reader.GetDecimal(11),
                        achievements = reader.GetDecimal(12),
                        continuous = reader.GetDecimal(13)
                    }
                });
            }
        }

        await using (var command = dataSource.CreateCommand("""
            select
                cells.name as cell,
                clans.name as clan,
                count(distinct ca.coder_id) as count,
                count(distinct cr.id) as roses,
                round((count(distinct ca.coder_id) * 2 + count(distinct cr.id) * 8 + count(distinct ca.id) filter (where lower(ca.role_in_cell) = 'leader') * 3)::numeric, 1) as score
            from cells
            join clans on clans.id = cells.clan_id
            left join cell_assignments ca on ca.cell_id = cells.id
            left join coder_roses cr on cr.coder_id = ca.coder_id
            group by cells.id, cells.name, clans.name
            order by score desc, count desc, cells.name
            limit 8;
            """))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                cells.Add(new
                {
                    cell = reader.GetString(0),
                    clan = reader.GetString(1),
                    count = reader.GetInt64(2),
                    roses = reader.GetInt64(3),
                    avg = reader.GetDecimal(4)
                });
            }
        }

        return Ok(new { coders, cells });
    }
}
