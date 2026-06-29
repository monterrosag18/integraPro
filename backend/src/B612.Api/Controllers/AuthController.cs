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
                u.first_name,
                u.last_name,
                u.email,
                u.password_hash,
                u.role,
                u.status,
                c.name as campus_name,
                co.name as cohort_name,
                cl.name as clan_name,
                ce.name as cell_name
            from users u
            left join campuses c on c.id = u.campus_id
            left join coders coder on coder.user_id = u.id
            left join cohorts co on co.id = coder.cohort_id
            left join clans cl on cl.id = coder.clan_id
            left join lateral (
                select cells.name
                from cell_assignments ca
                join cells on cells.id = ca.cell_id
                join sprints s on s.id = ca.sprint_id
                where ca.coder_id = u.id
                order by s.start_date desc, s.number desc
                limit 1
            ) ce on true
            where lower(u.email) = lower(@email)
            limit 1;
            """);

        command.Parameters.AddWithValue("email", request.Email.Trim());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var passwordHash = reader.GetString(4);
        var status = reader.GetString(6);
        var isActive = string.Equals(status, "active", StringComparison.OrdinalIgnoreCase);
        var passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, passwordHash);

        if (!isActive || !passwordOk)
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var id = reader.GetGuid(0);
        var firstName = reader.GetString(1);
        var lastName = reader.GetString(2);
        var email = reader.GetString(3);
        var role = reader.GetString(5).ToLowerInvariant();
        var fullName = $"{firstName} {lastName}".Trim();

        return Ok(new LoginResponse(
            CreateSessionToken(),
            new AuthUser(
                id,
                fullName,
                email,
                role,
                RoleRoute(role),
                ReadNullableString(reader, 7),
                ReadNullableString(reader, 8),
                ReadNullableString(reader, 9),
                ReadNullableString(reader, 10))));
    }

    private static string CreateSessionToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string RoleRoute(string role) => role switch
    {
        "admin" => "/app/admin/talent-passport",
        "tl" => "/app/tl",
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
