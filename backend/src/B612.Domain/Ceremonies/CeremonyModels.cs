using B612.Domain.Common;

namespace B612.Domain.Ceremonies;

public abstract class Ceremony : Entity { public Guid ProjectId { get; set; } public DateTimeOffset? Date { get; set; } public CeremonyStatus Status { get; set; } }
public sealed class Planning : Ceremony { public string? Goal { get; set; } }
public sealed class Review : Ceremony { public string? Summary { get; set; } }
public sealed class Retrospective : Ceremony { public string? Summary { get; set; } }
public enum CeremonyStatus { Pending, Open, Closed }
