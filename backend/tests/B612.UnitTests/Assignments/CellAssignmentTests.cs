using B612.Domain.Assignments;

namespace B612.UnitTests.Assignments;

public sealed class CellAssignmentTests
{
    [Fact]
    public void NewAssignment_StartsAsSuggested()
    {
        var assignment = new CellAssignment(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), CellRole.Rotator);
        Assert.Equal(AssignmentStatus.Suggested, assignment.Status);
    }
}
