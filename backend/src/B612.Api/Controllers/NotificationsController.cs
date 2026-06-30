using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController(NpgsqlDataSource dataSource, IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? userId, CancellationToken cancellationToken)
    {
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        await using var command = source.CreateCommand("""
            select id, user_id, type, title, body, url, read_at, created_at
            from notifications
            where @user_id::uuid is null or user_id = @user_id
            order by created_at desc
            limit 30;
            """);
        command.Parameters.AddWithValue("user_id", (object?)userId ?? DBNull.Value);

        var rows = new List<object>();
        var unread = 0;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var readAt = reader.IsDBNull(6) ? (DateTimeOffset?)null : reader.GetFieldValue<DateTimeOffset>(6);
            if (readAt is null) unread++;

            rows.Add(new
            {
                id = reader.GetGuid(0),
                userId = reader.GetGuid(1),
                type = reader.GetString(2),
                title = reader.GetString(3),
                body = reader.GetString(4),
                url = reader.IsDBNull(5) ? null : reader.GetString(5),
                readAt,
                createdAt = reader.GetFieldValue<DateTimeOffset>(7)
            });
        }

        return Ok(new
        {
            unread,
            notifications = rows
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request, CancellationToken cancellationToken)
    {
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        var id = Guid.NewGuid();
        await using var command = source.CreateCommand("""
            insert into notifications (id, user_id, type, title, body, url, created_at)
            values (@id, @user_id, @type, @title, @body, @url, now())
            returning id, created_at;
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("user_id", request.UserId);
        command.Parameters.AddWithValue("type", request.Type);
        command.Parameters.AddWithValue("title", request.Title);
        command.Parameters.AddWithValue("body", request.Body);
        command.Parameters.AddWithValue("url", (object?)request.Url ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return Ok(new { id = reader.GetGuid(0), createdAt = reader.GetFieldValue<DateTimeOffset>(1) });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        await using var command = source.CreateCommand("""
            update notifications
            set read_at = coalesce(read_at, now())
            where id = @id
            returning id, read_at;
            """);
        command.Parameters.AddWithValue("id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return NotFound(new { message = "Notification not found." });
        return Ok(new { id = reader.GetGuid(0), readAt = reader.GetFieldValue<DateTimeOffset>(1) });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead([FromBody] MarkAllReadRequest request, CancellationToken cancellationToken)
    {
        await using var readDataSource = CreateReadDataSource();
        var source = readDataSource ?? dataSource;
        await using var command = source.CreateCommand("""
            update notifications
            set read_at = coalesce(read_at, now())
            where user_id = @user_id and read_at is null;
            """);
        command.Parameters.AddWithValue("user_id", request.UserId);
        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return Ok(new { updated = affected });
    }

    private NpgsqlDataSource? CreateReadDataSource()
    {
        var connectionString = configuration.GetConnectionString("TalentPassportDatabase");
        return string.IsNullOrWhiteSpace(connectionString) ? null : NpgsqlDataSource.Create(connectionString);
    }
}

public sealed record CreateNotificationRequest(Guid UserId, string Type, string Title, string Body, string? Url);
public sealed record MarkAllReadRequest(Guid UserId);
