using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(NpgsqlDataSource dataSource, IConfiguration configuration) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        await using var command = source.CreateCommand("""
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
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        await using var command = source.CreateCommand("""
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
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        var cohorts = new List<object>();

        await using (var command = source.CreateCommand("""
            select
                co.name as cohort,
                ca.name as campus,
                count(distinct cl.id) as clans,
                count(distinct coder.user_id) as coders,
                case when count(distinct s.id) filter (where lower(s.status) = 'active') > 0 then 'Activa' else 'Preparacion' end as status
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

    [HttpGet("module/{role}/{section?}")]
    public async Task<IActionResult> Module(string role, string? section, CancellationToken cancellationToken)
    {
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        var key = $"{role.ToLowerInvariant()}/{(section ?? "resumen").ToLowerInvariant()}";

        return key switch
        {
            "admin/campus" => await ReadModule(source, "Campus", "Estructura academica", "Sedes reales registradas en PostgreSQL.", new[] { "Campus", "Ciudad", "Cohortes", "Coders", "Estado" }, """
                select ca.name, ca.name, count(distinct co.id)::text, count(distinct coder.user_id)::text, 'Activo'
                from campuses ca
                left join cohorts co on co.campus_id = ca.id
                left join coders coder on coder.cohort_id = co.id
                group by ca.id, ca.name
                order by ca.name;
                """, """
                select count(*)::text, 'Campus' from campuses
                union all select count(*)::text, 'Cohortes' from cohorts
                union all select count(*)::text, 'Coders' from coders;
                """, cancellationToken),

            "admin/cohortes" => await ReadModule(source, "Cohortes", "Organizacion", "Cohortes reales por campus, clanes y coders.", new[] { "Cohorte", "Campus", "Clanes", "Coders", "Estado" }, """
                select co.name, ca.name, count(distinct cl.id)::text, count(distinct coder.user_id)::text,
                    case when count(distinct s.id) filter (where lower(s.status) = 'active') > 0 then 'Activa' else 'Sin sprint activo' end
                from cohorts co
                join campuses ca on ca.id = co.campus_id
                left join clans cl on cl.cohort_id = co.id
                left join coders coder on coder.cohort_id = co.id
                left join sprints s on s.clan_id = cl.id
                group by co.id, co.name, ca.name
                order by ca.name, co.name;
                """, """
                select count(*)::text, 'Cohortes' from cohorts
                union all select count(*)::text, 'Clanes' from clans
                union all select count(*)::text, 'Coders' from coders;
                """, cancellationToken),

            "admin/clanes" => await ReadModule(source, "Clanes", "Estructura academica", "Clanes, TL y celulas reales por cohorte.", new[] { "Clan", "Cohorte", "TL", "Celulas", "Estado" }, """
                select cl.name, co.name,
                    coalesce(string_agg(distinct trim(concat_ws(' ', u.first_name, u.last_name)), ', ') filter (where u.id is not null), 'Sin TL') as tl,
                    count(distinct ce.id)::text,
                    case when count(distinct s.id) filter (where lower(s.status) = 'active') > 0 then 'Activo' else 'Sin sprint activo' end
                from clans cl
                join cohorts co on co.id = cl.cohort_id
                left join cells ce on ce.clan_id = cl.id
                left join clan_tl ct on ct.clan_id = cl.id
                left join users u on u.id = ct.user_id
                left join sprints s on s.clan_id = cl.id
                group by cl.id, cl.name, co.name
                order by co.name, cl.name;
                """, """
                select count(*)::text, 'Clanes' from clans
                union all select count(*)::text, 'Celulas' from cells
                union all select count(*)::text, 'TL asignados' from clan_tl;
                """, cancellationToken),

            "admin/usuarios" => await ReadModule(source, "Usuarios", "Identidad y acceso", "Usuarios reales del VPS con rol, contexto y estado.", new[] { "Nombre", "Correo", "Rol", "Contexto", "Estado" }, """
                select trim(concat_ws(' ', u.first_name, u.last_name)) as name,
                    u.email,
                    u.role,
                    coalesce(cl.name, ca.name, 'Global') as context,
                    u.status
                from users u
                left join coders coder on coder.user_id = u.id
                left join clans cl on cl.id = coder.clan_id
                left join campuses ca on ca.id = u.campus_id
                order by u.role, name
                limit 250;
                """, """
                select count(*)::text, 'Usuarios' from users
                union all select count(*)::text, 'Coders' from coders
                union all select count(*)::text, 'TL' from users where lower(role) = 'tl';
                """, cancellationToken),

            "admin/criterios" => await ReadModule(source, "Criterios de evaluacion", "Calidad de datos", "Catalogo real de criterios y uso en evaluaciones.", new[] { "Criterio", "Alcance", "Uso", "Scores", "Estado" }, """
                select ec.name, ec.scope, 'Evaluacion', count(es.id)::text,
                    case when ec.active then 'Activo' else 'Inactivo' end
                from evaluation_criteria ec
                left join evaluation_scores es on es.criterion_id = ec.id
                group by ec.id, ec.name, ec.scope, ec.active
                order by ec.scope, ec.name;
                """, """
                select count(*)::text, 'Criterios' from evaluation_criteria
                union all select count(*)::text, 'Activos' from evaluation_criteria where active
                union all select count(*)::text, 'Scores' from evaluation_scores;
                """, cancellationToken),

            "tl/resumen" => await ReadModule(source, "Pulso del clan", "Resumen real", "Lectura agregada de clanes, celulas y avance registrado.", new[] { "Clan", "Celulas", "Sprints", "Historias", "Estado" }, """
                select cl.name,
                    count(distinct ce.id)::text,
                    count(distinct s.id)::text,
                    count(distinct us.id)::text,
                    case when count(distinct s.id) filter (where lower(s.status) = 'active') > 0 then 'Activo' else 'Sin sprint activo' end
                from clans cl
                left join cells ce on ce.clan_id = cl.id
                left join sprints s on s.clan_id = cl.id
                left join projects p on p.sprint_id = s.id
                left join backlogs b on b.project_id = p.id
                left join user_stories us on us.backlog_id = b.id
                group by cl.id, cl.name
                order by cl.name;
                """, """
                select count(*)::text, 'Clanes' from clans
                union all select count(*)::text, 'Celulas' from cells
                union all select count(*)::text, 'Historias' from user_stories;
                """, cancellationToken),

            "tl/sprints" => await ReadModule(source, "Sprints", "Calendario del clan", "Sprints reales registrados en el VPS.", new[] { "Sprint", "Inicio", "Fin", "Clanes/Celulas", "Estado" }, """
                select 'Sprint ' || s.number::text,
                    s.start_date::text,
                    s.end_date::text,
                    cl.name || ' / ' || count(distinct p.cell_id)::text,
                    s.status
                from sprints s
                join clans cl on cl.id = s.clan_id
                left join projects p on p.sprint_id = s.id
                group by s.id, s.number, s.start_date, s.end_date, s.status, cl.name
                order by s.start_date desc, s.number desc;
                """, """
                select count(*)::text, 'Sprints' from sprints
                union all select count(*)::text, 'Activos' from sprints where lower(status) = 'active'
                union all select count(*)::text, 'Cerrados' from sprints where lower(status) = 'closed';
                """, cancellationToken),

            "tl/celulas" => await ReadModule(source, "Celulas", "Tripulaciones", "Celulas reales con lideres, rotadores y avance de historias.", new[] { "Celula", "Lider", "Rotadores", "Proyecto", "Avance" }, """
                select ce.name,
                    coalesce(string_agg(distinct trim(concat_ws(' ', leader.first_name, leader.last_name)), ', ') filter (where leader.id is not null), 'Sin lider') as leaders,
                    count(distinct ca.coder_id) filter (where lower(ca.role_in_cell) <> 'leader')::text as rotators,
                    coalesce(max(p.name), 'Sin proyecto') as project,
                    case when count(us.id) = 0 then '0%' else round((count(us.id) filter (where lower(us.kanban_status) = 'done')::numeric / count(us.id)) * 100, 1)::text || '%' end as progress
                from cells ce
                left join cell_assignments ca on ca.cell_id = ce.id
                left join users leader on leader.id = ca.coder_id and lower(ca.role_in_cell) = 'leader'
                left join projects p on p.cell_id = ce.id
                left join backlogs b on b.project_id = p.id
                left join user_stories us on us.backlog_id = b.id
                group by ce.id, ce.name
                order by ce.name;
                """, """
                select count(*)::text, 'Celulas' from cells
                union all select count(*)::text, 'Asignaciones' from cell_assignments
                union all select count(*)::text, 'Lideres' from cell_assignments where lower(role_in_cell) = 'leader';
                """, cancellationToken),

            "tl/evaluaciones" => await ReadModule(source, "Evaluaciones", "Empleabilidad", "Evaluaciones reales registradas en el VPS.", new[] { "Tipo", "Sujeto", "Scores", "Promedio", "Estado" }, """
                select coalesce(e.eval_type, e.ceremony_type), coalesce(trim(concat_ws(' ', u.first_name, u.last_name)), p.name, 'Sin sujeto'),
                    count(es.id)::text,
                    coalesce(round(avg(es.score), 2)::text, '0'),
                    case when count(es.id) > 0 then 'Con datos' else 'Sin scores' end
                from evaluations e
                left join users u on u.id = e.user_id
                left join projects p on p.id = e.project_id
                left join evaluation_scores es on es.evaluation_id = e.id
                group by e.id, e.eval_type, e.ceremony_type, u.first_name, u.last_name, p.name
                order by e.ceremony_type;
                """, """
                select count(*)::text, 'Evaluaciones' from evaluations
                union all select count(*)::text, 'Scores' from evaluation_scores
                union all select count(*)::text, 'Criterios' from evaluation_criteria;
                """, cancellationToken),

            "tl/rosa" => await ReadModule(source, "La Rosa", "Reconocimiento", "Rosas otorgadas por sprint y celula ganadora.", new[] { "Sprint", "Celula ganadora", "Clan", "Coders reconocidos", "Estado" }, """
                select 'Sprint ' || s.number::text,
                    ce.name,
                    cl.name,
                    count(distinct cr.coder_id)::text,
                    'Otorgada'
                from roses r
                join sprints s on s.id = r.sprint_id
                join cells ce on ce.id = r.cell_id
                join clans cl on cl.id = ce.clan_id
                left join coder_roses cr on cr.rose_id = r.id
                group by r.id, s.number, ce.name, cl.name
                order by s.number desc;
                """, """
                select count(*)::text, 'Rosas' from roses
                union all select count(*)::text, 'Coders reconocidos' from coder_roses
                union all select count(distinct cell_id)::text, 'Celulas ganadoras' from roses;
                """, cancellationToken),

            "leader/proyecto" => await ReadModule(source, "Proyecto de la celula", "Trabajo real", "Proyectos registrados por sprint y celula.", new[] { "Proyecto", "Celula", "Sprint", "Historias", "Estado" }, """
                select p.name, ce.name, 'Sprint ' || s.number::text, count(us.id)::text, s.status
                from projects p
                join cells ce on ce.id = p.cell_id
                join sprints s on s.id = p.sprint_id
                left join backlogs b on b.project_id = p.id
                left join user_stories us on us.backlog_id = b.id
                group by p.id, p.name, ce.name, s.number, s.status
                order by s.number desc, p.name;
                """, """
                select count(*)::text, 'Proyectos' from projects
                union all select count(*)::text, 'Historias' from user_stories
                union all select count(*)::text, 'Repos' from github_links;
                """, cancellationToken),

            "leader/backlog" => await ReadModule(source, "Backlog", "Historias de usuario", "Historias reales del backlog.", new[] { "Historia", "Titulo", "Prioridad", "Estimacion", "Responsable" }, """
                select 'HU-' || row_number() over (order by us.id)::text,
                    left(us.i_want, 60),
                    coalesce(us.priority::text, 'Sin prioridad'),
                    coalesce(us.estimate::text, '0') || ' pts',
                    coalesce(trim(concat_ws(' ', u.first_name, u.last_name)), 'Sin asignar')
                from user_stories us
                left join users u on u.id = us.assignee_coder_id
                order by us.priority desc nulls last, us.id
                limit 250;
                """, """
                select count(*)::text, 'Historias' from user_stories
                union all select coalesce(sum(estimate), 0)::text, 'Story points' from user_stories
                union all select count(*)::text, 'Sin asignar' from user_stories where assignee_coder_id is null;
                """, cancellationToken),

            "leader/ceremonias" => await ReadModule(source, "Ceremonias", "Ciclo Scrum", "Ceremonias reales por proyecto.", new[] { "Ceremonia", "Fecha", "Proyecto", "Evidencia", "Estado" }, """
                select c.ceremony_type, c.date::date::text, p.name, 'Registrada', c.status
                from ceremonies c
                join projects p on p.id = c.project_id
                order by c.date desc;
                """, """
                select count(*)::text, 'Ceremonias' from ceremonies
                union all select count(*)::text, 'Reviews' from ceremonies where lower(ceremony_type) = 'review'
                union all select count(*)::text, 'Retros' from ceremonies where lower(ceremony_type) = 'retrospective';
                """, cancellationToken),

            "leader/evaluaciones" => await ReadModule(source, "Evaluaciones", "Retroalimentacion", "Evaluaciones reales disponibles para lideres.", new[] { "Evaluacion", "Sujeto", "Criterios", "Promedio", "Estado" }, """
                select e.ceremony_type, coalesce(trim(concat_ws(' ', u.first_name, u.last_name)), p.name, 'Sin sujeto'),
                    count(es.id)::text,
                    coalesce(round(avg(es.score), 2)::text, '0'),
                    case when count(es.id) > 0 then 'Con datos' else 'Sin scores' end
                from evaluations e
                left join users u on u.id = e.user_id
                left join projects p on p.id = e.project_id
                left join evaluation_scores es on es.evaluation_id = e.id
                group by e.id, e.ceremony_type, u.first_name, u.last_name, p.name;
                """, """
                select count(*)::text, 'Evaluaciones' from evaluations
                union all select count(*)::text, 'Scores' from evaluation_scores
                union all select count(*)::text, 'Criterios' from evaluation_criteria;
                """, cancellationToken),

            _ => NotFound(new { message = "No real-data module exists for this view yet." })
        };
    }

    [HttpGet("talent-passport")]
    public async Task<IActionResult> TalentPassport(CancellationToken cancellationToken)
    {
        var coders = new List<object>();
        var cells = new List<object>();
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;

        await using (var command = source.CreateCommand("""
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
            assignment_stats as (
                select
                    ca.coder_id,
                    count(*) as assignments,
                    count(distinct ca.sprint_id) as sprints,
                    count(distinct ca.cell_id) as cells_worked,
                    count(*) filter (where lower(ca.role_in_cell) = 'leader') as leader_runs,
                    count(*) filter (where lower(ca.status) = 'confirmed') as confirmed_assignments
                from cell_assignments ca
                group by ca.coder_id
            ),
            story_points as (
                select assignee_coder_id as coder_id,
                    count(*) as stories,
                    coalesce(sum(coalesce(estimate, 1)), 0) as total_points,
                    coalesce(sum(case when lower(kanban_status) = 'done' then coalesce(estimate, 1) else 0 end), 0) as done_points,
                    count(*) filter (where lower(kanban_status) = 'done') as done_stories
                from user_stories
                where assignee_coder_id is not null
                group by assignee_coder_id
            ),
            eval_stats as (
                select
                    ev.user_id as coder_id,
                    count(distinct ev.id) as evaluations,
                    count(es.id) as evaluation_scores,
                    coalesce(avg(es.score), 0) as avg_eval,
                    count(distinct ec.id) filter (where ec.active) as active_criteria
                from evaluations ev
                left join evaluation_scores es on es.evaluation_id = ev.id
                left join evaluation_criteria ec on ec.id = es.criterion_id
                where ev.user_id is not null
                group by ev.user_id
            ),
            rose_stats as (
                select
                    cr.coder_id,
                    count(distinct cr.id) as roses
                from coder_roses cr
                group by cr.coder_id
            ),
            redemption_stats as (
                select
                    pr.coder_id,
                    count(distinct pr.id) as redemptions,
                    coalesce(sum(pr.roses_spent), 0) as roses_spent
                from prize_redemptions pr
                group by pr.coder_id
            ),
            score_rows as (
                select
                    u.id,
                    trim(concat_ws(' ', u.first_name, u.last_name)) as name,
                    u.email,
                    coalesce(cell.name, 'Sin celula') as cell,
                    coalesce(cl.name, 'Sin clan') as clan,
                    coalesce(ast.assignments, 0) as assignments,
                    coalesce(ast.sprints, 0) as sprints,
                    coalesce(ast.cells_worked, 0) as cells_worked,
                    coalesce(ast.leader_runs, 0) as leader_runs,
                    coalesce(ast.confirmed_assignments, 0) as confirmed_assignments,
                    coalesce(sp.stories, 0) as stories,
                    coalesce(sp.total_points, 0) as total_points,
                    coalesce(max(sp.done_points), 0) as done_points,
                    coalesce(max(sp.done_stories), 0) as done_stories,
                    coalesce(rs.roses, 0) as roses,
                    coalesce(red.redemptions, 0) as redemptions,
                    coalesce(red.roses_spent, 0) as roses_spent,
                    coalesce(es.evaluations, 0) as evaluations,
                    coalesce(es.evaluation_scores, 0) as evaluation_scores,
                    coalesce(es.avg_eval, 0) as avg_eval
                from users u
                join coders coder on coder.user_id = u.id
                left join latest_assignment la on la.coder_id = u.id
                left join cells cell on cell.id = la.cell_id
                left join clans cl on cl.id = coalesce(cell.clan_id, coder.clan_id)
                left join assignment_stats ast on ast.coder_id = u.id
                left join story_points sp on sp.coder_id = u.id
                left join eval_stats es on es.coder_id = u.id
                left join rose_stats rs on rs.coder_id = u.id
                left join redemption_stats red on red.coder_id = u.id
                where lower(u.role) = 'coder'
                group by u.id, u.first_name, u.last_name, u.email, cell.name, cl.name,
                    ast.assignments, ast.sprints, ast.cells_worked, ast.leader_runs, ast.confirmed_assignments,
                    sp.stories, sp.total_points, rs.roses, red.redemptions, red.roses_spent,
                    es.evaluations, es.evaluation_scores, es.avg_eval
            ),
            dimensions as (
                select *,
                    case when evaluation_scores > 0 then round(avg_eval * 20, 1) else 0 end as technical,
                    case when stories > 0 then round(((done_stories::numeric / stories) * 65) + least(35, done_points * 3), 1) else 0 end as delivery,
                    least(100, round((least(3, cells_worked) * 16) + (least(3, leader_runs) * 12) + (least(4, roses) * 4), 1)) as collaboration,
                    least(100, round((least(4, sprints) * 18) + case when assignments > 0 then 18 else 0 end + case when confirmed_assignments > 0 then 10 else 0 end, 1)) as professional,
                    least(100, round((least(5, roses) * 12) + (least(3, redemptions) * 10) + (least(30, roses_spent) * 1), 1)) as achievements,
                    least(100, round((least(4, sprints) * 14) + (least(3, cells_worked) * 10) + case when stories > 0 and done_stories > 0 then 18 else 0 end, 1)) as continuous,
                    (
                        case when evaluation_scores > 0 then 1 else 0 end +
                        case when stories > 0 then 1 else 0 end +
                        case when assignments > 0 then 1 else 0 end +
                        case when roses > 0 then 1 else 0 end +
                        case when sprints > 0 then 1 else 0 end +
                        case when cells_worked > 0 then 1 else 0 end
                    ) as coverage_points
                from score_rows
            ),
            ranked_rows as (
                select *,
                    round(
                        (technical * 0.30) +
                        (delivery * 0.20) +
                        (collaboration * 0.15) +
                        (professional * 0.10) +
                        (achievements * 0.10) +
                        (continuous * 0.15),
                        1
                    ) as score,
                    round((coverage_points::numeric / 6) * 100, 1) as data_coverage
                from dimensions
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
                continuous,
                stories,
                done_stories,
                total_points,
                done_points,
                evaluations,
                evaluation_scores,
                avg_eval,
                roses,
                redemptions,
                assignments,
                sprints,
                cells_worked,
                leader_runs,
                data_coverage
            from ranked_rows ranked
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
                    },
                    metrics = new
                    {
                        stories = reader.GetInt64(14),
                        doneStories = reader.GetInt64(15),
                        totalPoints = reader.GetDecimal(16),
                        donePoints = reader.GetDecimal(17),
                        evaluations = reader.GetInt64(18),
                        evaluationScores = reader.GetInt64(19),
                        averageEvaluation = reader.GetDecimal(20),
                        roses = reader.GetInt64(21),
                        redemptions = reader.GetInt64(22),
                        assignments = reader.GetInt64(23),
                        sprints = reader.GetInt64(24),
                        cellsWorked = reader.GetInt64(25),
                        leaderRuns = reader.GetInt64(26),
                        dataCoverage = reader.GetDecimal(27)
                    }
                });
            }
        }

        await using (var command = source.CreateCommand("""
            with latest_assignment as (
                select distinct on (ca.coder_id)
                    ca.coder_id,
                    ca.cell_id
                from cell_assignments ca
                join sprints s on s.id = ca.sprint_id
                order by ca.coder_id, s.start_date desc, s.number desc
            ),
            story_points as (
                select assignee_coder_id as coder_id,
                    count(*) as stories,
                    coalesce(sum(case when lower(kanban_status) = 'done' then coalesce(estimate, 1) else 0 end), 0) as done_points,
                    count(*) filter (where lower(kanban_status) = 'done') as done_stories
                from user_stories
                where assignee_coder_id is not null
                group by assignee_coder_id
            ),
            eval_stats as (
                select ev.user_id as coder_id, count(es.id) as evaluation_scores, coalesce(avg(es.score), 0) as avg_eval
                from evaluations ev
                left join evaluation_scores es on es.evaluation_id = ev.id
                where ev.user_id is not null
                group by ev.user_id
            ),
            rose_stats as (
                select cr.coder_id, count(distinct cr.id) as roses
                from coder_roses cr
                group by cr.coder_id
            ),
            assignment_stats as (
                select ca.coder_id,
                    count(distinct ca.sprint_id) as sprints,
                    count(distinct ca.cell_id) as cells_worked,
                    count(*) filter (where lower(ca.role_in_cell) = 'leader') as leader_runs
                from cell_assignments ca
                group by ca.coder_id
            ),
            coder_scores as (
                select
                    coalesce(cell.name, 'Sin celula') as cell,
                    coalesce(cl.name, 'Sin clan') as clan,
                    u.id as coder_id,
                    coalesce(rs.roses, 0) as roses,
                    round(
                        (case when coalesce(es.evaluation_scores, 0) > 0 then coalesce(es.avg_eval, 0) * 20 else 0 end * 0.30) +
                        (case when coalesce(sp.stories, 0) > 0 then (((sp.done_stories::numeric / sp.stories) * 65) + least(35, sp.done_points * 3)) else 0 end * 0.20) +
                        (least(100, (least(3, coalesce(ast.cells_worked, 0)) * 16) + (least(3, coalesce(ast.leader_runs, 0)) * 12) + (least(4, coalesce(rs.roses, 0)) * 4)) * 0.15) +
                        (least(100, (least(4, coalesce(ast.sprints, 0)) * 18) + case when coalesce(ast.sprints, 0) > 0 then 18 else 0 end) * 0.10) +
                        (least(100, least(5, coalesce(rs.roses, 0)) * 12) * 0.10) +
                        (least(100, (least(4, coalesce(ast.sprints, 0)) * 14) + (least(3, coalesce(ast.cells_worked, 0)) * 10) + case when coalesce(sp.done_stories, 0) > 0 then 18 else 0 end) * 0.15),
                        1
                    ) as score
                from users u
                join coders coder on coder.user_id = u.id
                left join latest_assignment la on la.coder_id = u.id
                left join cells cell on cell.id = la.cell_id
                left join clans cl on cl.id = coalesce(cell.clan_id, coder.clan_id)
                left join story_points sp on sp.coder_id = u.id
                left join eval_stats es on es.coder_id = u.id
                left join rose_stats rs on rs.coder_id = u.id
                left join assignment_stats ast on ast.coder_id = u.id
                where lower(u.role) = 'coder'
            )
            select
                cell,
                clan,
                count(distinct coder_id) as count,
                coalesce(sum(roses), 0) as roses,
                round(avg(score), 1) as score
            from coder_scores
            group by cell, clan
            order by score desc, count desc, cell
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

    private NpgsqlDataSource? CreateReadDataSource()
    {
        var connectionString = configuration.GetConnectionString("TalentPassportDatabase");
        return string.IsNullOrWhiteSpace(connectionString) ? null : NpgsqlDataSource.Create(connectionString);
    }

    private static async Task<IActionResult> ReadModule(
        NpgsqlDataSource source,
        string title,
        string eyebrow,
        string description,
        string[] columns,
        string rowsSql,
        string statsSql,
        CancellationToken cancellationToken)
    {
        var rows = new List<string[]>();
        await using (var command = source.CreateCommand(rowsSql))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = new string[reader.FieldCount];
                for (var index = 0; index < reader.FieldCount; index++)
                {
                    row[index] = reader.IsDBNull(index) ? "-" : Convert.ToString(reader.GetValue(index)) ?? "-";
                }
                rows.Add(row);
            }
        }

        var stats = new List<string[]>();
        await using (var command = source.CreateCommand(statsSql))
        {
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                stats.Add(new[]
                {
                    reader.IsDBNull(0) ? "0" : Convert.ToString(reader.GetValue(0)) ?? "0",
                    reader.IsDBNull(1) ? "Dato" : Convert.ToString(reader.GetValue(1)) ?? "Dato"
                });
            }
        }

        return new OkObjectResult(new
        {
            title,
            eyebrow,
            description,
            columns,
            rows,
            stats,
            source = "VPS PostgreSQL"
        });
    }
}
