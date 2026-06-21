using B612.Domain.Common;

namespace B612.Domain.Organization;

public sealed class Campus : Entity { public string Name { get; set; } = string.Empty; }
public sealed class Cohort : Entity { public Guid CampusId { get; set; } public string Name { get; set; } = string.Empty; }
public sealed class Clan : Entity { public Guid CohortId { get; set; } public string Name { get; set; } = string.Empty; }
public sealed class Cell : Entity { public Guid ClanId { get; set; } public string Name { get; set; } = string.Empty; public string? Theme { get; set; } }
