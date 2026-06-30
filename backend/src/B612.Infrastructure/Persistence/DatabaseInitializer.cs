using B612.Domain.Assignments;
using B612.Domain.Identity;
using B612.Domain.Organization;
using B612.Domain.Sprints;
using B612.Domain.Work;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace B612.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitialiseDatabaseAsync(this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<B612DbContext>();
        await db.Database.MigrateAsync();
        await EnsureClanResourcesTableAsync(db);
        await EnsureDemoAccessAsync(db);
        if (await db.Campuses.AnyAsync()) return;

        var campus = new Campus { Name = "Medellín" };
        var cohort = new Cohort { CampusId = campus.Id, Name = "Cohorte 6" };
        var clan = new Clan { CohortId = cohort.Id, Name = "Van Rossum" };
        var cells = new[] { "Cosmos", "B612", "Asteroide", "Zorro", "Rosa", "Volcán", "Desierto", "Estrella" }
            .Select(name => new Cell { ClanId = clan.Id, Name = name, Theme = "B612" }).ToArray();

        db.AddRange(campus, cohort, clan);
        db.Cells.AddRange(cells);

        var tl = new User { Email = "tl@b612.local", PasswordHash = "demo", FullName = "Alex R.", Role = UserRole.Tl };
        var admin = new User { Email = "admin@b612.local", PasswordHash = "demo", FullName = "Ana Admin", Role = UserRole.Admin };
        db.Users.AddRange(tl, admin);
        db.ClanTls.Add(new ClanTl { ClanId = clan.Id, UserId = tl.Id, TlType = TlType.Technical });

        var coderNames = new[] { "Laura M.", "Daniel R.", "Camila T.", "Andrés V.", "Sofía G.", "Mateo C.", "Valentina P.", "Samuel B." };
        foreach (var name in coderNames)
        {
            var user = new User { Email = $"{name.Replace(" ", string.Empty).Replace(".", string.Empty).ToLowerInvariant()}@b612.local", PasswordHash = "demo", FullName = name, Role = UserRole.Coder };
            db.Users.Add(user);
            db.Coders.Add(new Coder { UserId = user.Id, CohortId = cohort.Id });
        }

        var sprint = new Sprint { ClanId = clan.Id, Number = 1, StartDate = DateOnly.FromDateTime(DateTime.UtcNow), EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)), Status = SprintStatus.Active };
        db.Sprints.Add(sprint);
        foreach (var cell in cells.Take(4)) db.Projects.Add(new Project { SprintId = sprint.Id, CellId = cell.Id, Name = $"Proyecto {cell.Name}" });
        db.Documents.Add(new Document { Title = "README del Clan", ContentMarkdown = "# Bienvenidos a B612\n\nObjetivos y acuerdos del sprint.", Scope = DocumentScope.Clan, ScopeId = clan.Id, AuthorUserId = tl.Id, IsPublished = true });
        await db.SaveChangesAsync();
        await EnsureDemoAccessAsync(db);
    }

    private static async Task EnsureDemoAccessAsync(B612DbContext db)
    {
        const string demoPasswordHash = "$2a$11$40pwTrIEZbmPgIL4M3Vzr.JGXKIje1UES79Tocyy5X3pqvV9s86E6";

        var campus = await db.Campuses.FirstOrDefaultAsync()
            ?? Add(db, new Campus { Name = "Medellin" });
        var cohort = await db.Cohorts.FirstOrDefaultAsync()
            ?? Add(db, new Cohort { CampusId = campus.Id, Name = "Cohorte 6" });
        var clan = await db.Clans.FirstOrDefaultAsync()
            ?? Add(db, new Clan { CohortId = cohort.Id, Name = "Van Rossum" });
        var cell = await db.Cells.FirstOrDefaultAsync()
            ?? Add(db, new Cell { ClanId = clan.Id, Name = "B612", Theme = "B612" });
        var sprint = await db.Sprints.FirstOrDefaultAsync(s => s.ClanId == clan.Id && s.Status == SprintStatus.Active)
            ?? Add(db, new Sprint
            {
                ClanId = clan.Id,
                Number = 1,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                EndDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
                Status = SprintStatus.Active
            });

        var tl = await UpsertDemoUser(db, "tl.demo@b612.dev", "Alex TL", UserRole.Tl, demoPasswordHash);
        var coder = await UpsertDemoUser(db, "coder.demo@b612.dev", "Camila Coder", UserRole.Coder, demoPasswordHash);
        var leader = await UpsertDemoUser(db, "lider.demo@b612.dev", "Laura Lider", UserRole.Coder, demoPasswordHash);
        await UpsertDemoUser(db, "admin.demo@b612.dev", "Ana Admin", UserRole.Admin, demoPasswordHash);

        if (!await db.ClanTls.AnyAsync(x => x.ClanId == clan.Id && x.UserId == tl.Id))
        {
            db.ClanTls.Add(new ClanTl { ClanId = clan.Id, UserId = tl.Id, TlType = TlType.Technical });
        }

        await EnsureCoder(db, coder.Id, cohort.Id);
        await EnsureCoder(db, leader.Id, cohort.Id);
        await EnsureAssignment(db, sprint.Id, cell.Id, coder.Id, CellRole.Rotator);
        await EnsureAssignment(db, sprint.Id, cell.Id, leader.Id, CellRole.Leader);

        await db.SaveChangesAsync();
    }

    private static async Task EnsureClanResourcesTableAsync(B612DbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS clan_resources (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                clan_id UUID NOT NULL,
                type VARCHAR(30) NOT NULL,
                url TEXT NOT NULL,
                label TEXT,
                added_by_user_id UUID NOT NULL,
                added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_clan_resources_clan ON clan_resources (clan_id);
            """);
    }

    private static T Add<T>(B612DbContext db, T entity) where T : class
    {
        db.Add(entity);
        return entity;
    }

    private static async Task<User> UpsertDemoUser(B612DbContext db, string email, string fullName, UserRole role, string passwordHash)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is not null)
        {
            user.FullName = fullName;
            user.PasswordHash = passwordHash;
            user.Role = role;
            user.Status = UserStatus.Active;
            return user;
        }

        user = new User
        {
            Email = email,
            FullName = fullName,
            PasswordHash = passwordHash,
            Role = role,
            Status = UserStatus.Active
        };
        db.Users.Add(user);
        return user;
    }

    private static async Task EnsureCoder(B612DbContext db, Guid userId, Guid cohortId)
    {
        if (await db.Coders.AnyAsync(x => x.UserId == userId)) return;
        db.Coders.Add(new Coder { UserId = userId, CohortId = cohortId });
    }

    private static async Task EnsureAssignment(B612DbContext db, Guid sprintId, Guid cellId, Guid coderId, CellRole role)
    {
        if (await db.Set<CellAssignment>().AnyAsync(x => x.SprintId == sprintId && x.CoderId == coderId)) return;
        db.Set<CellAssignment>().Add(new CellAssignment(sprintId, cellId, coderId, role));
    }
}
