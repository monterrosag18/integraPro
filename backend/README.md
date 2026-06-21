# B612 Backend

Solución ASP.NET Core 8 organizada por responsabilidades:

- `B612.Domain`: entidades, invariantes y reglas del negocio.
- `B612.Application`: casos de uso y puertos de la aplicación.
- `B612.Infrastructure`: PostgreSQL, EF Core y servicios externos.
- `B612.Api`: entrada HTTP, autenticación y configuración.
- `B612.UnitTests`: pruebas del dominio y casos de uso.

La API depende de Application e Infrastructure; Infrastructure depende de Application y Domain; Domain no depende de ningún otro proyecto.
