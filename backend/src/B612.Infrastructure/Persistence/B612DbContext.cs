using B612.Application.Abstractions.Persistence;
using B612.Domain.Assignments;
using B612.Domain.Ceremonies;
using B612.Domain.Evaluations;
using B612.Domain.Gamification;
using B612.Domain.Identity;
using B612.Domain.Organization;
using B612.Domain.Sprints;
using B612.Domain.Work;
using Microsoft.EntityFrameworkCore;

namespace B612.Infrastructure.Persistence;

public sealed class B612DbContext(DbContextOptions<B612DbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public IQueryable<CellAssignment> CellAssignments => Set<CellAssignment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Coder> Coders => Set<Coder>();
    public DbSet<ClanTl> ClanTls => Set<ClanTl>();
    public DbSet<Campus> Campuses => Set<Campus>();
    public DbSet<Cohort> Cohorts => Set<Cohort>();
    public DbSet<Clan> Clans => Set<Clan>();
    public DbSet<Cell> Cells => Set<Cell>();
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<RotationRun> RotationRuns => Set<RotationRun>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Backlog> Backlogs => Set<Backlog>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<UserStory> UserStories => Set<UserStory>();
    public DbSet<Planning> Plannings => Set<Planning>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Retrospective> Retrospectives => Set<Retrospective>();
    public DbSet<GithubLink> GithubLinks => Set<GithubLink>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<EvaluationCriterion> EvaluationCriteria => Set<EvaluationCriterion>();
    public DbSet<Evaluation> Evaluations => Set<Evaluation>();
    public DbSet<EvaluationScore> EvaluationScores => Set<EvaluationScore>();
    public DbSet<Rose> Roses => Set<Rose>();
    public DbSet<CoderRose> CoderRoses => Set<CoderRose>();
    public DbSet<Prize> Prizes => Set<Prize>();
    public DbSet<PrizeRedemption> PrizeRedemptions => Set<PrizeRedemption>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(B612DbContext).Assembly);
        ConfigureIdentity(modelBuilder);
        ConfigureOrganization(modelBuilder);
        ConfigureWork(modelBuilder);
        ConfigureCeremoniesAndEvaluation(modelBuilder);
        ConfigureGamification(modelBuilder);
    }

    private static void ConfigureIdentity(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b => { b.ToTable("users"); b.HasIndex(x => x.Email).IsUnique(); b.Property(x => x.Role).HasConversion<string>(); b.Property(x => x.Status).HasConversion<string>(); });
        modelBuilder.Entity<Coder>(b => { b.ToTable("coders"); b.HasKey(x => x.UserId); b.HasOne<User>().WithOne().HasForeignKey<Coder>(x => x.UserId).OnDelete(DeleteBehavior.Cascade); b.HasOne<Cohort>().WithMany().HasForeignKey(x => x.CohortId); });
        modelBuilder.Entity<ClanTl>(b => { b.ToTable("clan_tl"); b.Property(x => x.TlType).HasConversion<string>(); b.HasIndex(x => new { x.ClanId, x.UserId, x.TlType }).IsUnique(); });
    }

    private static void ConfigureOrganization(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Campus>().ToTable("campuses");
        modelBuilder.Entity<Cohort>(b => { b.ToTable("cohorts"); b.HasOne<Campus>().WithMany().HasForeignKey(x => x.CampusId); });
        modelBuilder.Entity<Clan>(b => { b.ToTable("clans"); b.HasOne<Cohort>().WithMany().HasForeignKey(x => x.CohortId); });
        modelBuilder.Entity<Cell>(b => { b.ToTable("cells"); b.HasOne<Clan>().WithMany().HasForeignKey(x => x.ClanId); b.HasIndex(x => new { x.ClanId, x.Name }).IsUnique(); });
        modelBuilder.Entity<Sprint>(b => { b.ToTable("sprints"); b.Property(x => x.Status).HasConversion<string>(); b.HasIndex(x => new { x.ClanId, x.Number }).IsUnique(); });
        modelBuilder.Entity<RotationRun>(b => { b.ToTable("rotation_runs"); b.Property(x => x.Status).HasConversion<string>(); });
    }

    private static void ConfigureWork(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(b => { b.ToTable("projects"); b.HasIndex(x => new { x.SprintId, x.CellId }).IsUnique(); });
        modelBuilder.Entity<Backlog>(b => { b.ToTable("backlogs"); b.HasIndex(x => x.ProjectId).IsUnique(); });
        modelBuilder.Entity<Board>(b => { b.ToTable("boards"); b.HasIndex(x => x.ProjectId).IsUnique(); });
        modelBuilder.Entity<UserStory>(b => { b.ToTable("user_stories"); b.Property(x => x.KanbanStatus).HasConversion<string>(); b.HasIndex(x => new { x.BoardId, x.KanbanStatus }); });
        modelBuilder.Entity<GithubLink>().ToTable("github_links");
        modelBuilder.Entity<Document>(b => { b.ToTable("documents"); b.Property(x => x.Scope).HasConversion<string>(); b.HasIndex(x => new { x.Scope, x.ScopeId, x.Version }); });
    }

    private static void ConfigureCeremoniesAndEvaluation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Planning>(b => { b.ToTable("plannings"); b.Property(x => x.Status).HasConversion<string>(); b.HasIndex(x => x.ProjectId).IsUnique(); });
        modelBuilder.Entity<Review>(b => { b.ToTable("reviews"); b.Property(x => x.Status).HasConversion<string>(); b.HasIndex(x => x.ProjectId).IsUnique(); });
        modelBuilder.Entity<Retrospective>(b => { b.ToTable("retrospectives"); b.Property(x => x.Status).HasConversion<string>(); b.HasIndex(x => x.ProjectId).IsUnique(); });
        modelBuilder.Entity<EvaluationCriterion>(b => { b.ToTable("evaluation_criteria"); b.Property(x => x.Scope).HasConversion<string>(); });
        modelBuilder.Entity<Evaluation>(b => { b.ToTable("evaluations"); b.Property(x => x.CeremonyType).HasConversion<string>(); b.Property(x => x.SubjectType).HasConversion<string>(); b.Property(x => x.EvaluationType).HasConversion<string>(); });
        modelBuilder.Entity<EvaluationScore>(b => { b.ToTable("evaluation_scores"); b.HasIndex(x => new { x.EvaluationId, x.CriterionId }).IsUnique(); b.ToTable(t => t.HasCheckConstraint("ck_evaluation_score_range", "\"Score\" >= 0 AND \"Score\" <= 5")); });
    }

    private static void ConfigureGamification(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Rose>(b => { b.ToTable("roses"); b.HasIndex(x => x.SprintId).IsUnique(); });
        modelBuilder.Entity<CoderRose>(b => { b.ToTable("coder_roses"); b.HasIndex(x => new { x.CoderId, x.RoseId }).IsUnique(); });
        modelBuilder.Entity<Prize>().ToTable("prizes");
        modelBuilder.Entity<PrizeRedemption>().ToTable("prize_redemptions");
    }
}
