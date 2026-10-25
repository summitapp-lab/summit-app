# Summit

Gestor de tareas personal basado en GTD (Getting Things Done). Es una PWA: se abre en el navegador, se instala en la pantalla de inicio del iPhone y funciona sin conexión.

**Versión:** 1.3.0 · **Datos:** Supabase (esquema `summit` del proyecto DailyHabits) · **Web:** GitHub Pages

## Funciones

- Bandeja de entrada con procesado GTD en una sola pantalla (Hoy, Próxima acción, 2 minutos, Delegar, Algún día, Eliminar)
- Hoy, Próximos, Calendario, Próximas acciones por contexto, En espera, Algún día / Quizás, Registro
- Proyectos con secciones, vista de lista o tablero, objetivo, revisión periódica y proyectos compartidos con código
- Añadir rápido con `#proyecto`, `@contexto`, `!1`–`!4`, «hoy», «mañana», días de la semana y horas
- Fotos en las tareas (comprimidas en el dispositivo, guardadas en Supabase Storage)
- Enfoque (Pomodoro 25/5, 50/10, 90/15), Matriz Eisenhower, Revisión semanal y filtros guardados
- Estadísticas generales y por proyecto (racha, cumplimiento de fechas límite, lead time, burn-up)
- Atajos de iPhone y conector de Claude
- Sin conexión: copia local de los datos y cola de cambios que se sincroniza sola

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La aplicación |
| `config.js` | URL y clave publicable de Supabase (pública por diseño; la seguridad la ponen las reglas RLS) |
| `sw.js`, `manifest.webmanifest` | Funcionamiento sin conexión e instalación |
| `supabase.min.js`, `*.woff2`, `*.png`, `logo.svg` | Cliente de Supabase, tipografías e iconos, todos en la raíz |
| `supabase/fotos.sql` | Migración de fotos (ya aplicada) |
| `supabase/functions/summit-mcp/index.ts` | Copia del conector de Claude desplegado como Edge Function |

## Publicación

GitHub Pages: **Settings → Pages → Deploy from a branch → main → / (root)**.

En Supabase, **Authentication → URL Configuration**: la **Site URL** y las **Redirect URLs** deben apuntar a la dirección de GitHub Pages.

Al publicar una versión nueva, cambia el número en `app.js` (`APP_VERSION`), en los `?v=` de `index.html` y `sw.js`, y en `VERSION` de `sw.js`, para que los dispositivos descarguen la actualización.
