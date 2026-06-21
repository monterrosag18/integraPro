# B612 Frontend

Aplicación web construida con React 18, TypeScript y Vite.

## Organización

- `app`: configuración global, providers y rutas.
- `features`: funcionalidades aisladas por dominio.
- `pages`: composición de pantallas.
- `shared`: componentes, estilos, tipos y cliente HTTP reutilizables.

Las futuras funcionalidades deben añadirse dentro de `features` (`auth`, `rotations`, `boards`, `sprints`, `evaluations`, `documentation`) evitando concentrar lógica en las páginas.
