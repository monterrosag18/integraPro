using B612.Domain.Common;

namespace B612.Domain.Evaluations;

public sealed class EvaluationCriterion
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public EvaluationScope Scope { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class Evaluation : Entity
{
    public Guid ProjectId { get; set; }
    public CeremonyType CeremonyType { get; set; }
    public Guid EvaluatorUserId { get; set; }
    public SubjectType SubjectType { get; set; }
    public Guid SubjectId { get; set; }
    public decimal? Weight { get; set; }
    public EvaluationType? EvaluationType { get; set; }
}

public sealed class EvaluationScore : Entity
{
    public Guid EvaluationId { get; set; }
    public int CriterionId { get; set; }
    public int Score { get; set; }
    public string? Comment { get; set; }
}

public enum EvaluationScope { Project, Person }
public enum CeremonyType { Review, Retrospective }
public enum SubjectType { Project, Coder }
public enum EvaluationType { Peer, Self }
