using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Text;
using System.Text.Json;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/ai")]
public sealed class AiController(NpgsqlDataSource dataSource, IHttpClientFactory httpClientFactory, IConfiguration configuration) : ControllerBase
{
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request, CancellationToken cancellationToken)
    {
        var apiKey = configuration["Anthropic:ApiKey"] ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") ?? "";
        if (string.IsNullOrEmpty(apiKey))
            return Ok(new { response = "El asistente B612 AI aún no está activado. Pide al desarrollador que configure la clave ANTHROPIC_API_KEY en el servidor." });

        string contextData;
        try
        {
            await using var cmd = dataSource.CreateCommand("""
                select
                    (select count(*) from campuses) as campuses,
                    (select count(*) from cohorts) as cohorts,
                    (select count(*) from clans) as clans,
                    (select count(*) from cells) as cells,
                    (select count(*) from coders) as coders,
                    (select count(*) from users where lower(role) = 'tl') as tls,
                    (select count(*) from sprints where lower(status) = 'active') as active_sprints,
                    (select count(*) from projects) as projects,
                    (select count(*) from user_stories) as stories,
                    (select count(*) from user_stories where lower(kanban_status) = 'done') as done_stories;
                """);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                contextData = $"Datos en tiempo real: {reader.GetInt64(0)} campus activos, {reader.GetInt64(1)} cohortes, " +
                              $"{reader.GetInt64(2)} clanes, {reader.GetInt64(3)} células, {reader.GetInt64(4)} coders registrados, " +
                              $"{reader.GetInt64(5)} TLs, {reader.GetInt64(6)} sprints activos en este momento, " +
                              $"{reader.GetInt64(7)} proyectos totales, {reader.GetInt64(8)} historias de usuario " +
                              $"({reader.GetInt64(9)} completadas).";
            }
            else
            {
                contextData = "No se pudieron obtener datos del sistema en este momento.";
            }
        }
        catch
        {
            contextData = "No se pudo consultar la base de datos en este momento.";
        }

        var systemPrompt = $"""
            Eres B612 AI, el asistente inteligente de la plataforma educativa B612 Scrum Universe.

            CONTEXTO DE LA PLATAFORMA:
            B612 es una plataforma académica que utiliza metodología Scrum para formar programadores.
            - Campus: sedes físicas donde opera el programa
            - Cohortes: grupos de estudiantes por ciclo académico
            - Clanes: equipos grandes bajo la supervisión de un TL (Team Leader)
            - Células: sub-equipos dentro de un clan que trabajan en proyectos reales
            - Coders: estudiantes programadores
            - TL: Team Leader que supervisa y guía el proceso de aprendizaje
            - Sprints: ciclos de trabajo de 2 semanas con objetivos definidos
            - Historias de usuario: tareas con formato "Como [rol] quiero [acción] para que [beneficio]"
            - La Rosa: sistema de reconocimiento donde se premia a la célula o coder más destacado
            - Talent Passport: sistema de métricas de empleabilidad con 6 dimensiones y 24 KPIs

            {contextData}

            Responde siempre en español de manera concisa, útil y amigable para el administrador de la plataforma.
            Si te preguntan algo que no está en los datos, sugiere qué sección del panel revisar.
            Mantén respuestas bajo 200 palabras.
            """;

        var client = httpClientFactory.CreateClient();
        var payload = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 512,
            system = systemPrompt,
            messages = new[] { new { role = "user", content = request.Message } }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        httpRequest.Headers.Add("x-api-key", apiKey);
        httpRequest.Headers.Add("anthropic-version", "2023-06-01");
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var httpResponse = await client.SendAsync(httpRequest, cancellationToken);
        if (!httpResponse.IsSuccessStatusCode)
        {
            var err = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            Console.Error.WriteLine($"[AiController] Anthropic error {httpResponse.StatusCode}: {err}");
            return Ok(new { response = "El asistente no está disponible en este momento. Verifica la configuración de la API." });
        }

        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "Sin respuesta.";

        return Ok(new { response = text });
    }
}

public sealed record AiChatRequest(string Message);
