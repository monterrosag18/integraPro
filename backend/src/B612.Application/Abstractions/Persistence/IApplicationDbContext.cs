using B612.Domain.Assignments;

namespace B612.Application.Abstractions.Persistence;

public interface IApplicationDbContext
{
    IQueryable<CellAssignment> CellAssignments { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
