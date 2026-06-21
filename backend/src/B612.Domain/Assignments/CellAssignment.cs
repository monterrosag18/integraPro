using B612.Domain.Common;

namespace B612.Domain.Assignments;

public sealed class CellAssignment : Entity
{
    private CellAssignment() { }

    public CellAssignment(Guid sprintId, Guid cellId, Guid coderId, CellRole role)
    {
        SprintId = sprintId;
        CellId = cellId;
        CoderId = coderId;
        Role = role;
    }

    public Guid SprintId { get; private set; }
    public Guid CellId { get; private set; }
    public Guid CoderId { get; private set; }
    public CellRole Role { get; private set; }
    public AssignmentStatus Status { get; private set; } = AssignmentStatus.Suggested;
    public Guid? RotationRunId { get; private set; }
    public bool IsManualOverride { get; private set; }
    public Guid? ConfirmedByUserId { get; private set; }
    public DateTimeOffset? ConfirmedAt { get; private set; }
}

public enum CellRole { Leader, Rotator }
public enum AssignmentStatus { Suggested, Confirmed }
