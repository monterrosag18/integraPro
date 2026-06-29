using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/sprints")]
public sealed class SprintsController(NpgsqlDataSource dataSource) : ControllerBase
{
    private const int MinDurationDays = 7;
    private const int MaxDurationDays = 28;
    private const int MaxExtensionDays = 7;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? clanId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select s.id, s.number, s.start_date, s.end_date, s.status, s.closed_at, s.closed_by,
                   cl.name as clan,
                   count(distinct p.id) as projects,
                   count(distinct us.id) as stories,
                   count(distinct us.id) filter (where lower(us.kanban_status) = 'done') as done_stories
            from sprints s
            join clans cl on cl.id = s.clan_id
            left join projects p on p.sprint_id = s.id
            left join backlogs b on b.project_id = p.id
            left join user_stories us on us.backlog_id = b.id
            where (@clan_id::uuid is null or s.clan_id = @clan_id)
            group by s.id, s.number, s.start_date, s.end_date, s.status, s.closed_at, s.closed_by, cl.name
            order by s.start_date desc, s.number desc
            limit 40;
            """);
        command.Parameters.AddWithValue("clan_id", (object?)clanId ?? DBNull.Value);

        var rows = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var projects = reader.GetInt64(8);
            var stories = reader.GetInt64(9);
            var done = reader.GetInt64(10);
            rows.Add(new
            {
                id = reader.GetGuid(0),
                number = reader.GetInt32(1),
                startDate = reader.GetFieldValue<DateOnly>(2),
                endDate = reader.GetFieldValue<DateOnly>(3),
                status = reader.GetString(4),
                closedAt = reader.IsDBNull(5) ? null : reader.GetFieldValue<DateTimeOffset?>(5),
                closedBy = reader.IsDBNull(6) ? null : reader.GetString(6),
                clan = reader.GetString(7),
                projects,
                stories,
                doneStories = done,
                progress = stories == 0 ? 0 : Math.Round(done * 100m / stories, 1)
            });
        }

        return Ok(new { sprints = rows });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSprintRequest request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (request.StartDate < today) return BadRequest(new { message = "La fecha de inicio debe ser hoy o futura." });

        var rangeError = ValidateRange(request.StartDate, request.EndDate);
        if (rangeError is not null) return BadRequest(new { message = rangeError });

        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        if (!await ClanExistsAsync(connection, transaction, request.ClanId, cancellationToken))
            return NotFound(new { message = "Clan not found." });

        if (await HasActiveSprintAsync(connection, transaction, request.ClanId, cancellationToken))
            return Conflict(new { message = "El clan ya tiene un sprint activo. Ciérralo antes de crear otro." });

        if (await HasDateOverlapAsync(connection, transaction, request.ClanId, request.StartDate, request.EndDate, null, cancellationToken))
            return Conflict(new { message = "Las fechas se solapan con otro sprint del clan." });

        var id = Guid.NewGuid();
        var nextNumber = await NextSprintNumberAsync(connection, transaction, request.ClanId, cancellationToken);

        await using var command = new NpgsqlCommand("""
            insert into sprints (id, clan_id, number, start_date, end_date, status, closed_at, closed_by)
            values (@id, @clan_id, @number, @start_date, @end_date, 'active', null, null)
            returning id, clan_id, number, start_date, end_date, status, closed_at, closed_by;
            """, connection, transaction);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("clan_id", request.ClanId);
        command.Parameters.AddWithValue("number", nextNumber);
        command.Parameters.AddWithValue("start_date", request.StartDate);
        command.Parameters.AddWithValue("end_date", request.EndDate);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        var result = ReadSprint(reader, includeClanId: true);

        await transaction.CommitAsync(cancellationToken);
        return Created($"/api/sprints/{id}", result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSprintRequest request, CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var current = await LoadSprintForUpdateAsync(connection, transaction, id, cancellationToken);
        if (current is null) return NotFound(new { message = "Sprint not found." });
        if (IsClosed(current.Status)) return Conflict(new { message = "Un sprint cerrado no se puede modificar desde update normal." });

        var requestedStatus = NormalizeStatus(request.Status);
        if (requestedStatus is null && request.Status is not null)
            return BadRequest(new { message = "Estado inválido. Valores permitidos: active, closed." });

        if (request.StartDate.HasValue && current.StartDate <= DateOnly.FromDateTime(DateTime.Today))
            return Conflict(new { message = "No se puede modificar la fecha de inicio de un sprint ya comenzado." });

        var effectiveStart = request.StartDate ?? current.StartDate;
        var effectiveEnd = request.EndDate ?? current.EndDate;
        if (request.StartDate.HasValue || request.EndDate.HasValue)
        {
            var rangeError = ValidateRange(effectiveStart, effectiveEnd);
            if (rangeError is not null) return BadRequest(new { message = rangeError });

            if (await HasDateOverlapAsync(connection, transaction, current.ClanId, effectiveStart, effectiveEnd, id, cancellationToken))
                return Conflict(new { message = "Las fechas se solapan con otro sprint del clan." });
        }

        var closedBy = request.ClosedBy ?? "tl";
        await using var command = new NpgsqlCommand("""
            update sprints
            set start_date = @start_date,
                end_date = @end_date,
                status = coalesce(@status, status),
                closed_at = case when @status = 'closed' then coalesce(closed_at, now()) else closed_at end,
                closed_by = case when @status = 'closed' then @closed_by else closed_by end
            where id = @id
            returning id, clan_id, number, start_date, end_date, status, closed_at, closed_by;
            """, connection, transaction);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("start_date", effectiveStart);
        command.Parameters.AddWithValue("end_date", effectiveEnd);
        command.Parameters.AddWithValue("status", (object?)requestedStatus ?? DBNull.Value);
        command.Parameters.AddWithValue("closed_by", closedBy);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        var result = ReadSprint(reader, includeClanId: true);

        await transaction.CommitAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/extend")]
    public async Task<IActionResult> Extend(Guid id, [FromBody] ExtendSprintRequest request, CancellationToken cancellationToken)
    {
        if (request.ExtraDays < 1 || request.ExtraDays > MaxExtensionDays)
            return BadRequest(new { message = "La extensión debe ser entre 1 y 7 días." });

        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var current = await LoadSprintForUpdateAsync(connection, transaction, id, cancellationToken);
        if (current is null) return NotFound(new { message = "Sprint not found." });
        if (!IsClosed(current.Status)) return Conflict(new { message = "Solo se puede extender un sprint cerrado." });

        var newEndDate = current.EndDate.AddDays(request.ExtraDays);
        var newStatus = newEndDate >= DateOnly.FromDateTime(DateTime.Today) ? "active" : "closed";
        var closedAtExpression = newStatus == "active" ? "null" : "closed_at";
        var closedByExpression = newStatus == "active" ? "null" : "closed_by";

        await using var command = new NpgsqlCommand($"""
            update sprints
            set end_date = @end_date,
                status = @status,
                closed_at = {closedAtExpression},
                closed_by = {closedByExpression}
            where id = @id
            returning id, clan_id, number, start_date, end_date, status, closed_at, closed_by;
            """, connection, transaction);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("end_date", newEndDate);
        command.Parameters.AddWithValue("status", newStatus);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        var result = ReadSprint(reader, includeClanId: true);

        await transaction.CommitAsync(cancellationToken);
        return Ok(result);
    }

    private static string? ValidateRange(DateOnly startDate, DateOnly endDate)
    {
        if (startDate > endDate) return "La fecha de inicio no puede ser mayor que la fecha de cierre.";

        var days = endDate.DayNumber - startDate.DayNumber;
        if (days < MinDurationDays || days > MaxDurationDays)
            return "El rango entre la fecha de inicio y la fecha de cierre debe ser de entre 1 y 4 semanas.";

        return null;
    }

    private static string? NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        var normalized = status.Trim().ToLowerInvariant();
        if (normalized is "active" or "activo") return "active";
        if (normalized is "closed" or "cerrado") return "closed";
        return null;
    }

    private static bool IsClosed(string status) => status.Equals("closed", StringComparison.OrdinalIgnoreCase);

    private static object ReadSprint(NpgsqlDataReader reader, bool includeClanId)
    {
        return new
        {
            id = reader.GetGuid(0),
            clanId = includeClanId ? reader.GetGuid(1) : (Guid?)null,
            number = reader.GetInt32(2),
            startDate = reader.GetFieldValue<DateOnly>(3),
            endDate = reader.GetFieldValue<DateOnly>(4),
            status = reader.GetString(5),
            closedAt = reader.IsDBNull(6) ? (DateTimeOffset?)null : reader.GetFieldValue<DateTimeOffset>(6),
            closedBy = reader.IsDBNull(7) ? null : reader.GetString(7)
        };
    }

    private static async Task<SprintState?> LoadSprintForUpdateAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid id, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("""
            select id, clan_id, start_date, end_date, status
            from sprints
            where id = @id
            for update;
            """, connection, transaction);
        command.Parameters.AddWithValue("id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return null;
        return new SprintState(reader.GetGuid(0), reader.GetGuid(1), reader.GetFieldValue<DateOnly>(2), reader.GetFieldValue<DateOnly>(3), reader.GetString(4));
    }

    private static async Task<bool> ClanExistsAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid clanId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("select exists(select 1 from clans where id = @clan_id);", connection, transaction);
        command.Parameters.AddWithValue("clan_id", clanId);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    private static async Task<bool> HasActiveSprintAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid clanId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("""
            select exists(
                select 1 from sprints
                where clan_id = @clan_id and lower(status) = 'active'
            );
            """, connection, transaction);
        command.Parameters.AddWithValue("clan_id", clanId);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    private static async Task<bool> HasDateOverlapAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid clanId, DateOnly startDate, DateOnly endDate, Guid? excludedSprintId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("""
            select exists(
                select 1 from sprints
                where clan_id = @clan_id
                  and (@excluded_sprint_id::uuid is null or id <> @excluded_sprint_id)
                  and start_date <= @end_date
                  and end_date >= @start_date
            );
            """, connection, transaction);
        command.Parameters.AddWithValue("clan_id", clanId);
        command.Parameters.AddWithValue("excluded_sprint_id", (object?)excludedSprintId ?? DBNull.Value);
        command.Parameters.AddWithValue("start_date", startDate);
        command.Parameters.AddWithValue("end_date", endDate);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    private static async Task<int> NextSprintNumberAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid clanId, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand("""
            select coalesce(max(number), 0) + 1
            from sprints
            where clan_id = @clan_id;
            """, connection, transaction);
        command.Parameters.AddWithValue("clan_id", clanId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }
}

public sealed record CreateSprintRequest(Guid ClanId, DateOnly StartDate, DateOnly EndDate);
public sealed record UpdateSprintRequest(DateOnly? StartDate, DateOnly? EndDate, string? Status, string? ClosedBy);
public sealed record ExtendSprintRequest(int ExtraDays, string? ExtendedBy);
internal sealed record SprintState(Guid Id, Guid ClanId, DateOnly StartDate, DateOnly EndDate, string Status);
