# Summit

Gestor de tareas personal basado en GTD (Getting Things Done). Es una PWA: se abre en el navegador, se instala en la pantalla de inicio del iPhone y funciona sin conexión.

**Versión:** 1.8.0 · **Datos:** Supabase (proyecto «Summit» de la organización summitapp-lab) · **Web:** GitHub Pages

## Funciones

- Bandeja de entrada con procesado GTD en una sola pantalla (Hoy, Próxima acción, 2 minutos, Delegar, Algún día, Eliminar), y botón Procesar también en Hoy, Próximos, Calendario, Próximas acciones, En espera, Algún día, contextos, filtros, proyectos y Matriz (con «Saltar»)
- Apertura instantánea: la app se dibuja desde la copia del dispositivo (service worker cache-first) y la sesión y los datos se actualizan en segundo plano
- Hoy, Próximos, Calendario, Próximas acciones por contexto, En espera, Algún día / Quizás, Registro
- Proyectos con secciones, vista de lista o tablero, objetivo, revisión periódica y proyectos compartidos con código
- Secciones a mano dentro del proyecto: «Añadir sección» al final, tocar el nombre para renombrar y ⋯ para mover, añadir debajo o eliminar (con deshacer)
- Proyectos privados: sus tareas se ven difuminadas en todas las vistas hasta pulsar el ojo; se vuelven a ocultar al cambiar de pantalla o salir de la app
- Añadir rápido con la sintaxis de Todoist: `#proyecto`, `/sección`, `@contexto` o `%contexto`, `+persona`, `p1`–`p4`, `{fecha límite}`, fechas en lenguaje natural («mañana 10:00», «el viernes», «3/11», «en 5 días») y sugerencias mientras se escribe
- Delegar al crear o editar una tarea: chip «Delegar» al crear, fila «Delegada a» en el detalle y `>persona` al escribir (`>Ana_López` para nombres con espacio). Se escribe el nombre o se elige uno de los recientes; la tarea pasa a En espera con la fecha de inicio. Teclas: `W` sobre la tarea seleccionada o abierta y `Alt + W` mientras se escribe
- Atajos de teclado de Todoist sobre la tarea creada o seleccionada (`T`, `Shift+T`, `V`, `Y`, `1`–`4`, `L`, `Shift+R`, `W`, `E`, `Enter`) y de navegación (`Q`, `M`, `J/K`, `/`, `G` → `I/T/U/P`); `?` muestra la lista completa
- Menú lateral que se puede fijar en PC (botón del menú o tecla `M`)
- Tutorial en Ajustes: 8 recorridos guiados e interactivos (resaltan el botón en la propia app; se sale con la ✕ o Esc), con progreso sincronizado
- Fotos en las tareas (comprimidas en el dispositivo, guardadas en Supabase Storage)
- Enfoque (Pomodoro 25/5, 50/10, 90/15), Revisión semanal y filtros guardados
- Matriz Eisenhower a mano: bandeja «Por clasificar», arrastrar entre cuadrantes (mantener pulsado en el móvil), botón ▦ para mover con un toque y teclas `1`–`4`. El botón «Clasificar» abre una tarea cada vez con cuatro botones grandes (Deshacer, Saltar, Hecha, Algún día) sobre las tareas por revisar (sin clasificar o con más de 7 días) o sobre todas. El cuadrante fija la prioridad (Hacer ya = P1, Planificar = P2, Delegar = P3, Más tarde = P4) y el día de clasificación se guarda en los ajustes del perfil (`settings.matrix`), sin cambios en el esquema
- Revisión semanal con el paso «Priorizar» (clasificar en la matriz) y la lista «Importante y no urgente» para reservarle tiempo
- Estadísticas generales y por proyecto (racha, cumplimiento de fechas límite, lead time, burn-up)
- Atajos de iPhone y conector de Claude
- Sin conexión: copia local de los datos y cola de cambios persistente (localStorage + copia en IndexedDB, almacenamiento persistente) que se sincroniza sola. Varios dispositivos y pestañas sin red a la vez: al volver la conexión se suman todos los cambios; las secciones y los ajustes se fusionan campo a campo; una tarea cuyo proyecto se borró mientras tanto se guarda en la Bandeja

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
