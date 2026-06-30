using Amazon.S3;
using Amazon.S3.Model;
using System.Text;
using System.Text.Json;

namespace B612.Api.Services;

/// <summary>
/// Reads pre-computed Employment Score data from the S3 curated Parquet layer
/// produced by the B612 Glue ETL pipeline.
///
/// S3 path: s3://{bucket}/curated/kpis/employment_score/fact_employment_score/exec_date=YYYY-MM-DD/
/// Credentials: AWS default provider chain (env vars, ~/.aws/credentials, IAM role).
/// </summary>
public sealed class S3TalentPassportService(IConfiguration configuration, ILogger<S3TalentPassportService> logger)
{
    private const string BasePrefix = "curated/kpis/employment_score/fact_employment_score/";

    private readonly string _bucket = configuration["AWS:S3Bucket"] ?? "";
    private readonly string _region = configuration["AWS:Region"] ?? "us-east-1";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_bucket);

    public async Task<S3TalentPassportResult> ReadLatestAsync(CancellationToken ct = default)
    {
        using var s3 = new AmazonS3Client(Amazon.RegionEndpoint.GetBySystemName(_region));

        var latestPrefix = await FindLatestPartitionAsync(s3, ct);
        if (latestPrefix is null)
        {
            logger.LogWarning("[S3] No exec_date= partition found under {Prefix}", BasePrefix);
            return S3TalentPassportResult.Empty;
        }

        var keys = await ListParquetKeysAsync(s3, latestPrefix, ct);
        if (keys.Count == 0)
        {
            logger.LogWarning("[S3] No Parquet files found in partition {Partition}", latestPrefix);
            return S3TalentPassportResult.Empty;
        }

        var coders = new List<S3CoderRow>();
        foreach (var key in keys)
        {
            var rows = await SelectFromParquetAsync(s3, key, ct);
            coders.AddRange(rows);
        }

        var execDate = latestPrefix.Contains("exec_date=")
            ? latestPrefix.Split("exec_date=")[1].TrimEnd('/')
            : "";

        logger.LogInformation("[S3] Loaded {Count} coder records from exec_date={Date}", coders.Count, execDate);
        return new S3TalentPassportResult(coders, execDate);
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private async Task<string?> FindLatestPartitionAsync(IAmazonS3 s3, CancellationToken ct)
    {
        var response = await s3.ListObjectsV2Async(new ListObjectsV2Request
        {
            BucketName = _bucket,
            Prefix = BasePrefix,
            Delimiter = "/"
        }, ct);

        return response.CommonPrefixes
            .Where(p => p.Contains("exec_date="))
            .OrderByDescending(p => p)
            .FirstOrDefault();
    }

    private async Task<List<string>> ListParquetKeysAsync(IAmazonS3 s3, string prefix, CancellationToken ct)
    {
        var response = await s3.ListObjectsV2Async(new ListObjectsV2Request
        {
            BucketName = _bucket,
            Prefix = prefix
        }, ct);

        return response.S3Objects
            .Where(o => o.Key.EndsWith(".parquet", StringComparison.OrdinalIgnoreCase))
            .Select(o => o.Key)
            .ToList();
    }

    private async Task<List<S3CoderRow>> SelectFromParquetAsync(IAmazonS3 s3, string key, CancellationToken ct)
    {
        var request = new SelectObjectContentRequest
        {
            BucketName = _bucket,
            Key = key,
            ExpressionType = ExpressionType.SQL,
            Expression = """
                SELECT coder_id, first_name, last_name, email,
                       cohort_name, campus_name,
                       d_technical, d_delivery, d_collab,
                       d_professional, d_achievement, d_ci,
                       employment_score, employability_level
                FROM S3Object
                """,
            InputSerialization = new InputSerialization { Parquet = new ParquetInput() },
            OutputSerialization = new OutputSerialization
            {
                JSON = new JSONOutput { RecordDelimiter = "\n" }
            }
        };

        var response = await s3.SelectObjectContentAsync(request, ct);
        var sb = new StringBuilder();

        response.Payload.RecordsEventReceived += (_, args) =>
        {
            using var sr = new StreamReader(args.EventStreamEvent.Payload);
            sb.Append(sr.ReadToEnd());
        };

        await response.Payload.StartProcessingAsync();

        var results = new List<S3CoderRow>();
        foreach (var line in sb.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            try
            {
                var row = JsonSerializer.Deserialize<S3CoderRow>(line, JsonOpts);
                if (row is not null) results.Add(row);
            }
            catch (Exception ex)
            {
                logger.LogDebug("[S3] Skipped malformed row in {Key}: {Error}", key, ex.Message);
            }
        }

        return results;
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
}

public sealed record S3CoderRow(
    string? coder_id,
    string? first_name,
    string? last_name,
    string? email,
    string? cohort_name,
    string? campus_name,
    double d_technical,
    double d_delivery,
    double d_collab,
    double d_professional,
    double d_achievement,
    double d_ci,
    double employment_score,
    string? employability_level
);

public sealed record S3TalentPassportResult(IReadOnlyList<S3CoderRow> Coders, string ExecDate)
{
    public static readonly S3TalentPassportResult Empty = new([], "");
}
