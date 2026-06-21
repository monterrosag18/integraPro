using B612.Domain.Common;

namespace B612.Domain.Gamification;

public sealed class Rose : Entity { public Guid SprintId { get; set; } public Guid CellId { get; set; } public Guid GrantedByUserId { get; set; } }
public sealed class CoderRose : Entity { public Guid CoderId { get; set; } public Guid RoseId { get; set; } }
public sealed class Prize : Entity { public string Name { get; set; } = string.Empty; public int CostInRoses { get; set; } public bool Active { get; set; } = true; }
public sealed class PrizeRedemption : Entity { public Guid CoderId { get; set; } public Guid PrizeId { get; set; } public int RosesSpent { get; set; } public DateTimeOffset Date { get; set; } }
