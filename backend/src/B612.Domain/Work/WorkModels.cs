using B612.Domain.Common;

namespace B612.Domain.Work;

public sealed class Project : Entity { public Guid SprintId { get; set; } public Guid CellId { get; set; } public string Name { get; set; } = string.Empty; public string? Description { get; set; } }
public sealed class Backlog : Entity { public Guid ProjectId { get; set; } }
public sealed class Board : Entity { public Guid ProjectId { get; set; } }

public sealed class UserStory : Entity
{
    public Guid BacklogId { get; set; }
    public Guid BoardId { get; set; }
    public string AsA { get; set; } = string.Empty;
    public string IWant { get; set; } = string.Empty;
    public string SoThat { get; set; } = string.Empty;
    public KanbanStatus KanbanStatus { get; set; }
    public Guid? AssigneeCoderId { get; set; }
    public int? Estimate { get; set; }
    public int? Priority { get; set; }
}

public sealed class GithubLink : Entity { public Guid ProjectId { get; set; } public string Url { get; set; } = string.Empty; public Guid AddedByUserId { get; set; } }

public sealed class Document : Entity
{
    public string Title { get; set; } = string.Empty;
    public string ContentMarkdown { get; set; } = string.Empty;
    public DocumentScope Scope { get; set; }
    public Guid ScopeId { get; set; }
    public Guid AuthorUserId { get; set; }
    public int Version { get; set; } = 1;
    public bool IsPublished { get; set; }
}

public enum KanbanStatus { Todo, InProgress, Review, Done }
public enum DocumentScope { Clan, Cell, Project }
