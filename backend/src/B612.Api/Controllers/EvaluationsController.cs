using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace B612.Api.Controllers;

[ApiController]
[Route("api/evaluations")]
public sealed class EvaluationsController(NpgsqlDataSource dataSource) : ControllerBase
{
    [HttpGet("criteria")]
    public async Task<IActionResult> Criteria([FromQuery] string? scope, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select id, name, scope, active
            from evaluation_criteria
            where (@scope::text is null or scope = @scope::text)
            order by scope, id;
            """);
        command.Parameters.AddWithValue("scope", (object?)scope ?? DBNull.Value);

        var rows = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new { id = reader.GetInt32(0), name = reader.GetString(1), scope = reader.GetString(2), active = reader.GetBoolean(3) });
        }
        return Ok(new { criteria = rows });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEvaluationRequest request, CancellationToken cancellationToken)
    {
        var id = Guid.NewGuid();
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var command = new NpgsqlCommand("""
            insert into evaluations (id, ceremony_type, evaluator_user_id, project_id, user_id, weight, eval_type)
            values (@id, @ceremony_type, @evaluator_user_id, @project_id, @user_id, @weight, @eval_type);
            """, connection, transaction))
        {
            command.Parameters.AddWithValue("id", id);
            command.Parameters.AddWithValue("ceremony_type", request.CeremonyType);
            command.Parameters.AddWithValue("evaluator_user_id", request.EvaluatorUserId);
            command.Parameters.AddWithValue("project_id", request.ProjectId);
            command.Parameters.AddWithValue("user_id", (object?)request.SubjectCoderId ?? DBNull.Value);
            command.Parameters.AddWithValue("weight", (object?)request.Weight ?? DBNull.Value);
            command.Parameters.AddWithValue("eval_type", (object?)request.EvalType ?? DBNull.Value);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        foreach (var score in request.Scores)
        {
            await using var command = new NpgsqlCommand("""
                insert into evaluation_scores (id, evaluation_id, criterion_id, score, comment)
                values (@id, @evaluation_id, @criterion_id, @score, @comment);
                """, connection, transaction);
            command.Parameters.AddWithValue("id", Guid.NewGuid());
            command.Parameters.AddWithValue("evaluation_id", id);
            command.Parameters.AddWithValue("criterion_id", score.CriterionId);
            command.Parameters.AddWithValue("score", Math.Clamp(score.Score, 0, 5));
            command.Parameters.AddWithValue("comment", (object?)score.Comment ?? DBNull.Value);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return Ok(new { id, scores = request.Scores.Count });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] Guid? projectId, [FromQuery] Guid? coderId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            select
                ec.id,
                ec.name,
                ec.scope,
                round(avg(es.score)::numeric, 2) as avg_score,
                count(es.id) as responses
            from evaluation_scores es
            join evaluations ev on ev.id = es.evaluation_id
            join evaluation_criteria ec on ec.id = es.criterion_id
            where (@project_id::uuid is null or ev.project_id = @project_id)
              and (@coder_id::uuid is null or ev.user_id = @coder_id)
            group by ec.id, ec.name, ec.scope
            order by ec.scope, ec.id;
            """);
        command.Parameters.AddWithValue("project_id", (object?)projectId ?? DBNull.Value);
        command.Parameters.AddWithValue("coder_id", (object?)coderId ?? DBNull.Value);

        var rows = new List<object>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new
            {
                criterionId = reader.GetInt32(0),
                criterion = reader.GetString(1),
                scope = reader.GetString(2),
                average = reader.GetDecimal(3),
                responses = reader.GetInt64(4)
            });
        }

        return Ok(new { anonymous = true, criteria = rows });
    }
}

public sealed record CreateEvaluationRequest(
    string CeremonyType,
    Guid EvaluatorUserId,
    Guid ProjectId,
    Guid? SubjectCoderId,
    decimal? Weight,
    string? EvalType,
    List<EvaluationScoreRequest> Scores);

public sealed record EvaluationScoreRequest(int CriterionId, int Score, string? Comment);
