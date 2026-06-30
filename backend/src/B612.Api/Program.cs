using B612.Infrastructure;
using B612.Infrastructure.Persistence;
using B612.Api.BackgroundServices;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHostedService<SprintAutoCloseService>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

if (builder.Configuration.GetValue("Database:AutoMigrate", true))
{
    await app.Services.InitialiseDatabaseAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new
{
    service = "B612.Api",
    status = "healthy",
    timestamp = DateTimeOffset.UtcNow
}));

app.Run();
