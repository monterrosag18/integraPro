using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace B612.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCellAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cell_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SprintId = table.Column<Guid>(type: "uuid", nullable: false),
                    CellId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cell_assignments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cell_assignments_SprintId_CellId",
                table: "cell_assignments",
                columns: new[] { "SprintId", "CellId" });

            migrationBuilder.CreateIndex(
                name: "IX_cell_assignments_SprintId_CoderId",
                table: "cell_assignments",
                columns: new[] { "SprintId", "CoderId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cell_assignments");
        }
    }
}
