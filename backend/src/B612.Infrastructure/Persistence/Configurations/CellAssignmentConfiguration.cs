using B612.Domain.Assignments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace B612.Infrastructure.Persistence.Configurations;

public sealed class CellAssignmentConfiguration : IEntityTypeConfiguration<CellAssignment>
{
    public void Configure(EntityTypeBuilder<CellAssignment> builder)
    {
        builder.ToTable("cell_assignments");
        builder.HasKey(assignment => assignment.Id);
        builder.Property(assignment => assignment.Role).HasConversion<string>().HasMaxLength(16);
        builder.Property(assignment => assignment.Status).HasConversion<string>().HasMaxLength(16);
        builder.HasIndex(assignment => new { assignment.SprintId, assignment.CoderId }).IsUnique();
        builder.HasIndex(assignment => new { assignment.SprintId, assignment.CellId });
    }
}
