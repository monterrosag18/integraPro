using B612.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(B612DbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        return Ok(new
        {
            campuses = await db.Campuses.CountAsync(cancellationToken),
            cohorts = await db.Cohorts.CountAsync(cancellationToken),
            clans = await db.Clans.CountAsync(cancellationToken),
            cells = await db.Cells.CountAsync(cancellationToken),
            coders = await db.Coders.CountAsync(cancellationToken),
            activeSprints = await db.Sprints.CountAsync(sprint => sprint.Status == B612.Domain.Sprints.SprintStatus.Active, cancellationToken)
        });
    }

    [HttpGet("cells")]
    public async Task<IActionResult> Cells(CancellationToken cancellationToken) =>
        Ok(await db.Cells.OrderBy(cell => cell.Name).Select(cell => new { cell.Id, cell.Name, cell.Theme }).ToListAsync(cancellationToken));
}
