# Summit

Gestor de tareas personal basado en GTD (Getting Things Done). Es una PWA: se abre en el navegador, se instala en la pantalla de inicio del iPhone y funciona sin conexión.

**Versión:** 1.4.1 · **Datos:** Supabase (proyecto «Summit» de la organización summitapp-lab) · **Web:** GitHub Pages

## Funciones

- Bandeja de entrada con procesado GTD en una sola pantalla (Hoy, Próxima acción, 2 minutos, Delegar, Algún día, Eliminar)
- Hoy, Próximos, Calendario, Próximas acciones por contexto, En espera, Algún día / Quizás, Registro
- Proyectos con secciones, vista de lista o tablero, objetivo, revisión periódica y proyectos compartidos con código
- Añadir rápido con la sintaxis de Todoist: `#proyecto`, `/sección`, `@contexto` o `%contexto`, `+persona`, `p1`–`p4`, `{fecha límite}`, fechas en lenguaje natural («mañana 10:00», «el viernes», «3/11», «en 5 días») y sugerencias mientras se escribe
- Atajos de teclado de Todoist sobre la tarea creada o seleccionada (`T`, `Shift+T`, `V`, `Y`, `1`–`4`, `L`, `Shift+R`, `E`, `Enter`) y de navegación (`Q`, `M`, `J/K`, `/`, `G` → `I/T/U/P`); `?` muestra la lista completa
- Menú lateral que se puede fijar en PC (botón del menú o tecla `M`)
- Tutorial en Ajustes: 22 capítulos en 5 partes, con progreso de lectura sincronizado y acceso directo a cada sección
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
| `supabase/schema.sql` | Esquema completo: tablas, seguridad RLS, funciones de la app, atajos, tiempo real y fotos (ya aplicado) |
| `supabase/claude.sql` | Lógica del conector de Claude (ya aplicada) |
| `supabase/functions/summit-mcp/index.ts` | Conector de Claude, desplegado como Edge Function con «Verify JWT» desactivado |

Para montar Summit en otro proyecto de Supabase: aplica `schema.sql` y después `claude.sql` en el SQL Editor, despliega la función `summit-mcp` y cambia la URL y la clave publicable en `config.js`.

## Publicación

GitHub Pages: **Settings → Pages → Deploy from a branch → main → / (root)**.

En Supabase, **Authentication → URL Configuration**: la **Site URL** y las **Redirect URLs** deben apuntar a la dirección de GitHub Pages.

Al publicar una versión nueva, cambia el número en `app.js` (`APP_VERSION`), en los `?v=` de `index.html` y `sw.js`, y en `VERSION` de `sw.js`, para que los dispositivos descarguen la actualización.
