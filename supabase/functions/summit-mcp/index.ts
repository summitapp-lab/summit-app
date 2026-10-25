// ============================================================
// SUMMIT · Conector de Claude (servidor MCP)
// Supabase → Edge Functions → Deploy a new function → Via Editor
// Nombre de la función: summit-mcp · Pega este archivo entero · Deploy
// Después, en los ajustes de la función, desactiva «Verify JWT».
// No hay nada que editar: la URL y la clave del proyecto las pone Supabase.
// ============================================================

const VERSION = "1.1.0";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, accept, mcp-session-id, mcp-protocol-version, x-summit-key, apikey",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const INSTRUCTIONS = `Summit es el gestor de tareas personal del usuario, basado en el método GTD (Getting Things Done).
- Empieza con «resumen» para situarte: fecha de hoy del usuario, bandeja, tareas de hoy, vencidas, fechas límite y proyectos.
- Las fechas van siempre en formato AAAA-MM-DD. Calcula «mañana», «el viernes», etc. a partir de la fecha «hoy» que devuelve «resumen».
- Tres fechas distintas: «fecha» (cuándo piensa hacerla), «fecha_limite» (compromiso real; genera avisos) y «disponible_desde» (la oculta hasta ese día).
- Prioridad 1 = máxima, 4 = sin prioridad. Estados: open (próxima acción), waiting (en espera de alguien), someday (algún día), reference, done.
- Lo que el usuario captura sin aclarar va a la bandeja (crear_tarea sin proyecto). Si pide algo con varios pasos, propón un proyecto.
- Los proyectos se pueden compartir con un código; en un proyecto compartido se puede asignar una tarea a otro miembro por su nombre.
- Para modificar o completar necesitas el «id» de la tarea: obténlo con listar_tareas o ver_proyecto.
- Antes de eliminar algo, confirma con el usuario.`;

const s = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
const VISTAS = ["abiertas", "hoy", "vencidas", "proximos", "bandeja", "proximas_acciones", "en_espera", "algun_dia", "referencia", "completadas", "todas"];
const TASK_FIELDS = {
  titulo: s("Título de la tarea, empezando por un verbo (por ejemplo, «Llamar a KHS por los repuestos»)."),
  notas: s("Detalles, enlaces o criterios de aceptación."),
  proyecto: s("Nombre (o parte única del nombre) del proyecto. Vacío = sin proyecto."),
  seccion: s("Sección dentro del proyecto."),
  prioridad: { type: "integer", minimum: 1, maximum: 4, description: "1 = máxima, 4 = sin prioridad." },
  fecha: s("Fecha planificada, AAAA-MM-DD."),
  hora: s("Hora, HH:MM (24 h)."),
  fecha_limite: s("Fecha límite (compromiso), AAAA-MM-DD. Summit avisa unos días antes."),
  disponible_desde: s("Oculta la tarea hasta esta fecha, AAAA-MM-DD."),
  repeticion: s("Repetición.", { enum: ["Cada día", "Cada día laborable", "Cada semana", "Cada 2 semanas", "Cada mes", "Cada año", "Cada lunes", "Cada martes", "Cada miércoles", "Cada jueves", "Cada viernes", "Cada sábado", "Cada domingo"] }),
  recordatorio: s("Aviso.", { enum: ["A la hora", "15 min antes", "1 h antes", "1 día antes", "2 días antes"] }),
  contextos: { type: "array", items: { type: "string" }, description: "Contextos GTD, por ejemplo [\"Ordenador\"]. Consulta los disponibles en «resumen»." },
  energia: s("Energía necesaria.", { enum: ["baja", "media", "alta"] }),
  estimacion_min: { type: "integer", description: "Duración estimada en minutos." },
  estado: s("Estado.", { enum: ["open", "waiting", "someday", "reference", "done"] }),
  en_espera_de: s("Persona o área de la que depende (si el estado es waiting)."),
  asignada_a: s("Solo en proyectos compartidos: nombre del miembro, o «yo»."),
};

const TOOLS = [
  { name: "resumen", description: "Visión general de Summit: fecha de hoy del usuario, bandeja, tareas de hoy, vencidas, fechas límite próximas, proyectos, áreas y contextos. Úsala primero.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "listar_tareas", description: "Lista tareas filtradas por vista, proyecto, texto o contexto. Devuelve el id de cada tarea.", annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {
      vista: s("Qué tareas listar.", { enum: VISTAS }),
      proyecto: s("Limitar a un proyecto (nombre)."),
      texto: s("Buscar en título y notas."),
      contexto: s("Filtrar por contexto, por ejemplo «Teléfono»."),
      limite: { type: "integer", minimum: 1, maximum: 300, description: "Máximo de tareas (50 por defecto)." },
    } } },
  { name: "listar_proyectos", description: "Proyectos del usuario y los compartidos con él: estado, objetivo, secciones, miembros, tareas abiertas y completadas, código para compartir.", annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: { incluir_completados: { type: "boolean" } } } },
  { name: "ver_proyecto", description: "Detalle de un proyecto: objetivo, miembros, tareas abiertas por sección y últimas completadas.", annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: { proyecto: s("Nombre del proyecto.") }, required: ["proyecto"] } },
  { name: "estadisticas", description: "Estadísticas del historial: completadas, media diaria, creadas, cumplimiento de fechas límite, lead time, minutos de enfoque, reparto por proyecto y por día de la semana. Global o de un proyecto.", annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: { dias: { type: "integer", minimum: 1, maximum: 730, description: "Periodo en días (30 por defecto)." }, proyecto: s("Opcional: estadísticas de un proyecto.") } } },
  { name: "revision_semanal", description: "Datos para la revisión semanal GTD: bandeja sin procesar, proyectos sin próxima acción, proyectos por revisar, esperas largas y fechas límite.", annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {} } },
  { name: "crear_tarea", description: "Crea una tarea. Sin proyecto va a la bandeja de entrada (salvo bandeja=false).",
    inputSchema: { type: "object", properties: { ...TASK_FIELDS, subtareas: { type: "array", items: { type: "string" } }, bandeja: { type: "boolean", description: "Sin proyecto: false la deja como próxima acción en lugar de en la bandeja." } }, required: ["titulo"] } },
  { name: "actualizar_tarea", description: "Modifica una tarea. Solo cambia los campos que envíes; envía un campo vacío para borrarlo. completar=true la marca como hecha.",
    inputSchema: { type: "object", properties: { id: s("Id de la tarea."), ...TASK_FIELDS, completar: { type: "boolean" }, bandeja: { type: "boolean" }, anadir_subtareas: { type: "array", items: { type: "string" } } }, required: ["id"] } },
  { name: "completar_tarea", description: "Marca una tarea como completada. Si se repite, crea la siguiente.",
    inputSchema: { type: "object", properties: { id: s("Id de la tarea.") }, required: ["id"] } },
  { name: "eliminar_tarea", description: "Elimina una tarea definitivamente. Confirma antes con el usuario.", annotations: { destructiveHint: true },
    inputSchema: { type: "object", properties: { id: s("Id de la tarea.") }, required: ["id"] } },
  { name: "crear_proyecto", description: "Crea un proyecto, opcionalmente con secciones, tareas iniciales y código para compartir.",
    inputSchema: { type: "object", properties: {
      nombre: s("Nombre del proyecto."), objetivo: s("Resultado deseado: cómo sabrás que está terminado."),
      area: s("Área, por ejemplo «Trabajo» o «Personal»."), secciones: { type: "array", items: { type: "string" } },
      tareas: { type: "array", items: { type: "string" }, description: "Títulos de las primeras tareas." },
      color: s("Color en hexadecimal, por ejemplo #5F7F6A."), revisar_cada_dias: { type: "integer", description: "7, 14 o 30." },
      compartir: { type: "boolean", description: "true genera un código para que otras personas se unan." },
    }, required: ["nombre"] } },
  { name: "actualizar_proyecto", description: "Modifica un proyecto propio: nombre, objetivo, estado (active, paused, done), color, añadir secciones o marcarlo como revisado.",
    inputSchema: { type: "object", properties: {
      proyecto: s("Nombre actual."), nombre: s("Nombre nuevo."), objetivo: s("Resultado deseado."),
      estado: s("Estado.", { enum: ["active", "paused", "done"] }), color: s("Color hexadecimal."),
      anadir_secciones: { type: "array", items: { type: "string" } }, marcar_revisado: { type: "boolean" },
    }, required: ["proyecto"] } },
  { name: "compartir_proyecto", description: "Devuelve (o genera) el código para que otra persona se una a un proyecto propio desde su Summit.",
    inputSchema: { type: "object", properties: { proyecto: s("Nombre del proyecto."), nuevo: { type: "boolean", description: "true invalida el código anterior y crea otro." } }, required: ["proyecto"] } },
];

function apiKey(): string {
  const env = (k: string) => Deno.env.get(k) ?? "";
  for (const k of ["SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"]) if (env(k)) return env(k);
  for (const k of ["SUPABASE_PUBLISHABLE_KEYS"]) {
    try { const o = JSON.parse(env(k) || "{}"); const v = Object.values(o)[0]; if (typeof v === "string") return v; } catch (_) { /* nada */ }
  }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

async function callSummit(key: string, tool: string, args: unknown) {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const k = apiKey();
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: k };
  if (k.startsWith("eyJ")) headers.Authorization = `Bearer ${k}`;
  const r = await fetch(`${base}/rest/v1/rpc/summit_claude`, { method: "POST", headers, body: JSON.stringify({ p_key: key, p_tool: tool, p_args: args ?? {} }) });
  const txt = await r.text();
  let body: any = null; try { body = JSON.parse(txt); } catch (_) { body = txt; }
  if (!r.ok) throw new Error((body && (body.message || body.hint)) || `Error ${r.status}`);
  return body;
}

function summitKey(req: Request, url: URL): string {
  const q = url.searchParams.get("key");
  if (q) return q.trim();
  const h = req.headers.get("x-summit-key");
  if (h) return h.trim();
  const a = req.headers.get("authorization") ?? "";
  const m = a.match(/^Bearer\s+(CLD-[A-F0-9]+)$/i);
  return m ? m[1].toUpperCase() : "";
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handleMessage(msg: any, key: string) {
  const { id, method, params } = msg ?? {};
  if (typeof method !== "string") return rpcErr(id, -32600, "Solicitud no válida");
  const isNotification = id === undefined || id === null;
  if (method.startsWith("notifications/")) return null;
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      const supported = ["2025-06-18", "2025-03-26", "2024-11-05"];
      return { jsonrpc: "2.0", id, result: {
        protocolVersion: supported.includes(asked) ? asked : supported[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "summit", title: "Summit", version: VERSION },
        instructions: INSTRUCTIONS,
      } };
    }
    case "ping": return { jsonrpc: "2.0", id, result: {} };
    case "tools/list": return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
    case "tools/call": {
      const name = params?.name;
      if (!TOOLS.some((t) => t.name === name)) return rpcErr(id, -32602, `Herramienta desconocida: ${name}`);
      if (!key) return { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: "Falta la clave de Summit. Añade ?key=TU-CLAVE al final de la URL del conector (Summit → Ajustes → Claude)." }] } };
      try {
        const data = await callSummit(key, name, params?.arguments ?? {});
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(data, null, 1) }], structuredContent: data && typeof data === "object" && !Array.isArray(data) ? data : { resultado: data } } };
      } catch (e) {
        return { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: String((e as Error).message ?? e) }] } };
      }
    }
    case "resources/list": return { jsonrpc: "2.0", id, result: { resources: [] } };
    case "prompts/list": return { jsonrpc: "2.0", id, result: { prompts: [] } };
    default: return isNotification ? null : rpcErr(id, -32601, `Método no disponible: ${method}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  if (req.method === "GET") {
    if ((req.headers.get("accept") ?? "").includes("text/event-stream")) return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
    return json({ app: "Summit", servidor: "MCP", version: VERSION, estado: "Funcionando. Añade esta URL (con ?key=…) como conector personalizado en Claude." });
  }
  if (req.method === "DELETE") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: CORS });
  let body: any;
  try { body = await req.json(); } catch (_) { return json(rpcErr(null, -32700, "JSON no válido"), 400); }
  const key = summitKey(req, url);
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleMessage(m, key)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
  }
  const res = await handleMessage(body, key);
  if (!res) return new Response(null, { status: 202, headers: CORS });
  return json(res);
});
