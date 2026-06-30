using Npgsql;

namespace B612.Api.BackgroundServices;

public sealed class SprintAutoCloseService(NpgsqlDataSource dataSource, ILogger<SprintAutoCloseService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await TryCloseExpiredSprintsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.Now;
            var nextMidnight = new DateTimeOffset(now.Date.AddDays(1), now.Offset);
            var delay = nextMidnight - now;

            await Task.Delay(delay, stoppingToken);
            await TryCloseExpiredSprintsAsync(stoppingToken);
        }
    }

    private async Task TryCloseExpiredSprintsAsync(CancellationToken cancellationToken)
    {
        try
        {
            await CloseExpiredSprintsAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "SprintAutoCloseService could not close expired sprints in this run.");
        }
    }

    private async Task CloseExpiredSprintsAsync(CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            update sprints
            set status = 'closed',
                closed_at = coalesce(closed_at, now()),
                closed_by = 'system'
            where lower(status) = 'active'
              and end_date < current_date
            returning id, number;
            """);

        var closed = 0;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) closed++;

        if (closed > 0)
        {
            logger.LogInformation("SprintAutoCloseService closed {Count} expired sprint(s).", closed);
        }
    }
}
