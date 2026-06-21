using B612.Domain.Common;

namespace B612.Domain.Identity;

public sealed class User : Entity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserStatus Status { get; set; } = UserStatus.Active;
    public UserRole Role { get; set; }
}

public sealed class Coder
{
    public Guid UserId { get; set; }
    public Guid CohortId { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
}

public sealed class ClanTl : Entity
{
    public Guid ClanId { get; set; }
    public Guid UserId { get; set; }
    public TlType TlType { get; set; }
}

public enum UserRole { Admin, Tl, Coder }
public enum UserStatus { Active, Inactive }
public enum TlType { Technical, English, LifeSkills }
