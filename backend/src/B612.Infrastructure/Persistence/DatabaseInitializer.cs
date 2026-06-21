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
    }
}
