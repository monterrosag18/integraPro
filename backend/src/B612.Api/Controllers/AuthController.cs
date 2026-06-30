using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Correo y contraseña son obligatorios." });
        }

        await using var command = dataSource.CreateCommand("""
            select
                u.id,
                trim(concat_ws(' ', u.first_name, u.last_name)) as full_name,
                u.email,
                u.password_hash,
                u.role,
                u.status,
                campus.name as campus_name,
                cohort.name as cohort_name,
                coalesce(latest_cell.clan_name, tl_clan.name) as clan_name,
                latest_cell.cell_name,
                latest_cell.role_in_cell
            from users u
            left join coders coder on coder.user_id = u.id
            left join cohorts cohort on cohort.id = coder.cohort_id
            left join campuses campus on campus.id = cohort.campus_id
            left join clan_tl ct on ct.user_id = u.id
            left join clans tl_clan on tl_clan.id = ct.clan_id
            left join lateral (
                select
                    cells.name as cell_name,
                    clans.name as clan_name,
                    ca.role_in_cell
                from cell_assignments ca
                join cells on cells.id = ca.cell_id
                join clans on clans.id = cells.clan_id
                join sprints s on s.id = ca.sprint_id
                where ca.coder_id = u.id
                order by s.start_date desc, s.number desc
                limit 1
            ) latest_cell on true
            where lower(u.email) = lower(@email)
            limit 1;
            """);

        command.Parameters.AddWithValue("email", request.Email.Trim());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var passwordHash = reader.GetString(3);
        var status = reader.GetString(5);
        var isActive = string.Equals(status, "active", StringComparison.OrdinalIgnoreCase);
        var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, passwordHash);

        if (!isActive || !passwordOk)
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var id = reader.GetGuid(0);
        var fullName = reader.GetString(1);
        var email = reader.GetString(2);
        var role = reader.GetString(4).ToLowerInvariant();
        var roleInCell = ReadNullableString(reader, 10)?.ToLowerInvariant();

        return Ok(new LoginResponse(
            CreateSessionToken(),
            new AuthUser(
                id,
                fullName,
                email,
                role,
                RoleRoute(role, roleInCell),
                ReadNullableString(reader, 6),
                ReadNullableString(reader, 7),
                ReadNullableString(reader, 8),
                ReadNullableString(reader, 9))));
    }

    [HttpPost("dev/seed-passwords")]
    public async Task<IActionResult> SeedPasswords([FromQuery] string key, CancellationToken cancellationToken)
    {
        if (key != "b612-seed-2026") return Forbid();
        const string hash = "$2a$11$40pwTrIEZbmPgIL4M3Vzr.JGXKIje1UES79Tocyy5X3pqvV9s86E6";
        await using var cmd = dataSource.CreateCommand("UPDATE users SET password_hash = @hash WHERE password_hash IS NULL OR password_hash != @hash");
        cmd.Parameters.AddWithValue("hash", hash);
        var updated = await cmd.ExecuteNonQueryAsync(cancellationToken);
        return Ok(new { updated, password = "B612Demo2026!" });
    }

    private static string CreateSessionToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string RoleRoute(string role, string? roleInCell) => role switch
    {
        "admin" => "/app/admin/talent-passport",
        "tl" => "/app/tl",
        "coder" when roleInCell == "leader" => "/app/coder",
        "coder" => "/app/coder",
        _ => "/app/coder"
    };

    private static string? ReadNullableString(NpgsqlDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
}

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(string SessionToken, AuthUser User);

public sealed record AuthUser(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    string HomePath,
    string? Campus,
    string? Cohort,
    string? Clan,
    string? Cell);
