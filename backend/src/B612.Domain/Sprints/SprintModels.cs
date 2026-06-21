using B612.Domain.Common;

namespace B612.Domain.Sprints;

public sealed class Sprint : Entity
{
    public Guid ClanId { get; set; }
    public int Number { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public SprintStatus Status { get; set; } = SprintStatus.Draft;
}

public sealed class RotationRun : Entity
{
    public Guid SprintId { get; set; }
    public Guid GeneratedByUserId { get; set; }
    public RotationStatus Status { get; set; } = RotationStatus.Draft;
    public int Seed { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
}

public enum SprintStatus { Draft, Active, Closed }
public enum RotationStatus { Draft, Confirmed, Rejected }
