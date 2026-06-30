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
        var apiKey = configuration["OpenAI:ApiKey"] ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY") ?? "";
        if (string.IsNullOrEmpty(apiKey))
            return Ok(new { response = "El asistente B612 AI aún no está activado. Configura OPENAI_API_KEY en el servidor." });

        var ctx = await BuildContextAsync(cancellationToken);

        var systemPrompt =
            "Eres un asistente EXCLUSIVAMENTE de analitica del programa B612. " +
            "SOLO puedes responder preguntas sobre los datos de este dashboard: scores, dimensiones, coders, celulas, tiers y tendencias. " +
            "Si el usuario pregunta algo que NO sea sobre los datos de B612 (religion, historia, recetas, codigo, noticias, etc.), " +
            "responde UNICAMENTE: \"Solo puedo responder preguntas sobre los datos del dashboard B612.\" y no digas nada mas. " +
            $"Contexto actual: {ctx} " +
            "Responde en espanol, max 120 palabras. Pon nombres de coders entre [brackets].";

        // Build message list: system + last 6 history turns + current user message
        var messages = new List<object> { new { role = "system", content = systemPrompt } };
        if (request.History is { Count: > 0 })
        {
            foreach (var h in request.History.TakeLast(6))
                messages.Add(new { role = h.Role, content = h.Content });
        }
        messages.Add(new { role = "user", content = request.Message });

        var payload = new
        {
            model = "gpt-4o-mini",
            max_tokens = 300,
            temperature = 0.7,
            messages
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var client = httpClientFactory.CreateClient();
        using var httpResponse = await client.SendAsync(httpRequest, cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            var err = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            Console.Error.WriteLine($"[AiController] OpenAI error {httpResponse.StatusCode}: {err}");
            return Ok(new { response = "El asistente no está disponible en este momento. Verifica la configuración de la API." });
        }

        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var text = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "Sin respuesta.";

        return Ok(new { response = text });
    }

    // ── Context builder ───────────────────────────────────────────────────────

    private async Task<string> BuildContextAsync(CancellationToken ct)
    {
        try
        {
            await using var cmd = dataSource.CreateCommand("""
                with latest_assignment as (
                    select distinct on (ca.coder_id)
                        ca.coder_id, ca.cell_id
                    from cell_assignments ca
                    join sprints s on s.id = ca.sprint_id
                    order by ca.coder_id, s.start_date desc, s.number desc
                ),
                story_points as (
                    select assignee_coder_id as coder_id,
                        count(*) as stories,
                        coalesce(sum(coalesce(estimate,1)),0) as total_points,
                        coalesce(sum(case when lower(kanban_status)='done' then coalesce(estimate,1) else 0 end),0) as done_points,
                        count(*) filter (where lower(kanban_status)='done') as done_stories
                    from user_stories where assignee_coder_id is not null
                    group by assignee_coder_id
                ),
                eval_stats as (
                    select ev.user_id as coder_id,
                        count(es.id) as evaluation_scores,
                        coalesce(avg(es.score),0) as avg_eval
                    from evaluations ev
                    left join evaluation_scores es on es.evaluation_id = ev.id
                    where ev.user_id is not null
                    group by ev.user_id
                ),
                rose_stats as (
                    select cr.coder_id, count(distinct cr.id) as roses
                    from coder_roses cr group by cr.coder_id
                ),
                redemption_stats as (
                    select pr.coder_id,
                        count(distinct pr.id) as redemptions,
                        coalesce(sum(pr.roses_spent),0) as roses_spent
                    from prize_redemptions pr group by pr.coder_id
                ),
                assignment_stats as (
                    select ca.coder_id,
                        count(*) as assignments,
                        count(distinct ca.sprint_id) as sprints,
                        count(distinct ca.cell_id) as cells_worked,
                        count(*) filter (where lower(ca.role_in_cell)='leader') as leader_runs,
                        count(*) filter (where lower(ca.status)='confirmed') as confirmed_assignments
                    from cell_assignments ca group by ca.coder_id
                ),
                scored as (
                    select
                        trim(concat_ws(' ', u.first_name, u.last_name)) as name,
                        coalesce(ce.name,'Sin celula') as cell,
                        case when coalesce(es.evaluation_scores,0)>0 then round(es.avg_eval*20,1) else 0 end as d_tech,
                        case when coalesce(sp.stories,0)>0 then round(((sp.done_stories::numeric/sp.stories)*65)+least(35,sp.done_points*3),1) else 0 end as d_del,
                        least(100,round((least(3,coalesce(ast.cells_worked,0))*16)+(least(3,coalesce(ast.leader_runs,0))*12)+(least(4,coalesce(rs.roses,0))*4),1)) as d_col,
                        least(100,round((least(4,coalesce(ast.sprints,0))*18)+case when coalesce(ast.assignments,0)>0 then 18 else 0 end+case when coalesce(ast.confirmed_assignments,0)>0 then 10 else 0 end,1)) as d_pro,
                        least(100,round((least(5,coalesce(rs.roses,0))*12)+(least(3,coalesce(red.redemptions,0))*10)+(least(30,coalesce(red.roses_spent,0))*1),1)) as d_ach,
                        least(100,round((least(4,coalesce(ast.sprints,0))*14)+(least(3,coalesce(ast.cells_worked,0))*10)+case when coalesce(sp.stories,0)>0 and coalesce(sp.done_stories,0)>0 then 18 else 0 end,1)) as d_ci
                    from users u
                    join coders coder on coder.user_id = u.id
                    left join latest_assignment la on la.coder_id = u.id
                    left join cells ce on ce.id = la.cell_id
                    left join story_points sp on sp.coder_id = u.id
                    left join eval_stats es on es.coder_id = u.id
                    left join rose_stats rs on rs.coder_id = u.id
                    left join redemption_stats red on red.coder_id = u.id
                    left join assignment_stats ast on ast.coder_id = u.id
                    where lower(u.role)='coder'
                ),
                final as (
                    select name, cell, d_tech, d_del, d_col, d_pro, d_ach, d_ci,
                        round((d_tech*0.30)+(d_del*0.20)+(d_col*0.15)+(d_pro*0.10)+(d_ach*0.10)+(d_ci*0.15),1) as score
                    from scored
                )
                select name, cell, score,
                    round(d_tech,1) as d_tech, round(d_del,1) as d_del, round(d_col,1) as d_col,
                    round(d_pro,1) as d_pro, round(d_ach,1) as d_ach, round(d_ci,1) as d_ci,
                    case when score>=75 then 'Alto' when score>=45 then 'Medio' else 'Bajo' end as tier
                from final
                order by score desc;
                """);

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            var rows = new List<(string Name, string Cell, decimal Score, decimal DTech, decimal DDel, decimal DCol, decimal DPro, decimal DAch, decimal DCi, string Tier)>();

            while (await reader.ReadAsync(ct))
            {
                rows.Add((
                    reader.GetString(0), reader.GetString(1), reader.GetDecimal(2),
                    reader.GetDecimal(3), reader.GetDecimal(4), reader.GetDecimal(5),
                    reader.GetDecimal(6), reader.GetDecimal(7), reader.GetDecimal(8),
                    reader.GetString(9)
                ));
            }

            if (rows.Count == 0) return "No hay datos de coders disponibles.";

            var n       = rows.Count;
            var avg     = Math.Round((double)rows.Average(r => r.Score), 1);
            var alto    = rows.Count(r => r.Tier == "Alto");
            var medio   = rows.Count(r => r.Tier == "Medio");
            var bajo    = rows.Count(r => r.Tier == "Bajo");
            var top5    = string.Join("|", rows.Take(5).Select(r => $"{r.Name}({r.Cell}):{r.Score}"));
            var bot5    = string.Join("|", rows.TakeLast(5).Reverse().Select(r => $"{r.Name}({r.Cell}):{r.Score}"));
            var dimAvg  = $"{{Technical:{Math.Round((double)rows.Average(r => r.DTech), 1)}," +
                          $"Delivery:{Math.Round((double)rows.Average(r => r.DDel), 1)}," +
                          $"Collaboration:{Math.Round((double)rows.Average(r => r.DCol), 1)}," +
                          $"Professional:{Math.Round((double)rows.Average(r => r.DPro), 1)}," +
                          $"Achievements:{Math.Round((double)rows.Average(r => r.DAch), 1)}," +
                          $"Improvement:{Math.Round((double)rows.Average(r => r.DCi), 1)}}}";

            return $"Fecha:{DateTime.UtcNow:yyyy-MM-dd} n={n} avg={avg} " +
                   $"Alto={alto} Medio={medio} Bajo={bajo} " +
                   $"top5={top5} bot5={bot5} dims={dimAvg}";
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[AiController] BuildContext error: {ex.Message}");
            return "No se pudo consultar la base de datos en este momento.";
        }
    }
}

public sealed record AiChatRequest(string Message, List<ChatHistoryMessage>? History = null);
public sealed record ChatHistoryMessage(string Role, string Content);
