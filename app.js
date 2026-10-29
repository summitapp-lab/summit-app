/* Summit 1.6.0 · gestor de tareas GTD
   PWA sin dependencias de compilación. Datos en Supabase (esquema `summit`), con caché local
   y cola de cambios para funcionar sin conexión. */
'use strict';
const APP_VERSION = '1.6.0';
const CFG = window.SUMMIT_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
const LOGO = '<svg class="logo" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#F4F2EC"/><path d="M12 44 L24.5 28 L31 36 L40 23 L52 44" fill="none" stroke="#5F7F6A" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>';
const I = {
  cal: '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  flag: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>',
  rep: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/></svg>',
  at: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8"/></svg>',
  note: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 5h14M5 10h14M5 15h9"/></svg>',
  sub: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 6h14M9 12h10M9 18h10M5 12v6"/></svg>',
  cam: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  wait: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  user: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  inbox: '<svg viewBox="0 0 24 24"><path d="M4 13l2.5-7h11L20 13v5H4z"/><path d="M4 13h4.5l1 2h5l1-2H20"/></svg>',
  mount: '<svg viewBox="0 0 24 24"><path d="M3 19l6.5-10 4 6 2.5-3.5L21 19z"/></svg>',
  focus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>',
  soon: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z"/><path d="M5 16a4 4 0 0 1 4-4h10"/></svg>',
  done: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  review: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5"/><path d="M12 8v4l3 2"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
};
const COLORS = ['#5F7F6A', '#4F7DA8', '#C2553F', '#D18B2F', '#8A6FB0', '#3E8E8B', '#B5657E', '#6B6F5A'];
const RECURS = ['Cada día', 'Cada día laborable', 'Cada semana', 'Cada 2 semanas', 'Cada mes', 'Cada año', 'Cada lunes', 'Cada martes', 'Cada miércoles', 'Cada jueves', 'Cada viernes', 'Cada sábado', 'Cada domingo'];
const REMINDERS = ['A la hora', '15 min antes', '1 h antes', '1 día antes', '2 días antes'];
const STATUS = { open: 'Próxima acción', waiting: 'En espera', someday: 'Algún día', reference: 'Referencia', done: 'Hecha' };
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ---------- Estado ---------- */
let sb = null, ME = null, MEMAIL = '', MENAME = '';
let S = { profile: null, areas: [], projects: [], members: [], tasks: [], focus: [] };
let Q = [];
let VIEW = { name: 'today' };
let FOCUS = null; // tarea seleccionada con el teclado (o la última creada)
let OFFLINE = !navigator.onLine;
let flushing = false, reloadTimer = null, channel = null;

const settings = () => (S.profile && S.profile.settings) || {};
const tz = () => settings().tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Havana';

/* ---------- Fechas ---------- */
function today() {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch (_) { return new Date().toISOString().slice(0, 10); }
}
const parseD = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const isoD = (dt) => dt.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = parseD(iso); d.setUTCDate(d.getUTCDate() + n); return isoD(d); };
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const dow = (iso) => parseD(iso).getUTCDay();
function fmtDate(iso) {
  if (!iso) return '';
  const t = today(), n = diffDays(iso, t);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  if (n > 1 && n < 7) return DIAS[dow(iso)].replace(/^./, (c) => c.toUpperCase());
  const d = parseD(iso);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}` + (d.getUTCFullYear() !== parseD(t).getUTCFullYear() ? ` ${d.getUTCFullYear()}` : '');
}
function nextRecur(rule, d) {
  const r = String(rule || '').toLowerCase();
  d = d || today();
  if (r.includes('laborable')) { let n = addDays(d, 1); while ([0, 6].includes(dow(n))) n = addDays(n, 1); return n; }
  if (r.includes('2 semanas')) return addDays(d, 14);
  if (r.includes('día') || r.includes('dia')) return addDays(d, 1);
  if (r.includes('semana')) return addDays(d, 7);
  if (r.includes('mes')) { const x = parseD(d); x.setUTCMonth(x.getUTCMonth() + 1); return isoD(x); }
  if (r.includes('año') || r.includes('ano')) { const x = parseD(d); x.setUTCFullYear(x.getUTCFullYear() + 1); return isoD(x); }
  for (let i = 0; i < 7; i++) if (r.endsWith(DIAS[i])) { let n = addDays(d, 1); while (dow(n) !== i) n = addDays(n, 1); return n; }
  return addDays(d, 7);
}

/* ---------- Almacenamiento local ---------- */
const LS = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (_) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (_) { /* nada */ } },
};
const saveCache = () => ME && LS.set('summit-cache-' + ME, S);
const loadCache = () => { const c = ME && LS.get('summit-cache-' + ME, null); if (c && c.profile) { S = Object.assign({ profile: null, areas: [], projects: [], members: [], tasks: [], focus: [] }, c); return true; } return false; };

// Fotos y copia de seguridad de la cola en IndexedDB
const IDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('sin IndexedDB'));
    const r = indexedDB.open('summit', 2);
    r.onupgradeneeded = () => { const db = r.result; for (const s of ['photos', 'meta']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = (store, mode, fn) => open().then((db) => new Promise((res, rej) => { const t = db.transaction(store, mode); const st = t.objectStore(store); const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
  return {
    put: (k, v, store = 'photos') => tx(store, 'readwrite', (s) => s.put(v, k)).catch(() => null),
    get: (k, store = 'photos') => tx(store, 'readonly', (s) => s.get(k)).catch(() => null),
    del: (k, store = 'photos') => tx(store, 'readwrite', (s) => s.delete(k)).catch(() => null),
  };
})();

/* ---------- Cola de cambios (sin conexión) ----------
   Cada cambio se aplica en local al instante y se guarda en una cola persistente
   (localStorage + copia en IndexedDB). La cola se lee siempre del almacenamiento, así
   varias pestañas del mismo dispositivo no se pisan, y se envía en orden al volver la red.
   Los identificadores se generan en el dispositivo, de modo que las tareas creadas sin
   conexión en dos dispositivos distintos nunca chocan: al sincronizar se suman todas. */
const QKEY = () => 'summit-queue-' + ME;
const qRead = () => (ME ? LS.get(QKEY(), []) : []);
function qWrite(q) {
  if (!ME) return;
  Q = q;
  if (!LS.set(QKEY(), q)) { LS.del('summit-cache-' + ME); LS.set(QKEY(), q); } // si no cabe, la cola manda sobre la caché
  LS.set('summit-qstamp-' + ME, Date.now());
  IDB.put('queue-' + ME, q, 'meta');
}
async function qLoad() {
  let q = qRead();
  // Si el sistema borró el almacenamiento local, se recupera la copia de IndexedDB
  if (!q.length && LS.get('summit-qstamp-' + ME, null) == null) {
    const b = await IDB.get('queue-' + ME, 'meta');
    if (Array.isArray(b) && b.length) q = b;
  }
  let fix = false;
  for (const op of q) if (!op.i) { op.i = uid(); fix = true; }
  if (fix || q.length) qWrite(q); else Q = q;
  return q;
}

/* ---------- Cambios: se aplican en local y se encolan ---------- */
function tableArr(t) { return { tasks: S.tasks, projects: S.projects, areas: S.areas, focus_sessions: S.focus, project_members: S.members }[t]; }
// Secciones: se guardan como cambios sueltos (añadir, renombrar, mover, borrar) para que
// dos dispositivos que editan secciones sin conexión no se sobrescriban entre sí.
function applySec(list, op) {
  const l = (list || []).slice();
  if (op.a === 'add') { if (!l.includes(op.s)) { const at = op.after != null ? l.indexOf(op.after) : -1; if (op.first) l.unshift(op.s); else if (at >= 0) l.splice(at + 1, 0, op.s); else l.push(op.s); } }
  else if (op.a === 'ren') { const i = l.indexOf(op.s); if (i >= 0) { if (l.includes(op.n)) l.splice(i, 1); else l[i] = op.n; } }
  else if (op.a === 'del') return l.filter((x) => x !== op.s);
  else if (op.a === 'move') { const i = l.indexOf(op.s), j = i + (op.dir < 0 ? -1 : 1); if (i >= 0 && j >= 0 && j < l.length) [l[i], l[j]] = [l[j], l[i]]; }
  return l;
}
function applyLocal(op) {
  if (op.k === 'ins') {
    const arr = tableArr(op.t); if (!arr) return;
    if (!arr.some((x) => x.id === op.row.id)) arr.push(Object.assign({}, op.row));
    if (op.t === 'projects' && !S.members.some((m) => m.project_id === op.row.id && m.user_id === ME)) S.members.push({ project_id: op.row.id, user_id: ME, role: 'owner', display_name: MENAME });
  } else if (op.k === 'upd') {
    if (op.t === 'profiles') { if (S.profile) Object.assign(S.profile, op.patch); return; }
    const x = (tableArr(op.t) || []).find((r) => r.id === op.id); if (x) Object.assign(x, op.patch);
  } else if (op.k === 'set') {
    if (S.profile) S.profile.settings = Object.assign({}, S.profile.settings || {}, op.patch);
  } else if (op.k === 'sec') {
    const p = S.projects.find((r) => r.id === op.id); if (p) p.sections = applySec(p.sections, op);
  } else if (op.k === 'del') {
    const arr = tableArr(op.t); if (!arr) return;
    const i = arr.findIndex((r) => r.id === op.id); if (i >= 0) arr.splice(i, 1);
    if (op.t === 'projects') { S.tasks = S.tasks.filter((t) => t.project_id !== op.id); S.members = S.members.filter((m) => m.project_id !== op.id); }
  }
}
function mut(op) { op.i = op.i || uid(); applyLocal(op); const q = qRead(); q.push(op); qWrite(q); saveCache(); updatePill(); flush(); }
const ins = (t, row) => mut({ k: 'ins', t, row });
const upd = (t, id, patch) => mut({ k: 'upd', t, id, patch: Object.assign({}, patch, ['tasks', 'projects', 'profiles'].includes(t) ? { updated_at: new Date().toISOString() } : {}) });
const del = (t, id) => mut({ k: 'del', t, id });
const secOp = (id, a, extra = {}) => mut(Object.assign({ k: 'sec', id, a }, extra));

const isNetErr = (e) => { const m = String((e && (e.message || e.name || e)) || ''); return !navigator.onLine || /fetch|network|load failed|timeout|timed out|abort|ERR_|connection/i.test(m); };
const isAuthErr = (e) => e && (e.status === 401 || e.code === 'PGRST301' || /JWT|jwt expired|not authenticated/i.test(String(e.message || '')));

// Peticiones con tiempo máximo: con una conexión débil la petición no se queda colgada
// y el cambio sigue en la cola hasta el siguiente intento.
function timedFetch(url, opts = {}) {
  const ms = /\/storage\/v1\//.test(String(url)) ? 90000 : 25000;
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  if (opts.signal) { if (opts.signal.aborted) ctl.abort(); else opts.signal.addEventListener('abort', () => ctl.abort(), { once: true }); }
  return fetch(url, Object.assign({}, opts, { signal: ctl.signal })).finally(() => clearTimeout(tm));
}

async function runOp(op) {
  let r;
  if (op.k === 'ins') r = await sb.from(op.t).upsert(op.row, { onConflict: op.t === 'project_members' ? 'project_id,user_id' : 'id', ignoreDuplicates: true });
  else if (op.k === 'upd') r = await sb.from(op.t).update(op.patch).eq('id', op.id);
  else if (op.k === 'del') r = await sb.from(op.t).delete().eq('id', op.id);
  else if (op.k === 'set') { // ajustes: se mezclan con lo que haya en el servidor (otros dispositivos)
    const cur = await sb.from('profiles').select('settings').eq('id', ME).maybeSingle();
    if (cur.error) throw cur.error;
    r = await sb.from('profiles').update({ settings: Object.assign({}, (cur.data && cur.data.settings) || {}, op.patch), updated_at: new Date().toISOString() }).eq('id', ME);
  } else if (op.k === 'sec') {
    const cur = await sb.from('projects').select('sections').eq('id', op.id).maybeSingle();
    if (cur.error) throw cur.error;
    if (!cur.data) return; // el proyecto ya no existe
    r = await sb.from('projects').update({ sections: applySec(cur.data.sections, op), updated_at: new Date().toISOString() }).eq('id', op.id);
  } else if (op.k === 'photo') {
    const blob = await IDB.get(op.photo);
    if (!blob) return; // ya no existe en el dispositivo
    r = await sb.storage.from('summit-fotos').upload(op.path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  } else if (op.k === 'unphoto') r = await sb.storage.from('summit-fotos').remove([op.path]);
  if (r && r.error) throw r.error;
}
// Si una tarea creada sin conexión no se puede guardar en su proyecto (porque otro
// dispositivo lo borró o te quitaron el acceso), se guarda en la Bandeja: nunca se pierde.
function rescue(op) {
  if (op.rescued || op.k !== 'ins' || op.t !== 'tasks' || !op.row.project_id) return null;
  const row = Object.assign({}, op.row, { project_id: null, section: null, assignee_id: null, inbox: true, user_id: ME });
  const x = S.tasks.find((t) => t.id === row.id); if (x) Object.assign(x, row); saveCache();
  return Object.assign({}, op, { row, rescued: true });
}
async function flush() {
  if (flushing || !sb || !ME) return;
  if (!qRead().length) { Q = []; updatePill(); return; }
  if (!navigator.onLine) { setOffline(true); return; }
  flushing = true;
  let sent = 0;
  const run = async () => {
    for (;;) {
      const q = qRead(); if (!q.length) break;
      const op = q[0];
      try { await runOp(op); }
      catch (e) {
        if (isNetErr(e)) { setOffline(true); return; }
        if (isAuthErr(e)) { const { error } = await sb.auth.refreshSession(); if (error) return; continue; }
        console.warn('Cambio rechazado', op, e);
        const alt = rescue(op);
        if (alt) { const q2 = qRead(); const j = q2.findIndex((x) => x.i === op.i); if (j >= 0) { q2[j] = alt; qWrite(q2); } toast('Una tarea se ha guardado en la Bandeja porque su proyecto ya no está disponible.'); continue; }
        toast('No se pudo guardar un cambio: ' + (e.message || e));
      }
      qWrite(qRead().filter((x) => x.i !== op.i)); sent++; updatePill();
    }
    setOffline(false);
  };
  try {
    if (navigator.locks && navigator.locks.request) await navigator.locks.request('summit-flush-' + ME, run);
    else await run();
  } finally {
    flushing = false; Q = qRead(); updatePill();
    if (sent && !Q.length) scheduleReload(400); // trae lo que hayan subido otros dispositivos
  }
}
function setOffline(v) { OFFLINE = v; updatePill(); }
function updatePill() {
  const p = $('#offline-pill'); if (!p) return;
  const n = ME ? qRead().length : 0;
  p.hidden = !OFFLINE && !n;
  p.classList.toggle('sync', !OFFLINE && !!n);
  p.textContent = OFFLINE ? (n ? `sin conexión · ${n} sin subir` : 'sin conexión') : `subiendo ${n}`;
}

/* ---------- Arranque y sesión ---------- */
window.addEventListener('DOMContentLoaded', start);
async function start() {
  applyTheme(LS.get('summit-theme', 'system'));
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadSW = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => null);
    // La app abre desde la copia del dispositivo; cuando se descarga una versión nueva, se avisa
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW) toast('Hay una versión nueva de Summit', 'Actualizar', () => location.reload()); });
  }
  if (!window.supabase) return fatal('No se ha podido cargar <b>supabase.min.js</b>. Comprueba que está en la raíz del repositorio, junto a index.html.');
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return fatal('Falta configurar <b>config.js</b> con la URL y la clave publicable de Supabase.');
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'summit-auth' }, global: { fetch: timedFetch } });
  // Pide al navegador que no borre los datos locales (cola sin conexión, caché y fotos)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((ok) => ok || navigator.storage.persist()).catch(() => null); } catch (_) { /* nada */ }
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') showAuth('reset');
    if (ev === 'SIGNED_OUT') { ME = null; showAuth('login'); }
    if (ev === 'TOKEN_REFRESHED' && session) flush();
  });
  window.addEventListener('online', () => { setOffline(false); flush(); scheduleReload(300); });
  window.addEventListener('offline', () => setOffline(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hidePrivate(); return; }
    if (ME) { flush(); scheduleReload(500); }
  });
  // Otra pestaña del mismo dispositivo ha cambiado la cola
  window.addEventListener('storage', (e) => { if (ME && e.key === QKEY()) { Q = qRead(); updatePill(); } });
  // Reintento periódico: el aviso «online» del sistema no siempre llega cuando vuelve la red
  setInterval(() => { if (ME && !flushing && navigator.onLine && (qRead().length || OFFLINE)) { flush(); if (OFFLINE) scheduleReload(0); } }, 30000);
  if (/error_code=otp_expired|error=access_denied/.test(location.hash)) { history.replaceState(null, '', location.pathname); return showAuth('forgot', 'El enlace ha caducado. Pide un código nuevo.'); }

  // Apertura inmediata: si este dispositivo ya tiene una sesión y una copia de los datos, la app se
  // dibuja al momento desde la copia local, sin esperar a la red. La sesión se comprueba y los datos
  // se actualizan después, en segundo plano. Así abre igual de rápido con conexión, sin ella o con
  // una conexión que no responde.
  const last = LS.get('summit-last-user', null), stored = LS.get('summit-auth', null);
  const su = stored && (stored.user || (stored.currentSession && stored.currentSession.user));
  let shown = false;
  if (last && su && su.id === last.id) {
    ME = last.id; MEMAIL = last.email; MENAME = last.name || '';
    if (loadCache()) { Q = qRead(); showApp(); hideSplash(); shown = true; if (!navigator.onLine) setOffline(true); }
    else ME = null;
  }
  // Con la app ya en pantalla, se comprueba la sesión (puede tardar si hay que renovarla por red)
  let session = null;
  try { session = (await withTimeout(sb.auth.getSession(), shown ? 20000 : 8000)).data.session; } catch (_) { session = null; }
  const keptSession = !!LS.get('summit-auth', null);
  if (session && session.user) await enter(session.user, shown && session.user.id === ME);
  else if (shown && keptSession) { await qLoad(); setOffline(true); scheduleReload(1500); }
  else if (last && (keptSession || !navigator.onLine)) {
    // Sin red (o con una red que no responde) la sesión no se puede renovar, pero sigue guardada
    ME = last.id; MEMAIL = last.email; MENAME = last.name || '';
    if (loadCache()) { await qLoad(); showApp(); setOffline(true); scheduleReload(1500); } else { ME = null; showAuth('login'); }
  }
  else { if (shown) { ME = null; $('#app').hidden = true; } showAuth('login'); }
  hideSplash();
}
// Promesa con tiempo máximo: si la red no responde, se sigue adelante con la copia local
function withTimeout(pr, ms) { return Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
function hideSplash() { const s = $('#splash'); if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 400); } }
function fatal(html) { hideSplash(); const a = $('#auth'); a.hidden = false; $('#app').hidden = true; a.innerHTML = `<div class="auth-card"><span class="auth-logo">${LOGO}</span><h1>Summit</h1><p>${html}</p><button class="btn primary" onclick="location.reload()">Reintentar</button></div>`; }

async function enter(user, alreadyShown = false) {
  ME = user.id; MEMAIL = user.email || ''; MENAME = (user.user_metadata && user.user_metadata.name) || '';
  await qLoad();
  const cached = alreadyShown || loadCache();
  if (cached && !alreadyShown) { showApp(); hideSplash(); }
  try { await loadAll(); LS.set('summit-last-user', { id: ME, email: MEMAIL, name: S.profile && S.profile.name }); if (!cached) showApp(); else render(); subscribe(); flush(); }
  catch (e) {
    console.warn(e);
    if (isSchemaErr(e)) return fatal('La base de datos de Summit no está preparada. Aplica <b>supabase/schema.sql</b> en el proyecto de Supabase.');
    if (!cached) { if (isNetErr(e)) return fatal('No hay conexión y este dispositivo aún no tiene una copia de tus datos. Conéctate una vez para descargarlos.'); return fatal('No se han podido cargar tus datos: ' + esc(e.message || e)); }
    setOffline(true);
  }
}
const isSchemaErr = (e) => e && (e.code === 'PGRST106' || /schema must be one of|Invalid schema|exposed schemas/i.test(String(e.message || e.hint || '')));

async function loadAll(retried = false) {
  // Todo en paralelo (un solo viaje de ida y vuelta); la cuenta se inicia solo si aún no existe el perfil
  const since = addDays(today(), -400);
  const [pr, ar, pj, mb, tk, fc] = await Promise.all([
    sb.from('profiles').select('*').eq('id', ME).maybeSingle(),
    sb.from('areas').select('*').order('position'),
    sb.from('projects').select('*').order('position'),
    sb.from('project_members').select('*'),
    sb.from('tasks').select('*').or(`status.neq.done,completed_at.gte.${since}`).order('created_at').range(0, 9999),
    sb.from('focus_sessions').select('*').gte('day', since).range(0, 9999),
  ]);
  for (const r of [pr, ar, pj, mb, tk, fc]) if (r.error) throw r.error;
  if (!pr.data) {
    if (retried) throw new Error('No se ha podido crear tu perfil');
    const r = await sb.rpc('iniciar_cuenta', { p_name: MENAME || '' }); if (r.error) throw r.error;
    return loadAll(true); // cuenta nueva: se vuelve a descargar con lo que acaba de crear
  }
  S = { profile: pr.data, areas: ar.data, projects: pj.data, members: mb.data, tasks: tk.data, focus: fc.data };
  if (!settings().tz) { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z) S.profile.settings = Object.assign({}, settings(), { tz: z }); }
  Q = qRead();
  for (const op of Q) applyLocal(op); // los cambios pendientes mandan sobre lo descargado
  applyTheme(settings().theme || 'system');
  parsePending();
  saveCache();
}
function scheduleReload(ms = 800) {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(async () => {
    if (!ME || !navigator.onLine) return;
    if (qRead().length) { flush(); return; } // primero se sube lo pendiente; al terminar se recarga
    try { await loadAll(); setOffline(false); if (S.profile && S.profile.name) LS.set('summit-last-user', { id: ME, email: MEMAIL, name: S.profile.name }); render(); subscribe(); }
    catch (e) { if (isNetErr(e) || isAuthErr(e)) setOffline(true); }
  }, ms);
}
function subscribe() {
  if (channel || !sb.channel) return;
  channel = sb.channel('summit-' + ME);
  for (const table of ['tasks', 'projects', 'project_members']) channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => scheduleReload(1200));
  channel.subscribe();
}
// Tareas capturadas con el atajo de iPhone: se interpretan al abrir la app
function parsePending() {
  for (const t of S.tasks.filter((x) => x.needs_parse && x.user_id === ME)) {
    const p = parseQuick(t.title);
    const patch = { needs_parse: false, title: p.title || t.title };
    if (p.project_id) { patch.project_id = p.project_id; patch.inbox = false; }
    if (p.contexts.length) patch.contexts = p.contexts;
    if (p.priority) patch.priority = p.priority;
    if (p.due_date) patch.due_date = p.due_date;
    if (p.due_time) patch.due_time = p.due_time;
    if (p.deadline) patch.deadline = p.deadline;
    if (p.section && p.project_id) patch.section = p.section;
    upd('tasks', t.id, patch);
  }
}

/* ---------- Pantallas de acceso ---------- */
function showAuth(mode = 'login', msg = '') {
  $('#app').hidden = true; closeSheet(true); document.body.classList.remove('pinned'); $('#drawer').hidden = true; $('#drawer-scrim').hidden = true;
  const a = $('#auth'); a.hidden = false;
  const head = `<span class="auth-logo">${LOGO}</span><h1>Summit</h1>`;
  const forms = {
    login: `<p>Tu sistema de confianza.</p>
      <input class="field" id="a-email" type="email" autocomplete="email" placeholder="Correo">
      <input class="field" id="a-pass" type="password" autocomplete="current-password" placeholder="Contraseña">
      <div class="auth-msg" id="a-msg">${esc(msg)}</div>
      <button class="btn primary" id="a-go">Entrar</button>
      <button class="link" data-m="signup">Crear una cuenta</button>
      <button class="link" data-m="forgot">¿Has olvidado la contraseña?</button>`,
    signup: `<p>Crea tu cuenta. Tus datos solo los ves tú.</p>
      <input class="field" id="a-name" autocomplete="name" placeholder="Tu nombre">
      <input class="field" id="a-email" type="email" autocomplete="email" placeholder="Correo">
      <input class="field" id="a-pass" type="password" autocomplete="new-password" placeholder="Contraseña (mínimo 8)">
      <div class="auth-msg" id="a-msg">${esc(msg)}</div>
      <button class="btn primary" id="a-go">Crear cuenta</button>
      <button class="link" data-m="login">Ya tengo cuenta</button>`,
    forgot: `<p>Te enviaremos un código por correo.</p>
      <input class="field" id="a-email" type="email" autocomplete="email" placeholder="Correo">
      <div class="auth-msg" id="a-msg">${esc(msg)}</div>
      <button class="btn primary" id="a-go">Enviar código</button>
      <button class="link" data-m="code">Ya tengo un código</button>
      <button class="link" data-m="login">Volver</button>`,
    code: `<p>Escribe el código del correo y tu contraseña nueva.</p>
      <input class="field" id="a-email" type="email" autocomplete="email" placeholder="Correo" value="${esc(LS.get('summit-reset-email', ''))}">
      <input class="field mono" id="a-code" inputmode="numeric" autocomplete="one-time-code" placeholder="Código">
      <input class="field" id="a-pass" type="password" autocomplete="new-password" placeholder="Contraseña nueva">
      <div class="auth-msg" id="a-msg">${esc(msg)}</div>
      <button class="btn primary" id="a-go">Cambiar y entrar</button>
      <button class="link" data-m="forgot">Pedir otro código</button>`,
    reset: `<p>Elige tu contraseña nueva.</p>
      <input class="field" id="a-pass" type="password" autocomplete="new-password" placeholder="Contraseña nueva">
      <div class="auth-msg" id="a-msg">${esc(msg)}</div>
      <button class="btn primary" id="a-go">Guardar</button>`,
  };
  a.innerHTML = `<div class="auth-card">${head}${forms[mode] || forms.login}</div>`;
  $$('[data-m]', a).forEach((b) => b.onclick = () => showAuth(b.dataset.m));
  const go = $('#a-go', a), m = $('#a-msg', a);
  const val = (id) => ($('#' + id, a) || {}).value || '';
  $$('input', a).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go.click(); }));
  go.onclick = async () => {
    m.textContent = ''; go.disabled = true;
    try {
      if (mode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email: val('a-email').trim(), password: val('a-pass') });
        if (error) throw error; a.hidden = true; await enter(data.user);
      } else if (mode === 'signup') {
        if (val('a-pass').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const { data, error } = await sb.auth.signUp({ email: val('a-email').trim(), password: val('a-pass'), options: { data: { name: val('a-name').trim() } } });
        if (error) throw error;
        let user = data.session && data.user;
        if (!user) { // la cuenta queda confirmada en la base de datos: entrar directamente
          const s = await sb.auth.signInWithPassword({ email: val('a-email').trim(), password: val('a-pass') });
          if (s.error) { m.style.color = 'var(--sage)'; m.textContent = 'Cuenta creada. Ya puedes entrar con tu correo y contraseña.'; showAuth('login', 'Cuenta creada. Entra con tu correo y contraseña.'); return; }
          user = s.data.user;
        }
        a.hidden = true; await enter(user);
      } else if (mode === 'forgot') {
        const email = val('a-email').trim(); if (!email) throw new Error('Escribe tu correo.');
        const { error } = await sb.auth.resetPasswordForEmail(email); if (error) throw error;
        LS.set('summit-reset-email', email); showAuth('code', '');
      } else if (mode === 'code') {
        if (val('a-pass').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const { data, error } = await sb.auth.verifyOtp({ email: val('a-email').trim(), token: val('a-code').trim(), type: 'recovery' });
        if (error) throw new Error('Código incorrecto o caducado.');
        const u = await sb.auth.updateUser({ password: val('a-pass') }); if (u.error) throw u.error;
        a.hidden = true; await enter(data.user);
      } else if (mode === 'reset') {
        const u = await sb.auth.updateUser({ password: val('a-pass') }); if (u.error) throw u.error;
        a.hidden = true; await enter(u.data.user);
      }
    } catch (e) { m.style.color = ''; m.textContent = traducir(e); }
    finally { go.disabled = false; }
  };
}
function traducir(e) {
  const s = String((e && e.message) || e);
  if (/Invalid login credentials/i.test(s)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(s)) return 'Confirma tu correo antes de entrar.';
  if (/already registered/i.test(s)) return 'Ese correo ya tiene cuenta.';
  if (/rate limit|too many/i.test(s)) return 'Demasiados intentos. Espera unos minutos.';
  if (isNetErr(e)) return 'Sin conexión. Inténtalo cuando vuelva la red.';
  return s;
}
async function signOut() {
  if (qRead().length && !confirm('Hay cambios sin sincronizar en este dispositivo. Si cierras sesión se perderán. ¿Continuar?')) return;
  try { await sb.auth.signOut(); } catch (_) { /* sin red */ }
  LS.del('summit-cache-' + ME); LS.del('summit-queue-' + ME); LS.del('summit-qstamp-' + ME); IDB.del('queue-' + ME, 'meta'); LS.del('summit-last-user');
  if (channel) { sb.removeChannel(channel); channel = null; }
  ME = null; S = { profile: null, areas: [], projects: [], members: [], tasks: [], focus: [] }; Q = [];
  showAuth('login');
}

/* ---------- Tema ---------- */
function applyTheme(t) {
  LS.set('summit-theme', t);
  const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(LS.get('summit-theme', 'system')));

/* =========================================================
   INTERFAZ
   ========================================================= */
const PJ = (id) => S.projects.find((p) => p.id === id);
const projColor = (id) => (PJ(id) || {}).color || 'var(--ink3)';
const membersOf = (pid) => S.members.filter((m) => m.project_id === pid);
const isShared = (pid) => membersOf(pid).length > 1 || !!(PJ(pid) || {}).share_code;
const isOwner = (pid) => (PJ(pid) || {}).owner_id === ME;
const personName = (u) => u === ME ? 'Yo' : ((S.members.find((m) => m.user_id === u) || {}).display_name || 'Miembro');
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const isOpen = (t) => t.status !== 'done';
const available = (t) => !t.start_date || t.start_date <= today();
// Tareas que me tocan a mí (las de proyectos compartidos solo si me las han asignado o son mías)
const mine = (t) => t.assignee_id ? t.assignee_id === ME : t.user_id === ME;
const actionable = (t) => isOpen(t) && t.status === 'open' && !t.inbox && mine(t) && available(t);
const activeProjects = () => S.projects.filter((p) => p.status === 'active').sort((a, b) => (a.position - b.position) || a.name.localeCompare(b.name));
const contexts = () => settings().contexts || [];
const overdue = (t) => isOpen(t) && t.status !== 'someday' && t.status !== 'reference' && ((t.due_date && t.due_date < today()) || (t.deadline && t.deadline < today()));
const inboxTasks = () => S.tasks.filter((t) => t.inbox && isOpen(t) && t.user_id === ME && !t.project_id);
const todayTasks = () => S.tasks.filter((t) => isOpen(t) && mine(t) && !['someday', 'reference'].includes(t.status) && (t.due_date === today() || t.deadline === today()) && !overdue(t));
const sortTasks = (a, b) => (a.priority - b.priority) || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')) || String(a.created_at || '').localeCompare(String(b.created_at || ''));
function reviewDue() {
  const rv = settings().reviews || []; const last = rv[rv.length - 1];
  return !last || diffDays(today(), last) >= 7;
}
function alerts() {
  const out = [], lead = settings().leadDays ?? 2;
  const od = S.tasks.filter((t) => overdue(t) && mine(t));
  if (od.length && settings().notifyOverdue !== false) out.push({ txt: `${od.length} ${od.length === 1 ? 'tarea vencida' : 'tareas vencidas'}`, go: { name: 'today' } });
  for (const t of S.tasks.filter((x) => isOpen(x) && mine(x) && x.deadline && x.deadline >= today() && diffDays(x.deadline, today()) <= lead)) out.push({ txt: `Fecha límite ${fmtDate(t.deadline).toLowerCase()}: ${safeTitle(t)}`, task: t.id });
  if (reviewDue() && dow(today()) === (settings().reviewDay ?? 5)) out.push({ txt: 'Toca hacer la revisión semanal', go: { name: 'review' } });
  return out;
}

/* ---------- Navegación ---------- */
function showApp() { $('#auth').hidden = true; $('#app').hidden = false; bindChrome(); render(); applyPin(); }
let chromeBound = false;
function bindChrome() {
  if (chromeBound) return; chromeBound = true;
  $('#btn-menu').onclick = () => (pinnedNow() ? togglePin() : openDrawer());
  window.addEventListener('resize', applyPin);
  $('#btn-stats').onclick = () => go(VIEW.name === 'project' ? { name: 'stats', tab: 'project', id: VIEW.id } : { name: 'stats' });
  $('#btn-search').onclick = openSearch;
  $('#btn-bell').onclick = openBell;
  $('#fab').onclick = () => openQuick();
  $('#offline-pill').onclick = () => {
    const n = qRead().length;
    toast(n ? `${n} ${n === 1 ? 'cambio guardado' : 'cambios guardados'} en este dispositivo. Se subirán solos en cuanto haya conexión.` : 'Sin conexión. Puedes seguir trabajando: todo se guarda en este dispositivo.');
    flush(); scheduleReload(0);
  };
  $$('#tabbar button').forEach((b) => b.onclick = () => go({ name: b.dataset.view }));
  bindGestures(); bindKeys(); bindViewport();
}
function go(v) { const keep = v.name === 'project' && REVEAL.has(v.id); REVEAL.clear(); if (keep) REVEAL.add(v.id); VIEW = v; closeDrawer(); closeOverlay(); render(); if (FOCUS && !$(`#view .task[data-task="${FOCUS}"]`)) FOCUS = null; window.scrollTo(0, 0); }
function render() {
  if (!S.profile || $('#app').hidden) return;
  Q = qRead(); updatePill();
  const n = inboxTasks().length, bi = $('#badge-inbox');
  bi.hidden = !n; bi.textContent = n;
  $$('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.view === VIEW.name || (b.dataset.view === 'projects' && VIEW.name === 'project')));
  $('#bell-dot').hidden = !alerts().length;
  $('#btn-stats').classList.toggle('on', VIEW.name === 'stats');
  const fn = VIEWS[VIEW.name] || VIEWS.today;
  if (VIEW.secEdit && (VIEW.name !== 'project' || VIEW.secEdit.pid !== VIEW.id)) VIEW.secEdit = null;
  const typing = VIEW.secEdit && $('#sec-input') ? $('#sec-input').value : null; // no perder lo escrito si llega una sincronización
  $('#view').innerHTML = fn();
  addProcessButton();
  bindView();
  if (VIEW.secEdit) { if (typing != null && $('#sec-input')) $('#sec-input').value = typing; bindSecInput(); }
  if (VIEW.name === 'focus') tickPomo();
  if (!$('#drawer').hidden) renderDrawer();
}
const head = (title, sub = '', extra = '') => `<div class="v-head${extra ? ' row' : ''}"><div style="flex:1;min-width:0"><h1>${esc(title)}</h1>${sub ? `<div class="v-sub">${sub}</div>` : ''}</div>${extra}</div>`;
const longDate = (iso) => { const d = parseD(iso); return `${DIAS[d.getUTCDay()].replace(/^./, (c) => c.toUpperCase())}, ${d.getUTCDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getUTCMonth()]}`; };

/* ---------- Proyectos privados (tareas ocultas) ----------
   Las tareas de un proyecto privado se muestran difuminadas en todas las vistas, como el
   saldo oculto de una app bancaria. El texto real no llega a la pantalla: se dibuja un
   texto de relleno borroso. Se muestran con el ojo del proyecto (o tocando una tarea
   difuminada) y se vuelven a ocultar al cambiar de pantalla o al salir de la app. */
const REVEAL = new Set();
const privateIds = () => settings().privateProjects || [];
const isPrivate = (pid) => !!pid && privateIds().includes(pid);
const veiled = (t) => !!t && isPrivate(t.project_id) && !REVEAL.has(t.project_id);
const safeTitle = (t) => (veiled(t) ? 'Tarea privada' : t.title);
const EYE = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.7M6.4 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const LOCK = '<svg class="ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function veilText(id) { // relleno estable por tarea, sin relación con el título real
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const words = 2 + (h % 4); let out = [];
  for (let i = 0; i < words; i++) { h = (h * 1103515245 + 12345) >>> 0; out.push('x'.repeat(3 + (h % 7))); }
  return out.join(' ');
}
function setPrivate(pid, on) {
  const l = privateIds().filter((x) => x !== pid && S.projects.some((p) => p.id === x));
  if (on) l.push(pid);
  REVEAL.delete(pid);
  saveSettings({ privateProjects: l });
  toast(on ? 'Proyecto privado: sus tareas se mostrarán ocultas' : 'Las tareas del proyecto vuelven a verse siempre');
  render();
}
function hidePrivate() {
  if (!REVEAL.size) return;
  REVEAL.clear();
  if (sheetCtx && sheetCtx.taskId && isPrivate((S.tasks.find((t) => t.id === sheetCtx.taskId) || {}).project_id)) closeSheet(true);
  if (S.profile && !$('#app').hidden) render();
}
function toggleReveal(pid) { if (REVEAL.has(pid)) REVEAL.delete(pid); else REVEAL.add(pid); render(); }

/* ---------- Fila de tarea ---------- */
function veiledRow(t, o = {}) {
  const pj = PJ(t.project_id);
  return `<div class="task veiled${t.status === 'done' ? ' done' : ''}" data-veil="${t.project_id}" title="Tarea oculta. Toca para mostrar">
    <span class="check p4 veil-check" aria-hidden="true"></span>
    <div class="t-body"><div class="t-title"><span class="veil-txt">${veilText(t.id)}</span></div><div class="t-sub"><span class="tag">${LOCK}Oculta${!o.noProject && pj ? ' · ' + esc(pj.name) : ''}</span></div></div>
    ${!o.noProject && pj ? `<div class="t-right"><i class="pdot" style="background:${projColor(t.project_id)}"></i></div>` : ''}</div>`;
}
function row(t, o = {}) {
  if (veiled(t)) return veiledRow(t, o);
  const sub = [];
  if (!o.noProject && t.project_id && PJ(t.project_id)) sub.push(`<span class="tag"><i class="pdot" style="background:${projColor(t.project_id)}"></i>${esc(PJ(t.project_id).name)}${t.section ? ' · ' + esc(t.section) : ''}</span>`);
  if (t.status === 'waiting') sub.push(`<span class="tag">${I.wait}${esc(t.waiting_for || 'En espera')}${t.waiting_since ? ' · ' + Math.max(0, diffDays(today(), t.waiting_since)) + ' d' : ''}</span>`);
  if (t.assignee_id && t.assignee_id !== ME) sub.push(`<span class="tag">${I.user}${esc(personName(t.assignee_id))}</span>`);
  for (const c of t.contexts || []) sub.push(`<span class="tag">@${esc(c)}</span>`);
  const st = t.subtasks || []; if (st.length) sub.push(`<span class="tag">${I.sub}${st.filter((s) => s.done).length}/${st.length}</span>`);
  if (t.notes) sub.push(`<span class="tag">${I.note}</span>`);
  if ((t.photos || []).length) sub.push(`<span class="tag">${I.cam}${t.photos.length}</span>`);
  if (t.recur) sub.push(`<span class="tag">${I.rep}</span>`);
  const right = [];
  if (o.log && t.completed_at) right.push(`<span class="date">${esc(fmtDate(localDay(t.completed_at)))}</span>`);
  else {
    if (t.due_date) right.push(`<span class="date ${t.due_date < today() ? 'red' : t.due_date === today() ? 'today' : ''}">${esc(fmtDate(t.due_date))}${t.due_time ? ' ' + esc(t.due_time) : ''}</span>`);
    if (t.deadline && t.deadline !== t.due_date) right.push(`<span class="date dl ${t.deadline < today() ? 'red' : ''}">⚑ ${esc(fmtDate(t.deadline))}</span>`);
    if (t.priority < 4 && o.showPrio) right.push(`<span class="prio-tag">P${t.priority}</span>`);
  }
  if (t.project_id && !o.noProject) right.push(`<i class="pdot" style="background:${projColor(t.project_id)}"></i>`);
  return `<div class="task${t.status === 'done' ? ' done' : ''}${t.id === FOCUS ? ' focused' : ''}" data-task="${t.id}">
    <button class="check p${t.priority}${t.status === 'done' ? ' on' : ''}" data-check="${t.id}" aria-label="Completar"></button>
    <div class="t-body"><div class="t-title">${esc(t.title)}</div>${sub.length ? `<div class="t-sub">${sub.join('')}</div>` : ''}</div>
    ${right.length ? `<div class="t-right">${right.join('')}</div>` : ''}</div>`;
}
const localDay = (ts) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts)); } catch (_) { return String(ts).slice(0, 10); } };
const group = (title, tasks, o = {}) => !tasks.length && !o.always ? '' : `<div class="group"><div class="group-h${o.red ? ' red' : ''}">${esc(title)} <span class="count">${tasks.length}</span>${o.right || ''}</div><div class="list">${tasks.map((t) => row(t, o)).join('')}</div></div>`;
const addRow = (attrs = '') => `<button class="add-row" data-add ${attrs}><svg class="ic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Añadir tarea</button>`;
const empty = (t, s = '') => `<div class="empty">${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</div>`;

function bindView() {
  const v = $('#view');
  $$('[data-check]', v).forEach((b) => b.onclick = (e) => { e.stopPropagation(); toggleDone(b.dataset.check); });
  $$('[data-task]', v).forEach((r) => {
    r.onclick = () => openTask(r.dataset.task);
    r.onmouseenter = () => { if (hoverOk()) setFocus(r.dataset.task, false); };
  });
  $$('[data-veil]', v).forEach((r) => r.onclick = (e) => { e.stopPropagation(); REVEAL.add(r.dataset.veil); render(); });
  $$('[data-add]', v).forEach((b) => b.onclick = () => openQuick(quickDefaults(b.dataset)));
  $$('[data-go]', v).forEach((b) => b.onclick = () => go(JSON.parse(b.dataset.go)));
  $$('[data-act]', v).forEach((b) => {
    const fn = ACT[b.dataset.act]; if (!fn) return;
    if (b.type === 'checkbox') b.onchange = () => fn(b.dataset, b);
    else if (b.tagName === 'SELECT' || b.tagName === 'INPUT') fn(b.dataset, b); // estos enganchan su propio onchange
    else b.onclick = (e) => { e.stopPropagation(); fn(b.dataset, b); };
  });
}
const goAttr = (v) => `data-go='${esc(JSON.stringify(v))}'`;

/* ---------- Vistas ---------- */
const VIEWS = {
  today() {
    const od = S.tasks.filter((t) => overdue(t) && mine(t)).sort((a, b) => String(a.due_date || a.deadline).localeCompare(String(b.due_date || b.deadline)) || sortTasks(a, b));
    const td = todayTasks().sort(sortTasks);
    const doneToday = S.tasks.filter((t) => t.status === 'done' && t.completed_at && localDay(t.completed_at) === today() && (t.completed_by === ME || mine(t)));
    return head('Hoy', esc(longDate(today()))) +
      group('Vencidas', od, { red: true }) +
      (td.length || !od.length ? `<div class="group">${od.length ? `<div class="group-h">Hoy <span class="count">${td.length}</span></div>` : ''}<div class="list">${td.map((t) => row(t)).join('')}</div></div>` : '') +
      (!od.length && !td.length ? empty('Nada para hoy', 'Disfruta o elige algo de Próximas acciones.') : '') +
      addRow('data-due="today"') +
      (doneToday.length ? `<button class="more-row" ${goAttr({ name: 'log' })}><span>${doneToday.length} ${doneToday.length === 1 ? 'completada' : 'completadas'} hoy</span><span>›</span></button>` : '');
  },
  inbox() {
    const t = inboxTasks().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return head('Bandeja', '', t.length ? `<button class="btn primary small" data-act="clarify">Procesar ${t.length}</button>` : '') +
      (t.length ? `<div class="list">${t.map((x) => row(x)).join('')}</div>` + addRow() : empty('Bandeja vacía'));
  },
  upcoming() {
    const t0 = today(), items = S.tasks.filter((t) => isOpen(t) && mine(t) && !['someday', 'reference'].includes(t.status) && ((t.due_date && t.due_date > t0) || (t.deadline && t.deadline > t0)));
    const byDay = {};
    for (const t of items) { const d = t.due_date && t.due_date > t0 ? t.due_date : t.deadline; (byDay[d] = byDay[d] || []).push(t); }
    const days = Object.keys(byDay).sort();
    return head('Próximos') + (days.length ? days.map((d) => group(`${fmtDate(d)} · ${longDate(d)}`.replace(/^(Hoy|Mañana) · /, '$1 · '), byDay[d].sort(sortTasks))).join('') : empty('Nada programado'));
  },
  calendar() {
    const sel = VIEW.day || today(); const base = parseD(VIEW.month || sel.slice(0, 7) + '-01');
    const y = base.getUTCFullYear(), m = base.getUTCMonth();
    const first = isoD(new Date(Date.UTC(y, m, 1)));
    const start = addDays(first, -((dow(first) + 6) % 7));
    const marks = {};
    for (const t of S.tasks) if (isOpen(t) && mine(t)) { if (t.due_date) (marks[t.due_date] = marks[t.due_date] || []).push(''); if (t.deadline) (marks[t.deadline] = marks[t.deadline] || []).push('red'); }
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i), mk = marks[d] || [];
      cells += `<div class="d${parseD(d).getUTCMonth() !== m ? ' out' : ''}${d === sel ? ' sel' : ''}${d === today() ? ' today' : ''}" data-act="calday" data-d="${d}"><span class="n">${parseD(d).getUTCDate()}</span>${mk.slice(0, 2).map((c) => `<i class="${c}"></i>`).join('')}${mk.length > 2 ? `<div class="more">+${mk.length - 2} más</div>` : ''}</div>`;
    }
    const list = S.tasks.filter((t) => mine(t) && (t.due_date === sel || t.deadline === sel || (t.status === 'done' && t.completed_at && localDay(t.completed_at) === sel))).sort(sortTasks);
    const mm = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][m];
    return head('Calendario') + `<div class="cal-head"><button class="icon-btn" data-act="calmove" data-n="-1">${I.back}</button><b>${mm} ${y}</b><button class="icon-btn" data-act="calmove" data-n="1" style="transform:scaleX(-1)">${I.back}</button><button class="btn small" data-act="caltoday">Hoy</button></div>
      <div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((w) => `<div class="wd">${w}</div>`).join('')}${cells}</div>
      <div class="group"><div class="group-h">${esc(longDate(sel))} <span class="count">${list.length}</span></div><div class="list">${list.map((t) => row(t)).join('')}</div></div>${addRow(`data-due="${sel}"`)}`;
  },
  next() {
    const f = VIEW.filter || {};
    let t = S.tasks.filter(actionable);
    if (f.energy) t = t.filter((x) => x.energy === f.energy);
    if (f.maxMin) t = t.filter((x) => x.estimate && x.estimate <= f.maxMin);
    const groups = [['Sin contexto', t.filter((x) => !(x.contexts || []).length)]];
    for (const c of contexts()) groups.push(['@' + c, t.filter((x) => (x.contexts || []).includes(c))]);
    const fl = [f.energy && 'energía ' + f.energy, f.maxMin && '≤ ' + f.maxMin + ' min'].filter(Boolean).join(' · ');
    return head('Próximas acciones') + `<button class="more-row" data-act="nextfilter" style="padding-top:2px"><span>⚲ Filtrar${fl ? ': ' + esc(fl) : ''}</span><span>›</span></button>` +
      (t.length ? groups.map(([n, l]) => group(n, l.sort(sortTasks), { showPrio: false })).join('') : empty('No hay próximas acciones'));
  },
  waiting() {
    const t = S.tasks.filter((x) => x.status === 'waiting' && (x.user_id === ME || x.assignee_id === ME)).sort((a, b) => String(a.waiting_since || '').localeCompare(String(b.waiting_since || '')));
    return head('En espera') + (t.length ? `<div class="list">${t.map((x) => row(x)).join('')}</div>` : empty('Nada en espera'));
  },
  someday() {
    const s = S.tasks.filter((x) => x.status === 'someday' && mine(x)), r = S.tasks.filter((x) => x.status === 'reference' && mine(x));
    const paused = S.projects.filter((p) => p.status === 'paused');
    return head('Algún día / Quizás') + (s.length || r.length || paused.length ? group('Ideas', s) + group('Referencia', r) +
      (paused.length ? `<div class="group"><div class="group-h">Proyectos en pausa <span class="count">${paused.length}</span></div><div class="rows">${paused.map(projRow).join('')}</div></div>` : '') : empty('Nada por aquí', 'Lo que no harás ahora, pero no quieres olvidar.'));
  },
  context() {
    const c = VIEW.ctx, t = S.tasks.filter((x) => actionable(x) && (x.contexts || []).includes(c)).sort(sortTasks);
    return head('@' + c) + (t.length ? `<div class="list">${t.map((x) => row(x)).join('')}</div>` : empty('Nada en este contexto')) + addRow(`data-ctx="${esc(c)}"`);
  },
  filter() {
    const f = (settings().filters || [])[VIEW.i]; if (!f) return head('Filtro') + empty('Este filtro ya no existe');
    let t = S.tasks.filter((x) => isOpen(x) && mine(x) && !x.inbox && !['someday', 'reference'].includes(x.status));
    if (f.contexts && f.contexts.length) t = t.filter((x) => (x.contexts || []).some((c) => f.contexts.includes(c)));
    if (f.maxPriority) t = t.filter((x) => x.priority <= f.maxPriority);
    if (f.project) t = t.filter((x) => x.project_id === f.project);
    if (f.days) t = t.filter((x) => (x.due_date && diffDays(x.due_date, today()) <= f.days) || (x.deadline && diffDays(x.deadline, today()) <= f.days));
    return head(f.name, '', `<button class="icon-btn" data-act="filtermenu">${I.dots}</button>`) + (t.length ? `<div class="list">${t.sort(sortTasks).map((x) => row(x)).join('')}</div>` : empty('Ninguna tarea cumple el filtro'));
  },
  log() {
    const t = S.tasks.filter((x) => x.status === 'done' && x.completed_at && (x.completed_by === ME || mine(x))).sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
    const by = {}; for (const x of t.slice(0, 400)) { const d = localDay(x.completed_at); (by[d] = by[d] || []).push(x); }
    return head('Registro') + (t.length ? Object.keys(by).sort().reverse().map((d) => group(fmtDate(d) + (diffDays(today(), d) > 1 ? ' · ' + longDate(d) : ''), by[d], { log: true })).join('') : empty('Aún no has completado nada'));
  },
  matrix() {
    const soon = addDays(today(), 2), t = S.tasks.filter((x) => isOpen(x) && mine(x) && x.status === 'open' && !x.inbox);
    const urg = (x) => (x.due_date && x.due_date <= soon) || (x.deadline && x.deadline <= soon), imp = (x) => x.priority <= 2;
    const q = (title, sub, color, l) => `<div class="quad"><h3><i class="pdot" style="background:${color}"></i>${title}</h3><small>${sub} · ${l.length}</small>${l.slice(0, 12).map((x) => row(x, { noProject: true })).join('')}</div>`;
    return head('Matriz Eisenhower') + `<div class="matrix">${q('Hacer ya', 'Urgente e importante', 'var(--red)', t.filter((x) => urg(x) && imp(x)))}${q('Planificar', 'Importante', 'var(--sage)', t.filter((x) => !urg(x) && imp(x)))}${q('Delegar', 'Urgente', 'var(--amber)', t.filter((x) => urg(x) && !imp(x)))}${q('Más tarde', 'Ni urgente ni importante', 'var(--ink3)', t.filter((x) => !urg(x) && !imp(x)))}</div><p class="hint">Importante = prioridad 1 o 2. Urgente = fecha o límite en los próximos 2 días.</p>`;
  },
  review() {
    const chk = settings().reviewChecks || {}, rv = settings().reviews || [];
    const projs = activeProjects();
    const items = [
      ['Obtener claridad', [['r1', 'Recoger papeles, notas y apuntes sueltos'], ['r2', 'Procesar la bandeja de entrada', `${inboxTasks().length} pendientes`], ['r3', 'Vaciar la cabeza: anotar todo lo que te preocupa']]],
      ['Ponerse al día', [['r4', 'Revisar la lista de próximas acciones', `${S.tasks.filter(actionable).length} acciones`], ['r5', 'Revisar el calendario de la semana pasada'], ['r6', 'Revisar el calendario de las próximas dos semanas'], ['r7', 'Revisar la lista En espera', `${S.tasks.filter((x) => x.status === 'waiting' && x.user_id === ME).length} elementos`], ['r8', 'Revisar cada proyecto activo', `${projs.length} proyectos`]]],
      ['Ser creativo', [['r9', 'Revisar Algún día / Quizás', `${S.tasks.filter((x) => x.status === 'someday' && mine(x)).length} ideas`], ['r10', 'Anotar ideas y proyectos nuevos']]],
    ];
    const total = 10, done = Object.values(chk).filter(Boolean).length;
    const noNext = projs.filter((p) => !S.tasks.some((t) => t.project_id === p.id && t.status === 'open' && isOpen(t)));
    const due = projs.filter((p) => !p.last_review || diffDays(today(), p.last_review) >= (p.review_every || 7));
    return head('Revisión semanal', 'Última: ' + (rv.length ? esc(fmtDate(rv[rv.length - 1]).toLowerCase()) : 'nunca')) +
      `<div class="card rev"><div class="bar"><i style="width:${done / total * 100}%"></i></div>${items.map(([h, l]) => `<h3>${h}</h3>${l.map(([k, txt, c]) => `<label class="rev-i${chk[k] ? ' done' : ''}"><input type="checkbox" data-act="revcheck" data-k="${k}" ${chk[k] ? 'checked' : ''}><span>${txt}</span>${c ? `<span class="c">${c}</span>` : ''}</label>`).join('')}`).join('')}
      <div style="margin-top:12px"><button class="btn primary" style="width:100%" data-act="revdone">✓ Marcar revisión como completada</button></div></div>` +
      (noNext.length ? `<div class="group"><div class="group-h red">Proyectos sin próxima acción <span class="count">${noNext.length}</span></div><div class="rows">${noNext.map(projRow).join('')}</div></div>` : '') +
      (due.length ? `<div class="group"><div class="group-h">Proyectos por revisar <span class="count">${due.length}</span></div><div class="rows">${due.map(projRow).join('')}</div></div>` : '');
  },
  projects() {
    const act = activeProjects(), other = S.projects.filter((p) => p.status !== 'active');
    return head('Proyectos', '', `<div class="ph-btns"><button class="btn outline small" data-act="join"><svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 8v6M14 11h6"/></svg>Unirme</button><button class="btn primary small" data-act="newproj">+ Nuevo</button></div>`) +
      (act.length ? `<div class="rows">${act.map(projRow).join('')}</div>` : empty('Aún no hay proyectos', 'Un proyecto es cualquier resultado que necesita más de un paso.')) +
      (other.length ? `<div class="group"><div class="group-h">En pausa y completados <span class="count">${other.length}</span></div><div class="rows">${other.map(projRow).join('')}</div></div>` : '');
  },
  project() { return projectView(); },
  focus() { return focusView(); },
  stats() { return statsView(); },
  settings() { return settingsView(); },
};
function projRow(p) {
  const open = S.tasks.filter((t) => t.project_id === p.id && isOpen(t)).length;
  return `<button class="r" ${goAttr({ name: 'project', id: p.id })}><i class="pdot" style="background:${esc(p.color)}"></i><span class="grow name">${esc(p.name)}${isPrivate(p.id) ? ` <span class="priv-ic" title="Tareas ocultas">${LOCK}</span>` : ''}${p.status !== 'active' ? ` <span class="muted">· ${p.status === 'paused' ? 'en pausa' : 'completado'}</span>` : ''}</span>${isShared(p.id) ? `<svg class="ic muted" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>` : ''}<span class="val">${open || ''}</span><span class="chev">›</span></button>`;
}
const ring = (pct, color, size = 38) => `<div class="proj-ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 38 38" style="width:${size}px;height:${size}px"><circle cx="19" cy="19" r="16" stroke="var(--surface2)"/><circle cx="19" cy="19" r="16" stroke="${color}" stroke-dasharray="${(pct / 100 * 100.5).toFixed(1)} 200"/></svg><b>${Math.round(pct)}%</b></div>`;

function projectView() {
  const p = PJ(VIEW.id); if (!p) return head('Proyecto') + empty('Este proyecto ya no existe o te han quitado el acceso.');
  const all = S.tasks.filter((t) => t.project_id === p.id), open = all.filter(isOpen), done = all.filter((t) => !isOpen(t));
  const pct = all.length ? done.length / all.length * 100 : 0;
  const board = VIEW.board, own = isOwner(p.id), sections = p.sections || [];
  const priv = isPrivate(p.id), hidden = priv && !REVEAL.has(p.id);
  const ed = VIEW.secEdit && VIEW.secEdit.pid === p.id ? VIEW.secEdit : null;
  const secs = [null, ...sections];
  const orphan = open.filter((t) => t.section && !sections.includes(t.section));
  const secTasks = (s) => s === null ? [...open.filter((t) => !t.section), ...orphan].sort(sortTasks) : open.filter((t) => t.section === s).sort(sortTasks);
  const mem = membersOf(p.id);
  // Cabecera de sección: el nombre se toca para renombrar; ⋯ abre mover, añadir debajo y eliminar
  const secHead = (s, n) => {
    if (s && ed && ed.mode === 'ren' && ed.s === s) return `<div class="group-h sec-h">${secInput(s, 'Nombre de la sección')}</div>`;
    const name = s ? (own ? `<button class="sec-name" data-act="secren" data-s="${esc(s)}" title="Renombrar">${esc(s)}</button>` : esc(s)) : esc(board ? 'Sin sección' : 'Tareas');
    return `<div class="group-h sec-h">${name} <span class="count">${n}</span><span class="grow"></span>${s && own ? `<button class="sec-dots" data-act="secmenu" data-s="${esc(s)}" aria-label="Opciones de la sección">${I.dots}</button>` : ''}</div>`;
  };
  const addAfter = (s) => ed && ed.mode === 'add' && ed.after === s ? `<div class="sec-new">${secInput('', 'Nombre de la nueva sección')}</div>` : '';
  const addSecBtn = own && !(ed && ed.mode === 'add' && ed.after === undefined) ? `<button class="sec-add" data-act="secadd"><svg class="ic" viewBox="0 0 24 24"><path d="M4 7h10M4 12h10M4 17h6M18 14v6M15 17h6"/></svg>Añadir sección</button>` : '';
  const addSecInput = ed && ed.mode === 'add' && ed.after === undefined ? `<div class="sec-new">${secInput('', 'Nombre de la nueva sección')}</div>` : '';
  let body;
  if (board) body = `<div class="board">${secs.map((s) => { const l = secTasks(s); return `<div class="col">${secHead(s, l.length)}<div class="list">${l.map((t) => row(t, { noProject: true })).join('')}</div>${addRow(`data-project="${p.id}" data-section="${esc(s || '')}"`)}</div>${s ? addAfter(s) : ''}`; }).join('')}${own ? `<div class="col col-add">${addSecInput || addSecBtn}</div>` : ''}</div>`;
  else body = secs.map((s) => {
    const l = secTasks(s);
    if (!s && !l.length && sections.length) return '';
    return `<div class="group">${secHead(s, l.length)}${l.length ? `<div class="list">${l.map((t) => row(t, { noProject: true })).join('')}</div>` : ''}${addRow(`data-project="${p.id}" data-section="${esc(s || '')}"`)}</div>${s ? addAfter(s) : ''}`;
  }).join('') + addSecInput + addSecBtn;
  return `<div class="p-head">${ring(pct, p.color)}<div class="t"><h1>${esc(p.name)}</h1><small>${open.length} abiertas${p.status !== 'active' ? ' · ' + (p.status === 'paused' ? 'en pausa' : 'completado') : ''}</small></div>
      ${priv ? `<button class="icon-btn eye${hidden ? '' : ' on'}" data-act="veil" aria-label="${hidden ? 'Mostrar tareas' : 'Ocultar tareas'}" title="${hidden ? 'Mostrar tareas' : 'Ocultar tareas'}">${hidden ? EYE_OFF : EYE}</button>` : ''}
      <div class="seg"><button class="${board ? '' : 'on'}" data-act="pmode" data-b="0" aria-label="Lista"><svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg></button><button class="${board ? 'on' : ''}" data-act="pmode" data-b="1" aria-label="Tablero"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="16" rx="1.5"/><rect x="14" y="4" width="6" height="10" rx="1.5"/></svg></button></div>
      <button class="icon-btn" ${goAttr({ name: 'stats', tab: 'project', id: p.id })} aria-label="Estadísticas"><svg viewBox="0 0 24 24"><path d="M4 20h16M7 17V10M12 17V5M17 17v-4"/></svg></button>
      <button class="icon-btn" data-act="share" aria-label="Compartir">${mem.length > 1 ? `<span style="display:flex">${mem.slice(0, 2).map((m) => `<span class="avatar" style="width:22px;height:22px;font-size:9px">${esc(initials(m.display_name))}</span>`).join('')}</span>` : '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>'}</button>
      <button class="icon-btn" data-act="projmenu" aria-label="Más">${I.dots}</button></div>
    ${p.goal ? `<div class="goal${hidden ? ' veil-txt' : ''}">${hidden ? veilText(p.id + 'goal') : esc(p.goal)}</div>` : ''}${body}
    ${done.length ? `<button class="more-row" data-act="showdone"><span>${done.length} ${done.length === 1 ? 'completada' : 'completadas'}</span><span>${VIEW.showDone ? '⌄' : '›'}</span></button>${VIEW.showDone ? `<div class="list">${done.sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))).map((t) => row(t, { noProject: true, log: true })).join('')}</div>` : ''}` : ''}`;
}
const secInput = (v, ph) => `<input class="field sec-input" id="sec-input" value="${esc(v)}" placeholder="${esc(ph)}" maxlength="60" autocomplete="off" enterkeyhint="done"><button class="btn primary small" id="sec-ok">${v ? 'Guardar' : 'Añadir'}</button><button class="icon-btn" id="sec-cancel" aria-label="Cancelar">${I.close}</button>`;

/* ---------- Secciones: añadir, renombrar, mover y eliminar desde el propio proyecto ---------- */
function editSection(ed) { VIEW.secEdit = ed; render(); }
function bindSecInput() {
  const i = $('#sec-input'); if (!i) return;
  const ed = VIEW.secEdit; if (!ed) return;
  const close = () => { VIEW.secEdit = null; render(); };
  const commit = (keepOpen) => {
    const v = i.value.trim().slice(0, 60), p = PJ(ed.pid); if (!p) return close();
    if (!v) return close();
    if (ed.mode === 'add') {
      if ((p.sections || []).includes(v)) { toast('Ya hay una sección con ese nombre', null, null, true); i.select(); return; }
      secOp(p.id, 'add', ed.after !== undefined ? { s: v, after: ed.after } : { s: v });
      if (keepOpen && ed.after === undefined) { render(); bindSecInput(); const j = $('#sec-input'); if (j) j.value = ''; return; } // seguir añadiendo
    } else if (ed.mode === 'ren' && v !== ed.s) {
      if ((p.sections || []).includes(v)) { toast('Ya hay una sección con ese nombre', null, null, true); i.select(); return; }
      secOp(p.id, 'ren', { s: ed.s, n: v });
      for (const t of S.tasks.filter((x) => x.project_id === p.id && x.section === ed.s)) upd('tasks', t.id, { section: v });
    }
    close();
  };
  i.focus(); if (ed.mode === 'ren') i.select();
  i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(true); } if (e.key === 'Escape') { e.preventDefault(); close(); } };
  $('#sec-ok').onclick = (e) => { e.stopPropagation(); commit(false); };
  $('#sec-cancel').onclick = (e) => { e.stopPropagation(); close(); };
}
function deleteSection(pid, s) {
  const tasks = S.tasks.filter((t) => t.project_id === pid && t.section === s);
  const list = (PJ(pid) || {}).sections || [], at = list.indexOf(s), back = at > 0 ? { after: list[at - 1] } : { first: true };
  if (tasks.some(isOpen) && !confirm(`¿Eliminar la sección «${s}»? Sus ${tasks.filter(isOpen).length} tareas pasarán a «Sin sección».`)) return;
  secOp(pid, 'del', { s });
  for (const t of tasks) upd('tasks', t.id, { section: null });
  render();
  toast(`Sección «${s}» eliminada`, 'Deshacer', () => { secOp(pid, 'add', Object.assign({ s }, back)); for (const t of tasks) upd('tasks', t.id, { section: s }); render(); });
}

/* ---------- Acciones de las vistas ---------- */
const ACT = {
  clarify: () => openClarify(VIEW.name === 'inbox' ? null : procIds()),
  calday: (d) => { VIEW.day = d.d; render(); },
  calmove: (d) => { const b = parseD((VIEW.month || (VIEW.day || today()).slice(0, 7) + '-01')); b.setUTCMonth(b.getUTCMonth() + Number(d.n)); VIEW.month = isoD(b); render(); },
  caltoday: () => { VIEW.day = today(); VIEW.month = null; render(); },
  nextfilter: () => openPop({ title: 'Filtrar', items: [{ label: 'Sin filtro', v: {} }, { label: 'Energía baja', v: { energy: 'baja' } }, { label: 'Energía media', v: { energy: 'media' } }, { label: 'Energía alta', v: { energy: 'alta' } }, { label: '15 minutos o menos', v: { maxMin: 15 } }, { label: '30 minutos o menos', v: { maxMin: 30 } }], onPick: (it) => { VIEW.filter = it.v; render(); } }),
  revcheck: (d, el) => { const c = Object.assign({}, settings().reviewChecks || {}); c[d.k] = el.checked; saveSettings({ reviewChecks: c }); render(); },
  revdone: () => { const rv = (settings().reviews || []).filter((x) => x !== today()); rv.push(today()); saveSettings({ reviews: rv.slice(-60), reviewChecks: {} }); for (const p of activeProjects()) if (p.owner_id === ME) upd('projects', p.id, { last_review: today() }); toast('Revisión semanal completada. Buen trabajo.'); render(); },
  join: () => joinProject(),
  newproj: () => editProject(null),
  pmode: (d) => { VIEW.board = d.b === '1'; render(); },
  showdone: () => { VIEW.showDone = !VIEW.showDone; render(); },
  share: () => openShare(VIEW.id),
  projmenu: () => projectMenu(VIEW.id),
  secmenu: (d) => sectionMenu(VIEW.id, d.s),
  secadd: () => editSection({ pid: VIEW.id, mode: 'add' }),
  secren: (d) => editSection({ pid: VIEW.id, mode: 'ren', s: d.s }),
  veil: () => toggleReveal(VIEW.id),
  filtermenu: () => openPop({ title: 'Filtro', items: [{ label: 'Eliminar filtro', v: 'del' }], onPick: () => { const f = (settings().filters || []).slice(); f.splice(VIEW.i, 1); saveSettings({ filters: f }); go({ name: 'today' }); } }),
};
function quickDefaults(ds = {}) {
  const d = {};
  if (ds.project) { d.project_id = ds.project; if (ds.section) d.section = ds.section; }
  if (ds.due) d.due_date = ds.due === 'today' ? today() : ds.due;
  if (ds.ctx) d.contexts = [ds.ctx];
  return d;
}
function viewDefaults() {
  if (VIEW.name === 'project' && PJ(VIEW.id)) return { project_id: VIEW.id };
  if (VIEW.name === 'today') return { due_date: today() };
  if (VIEW.name === 'calendar' && VIEW.day) return { due_date: VIEW.day };
  if (VIEW.name === 'context') return { contexts: [VIEW.ctx] };
  return {};
}

/* ---------- Completar ---------- */
function toggleDone(id) {
  const t = S.tasks.find((x) => x.id === id); if (!t) return;
  const prev = t.status;
  if (t.status === 'done') { upd('tasks', id, { status: 'open', completed_at: null, completed_by: null }); render(); refreshSheet(); return; }
  upd('tasks', id, { status: 'done', completed_at: new Date().toISOString(), completed_by: ME, inbox: false });
  let next = null;
  if (t.recur) {
    const base = t.due_date || t.deadline || today();
    let nd = nextRecur(t.recur, base); while (nd < today()) nd = nextRecur(t.recur, nd);
    next = Object.assign({}, t, { id: uid(), user_id: ME, assignee_id: t.assignee_id, inbox: false, status: 'open', completed_at: null, completed_by: null, focus_min: 0, photos: [], needs_parse: false, created_on: today(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      subtasks: (t.subtasks || []).map((s) => ({ t: s.t, done: false })), due_date: t.due_date ? nd : null, deadline: t.deadline ? addDays(t.deadline, diffDays(nd, base)) : null, source: 'app' });
    ins('tasks', next);
  }
  if (navigator.vibrate) navigator.vibrate(12);
  render(); refreshSheet();
  toast(next ? 'Completada · siguiente: ' + fmtDate(next.due_date || next.deadline).toLowerCase() : 'Completada', 'Deshacer', () => { upd('tasks', id, { status: prev, completed_at: null, completed_by: null }); if (next) del('tasks', next.id); render(); refreshSheet(); });
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, action, fn, err = false) {
  const el = $('#toast'); clearTimeout(toastTimer);
  el.className = (err ? 'err' : '') + (sheetOpen() ? ' low' : ''); el.hidden = false; // con una hoja abierta, abajo para no tapar sus botones
  el.innerHTML = `<span class="grow">${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}<button class="x" aria-label="Cerrar">✕</button>`;
  if (action) el.querySelector('button').onclick = () => { el.hidden = true; fn && fn(); };
  el.querySelector('.x').onclick = () => { el.hidden = true; };
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 5000 : 3200);
}

/* ---------- Drawer ---------- */
let drawerMore = LS.get('summit-drawer-more', false);
// En pantallas anchas (PC) el menú se puede fijar a la izquierda; la preferencia se recuerda en el dispositivo
let PINNED = LS.get('summit-pin', false);
const wide = () => (window.matchMedia ? matchMedia('(min-width: 1024px)').matches : window.innerWidth >= 1024);
const pinnedNow = () => PINNED && wide();
function applyPin() {
  const on = pinnedNow();
  document.body.classList.toggle('pinned', on);
  if (on) { $('#drawer').hidden = false; $('#drawer-scrim').hidden = true; if (S.profile) renderDrawer(); }
  else if (!$('#drawer').hidden && $('#drawer-scrim').hidden) $('#drawer').hidden = true;
}
function togglePin() {
  PINNED = !PINNED; LS.set('summit-pin', PINNED);
  if (!PINNED) { document.body.classList.remove('pinned'); $('#drawer').hidden = true; $('#drawer-scrim').hidden = true; }
  applyPin();
  toast(PINNED ? 'Menú fijado' : 'Menú suelto');
}
function toggleSidebar() { if (wide()) togglePin(); else if ($('#drawer').hidden) openDrawer(); else closeDrawer(); }
function openDrawer() { if (pinnedNow()) return; $('#drawer').hidden = false; $('#drawer-scrim').hidden = false; $('#drawer-scrim').onclick = closeDrawer; renderDrawer(); }
function closeDrawer() { if (pinnedNow()) return; $('#drawer').hidden = true; $('#drawer-scrim').hidden = true; }
function renderDrawer() {
  const on = (n, extra = {}) => VIEW.name === n && Object.keys(extra).every((k) => VIEW[k] === extra[k]) ? ' on' : '';
  const item = (v, icon, label, right = '') => `<button class="d-item${on(v.name, Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'name')))}" ${goAttr(v)}>${icon}<span>${esc(label)}</span>${right}</button>`;
  const nToday = S.tasks.filter((t) => overdue(t) && mine(t)).length + todayTasks().length;
  const filters = settings().filters || [];
  const name = (S.profile && S.profile.name) || MENAME || MEMAIL;
  const d = $('#drawer');
  d.innerHTML = `<div class="d-brand"><span class="mark">${LOGO}</span><b>Summit</b><button class="d-pin${PINNED ? ' on' : ''}" data-dact="pin" aria-label="${PINNED ? 'Soltar el menú' : 'Fijar el menú'}" title="${PINNED ? 'Soltar el menú (M)' : 'Fijar el menú (M)'}">${PINNED ? '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/><path d="M14.5 10l-2 2 2 2"/></svg>' : '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/><path d="M12.5 10l2 2-2 2"/></svg>'}</button></div>
    <div class="scroll">
    ${item({ name: 'inbox' }, I.inbox, 'Bandeja', inboxTasks().length ? `<span class="n plain">${inboxTasks().length}</span>` : '')}
    ${item({ name: 'today' }, '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>', 'Hoy', nToday ? `<span class="n">${nToday}</span>` : '')}
    ${item({ name: 'upcoming' }, '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3"/></svg>', 'Próximos')}
    ${item({ name: 'calendar' }, I.soon, 'Calendario')}
    <div class="d-head"><span class="grow">Proyectos</span><button data-dact="join" aria-label="Unirme"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 8v6M14 11h6"/></svg></button><button data-dact="newproj" aria-label="Nuevo proyecto"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>
    ${activeProjects().map((p) => `<button class="d-item${VIEW.name === 'project' && VIEW.id === p.id ? ' on' : ''}" ${goAttr({ name: 'project', id: p.id })}><i class="pdot" style="background:${esc(p.color)}"></i><span>${esc(p.name)}</span>${isShared(p.id) ? '<svg class="ic" style="margin-left:auto" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7"/></svg>' : ''}</button>`).join('')}
    <button class="d-more${drawerMore ? ' open' : ''}" data-dact="more"><span>Más</span><span>${drawerMore ? '⌄' : '›'}</span></button>
    ${drawerMore ? `
      ${item({ name: 'next' }, '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M10 9l3 3-3 3"/></svg>', 'Próximas acciones')}
      ${item({ name: 'waiting' }, I.wait.replace('class="ic"', ''), 'En espera')}
      ${item({ name: 'someday' }, I.cloud, 'Algún día / Quizás')}
      ${item({ name: 'review' }, I.rep.replace('class="ic"', ''), 'Revisión semanal', reviewDue() ? '<i class="alert"></i>' : '')}
      ${item({ name: 'matrix' }, '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>', 'Matriz Eisenhower')}
      ${item({ name: 'focus' }, I.focus, 'Enfoque')}
      ${item({ name: 'log' }, I.book, 'Registro')}
      <div class="d-head"><span class="grow">Filtros</span><button data-dact="newfilter" aria-label="Nuevo filtro"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>
      ${filters.map((f, i) => item({ name: 'filter', i }, '<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>', f.name)).join('')}
      <div class="d-head"><span class="grow">Contextos</span></div>
      ${contexts().map((c) => item({ name: 'context', ctx: c }, I.at.replace('class="ic"', ''), c)).join('')}` : ''}
    </div>
    <div class="d-foot">${item({ name: 'settings' }, I.gear, 'Ajustes')}
      <button class="d-user" ${goAttr({ name: 'settings', page: 'cuenta' })}><span class="avatar">${esc(initials(name))}</span><span style="min-width:0"><b>${esc(name)}</b><small>${esc(MEMAIL)}</small></span><i class="on-dot${OFFLINE ? ' off' : ''}"></i></button></div>`;
  $$('[data-go]', d).forEach((b) => b.onclick = () => go(JSON.parse(b.dataset.go)));
  $$('[data-dact]', d).forEach((b) => b.onclick = () => {
    const a = b.dataset.dact;
    if (a === 'more') { drawerMore = !drawerMore; LS.set('summit-drawer-more', drawerMore); renderDrawer(); }
    if (a === 'pin') togglePin();
    if (a === 'join') { closeDrawer(); joinProject(); }
    if (a === 'newproj') { closeDrawer(); editProject(null); }
    if (a === 'newfilter') { closeDrawer(); editFilter(); }
  });
}

/* ---------- Hoja (sheet) genérica ---------- */
let sheetCtx = null, sheetTimer = null;
const reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const sheetOpen = () => { const sh = $('#sheet'); return !!sh && !sh.hidden && !sh.classList.contains('closing'); };
function resetSheetStyle() { const sh = $('#sheet'), sc = $('#sheet-scrim'); sh.style.transform = ''; sh.style.transition = ''; sc.style.opacity = ''; sc.style.transition = ''; sh.classList.remove('closing'); sc.classList.remove('closing'); }
function openSheet(html, o = {}) {
  closePop(); clearTimeout(sheetTimer); resetSheetStyle();
  const tt = $('#toast'); if (tt && !tt.hidden) { clearTimeout(toastTimer); tt.hidden = true; } // al abrir otra hoja (p. ej. capturar la siguiente) el aviso se va
  const sh = $('#sheet'); sh.className = o.top ? 'top' : o.full ? 'full' : '';
  sh.innerHTML = (o.top ? '' : '<div class="sheet-grab"></div>') + html;
  sh.hidden = false; $('#sheet-scrim').hidden = false;
  $('#sheet-scrim').onclick = () => { if (!o.modal) closeSheet(); };
  sheetCtx = o; return sh;
}
// instant = true cierra sin animación (por ejemplo, al terminar el gesto de arrastre, que ya ha animado la salida)
function closeSheet(instant) {
  const sh = $('#sheet'); if (!sh || sh.hidden || sh.classList.contains('closing')) return;
  if (sheetCtx && sheetCtx.onClose) sheetCtx.onClose();
  sheetCtx = null; closePop();
  const done = () => { sh.hidden = true; $('#sheet-scrim').hidden = true; sh.innerHTML = ''; resetSheetStyle(); };
  if (instant === true || reducedMotion()) { clearTimeout(sheetTimer); done(); return; }
  sh.classList.add('closing'); $('#sheet-scrim').classList.add('closing');
  clearTimeout(sheetTimer); sheetTimer = setTimeout(done, 190);
}
function refreshSheet() { if (sheetCtx && sheetCtx.refresh) sheetCtx.refresh(); }

/* ---------- Selector flotante ---------- */
// POPK: estado del teclado en el selector abierto (elemento resaltado y función para redibujar)
let POPK = { i: -1, draw: null, items: [] };
function openPop({ title, items, search, multi, onPick, onDone, kb }) {
  const p = $('#pop'); p.hidden = false; p.className = kb ? 'kb' : '';
  POPK = { i: Math.max(0, items.findIndex((x) => x.sel)), draw: null, items };
  let sel = new Set(items.filter((i) => i.sel).map((i) => i.label));
  const draw = (q = '') => {
    const nq = norm(q);
    const l = items.filter((i) => !nq || norm(i.label).includes(nq));
    $('.pop-list', p).innerHTML = l.map((i, n) => `<button class="pop-i${(multi ? sel.has(i.label) : i.sel) ? ' sel' : ''}${n === POPK.i ? ' kfocus' : ''}" data-n="${items.indexOf(i)}">${i.icon || ''}<span>${esc(i.label)}</span>${i.k ? `<span class="k">${esc(i.k)}</span>` : ''}${(multi ? sel.has(i.label) : i.sel) ? '<span class="tick">✓</span>' : ''}</button>`).join('') || '<div class="hint" style="padding:8px">Sin resultados</div>';
    $$('.pop-i', p).forEach((b) => b.onclick = () => {
      const it = items[Number(b.dataset.n)];
      if (multi) { sel.has(it.label) ? sel.delete(it.label) : sel.add(it.label); draw($('.pop-search', p) ? $('.pop-search', p).value : ''); onPick && onPick(it, sel.has(it.label)); }
      else { closePop(); onPick && onPick(it); }
    });
  };
  p.innerHTML = `<div class="pop-h"><span>${esc(title)}</span>${multi ? '<button class="btn primary small" data-done>Listo</button>' : ''}</div>${search ? '<input class="field pop-search" placeholder="Buscar…">' : ''}<div class="pop-list"></div>`;
  POPK.draw = draw;
  draw();
  if (search) { const s = $('.pop-search', p); s.oninput = () => { POPK.i = 0; draw(s.value); }; if (!('ontouchstart' in window)) s.focus(); }
  if (multi) $('[data-done]', p).onclick = () => { closePop(); onDone && onDone([...sel]); };
  setTimeout(() => document.addEventListener('pointerdown', popOutside, true), 0);
}
function popOutside(e) { const p = $('#pop'); if (p && !p.hidden && !p.contains(e.target)) { if (e.target.closest && e.target.closest('.qchip,.kv button.v')) return; const done = $('[data-done]', p); if (done) done.click(); else closePop(); } }
function closePop() { const p = $('#pop'); if (p) { p.hidden = true; p.innerHTML = ''; } POPK = { i: -1, draw: null, items: [] }; document.removeEventListener('pointerdown', popOutside, true); }
// Teclado dentro del selector: ↑ ↓ para moverse, Enter para elegir, Esc para cerrar, y la tecla rápida de cada opción
function popKey(e) {
  const p = $('#pop'); if (!p || p.hidden) return false;
  if (e.target && e.target.closest && e.target.closest('input,textarea') && !p.contains(e.target)) return false;
  const btns = $$('.pop-i', p);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!btns.length) return true; POPK.i = (POPK.i + (e.key === 'ArrowDown' ? 1 : btns.length - 1)) % btns.length; POPK.draw($('.pop-search', p) ? $('.pop-search', p).value : ''); const b = $$('.pop-i', p)[POPK.i]; if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); return true; }
  if (e.key === 'Enter') { e.preventDefault(); const b = btns[Math.max(0, POPK.i)]; if (b) b.click(); else { const d = $('[data-done]', p); if (d) d.click(); } return true; }
  if (e.key === 'Escape') { e.preventDefault(); const d = $('[data-done]', p); if (d) d.click(); else closePop(); return true; }
  const typing = e.target && e.target.classList && e.target.classList.contains('pop-search');
  if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const hit = btns.find((b) => { const it = POPK.items[Number(b.dataset.n)]; return it && it.hot && it.hot === e.key.toLowerCase(); });
    if (hit) { e.preventDefault(); hit.click(); return true; }
  }
  return false;
}

const SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>';
function pickDate(title, cur, cb, kb) {
  const t = today(), sat = (() => { let d = t; while (dow(d) !== 6) d = addDays(d, 1); return d === t ? addDays(t, 7) : d; })(), mon = (() => { let d = addDays(t, 1); while (dow(d) !== 1) d = addDays(d, 1); return d; })();
  const short = (d) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dow(d)];
  openPop({ title, kb, items: [
    { label: 'Hoy', icon: SUN, k: short(t), v: t, sel: cur === t, hot: 'h' },
    { label: 'Mañana', icon: '<svg viewBox="0 0 24 24"><path d="M12 4v3M5 12H2M22 12h-3M7 17a5 5 0 0 1 10 0M3 20h18"/></svg>', k: short(addDays(t, 1)), v: addDays(t, 1), sel: cur === addDays(t, 1), hot: 'm' },
    { label: 'Fin de semana', icon: I.soon, k: short(sat), v: sat, sel: cur === sat, hot: 'f' },
    { label: 'Próxima semana', icon: I.soon, k: short(mon), v: mon, sel: cur === mon, hot: 's' },
    { label: cur && ![t, addDays(t, 1), sat, mon].includes(cur) ? 'Elegida: ' + fmtDate(cur) : 'Elegir fecha…', icon: I.soon, v: 'pick', sel: cur && ![t, addDays(t, 1), sat, mon].includes(cur) },
    { label: 'Sin fecha', icon: I.close, v: null, sel: !cur, hot: 'x' },
  ], onPick: (it) => { if (it.v === 'pick') nativeDate(cur, cb); else cb(it.v); } });
}
function nativeDate(cur, cb) {
  const i = document.createElement('input'); i.type = 'date'; i.value = cur || today();
  i.style.cssText = 'position:fixed;left:50%;top:40%;opacity:0;width:1px;height:1px';
  document.body.appendChild(i);
  i.onchange = () => { if (i.value) cb(i.value); i.remove(); };
  i.onblur = () => setTimeout(() => i.remove(), 400);
  try { i.showPicker ? i.showPicker() : i.click(); } catch (_) { i.focus(); i.click(); }
}
function pickProject(cur, cb, o = {}) {
  const items = [{ label: 'Bandeja', icon: I.inbox, v: null, sel: !cur }, ...activeProjects().map((p) => ({ label: p.name, icon: `<i class="pdot" style="background:${esc(p.color)};margin:0 4px"></i>`, v: p.id, sel: p.id === cur }))];
  openPop({ title: 'Mover a proyecto', search: true, items, kb: o.kb, onPick: (it) => cb(it.v) });
}
function pickPriority(cur, cb, kb) {
  const c = ['var(--red)', 'var(--amber)', 'var(--blue)', 'var(--ink3)'];
  openPop({ title: 'Prioridad', kb, items: [1, 2, 3, 4].map((n) => ({ label: n < 4 ? 'Prioridad ' + n : 'Sin prioridad', icon: `<i class="pdot" style="background:${c[n - 1]};margin:0 4px"></i>`, k: String(n), v: n, sel: cur === n, hot: String(n) })), onPick: (it) => cb(it.v) });
}
function pickContexts(cur, cb, kb) {
  openPop({ title: 'Contextos', search: true, multi: true, kb, items: contexts().map((c) => ({ label: '@' + c, v: c, sel: (cur || []).includes(c) })), onDone: (sel) => cb(sel.map((s) => s.replace(/^@/, ''))) });
}

/* ---------- Añadir rápido (sintaxis de Todoist) ----------
   #proyecto  /sección  @contexto o %contexto  +persona  p1–p4  {fecha límite}
   Fechas en lenguaje natural: hoy, mañana, pasado mañana, el viernes, 3/11, en 5 días, fin de semana,
   próxima semana, y horas (10:00, a las 9:30). */
function nextWeekday(i, from) { let n = addDays(from || today(), 1); while (dow(n) !== i) n = addDays(n, 1); return n; }
function weekendDay() { const t = today(); return dow(t) === 6 ? addDays(t, 7) : nextWeekday(6); }
// Convierte una expresión de fecha en AAAA-MM-DD (o null si no la reconoce)
function parseDateWord(w) {
  const t = today(), s = norm(w).replace(/^(el|para|hasta)/, '');
  if (!s) return null;
  if (s === 'hoy') return t;
  if (s === 'manana') return addDays(t, 1);
  if (s === 'pasadomanana') return addDays(t, 2);
  if (s === 'findesemana' || s === 'finde' || s === 'elfindesemana') return weekendDay();
  if (s === 'proximasemana' || s === 'semanaqueviene' || s === 'lasemanaqueviene') return nextWeekday(1);
  const i = DIAS.findIndex((d) => norm(d) === s); if (i >= 0) return nextWeekday(i);
  let m = s.match(/^en(\d{1,3})dias?$/); if (m) return addDays(t, Number(m[1]));
  m = s.match(/^en(\d{1,2})semanas?$/); if (m) return addDays(t, 7 * Number(m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]); if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    let y = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : Number(t.slice(0, 4));
    const iso = (yy) => `${yy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!m[3] && iso(y) < t) y += 1;
    return iso(y);
  }
  return null;
}
const DATE_PHRASES = /(^|\s)((?:el\s|para\s)?(?:pasado\s+ma[ñn]ana|ma[ñn]ana|hoy|fin\s+de\s+semana|finde|pr[oó]xima\s+semana|la\s+semana\s+que\s+viene|en\s+\d{1,3}\s+d[ií]as?|en\s+\d{1,2}\s+semanas?|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2}))(?=\s|$)/i;
function parseQuick(text, base = {}) {
  const out = { title: text, project_id: null, section: null, contexts: [], priority: 0, due_date: null, due_time: null, deadline: null, assignee: null, tokens: [] };
  let s = ' ' + String(text || '').replace(/\s+/g, ' ') + ' ';
  const take = (re, fn) => { s = s.replace(re, (...a) => { const r = fn(...a); if (r === false) return a[0]; return ' '; }); };
  // Fecha límite entre llaves: {viernes}, {3/11}
  take(/\{([^}]*)\}/g, (m, w) => { const d = parseDateWord(w); if (!d) return false; out.deadline = d; out.tokens.push('deadline'); });
  // Prioridad: p1–p4 (Todoist). También se acepta !1–!4 por compatibilidad con versiones anteriores
  take(/\s[pP!]([1-4])(?=\s)/g, (m, n) => { out.priority = Number(n); out.tokens.push('priority'); });
  // Proyecto
  take(/\s#([\p{L}\d_.-]+)(?=\s)/gu, (m, c) => { const f = activeProjects().find((p) => norm(p.name) === norm(c)) || activeProjects().find((p) => norm(p.name).startsWith(norm(c))); if (!f) return false; out.project_id = f.id; out.tokens.push('project'); });
  // Sección (del proyecto escrito o del que ya estaba elegido)
  take(/\s\/([\p{L}\d_.-]+)(?=\s)/gu, (m, c) => { const p = PJ(out.project_id || base.project_id); const f = p && (p.sections || []).find((x) => norm(x) === norm(c) || norm(x).startsWith(norm(c))); if (!f) return false; out.section = f; out.tokens.push('section'); });
  // Contextos: @ o % (Todoist usa % para etiquetas)
  take(/\s[@%]([\p{L}\d_.-]+)(?=\s)/gu, (m, c) => { const f = contexts().find((x) => norm(x) === norm(c)) || contexts().find((x) => norm(x).startsWith(norm(c))); if (!f) return false; out.contexts.push(f); out.tokens.push('ctx'); });
  // Persona asignada (solo en proyectos compartidos)
  take(/\s\+([\p{L}\d_.-]+)(?=\s)/gu, (m, c) => { const pid = out.project_id || base.project_id; const mm = pid && membersOf(pid).find((x) => norm(x.display_name).startsWith(norm(c)) || (norm(c) === 'yo' && x.user_id === ME)); if (!mm) return false; out.assignee = mm.user_id; out.tokens.push('assignee'); });
  // Hora
  take(/\s(?:a\s+las\s+)?(\d{1,2}):(\d{2})(?=\s)/i, (m, h, mi) => { if (Number(h) > 23 || Number(mi) > 59) return false; out.due_time = h.padStart(2, '0') + ':' + mi; out.tokens.push('time'); });
  // Fecha en lenguaje natural (la primera que aparezca)
  const dm = s.match(DATE_PHRASES);
  if (dm) { const d = parseDateWord(dm[2]); if (d) { out.due_date = d; out.tokens.push('date'); s = s.replace(dm[0], dm[1] || ' '); } }
  if (out.due_time && !out.due_date) out.due_date = today();
  out.title = s.replace(/\s+/g, ' ').trim();
  return out;
}
// Sugerencias mientras se escribe tras un símbolo
function quickSuggestions(sym, q, st) {
  const nq = norm(q), match = (x) => !nq || norm(x).includes(nq);
  const pid = st.project_id;
  if (sym === '#') return [{ label: 'Bandeja', v: null, icon: I.inbox }, ...activeProjects().map((p) => ({ label: p.name, v: p.id, icon: `<i class="pdot" style="background:${esc(p.color)}"></i>` }))].filter((x) => match(x.label));
  if (sym === '/') { const p = PJ(pid); return p ? (p.sections || []).filter(match).map((x) => ({ label: x, v: x, icon: I.sub })) : []; }
  if (sym === '@' || sym === '%') return contexts().filter(match).map((x) => ({ label: x, v: x, icon: I.at }));
  if (sym === '+') return pid ? membersOf(pid).map((m) => ({ label: m.user_id === ME ? 'Yo' : m.display_name || 'Miembro', v: m.user_id, icon: I.user })).filter((x) => match(x.label)) : [];
  if (sym === '{') return [['Hoy', today()], ['Mañana', addDays(today(), 1)], ['Fin de semana', weekendDay()], ['Próxima semana', nextWeekday(1)]].map(([l, v]) => ({ label: l, v, icon: I.flag, k: fmtDate(v) })).filter((x) => match(x.label));
  return [];
}
const SYM_NAMES = { '#': 'Proyecto', '/': 'Sección', '@': 'Contexto', '%': 'Contexto', '+': 'Asignar a', '{': 'Fecha límite' };

function openQuick(defaults) {
  defaults = defaults || viewDefaults();
  // set: lo elegido a mano (chips o sugerencias) manda sobre lo escrito
  const st = { project_id: defaults.project_id || null, section: defaults.section || null, due_date: defaults.due_date || null, due_time: null, deadline: null, priority: 4, contexts: defaults.contexts || [], assignee: null, photos: [], set: {} };
  let expanded = !!(st.project_id || st.due_date || st.contexts.length), sugg = [], sel = 0, trig = null;
  const sh = openSheet(`<div class="sheet-body" style="padding-top:14px">
      <textarea class="qa-input grow" id="qa-title" rows="1" placeholder="Nueva tarea" autocomplete="off" enterkeyhint="done" spellcheck="true"></textarea>
      <div class="suggest-box" id="qa-sug" hidden></div>
      <div id="qa-opts"></div>
      <div class="qa-photos" id="qa-ph"></div>
      <div class="qa-hint">#proyecto · /sección · @contexto · p1 · mañana 10:00 · {fecha límite}</div>
      <div class="qa-foot"><label class="icon-btn" aria-label="Foto">${I.cam.replace('class="ic"', '')}<input type="file" accept="image/*" id="qa-file" hidden multiple></label><span class="grow"></span><button class="btn ghost small" id="qa-cancel">Cancelar</button><button class="btn primary small" id="qa-add">Añadir</button></div>
    </div>`, { top: true, quick: true });
  const inp = $('#qa-title', sh);
  // Valores finales = elegidos a mano > escritos en el texto > valores por defecto de la vista
  const merged = () => {
    const p = parseQuick(inp.value, st), pick = (k, pv) => (st.set[k] ? st[k] : (pv || st[k]));
    const project_id = st.set.project_id ? st.project_id : (p.project_id || st.project_id);
    return {
      p, project_id,
      section: st.set.section ? st.section : (p.section || (p.project_id && p.project_id !== st.project_id ? null : st.section)),
      due_date: pick('due_date', p.due_date), due_time: st.set.due_date ? st.due_time : (p.due_time || st.due_time),
      deadline: pick('deadline', p.deadline), priority: st.set.priority ? st.priority : (p.priority || st.priority),
      contexts: [...new Set([...st.contexts, ...p.contexts])], assignee: st.set.assignee ? st.assignee : (p.assignee || st.assignee),
    };
  };
  const drawOpts = () => {
    const o = $('#qa-opts', sh), m = merged();
    if (m.p.tokens.length) expanded = true;
    if (!expanded) { o.innerHTML = `<button class="qa-more" id="qa-more">··· Más</button>`; $('#qa-more', sh).onclick = () => { expanded = true; drawOpts(); }; return; }
    const p = m.project_id && PJ(m.project_id), shared = m.project_id && membersOf(m.project_id).length > 1;
    o.innerHTML = `<div class="qa-chips">
      <button class="qchip${p ? ' set' : ''}" data-c="project">${p ? `<i class="pdot" style="background:${esc(p.color)}"></i>${esc(p.name)}${m.section ? ' · ' + esc(m.section) : ''}` : I.inbox.replace('<svg', '<svg class="ic"') + 'Bandeja'}</button>
      <button class="qchip${m.due_date ? ' set' : ''}" data-c="date">${I.cal}${m.due_date ? esc(fmtDate(m.due_date)) + (m.due_time ? ' ' + esc(m.due_time) : '') : 'Fecha'}</button>
      <button class="qchip${m.deadline ? ' set' : ''}" data-c="deadline">${I.flag}${m.deadline ? esc(fmtDate(m.deadline)) : 'Límite'}</button>
      <button class="qchip${m.priority < 4 ? ' set' : ''}" data-c="prio">${I.flag}${m.priority < 4 ? 'P' + m.priority : 'Prioridad'}</button>
      <button class="qchip${m.contexts.length ? ' set' : ''}" data-c="ctx">${I.at}${m.contexts.length ? m.contexts.map(esc).join(', ') : 'Contexto'}</button>
      ${shared ? `<button class="qchip${m.assignee ? ' set' : ''}" data-c="assignee">${I.user}${m.assignee ? esc(personName(m.assignee)) : 'Asignar'}</button>` : ''}</div>`;
    $$('.qchip', o).forEach((b) => b.onclick = () => {
      const c = b.dataset.c, kb = true, mm = merged();
      if (c === 'project') pickProject(mm.project_id, (v) => { st.project_id = v; st.section = null; st.set.project_id = st.set.section = true; drawOpts(); }, { kb });
      if (c === 'date') pickDate('Fecha', mm.due_date, (v) => { st.due_date = v; st.due_time = v ? mm.due_time : null; st.set.due_date = true; drawOpts(); }, kb);
      if (c === 'deadline') pickDate('Fecha límite', mm.deadline, (v) => { st.deadline = v; st.set.deadline = true; drawOpts(); }, kb);
      if (c === 'prio') pickPriority(mm.priority, (v) => { st.priority = v; st.set.priority = true; drawOpts(); }, kb);
      if (c === 'ctx') pickContexts(mm.contexts, (v) => { st.contexts = v; inp.value = inp.value.replace(/(^|\s)[@%][\p{L}\d_.-]+(?=\s|$)/gu, '$1').replace(/\s+/g, ' '); drawOpts(); }, kb);
      if (c === 'assignee') pickAssignee(mm.project_id, mm.assignee, (v) => { st.assignee = v; st.set.assignee = true; drawOpts(); }, kb);
    });
  };
  const drawPhotos = () => { $('#qa-ph', sh).innerHTML = st.photos.map((b) => `<img src="${URL.createObjectURL(b)}" alt="">`).join(''); };
  // Sugerencias tras #, /, @, %, + o {
  const drawSugg = () => {
    const box = $('#qa-sug', sh), upto = inp.value.slice(0, inp.selectionStart);
    const m = upto.match(/(^|\s)([#/@%+])([^\s#@%+{}]*)$/u) || upto.match(/(\{)([^}]*)$/) && ['', '', '{', upto.match(/\{([^}]*)$/)[1]];
    if (!m) { box.hidden = true; sugg = []; trig = null; return; }
    trig = { sym: m[2], q: m[3], start: upto.length - m[3].length - 1 };
    sugg = quickSuggestions(trig.sym, trig.q, { project_id: merged().project_id }).slice(0, 8);
    if (!sugg.length) { box.hidden = true; return; }
    sel = Math.min(sel, sugg.length - 1);
    box.hidden = false;
    box.innerHTML = `<div class="sg-h">${esc(SYM_NAMES[trig.sym])}</div>` + sugg.map((x, i) => `<button class="sg-i${i === sel ? ' on' : ''}" data-i="${i}">${x.icon || ''}<span>${esc(x.label)}</span>${x.k ? `<span class="k">${esc(x.k)}</span>` : ''}</button>`).join('');
    $$('.sg-i', box).forEach((b) => b.onmousedown = (e) => { e.preventDefault(); pickSugg(Number(b.dataset.i)); });
  };
  const pickSugg = (i) => {
    const x = sugg[i]; if (!x || !trig) return;
    const pos = inp.selectionStart, end = trig.sym === '{' ? (inp.value.indexOf('}', pos) >= 0 ? inp.value.indexOf('}', pos) + 1 : pos) : pos;
    inp.value = (inp.value.slice(0, trig.start) + ' ' + inp.value.slice(end)).replace(/\s+/g, ' ').replace(/^\s/, '');
    const s = trig.sym;
    if (s === '#') { st.project_id = x.v; st.section = null; st.set.project_id = st.set.section = true; }
    if (s === '/') { st.section = x.v; st.set.section = true; }
    if (s === '@' || s === '%') { if (!st.contexts.includes(x.v)) st.contexts.push(x.v); }
    if (s === '+') { st.assignee = x.v; st.set.assignee = true; }
    if (s === '{') { st.deadline = x.v; st.set.deadline = true; }
    const caret = Math.min(trig.start, inp.value.length);
    expanded = true; sel = 0; trig = null; $('#qa-sug', sh).hidden = true;
    inp.setSelectionRange(caret, caret);
    autoGrow(inp); drawOpts(); inp.focus();
  };
  drawOpts();
  inp.oninput = () => {
    if (/\n/.test(inp.value)) inp.value = inp.value.replace(/\s*\n\s*/g, ' '); // pegar varias líneas → una sola
    autoGrow(inp); sel = 0; drawSugg(); drawOpts();
  };
  inp.onclick = () => drawSugg();
  $('#qa-file', sh).onchange = async (e) => { for (const f of e.target.files) { try { st.photos.push(await compressImage(f)); } catch (err) { toast('No se pudo leer la foto', null, null, true); } } drawPhotos(); };
  $('#qa-cancel', sh).onclick = () => closeSheet();
  const add = () => {
    const raw = inp.value.trim(); if (!raw) { inp.focus(); return; }
    const m = merged(), pid = m.project_id;
    const row = {
      id: uid(), user_id: ME, project_id: pid, section: pid ? m.section : null,
      assignee_id: pid && membersOf(pid).some((x) => x.user_id === m.assignee) ? m.assignee : null,
      status: 'open', priority: m.priority || 4, title: (m.p.title || raw).slice(0, 500), notes: '',
      start_date: null, due_date: m.due_date, due_time: m.due_date ? m.due_time : null, deadline: m.deadline, recur: null, reminder: null,
      contexts: m.contexts, energy: null, estimate: null, waiting_for: null, waiting_since: null,
      subtasks: [], photos: [], created_on: today(), completed_at: null, completed_by: null, focus_min: 0, source: 'app', needs_parse: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    row.inbox = !row.project_id && !row.due_date;
    ins('tasks', row);
    for (const b of st.photos) addPhoto(row.id, b);
    FOCUS = row.id;
    closeSheet(); render();
    const where = row.project_id ? PJ(row.project_id).name : row.inbox ? 'Bandeja' : fmtDate(row.due_date);
    toast('Añadida a ' + where + (wide() ? ' · T fecha · V proyecto · Y prioridad' : ''), 'Abrir', () => openTask(row.id));
  };
  $('#qa-add', sh).onclick = add;
  inp.onkeydown = (e) => {
    const box = $('#qa-sug', sh), open = !box.hidden && sugg.length;
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : sugg.length - 1)) % sugg.length; drawSugg(); return; }
    if (open && (e.key === 'Enter' || e.key === 'Tab') && !e.isComposing) { e.preventDefault(); pickSugg(sel); return; }
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); add(); return; }
    if (e.key === 'Escape') { e.preventDefault(); if (open) { box.hidden = true; sugg = []; } else closeSheet(); }
  };
  inp.focus(); setTimeout(() => inp.focus(), 60);
}
function pickAssignee(pid, cur, cb, kb) {
  if (!pid || membersOf(pid).length < 2) { toast('Solo se puede asignar en proyectos compartidos'); return; }
  openPop({ title: 'Asignar a', kb, items: [{ label: 'Nadie', v: null, icon: I.close, sel: !cur }, ...membersOf(pid).map((m) => ({ label: m.user_id === ME ? 'Yo' : m.display_name || 'Miembro', v: m.user_id, icon: I.user, sel: cur === m.user_id }))], onPick: (it) => cb(it.v) });
}
// Las cajas de texto crecen con su contenido para que siempre se lea todo
function autoGrow(el) { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
document.addEventListener('input', (e) => { if (e.target && e.target.matches && e.target.matches('textarea.grow')) autoGrow(e.target); });

/* ---------- Detalle de tarea ---------- */
function openTask(id) {
  const draw = () => {
    const t = S.tasks.find((x) => x.id === id); if (!t) { closeSheet(); return; }
    const p = t.project_id && PJ(t.project_id), shared = t.project_id && membersOf(t.project_id).length > 1;
    const sel = (field, opts, cur, ph) => `<select data-f="${field}"><option value="">${ph}</option>${opts.map((o) => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    const sh = $('#sheet');
    // Al redibujar (marcar una subtarea, cambiar un campo o llegar una sincronización) se conserva la posición de desplazamiento
    const prevBody = sh.querySelector('.sheet-body'), keepY = prevBody && sh.dataset.task === id ? prevBody.scrollTop : 0;
    sh.dataset.task = id;
    sh.innerHTML = `<div class="sheet-grab"></div><div class="sheet-head"><button class="check p${t.priority}${t.status === 'done' ? ' on' : ''}" id="td-check"></button><span class="grow" style="flex:1;color:var(--ink3);font-size:13px;padding-left:4px">${p ? `<i class="pdot" style="background:${esc(p.color)};display:inline-block"></i> ${esc(p.name)}` : t.inbox ? 'Bandeja' : 'Sin proyecto'}</span><button class="icon-btn" id="td-menu">${I.dots}</button><button class="icon-btn" id="td-close">${I.close}</button></div>
    <div class="sheet-body">
      <textarea class="d-title grow" id="td-title" rows="1">${esc(t.title)}</textarea>
      <textarea class="d-notes grow" id="td-notes" rows="1" placeholder="Notas">${esc(t.notes || '')}</textarea>
      <div class="card" style="padding:0 12px">
        <div class="kv"><span class="k">${I.mount.replace('<svg', '<svg class="ic"')}</span><span class="lab">Proyecto</span><span class="grow"><button class="v" data-pick="project">${p ? esc(p.name) : '<span class="ph">Bandeja</span>'}</button></span></div>
        ${p && (p.sections || []).length ? `<div class="kv"><span class="k">${I.sub}</span><span class="lab">Sección</span><span class="grow">${sel('section', p.sections, t.section, 'Sin sección')}</span></div>` : ''}
        <div class="kv"><span class="k">${I.cal}</span><span class="lab">Fecha</span><span class="grow"><button class="v" data-pick="due">${t.due_date ? esc(fmtDate(t.due_date)) : '<span class="ph">Sin fecha</span>'}</button></span>${t.due_date ? `<input type="time" data-f="due_time" value="${esc(t.due_time || '')}" style="width:84px">` : ''}</div>
        <div class="kv"><span class="k">${I.flag}</span><span class="lab">Límite</span><span class="grow"><button class="v" data-pick="deadline">${t.deadline ? esc(fmtDate(t.deadline)) : '<span class="ph">Sin límite</span>'}</button></span></div>
        <div class="kv"><span class="k">${I.flag}</span><span class="lab">Prioridad</span><span class="grow"><div class="prio-picker">${[1, 2, 3, 4].map((n) => `<button data-p="${n}" class="${t.priority === n ? 'on' : ''}">${n < 4 ? 'P' + n : '—'}</button>`).join('')}</div></span></div>
        <div class="kv"><span class="k">${I.at}</span><span class="lab">Contexto</span><span class="grow"><button class="v" data-pick="ctx">${(t.contexts || []).length ? t.contexts.map((c) => '@' + esc(c)).join(' ') : '<span class="ph">Ninguno</span>'}</button></span></div>
        <div class="kv"><span class="k">${I.wait}</span><span class="lab">Estado</span><span class="grow"><select data-f="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></span></div>
        ${t.status === 'waiting' ? `<div class="kv"><span class="k">${I.user}</span><span class="lab">Espero a</span><span class="grow"><input data-f="waiting_for" value="${esc(t.waiting_for || '')}" placeholder="Persona"></span></div>` : ''}
        ${shared ? `<div class="kv"><span class="k">${I.user}</span><span class="lab">Asignada a</span><span class="grow"><select data-f="assignee_id"><option value="">Nadie</option>${membersOf(t.project_id).map((m) => `<option value="${m.user_id}" ${t.assignee_id === m.user_id ? 'selected' : ''}>${esc(m.user_id === ME ? 'Yo' : m.display_name || 'Miembro')}</option>`).join('')}</select></span></div>` : ''}
      </div>
      <details class="card" style="padding:0 12px" ${t.recur || t.reminder || t.start_date || t.estimate || t.energy ? 'open' : ''}><summary class="kv" style="cursor:pointer;list-style:none"><span class="k">${I.dots.replace('<svg', '<svg class="ic"')}</span><span class="lab" style="width:auto">Más opciones</span></summary>
        <div class="kv"><span class="k">${I.rep}</span><span class="lab">Repetir</span><span class="grow">${sel('recur', RECURS, t.recur, 'No se repite')}</span></div>
        <div class="kv"><span class="k">${I.wait}</span><span class="lab">Aviso</span><span class="grow">${sel('reminder', REMINDERS, t.reminder, 'Sin aviso')}</span></div>
        <div class="kv"><span class="k">${I.cal}</span><span class="lab">Disponible</span><span class="grow"><input type="date" data-f="start_date" value="${esc(t.start_date || '')}"></span></div>
        <div class="kv"><span class="k">${I.wait}</span><span class="lab">Duración</span><span class="grow"><select data-f="estimate"><option value="">—</option>${[5, 10, 15, 30, 45, 60, 90, 120, 240].map((n) => `<option value="${n}" ${t.estimate === n ? 'selected' : ''}>${n < 60 ? n + ' min' : n / 60 + ' h'}</option>`).join('')}</select></span></div>
        <div class="kv"><span class="k">${I.flag}</span><span class="lab">Energía</span><span class="grow">${sel('energy', ['baja', 'media', 'alta'], t.energy, '—')}</span></div>
      </details>
      <div class="seclabel">Subtareas</div>
      <div class="card" style="padding:4px 12px" id="td-subs">${(t.subtasks || []).map((s, i) => `<div class="subtask"><button class="check${s.done ? ' on' : ''}" data-si="${i}"></button><textarea class="grow" rows="1" data-st="${i}">${esc(s.t)}</textarea><button class="x" data-sx="${i}">✕</button></div>`).join('')}<div class="subtask"><span class="check" style="border-style:dashed"></span><textarea class="grow" rows="1" id="td-newsub" placeholder="Añadir subtarea"></textarea></div></div>
      <div class="seclabel">Fotos</div>
      <div class="photos" id="td-photos">${(t.photos || []).map((ph, i) => `<div class="photo" data-ph="${i}"><img alt="" data-src="${esc(ph.id)}"><button class="rm" data-rm="${i}">✕</button></div>`).join('')}<label class="photo add">${I.cam.replace('class="ic"', '')}<input type="file" accept="image/*" multiple hidden id="td-file"></label></div>
      <div class="hint">Creada ${esc(fmtDate(t.created_on || localDay(t.created_at)).toLowerCase())}${t.user_id !== ME ? ' por ' + esc(personName(t.user_id)) : ''}${t.focus_min ? ` · ${t.focus_min} min de enfoque` : ''}${t.source === 'claude' ? ' · desde Claude' : t.source === 'atajo' ? ' · desde atajo' : ''}</div>
    </div>`;
    const save = (patch) => { upd('tasks', id, patch); render(); };
    const ti = $('#td-title', sh), no = $('#td-notes', sh);
    $$('textarea.grow', sh).forEach(autoGrow);
    ti.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ti.blur(); } };
    ti.onchange = () => { const v = ti.value.trim(); if (v) save({ title: v.slice(0, 500) }); else ti.value = t.title; };
    no.onchange = () => save({ notes: no.value });
    $('#td-check', sh).onclick = () => toggleDone(id);
    $('#td-close', sh).onclick = () => closeSheet();
    $('#td-menu', sh).onclick = () => openPop({ title: 'Tarea', items: [{ label: 'Duplicar', v: 'dup' }, ...(t.project_id || !t.inbox ? [{ label: 'Devolver a la bandeja', v: 'inbox' }] : []), ...(PJ(t.project_id) || t.user_id === ME ? [{ label: 'Eliminar', v: 'del' }] : [])], onPick: (it) => {
      if (it.v === 'dup') { const c = Object.assign({}, t, { id: uid(), user_id: ME, title: t.title, status: 'open', completed_at: null, completed_by: null, photos: [], created_at: new Date().toISOString(), created_on: today() }); ins('tasks', c); render(); openTask(c.id); }
      if (it.v === 'inbox') save({ project_id: null, section: null, inbox: true, assignee_id: null });
      if (it.v === 'del' && confirm('¿Eliminar esta tarea?')) { for (const ph of t.photos || []) mut({ k: 'unphoto', path: ph.path }); del('tasks', id); closeSheet(); render(); toast('Tarea eliminada'); }
    } });
    $$('[data-f]', sh).forEach((el) => el.onchange = () => {
      const f = el.dataset.f; let v = el.value || null;
      if (f === 'estimate') v = v ? Number(v) : null;
      const patch = { [f]: v };
      if (f === 'status') { patch.status = v || 'open'; if (v === 'waiting' && !t.waiting_since) patch.waiting_since = today(); if (v === 'done') { toggleDone(id); return; } if (v !== 'open') patch.inbox = false; }
      if (f === 'section') patch.section = v;
      save(patch); if (['status', 'recur'].includes(f)) draw();
    });
    $$('.prio-picker button', sh).forEach((b) => b.onclick = () => { save({ priority: Number(b.dataset.p) }); draw(); });
    $$('[data-pick]', sh).forEach((b) => b.onclick = () => {
      const k = b.dataset.pick;
      if (k === 'project') pickProject(t.project_id, (v) => { save({ project_id: v, section: null, inbox: !v && !t.due_date, assignee_id: null }); draw(); });
      if (k === 'due') pickDate('Fecha', t.due_date, (v) => { save({ due_date: v, due_time: v ? t.due_time : null, inbox: v ? false : t.inbox }); draw(); });
      if (k === 'deadline') pickDate('Fecha límite', t.deadline, (v) => { save({ deadline: v }); draw(); });
      if (k === 'ctx') pickContexts(t.contexts, (v) => { save({ contexts: v }); draw(); });
    });
    const subs = () => (S.tasks.find((x) => x.id === id).subtasks || []).map((s) => Object.assign({}, s));
    $$('[data-si]', sh).forEach((b) => b.onclick = () => { const s = subs(); s[b.dataset.si].done = !s[b.dataset.si].done; save({ subtasks: s }); draw(); });
    $$('[data-st]', sh).forEach((i) => i.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); i.blur(); } });
    $$('[data-st]', sh).forEach((i) => i.onchange = () => { const s = subs(); if (i.value.trim()) s[i.dataset.st].t = i.value.trim(); else s.splice(i.dataset.st, 1); save({ subtasks: s }); draw(); });
    $$('[data-sx]', sh).forEach((b) => b.onclick = () => { const s = subs(); s.splice(b.dataset.sx, 1); save({ subtasks: s }); draw(); });
    const ns = $('#td-newsub', sh); ns.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) e.preventDefault(); if (e.key === 'Enter' && !e.isComposing && ns.value.trim()) { const s = subs(); s.push({ t: ns.value.trim(), done: false }); save({ subtasks: s }); draw(); setTimeout(() => $('#td-newsub') && $('#td-newsub').focus(), 30); } };
    ns.onblur = () => { if (ns.value.trim()) { const s = subs(); s.push({ t: ns.value.trim(), done: false }); save({ subtasks: s }); draw(); } };
    $('#td-file', sh).onchange = async (e) => { for (const f of e.target.files) { try { addPhoto(id, await compressImage(f)); } catch (_) { toast('No se pudo leer la foto', null, null, true); } } draw(); };
    $$('[data-rm]', sh).forEach((b) => b.onclick = (e) => { e.stopPropagation(); if (confirm('¿Quitar esta foto?')) { removePhoto(id, Number(b.dataset.rm)); draw(); } });
    $$('[data-ph]', sh).forEach((d) => d.onclick = () => { const img = $('img', d); if (img && img.src) lightbox(img.src); });
    $$('img[data-src]', sh).forEach(async (img) => { const ph = (t.photos || []).find((x) => x.id === img.dataset.src); const u = ph && await photoURL(ph); if (u) img.src = u; });
    if (keepY) { const b = sh.querySelector('.sheet-body'); if (b) { $$('textarea.grow', b).forEach(autoGrow); b.scrollTop = keepY; } }
  };
  openSheet('', { full: true, refresh: draw, taskId: id });
  delete $('#sheet').dataset.task;
  FOCUS = id;
  draw();
}

/* ---------- Fotos ---------- */
function compressImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let max = 1600, q = 0.8, blob = null;
      for (let i = 0; i < 7; i++) {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
        if (blob && blob.size <= 160 * 1024) break;
        if (q > 0.55) q -= 0.1; else max = Math.round(max * 0.8);
      }
      blob ? res(blob) : rej(new Error('No se pudo comprimir'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagen no válida')); };
    img.src = url;
  });
}
function addPhoto(taskId, blob) {
  const id = uid(), path = `${taskId}/${id}.jpg`;
  IDB.put(id, blob);
  const t = S.tasks.find((x) => x.id === taskId); if (!t) return;
  upd('tasks', taskId, { photos: [...(t.photos || []), { id, path, at: new Date().toISOString() }] });
  mut({ k: 'photo', photo: id, path });
}
function removePhoto(taskId, i) {
  const t = S.tasks.find((x) => x.id === taskId); if (!t) return;
  const ph = (t.photos || [])[i]; if (!ph) return;
  upd('tasks', taskId, { photos: t.photos.filter((_, n) => n !== i) });
  mut({ k: 'unphoto', path: ph.path }); IDB.del(ph.id); render();
}
const PHURL = {};
async function photoURL(ph) {
  if (PHURL[ph.id]) return PHURL[ph.id];
  const b = await IDB.get(ph.id);
  if (b) return (PHURL[ph.id] = URL.createObjectURL(b));
  if (!navigator.onLine) return null;
  const { data, error } = await sb.storage.from('summit-fotos').download(ph.path);
  if (error || !data) return null;
  IDB.put(ph.id, data);
  return (PHURL[ph.id] = URL.createObjectURL(data));
}
function lightbox(src) { const d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = `<img src="${src}" alt="">`; d.onclick = () => d.remove(); document.body.appendChild(d); }

/* ---------- Procesar (Bandeja o cualquier lista) ----------
   En la Bandeja se procesa todo lo que entra. En el resto de listas (Hoy, Próximos, Calendario,
   un proyecto, un contexto…) el botón Procesar recorre las tareas abiertas que se ven en pantalla,
   una a una, con las mismas decisiones; «Saltar» deja una tarea como está. */
const PROC_VIEWS = ['today', 'upcoming', 'calendar', 'next', 'waiting', 'someday', 'context', 'filter', 'project', 'matrix'];
function procIds() {
  const ids = [...new Set($$('#view .task[data-task]').map((e) => e.dataset.task))];
  return ids.filter((id) => { const t = S.tasks.find((x) => x.id === id); return t && isOpen(t); });
}
function addProcessButton() {
  if (!PROC_VIEWS.includes(VIEW.name)) return;
  const n = procIds().length, h = $('#view .v-head');
  if (!n || !h) return;
  h.insertAdjacentHTML('afterend', `<button class="proc-btn" data-act="clarify" data-tour="process"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>Procesar ${n}</button>`);
}
function openClarify(ids) {
  let done = 0;
  const skipped = new Set(), handled = new Set();
  const draw = () => {
    const list = ids ? ids.map((id) => S.tasks.find((x) => x.id === id)).filter((x) => x && isOpen(x) && !handled.has(x.id) && !skipped.has(x.id))
      : inboxTasks().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const t = list[0];
    const sh = $('#sheet');
    if (!t) { sh.innerHTML = `<div class="sheet-grab"></div><div class="sheet-body" style="text-align:center;padding:30px 16px 40px"><div class="clarify-title">${ids ? 'Lista procesada' : 'Bandeja vacía'}</div><p class="muted">${done ? `Has procesado ${done} ${done === 1 ? 'elemento' : 'elementos'}${skipped.size ? ` y saltado ${skipped.size}` : ''}.` : 'No queda nada por procesar.'}</p><button class="btn primary" id="cl-x">Cerrar</button></div>`; $('#cl-x', sh).onclick = closeSheet; return; }
    const st = { project_id: t.project_id || null };
    const recent = activeProjects().slice(0, 12);
    if (t.project_id && PJ(t.project_id) && !recent.some((p) => p.id === t.project_id)) recent.unshift(PJ(t.project_id));
    sh.innerHTML = `<div class="sheet-grab"></div><div class="sheet-head"><span class="clarify-progress" style="flex:1">${done + skipped.size + 1} de ${list.length + done + skipped.size}</span>${ids ? '<button class="btn small" id="cl-skip">Saltar</button>' : ''}<button class="icon-btn" id="cl-open" aria-label="Editar">${I.note.replace('class="ic"', '')}</button><button class="icon-btn" id="cl-x">${I.close}</button></div>
      <div class="sheet-body">
        <textarea class="d-title grow" id="cl-title" rows="1">${esc(t.title)}</textarea>
        ${t.notes ? `<div class="muted" style="font-size:14px">${esc(t.notes)}</div>` : ''}
        <div class="seclabel">Proyecto</div>
        <div class="chips" id="cl-proj"><button class="pill${st.project_id ? '' : ' on'}" data-p="">Sin proyecto</button>${recent.map((p) => `<button class="pill${p.id === st.project_id ? ' on' : ''}" data-p="${p.id}"><i class="pdot" style="background:${esc(p.color)};display:inline-block;margin-right:5px"></i>${esc(p.name)}</button>`).join('')}</div>
        <div class="big-actions"><button class="btn primary" data-a="today">${SUN.replace('<svg', '<svg class="ic"')} Hoy</button><button class="btn" data-a="next">Próxima acción</button></div>
        <div class="small-actions">
          ${settings().twoMinute !== false ? `<button data-a="two">${I.done}<span>2 minutos: hecho</span></button>` : `<button data-a="date">${I.soon}<span>Con fecha</span></button>`}
          <button data-a="wait">${I.hourglass}<span>Delegar</span></button>
          <button data-a="someday">${I.cloud}<span>Algún día</span></button>
          <button data-a="del">${I.close}<span>Eliminar</span></button>
        </div>
      </div>`;
    const ti = $('#cl-title', sh); autoGrow(ti); ti.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ti.blur(); } };
    $$('#cl-proj .pill', sh).forEach((b) => b.onclick = () => { $$('#cl-proj .pill', sh).forEach((x) => x.classList.remove('on')); b.classList.add('on'); st.project_id = b.dataset.p || null; });
    $('#cl-x', sh).onclick = closeSheet;
    $('#cl-open', sh).onclick = () => openTask(t.id);
    if (ids) $('#cl-skip', sh).onclick = () => { skipped.add(t.id); draw(); };
    const finish = (patch) => {
      const title = ti.value.trim() || t.title, moved = st.project_id !== (t.project_id || null);
      upd('tasks', t.id, Object.assign({ title, inbox: false, project_id: st.project_id }, moved ? { section: null, assignee_id: null } : {}, patch));
      handled.add(t.id); done++; render(); draw();
    };
    $$('[data-a]', sh).forEach((b) => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'today') finish({ due_date: today(), status: 'open' });
      if (a === 'next') finish(ids ? { status: 'open', due_date: null, due_time: null } : { status: 'open' });
      if (a === 'two') { finish({ status: 'done', completed_at: new Date().toISOString(), completed_by: ME }); }
      if (a === 'date') pickDate('Fecha', null, (v) => finish({ due_date: v, status: 'open' }));
      if (a === 'wait') { const w = prompt('¿De quién esperas respuesta?'); if (w !== null) finish({ status: 'waiting', waiting_for: w.trim() || null, waiting_since: today() }); }
      if (a === 'someday') finish({ status: 'someday' });
      if (a === 'del') { del('tasks', t.id); handled.add(t.id); done++; render(); draw(); }
    });
  };
  openSheet('', { full: true, refresh: () => {} });
  draw();
}

/* ---------- Proyectos: crear, editar, compartir ---------- */
function editProject(id) {
  const p = id ? PJ(id) : null;
  const st = { color: p ? p.color : COLORS[S.projects.length % COLORS.length], sections: p ? (p.sections || []).slice() : [] };
  const sh = openSheet(`<div class="sheet-head"><h2>${p ? 'Editar proyecto' : 'Nuevo proyecto'}</h2><button class="icon-btn" id="pe-x">${I.close}</button></div>
    <div class="sheet-body">
      <input class="field" id="pe-name" placeholder="Nombre del proyecto" value="${esc(p ? p.name : '')}">
      <textarea class="field" id="pe-goal" rows="2" placeholder="Resultado deseado: ¿cómo sabrás que está terminado?">${esc(p ? p.goal : '')}</textarea>
      <div class="row"><select class="field grow" id="pe-area"><option value="">Sin área</option>${S.areas.map((a) => `<option value="${a.id}" ${p && p.area_id === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
        <select class="field" id="pe-rev" style="width:auto">${[7, 14, 30].map((n) => `<option value="${n}" ${(p ? p.review_every : 7) === n ? 'selected' : ''}>Revisar cada ${n} d</option>`).join('')}</select></div>
      <div class="chips" id="pe-colors">${COLORS.map((c) => `<button data-c="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};outline:${c === st.color ? '2px solid var(--ink)' : 'none'};outline-offset:2px"></button>`).join('')}</div>
      <div class="seclabel">Secciones</div>
      <div class="list-edit" id="pe-secs"></div>
      <div class="row"><input class="field grow" id="pe-newsec" placeholder="Nueva sección"><button class="btn" id="pe-addsec">Añadir</button></div>
      <label class="priv-opt"><input type="checkbox" id="pe-priv" ${p && isPrivate(p.id) ? 'checked' : ''}><span>${LOCK}<b>Ocultar tareas</b><small>Se ven difuminadas hasta que pulses el ojo. Ideal para proyectos personales en el trabajo.</small></span></label>
      <button class="btn primary" id="pe-save">${p ? 'Guardar' : 'Crear proyecto'}</button>
    </div>`, { full: true });
  const drawSecs = () => { $('#pe-secs', sh).innerHTML = st.sections.map((s, i) => `<div class="r card"><span class="grow">${esc(s)}</span><button data-up="${i}" class="muted">↑</button><button data-rm="${i}" class="muted">✕</button></div>`).join(''); $$('[data-rm]', sh).forEach((b) => b.onclick = () => { st.sections.splice(b.dataset.rm, 1); drawSecs(); }); $$('[data-up]', sh).forEach((b) => b.onclick = () => { const i = Number(b.dataset.up); if (i > 0) { [st.sections[i - 1], st.sections[i]] = [st.sections[i], st.sections[i - 1]]; drawSecs(); } }); };
  drawSecs();
  $$('#pe-colors button', sh).forEach((b) => b.onclick = () => { st.color = b.dataset.c; $$('#pe-colors button', sh).forEach((x) => x.style.outline = x.dataset.c === st.color ? '2px solid var(--ink)' : 'none'); });
  const addSec = () => { const v = $('#pe-newsec', sh).value.trim(); if (v && !st.sections.includes(v)) st.sections.push(v.slice(0, 60)); $('#pe-newsec', sh).value = ''; drawSecs(); };
  $('#pe-addsec', sh).onclick = addSec; $('#pe-newsec', sh).onkeydown = (e) => { if (e.key === 'Enter') addSec(); };
  $('#pe-x', sh).onclick = closeSheet;
  $('#pe-save', sh).onclick = () => {
    const name = $('#pe-name', sh).value.trim(); if (!name) { $('#pe-name', sh).focus(); return; }
    const data = { name: name.slice(0, 120), goal: $('#pe-goal', sh).value.trim(), area_id: $('#pe-area', sh).value || null, review_every: Number($('#pe-rev', sh).value), color: st.color, sections: st.sections };
    const wantPriv = $('#pe-priv', sh).checked;
    if (p) {
      if (wantPriv !== isPrivate(p.id)) setPrivate(p.id, wantPriv);
      if (JSON.stringify(st.sections) === JSON.stringify(p.sections || [])) delete data.sections; // sin cambios: no pisar lo de otros dispositivos
      const removed = (p.sections || []).filter((s) => !st.sections.includes(s));
      upd('projects', p.id, data);
      for (const t of S.tasks.filter((x) => x.project_id === p.id && removed.includes(x.section))) upd('tasks', t.id, { section: null });
      closeSheet(); render();
    } else {
      const row = Object.assign({ id: uid(), owner_id: ME, status: 'active', position: S.projects.length, last_review: today(), share_code: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, data);
      ins('projects', row); if (wantPriv) setPrivate(row.id, true); closeSheet(); go({ name: 'project', id: row.id });
    }
  };
  if (!p) $('#pe-name', sh).focus();
}
function projectMenu(id) {
  const p = PJ(id); if (!p) return;
  const own = isOwner(id);
  const privItem = isPrivate(id) ? { label: 'Dejar de ocultar tareas', v: 'unpriv' } : { label: 'Ocultar tareas (privado)', v: 'priv' };
  const items = own ? [
    { label: 'Editar proyecto', v: 'edit' }, { label: 'Añadir sección', v: 'sec' }, privItem, { label: 'Marcar como revisado', v: 'rev' },
    { label: p.status === 'paused' ? 'Reanudar' : 'Pausar (Algún día)', v: 'pause' }, { label: p.status === 'done' ? 'Reabrir' : 'Marcar como completado', v: 'done' },
    { label: 'Compartir', v: 'share' }, { label: 'Eliminar proyecto', v: 'del' },
  ] : [privItem, { label: 'Ver miembros', v: 'share' }, { label: 'Abandonar proyecto', v: 'leave' }];
  openPop({ title: p.name, items, onPick: async (it) => {
    if (it.v === 'edit') editProject(id);
    if (it.v === 'sec') { if (VIEW.name !== 'project' || VIEW.id !== id) go({ name: 'project', id }); editSection({ pid: id, mode: 'add' }); }
    if (it.v === 'priv' || it.v === 'unpriv') setPrivate(id, it.v === 'priv');
    if (it.v === 'rev') { upd('projects', id, { last_review: today() }); toast('Proyecto revisado'); render(); }
    if (it.v === 'pause') { upd('projects', id, { status: p.status === 'paused' ? 'active' : 'paused' }); render(); }
    if (it.v === 'done') { upd('projects', id, { status: p.status === 'done' ? 'active' : 'done' }); render(); }
    if (it.v === 'share') openShare(id);
    if (it.v === 'del') { const n = S.tasks.filter((t) => t.project_id === id).length; if (confirm(`¿Eliminar «${p.name}» y sus ${n} tareas? No se puede deshacer.`)) { for (const t of S.tasks.filter((x) => x.project_id === id)) del('tasks', t.id); del('projects', id); if (isPrivate(id)) saveSettings({ privateProjects: privateIds().filter((x) => x !== id) }); go({ name: 'projects' }); toast('Proyecto eliminado'); } }
    if (it.v === 'leave') { if (!confirm('¿Abandonar este proyecto compartido?')) return; const r = await sb.rpc('abandonar_proyecto', { p_project: id }); if (r.error) return toast(r.error.message, null, null, true); S.projects = S.projects.filter((x) => x.id !== id); S.tasks = S.tasks.filter((t) => t.project_id !== id); saveCache(); go({ name: 'projects' }); }
  } });
}
function sectionMenu(pid, s) {
  const p = PJ(pid); if (!p) return;
  if (!isOwner(pid)) return toast('Solo quien creó el proyecto puede cambiar las secciones');
  const l = p.sections || [], i = l.indexOf(s);
  const items = [{ label: 'Renombrar', v: 'ren' }, { label: 'Añadir sección debajo', v: 'add' }];
  if (i > 0) items.push({ label: 'Mover arriba', v: 'up' });
  if (i >= 0 && i < l.length - 1) items.push({ label: 'Mover abajo', v: 'down' });
  items.push({ label: 'Eliminar sección', v: 'del' });
  openPop({ title: s, items, onPick: (it) => {
    if (it.v === 'ren') editSection({ pid, mode: 'ren', s });
    if (it.v === 'add') editSection({ pid, mode: 'add', after: s });
    if (it.v === 'up' || it.v === 'down') { secOp(pid, 'move', { s, dir: it.v === 'up' ? -1 : 1 }); render(); }
    if (it.v === 'del') deleteSection(pid, s);
  } });
}
async function openShare(id) {
  const p = PJ(id); if (!p) return;
  const own = isOwner(id);
  const draw = (code, msg = '') => {
    const sh = $('#sheet'), mem = membersOf(id);
    sh.innerHTML = `<div class="sheet-grab"></div><div class="sheet-head"><h2>Compartir</h2><button class="icon-btn" id="sh-x">${I.close}</button></div><div class="sheet-body">
      <div class="seclabel">Miembros · ${mem.length}</div>
      <div class="rows">${mem.map((m) => `<div class="r"><span class="avatar">${esc(initials(m.display_name))}</span><span class="grow" style="padding-left:6px">${esc(m.user_id === ME ? (m.display_name || 'Yo') + ' (tú)' : m.display_name || 'Miembro')}</span><span class="val">${m.role === 'owner' ? 'propietario' : ''}</span>${own && m.user_id !== ME ? `<button class="btn ghost small" data-rm="${m.user_id}">Quitar</button>` : ''}</div>`).join('')}</div>
      ${own ? (code ? `<div class="seclabel">Código para unirse</div><div class="code" style="font-size:20px;text-align:center">${esc(code)}</div><p class="hint">La otra persona entra en su Summit → Proyectos → Unirme y escribe este código. Cada uno añade sus acciones.</p>
        <div class="row"><button class="btn grow" id="sh-copy">Copiar</button><button class="btn grow" id="sh-new">Nuevo código</button><button class="btn danger grow" id="sh-stop">Dejar de compartir</button></div>`
        : `<p class="hint">Genera un código para que otra persona se una a este proyecto desde su propia cuenta.</p><button class="btn primary" id="sh-gen">Generar código</button>`) : '<p class="hint">Este proyecto lo comparte otra persona contigo.</p>'}
      ${msg ? `<div class="auth-msg">${esc(msg)}</div>` : ''}</div>`;
    $('#sh-x', sh).onclick = closeSheet;
    const call = async (fn, args) => { if (!navigator.onLine) return draw(code, 'Necesitas conexión para esto.'); const r = await sb.rpc(fn, args); if (r.error) { draw(code, r.error.message); return null; } return r; };
    if ($('#sh-gen', sh)) $('#sh-gen', sh).onclick = async () => { const r = await call('compartir_proyecto', { p_project: id, p_nuevo: false }); if (r) { PJ(id).share_code = r.data; saveCache(); draw(r.data); } };
    if ($('#sh-new', sh)) $('#sh-new', sh).onclick = async () => { const r = await call('compartir_proyecto', { p_project: id, p_nuevo: true }); if (r) { PJ(id).share_code = r.data; saveCache(); draw(r.data); } };
    if ($('#sh-stop', sh)) $('#sh-stop', sh).onclick = async () => { const r = await call('dejar_de_compartir', { p_project: id }); if (r) { PJ(id).share_code = null; saveCache(); draw(null); render(); } };
    if ($('#sh-copy', sh)) $('#sh-copy', sh).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code); toast('Código copiado'); };
    $$('[data-rm]', sh).forEach((b) => b.onclick = async () => { if (!confirm('¿Quitar a esta persona del proyecto?')) return; const r = await call('quitar_miembro', { p_project: id, p_user: b.dataset.rm }); if (r) { S.members = S.members.filter((m) => !(m.project_id === id && m.user_id === b.dataset.rm)); saveCache(); draw(code); render(); } });
  };
  openSheet('', { full: true });
  draw(p.share_code);
}
async function joinProject() {
  const c = (prompt('Escribe el código del proyecto (SUM-…)') || '').trim();
  if (!c) return;
  if (!navigator.onLine) return toast('Necesitas conexión para unirte', null, null, true);
  const r = await sb.rpc('unirse_a_proyecto', { p_codigo: c });
  if (r.error) return toast(r.error.message, null, null, true);
  try { await loadAll(); } catch (_) { /* se verá al recargar */ }
  go({ name: 'project', id: r.data }); toast('Te has unido al proyecto');
}
function editFilter() {
  const st = { contexts: [] };
  const sh = openSheet(`<div class="sheet-head"><h2>Nuevo filtro</h2><button class="icon-btn" id="fe-x">${I.close}</button></div><div class="sheet-body">
    <input class="field" id="fe-name" placeholder="Nombre (p. ej. «Llamadas urgentes»)">
    <div class="seclabel">Contextos</div><div class="chips">${contexts().map((c) => `<button class="pill" data-c="${esc(c)}">@${esc(c)}</button>`).join('')}</div>
    <select class="field" id="fe-prio"><option value="">Cualquier prioridad</option><option value="1">Solo P1</option><option value="2">P1 y P2</option><option value="3">P1 a P3</option></select>
    <select class="field" id="fe-proj"><option value="">Cualquier proyecto</option>${activeProjects().map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
    <select class="field" id="fe-days"><option value="">Cualquier fecha</option><option value="0">Para hoy o vencidas</option><option value="7">Próximos 7 días</option><option value="30">Próximos 30 días</option></select>
    <button class="btn primary" id="fe-save">Crear filtro</button></div>`, { full: true });
  $$('.pill', sh).forEach((b) => b.onclick = () => { b.classList.toggle('on'); const c = b.dataset.c; st.contexts = st.contexts.includes(c) ? st.contexts.filter((x) => x !== c) : [...st.contexts, c]; });
  $('#fe-x', sh).onclick = closeSheet;
  $('#fe-save', sh).onclick = () => {
    const name = $('#fe-name', sh).value.trim(); if (!name) return $('#fe-name', sh).focus();
    const f = { name, contexts: st.contexts, maxPriority: Number($('#fe-prio', sh).value) || null, project: $('#fe-proj', sh).value || null, days: $('#fe-days', sh).value === '' ? null : Number($('#fe-days', sh).value) };
    const list = [...(settings().filters || []), f]; saveSettings({ filters: list }); closeSheet(); go({ name: 'filter', i: list.length - 1 });
  };
}
function saveSettings(patch) { mut({ k: 'set', patch: Object.assign({}, patch) }); }

/* ---------- Enfoque (Pomodoro) ---------- */
const MODES = { '25/5': [25, 5], '50/10': [50, 10], '90/15': [90, 15] };
let POMO = LS.get('summit-pomo', { mode: '25/5', phase: 'work', running: false, endsAt: null, left: 25 * 60, task: '' });
let pomoTimer = null;
const savePomo = () => LS.set('summit-pomo', POMO);
const phaseLen = () => MODES[POMO.mode][POMO.phase === 'work' ? 0 : 1] * 60;
const pomoLeft = () => POMO.running ? Math.max(0, Math.round((POMO.endsAt - Date.now()) / 1000)) : POMO.left;
function focusView() {
  const left = pomoLeft(), pct = 1 - left / phaseLen();
  const opts = S.tasks.filter((t) => actionable(t) || (isOpen(t) && mine(t) && t.due_date && t.due_date <= today())).sort(sortTasks).slice(0, 60);
  const t0 = today(), todayMin = S.focus.filter((f) => f.day === t0).reduce((a, f) => a + f.minutes, 0), ses = S.focus.filter((f) => f.day === t0).length;
  const days = Array.from({ length: 7 }, (_, i) => addDays(t0, i - 6)), mins = days.map((d) => S.focus.filter((f) => f.day === d).reduce((a, f) => a + f.minutes, 0));
  return head('Enfoque') + `<div class="card pomo">
    <div class="seg">${Object.keys(MODES).map((m) => `<button class="${POMO.mode === m ? 'on' : ''}" data-act="pmode2" data-m="${m}">${m.replace('/', ' / ')}</button>`).join('')}</div>
    <div class="pomo-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" stroke="var(--surface2)"/><circle id="pomo-arc" cx="50" cy="50" r="46" stroke="var(--sage)" stroke-linecap="round" stroke-dasharray="${(289 * (1 - pct)).toFixed(1)} 400"/></svg><div><div class="time" id="pomo-time">${fmtClock(left)}</div><span class="phase">${POMO.phase === 'work' ? 'Concentración' : 'Descanso'}</span></div></div>
    <div class="task-sel"><div class="seclabel" style="padding-bottom:4px">Tarea</div><select class="field" data-act="ptask" id="pomo-task"><option value="">Sin tarea concreta</option>${opts.map((t) => `<option value="${t.id}" ${POMO.task === t.id ? 'selected' : ''}>${esc(safeTitle(t).slice(0, 70))}</option>`).join('')}</select></div>
    <div class="ctrl"><button class="btn primary small" data-act="pstart">${POMO.running ? '❚❚ Pausar' : '▷ Empezar'}</button><button class="btn ghost small" data-act="preset">↺ Reiniciar</button><button class="btn ghost small" data-act="pskip">Saltar fase</button></div>
  </div>
  <div class="minis"><div class="kpi"><span class="l">Enfoque hoy</span><b>${todayMin} <small>min</small></b><span class="s">${ses} ${ses === 1 ? 'sesión' : 'sesiones'}</span></div>
  <div class="kpi"><span class="l">Últimos 7 días</span>${miniBars(mins, days)}</div></div>`;
}
const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
function miniBars(vals, days) {
  const mx = Math.max(1, ...vals), w = 100 / vals.length;
  return `<svg viewBox="0 0 100 44" style="width:100%;height:auto;margin-top:6px">${vals.map((v, i) => `<rect x="${i * w + 2}" y="${36 - v / mx * 32}" width="${w - 4}" height="${Math.max(1, v / mx * 32)}" rx="1.5" fill="${days[i] === today() ? 'var(--sage)' : 'var(--line2)'}"/><text x="${i * w + w / 2}" y="43" text-anchor="middle" style="font-size:6px">${['D', 'L', 'M', 'X', 'J', 'V', 'S'][dow(days[i])]}</text>`).join('')}</svg>`;
}
Object.assign(ACT, {
  pmode2: (d) => { if (POMO.running && !confirm('¿Cambiar de modo y reiniciar el temporizador?')) return; POMO = Object.assign(POMO, { mode: d.m, phase: 'work', running: false }); POMO.left = phaseLen(); savePomo(); render(); },
  ptask: (d, el) => { el.onchange = () => { POMO.task = el.value; savePomo(); }; },
  pstart: () => {
    if (POMO.running) { POMO.left = pomoLeft(); POMO.running = false; }
    else { POMO.endsAt = Date.now() + pomoLeft() * 1000; POMO.running = true; if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); }
    savePomo(); render(); tickPomo();
  },
  preset: () => { POMO.running = false; POMO.left = phaseLen(); savePomo(); render(); },
  pskip: () => { endPhase(false); },
});
function endPhase(record) {
  if (record && POMO.phase === 'work') {
    const minutes = MODES[POMO.mode][0], t = POMO.task && S.tasks.find((x) => x.id === POMO.task);
    ins('focus_sessions', { id: uid(), user_id: ME, day: today(), minutes, task_id: t ? t.id : null, project_id: t ? t.project_id : null, created_at: new Date().toISOString() });
    if (t) upd('tasks', t.id, { focus_min: (t.focus_min || 0) + minutes });
    notify('Sesión de enfoque completada', `${minutes} min${t ? ' en «' + (isPrivate(t.project_id) ? 'Tarea privada' : t.title) + '»' : ''}. Toca descansar.`);
  } else if (record) notify('Descanso terminado', 'Vuelve al enfoque cuando quieras.');
  POMO.phase = POMO.phase === 'work' ? 'break' : 'work'; POMO.running = false; POMO.left = phaseLen(); savePomo(); render();
}
function tickPomo() {
  clearInterval(pomoTimer);
  if (!POMO.running) return;
  pomoTimer = setInterval(() => {
    const left = pomoLeft();
    if (left <= 0) { clearInterval(pomoTimer); endPhase(true); return; }
    const el = $('#pomo-time'); if (el) { el.textContent = fmtClock(left); const a = $('#pomo-arc'); if (a) a.setAttribute('stroke-dasharray', `${(289 * left / phaseLen()).toFixed(1)} 400`); }
  }, 500);
}
function notify(title, body) {
  toast(title + ' · ' + body);
  if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
  try { if (window.Notification && Notification.permission === 'granted') navigator.serviceWorker && navigator.serviceWorker.ready.then((r) => r.showNotification(title, { body, icon: 'icon-192.png', tag: 'summit-focus' })).catch(() => new Notification(title, { body })); } catch (_) { /* nada */ }
}
// Aviso del sistema una vez al día al abrir la app (si está activado)
function dailyNotice() {
  if (!settings().sysNotif || !window.Notification || Notification.permission !== 'granted') return;
  if (LS.get('summit-notified', '') === today()) return;
  const a = alerts(); if (!a.length) return;
  LS.set('summit-notified', today());
  notify('Summit', a.map((x) => x.txt).slice(0, 3).join(' · '));
}

/* ---------- Estadísticas ---------- */
function statsView() {
  const tab = VIEW.tab || 'general';
  return head('Estadísticas') + `<div class="tabs"><button class="${tab === 'general' ? 'on' : ''}" data-act="stab" data-t="general">General</button><button class="${tab === 'project' ? 'on' : ''}" data-act="stab" data-t="project">Por proyecto</button></div>` + (tab === 'project' ? statsProject() : statsGeneral());
}
Object.assign(ACT, {
  stab: (d) => { VIEW.tab = d.t; if (d.t === 'project' && !VIEW.id) VIEW.id = (activeProjects()[0] || {}).id; render(); },
  speriod: (d) => { VIEW.days = Number(d.n); render(); },
  sproj: (d, el) => { el.onchange = () => { VIEW.id = el.value; render(); }; },
  sfull: () => { VIEW.full = !VIEW.full; render(); },
});
const completedBy = (t) => t.status === 'done' && t.completed_at && (t.completed_by === ME || (!t.completed_by && t.user_id === ME));
function barChart(vals, labels, o = {}) {
  const W = 300, H = 110, mx = Math.max(1, ...vals), n = vals.length, w = W / n;
  const ticks = [0, Math.round(n / 3), Math.round(2 * n / 3), n - 1];
  return `<svg viewBox="0 0 ${W} ${H + 14}">${[0.25, 0.5, 0.75, 1].map((k) => `<line x1="0" x2="${W}" y1="${H - k * (H - 6)}" y2="${H - k * (H - 6)}" stroke="var(--line)" stroke-dasharray="2 3"/>`).join('')}
    ${vals.map((v, i) => `<rect x="${i * w + w * 0.18}" y="${H - v / mx * (H - 6)}" width="${w * 0.64}" height="${Math.max(v ? 2 : 0.5, v / mx * (H - 6))}" rx="1.2" fill="${o.hl === i ? 'var(--amber)' : 'var(--sage)'}"/>`).join('')}
    ${ticks.map((i) => `<text x="${i * w + w / 2}" y="${H + 11}" text-anchor="middle">${esc(labels[i] || '')}</text>`).join('')}
    <text x="0" y="8">${mx}</text></svg>`;
}
function lineChart(series, labels) {
  const W = 300, H = 110, mx = Math.max(1, ...series.flatMap((s) => s.vals)), n = series[0].vals.length;
  const x = (i) => n > 1 ? i / (n - 1) * W : 0, y = (v) => H - v / mx * (H - 8);
  return `<svg viewBox="0 0 ${W} ${H + 14}">${[0.5, 1].map((k) => `<line x1="0" x2="${W}" y1="${y(k * mx)}" y2="${y(k * mx)}" stroke="var(--line)" stroke-dasharray="2 3"/>`).join('')}
    ${series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="1.6" ${s.dash ? 'stroke-dasharray="3 3"' : ''} points="${s.vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/><circle cx="${x(n - 1)}" cy="${y(s.vals[n - 1])}" r="2.2" fill="${s.color}"/>`).join('')}
    ${[0, Math.floor(n / 2), n - 1].map((i) => `<text x="${Math.min(W - 18, Math.max(0, x(i) - 10))}" y="${H + 11}">${esc(labels[i] || '')}</text>`).join('')}<text x="0" y="8">${mx}</text></svg>`;
}
const hbars = (rows, color) => { const mx = Math.max(1, ...rows.map((r) => r.v)); return rows.map((r) => `<div class="hbar"><span class="name">${r.dot ? `<i class="pdot" style="background:${esc(r.dot)}"></i>` : ''}${esc(r.name)}</span><span class="track"><i style="width:${r.v / mx * 100}%;${r.dot || color ? `background:${esc(r.dot || color)}` : ''}"></i></span><span class="v">${r.v}</span></div>`).join(''); };
const shortD = (iso) => { const d = parseD(iso); return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; };
function statsGeneral() {
  const N = VIEW.days || 30, t0 = today(), from = addDays(t0, -(N - 1));
  const done = S.tasks.filter((t) => completedBy(t) && localDay(t.completed_at) >= from);
  const days = Array.from({ length: N }, (_, i) => addDays(from, i));
  const perDay = days.map((d) => done.filter((t) => localDay(t.completed_at) === d).length);
  let streak = 0; { let d = t0; const has = (x) => S.tasks.some((t) => completedBy(t) && localDay(t.completed_at) === x); if (!has(d)) d = addDays(d, -1); while (has(d)) { streak++; d = addDays(d, -1); } }
  const withDl = done.filter((t) => t.deadline), onTime = withDl.filter((t) => localDay(t.completed_at) <= t.deadline);
  const odOpen = S.tasks.filter((t) => isOpen(t) && mine(t) && t.deadline && t.deadline < t0).length;
  const focusMin = S.focus.filter((f) => f.day >= from).reduce((a, f) => a + f.minutes, 0);
  const created = S.tasks.filter((t) => (t.user_id === ME) && (t.created_on || localDay(t.created_at)) >= from).length;
  const lead = done.map((t) => diffDays(localDay(t.completed_at), t.created_on || localDay(t.created_at))).filter((x) => x >= 0);
  const leadAvg = lead.length ? (lead.reduce((a, b) => a + b, 0) / lead.length) : null;
  const wip = S.tasks.filter((t) => isOpen(t) && mine(t) && ['open', 'waiting'].includes(t.status) && !t.inbox).length;
  const byProj = {}; for (const t of done) { const k = t.project_id || ''; byProj[k] = (byProj[k] || 0) + 1; }
  const byDow = [1, 2, 3, 4, 5, 6, 0].map((i) => ({ name: DIAS[i].replace(/^./, (c) => c.toUpperCase()), v: done.filter((t) => new Date(t.completed_at).getDay() === i).length }));
  const byHour = [['Mañana (6-12)', 6, 12], ['Tarde (12-18)', 12, 18], ['Noche (18-24)', 18, 24], ['Madrugada (0-6)', 0, 6]].map(([n, a, b]) => ({ name: n, v: done.filter((t) => { const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz(), hour: '2-digit', hour12: false }).format(new Date(t.completed_at))) % 24; return h >= a && h < b; }).length }));
  const activeDays = perDay.filter((v) => v > 0).length;
  return `<div class="period"><span>Periodo</span><div class="seg">${[7, 30, 90].map((n) => `<button class="${N === n ? 'on' : ''}" data-act="speriod" data-n="${n}">${n} días</button>`).join('')}</div></div>
    <div class="kpis"><div class="kpi"><span class="l">Completadas</span><b>${done.length}</b></div><div class="kpi"><span class="l">Racha actual</span><b>${streak}<small>días</small></b><span class="s">con al menos una tarea</span></div>
    <div class="kpi"><span class="l">Fechas límite cumplidas</span><b>${withDl.length ? Math.round(onTime.length / withDl.length * 100) + '<small>%</small>' : '—'}</b><span class="s">${odOpen} vencidas abiertas</span></div><div class="kpi"><span class="l">Tiempo de enfoque</span><b>${(focusMin / 60).toFixed(1)}<small>h</small></b></div></div>
    <div class="chart"><h3>Tareas completadas</h3><div class="s">Por día · promedio ${(done.length / N).toFixed(1)} por día</div>${barChart(perDay, days.map(shortD), { hl: N - 1 })}</div>
    <button class="card expand" data-act="sfull"><span>Ver análisis completo</span><small>constancia, flujo, proyectos, horarios</small><span>${VIEW.full ? '⌄' : '›'}</span></button>
    ${VIEW.full ? `<div class="kpis"><div class="kpi"><span class="l">Lead time medio</span><b>${leadAvg == null ? '—' : leadAvg.toFixed(1)}<small>días</small></b><span class="s">de creación a cierre</span></div><div class="kpi"><span class="l">Trabajo en curso</span><b>${wip}</b><span class="s">abiertas + en espera</span></div>
      <div class="kpi"><span class="l">Creadas</span><b>${created}</b><span class="s">${created ? Math.round(done.length / created * 100) : 0}% de cierre</span></div><div class="kpi"><span class="l">Días activos</span><b>${activeDays}<small>/ ${N}</small></b><span class="s">constancia ${Math.round(activeDays / N * 100)}%</span></div></div>
      <div class="chart"><h3>Por proyecto</h3><div class="s">Completadas en el periodo</div>${hbars(Object.entries(byProj).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ name: k ? (PJ(k) || {}).name || 'Proyecto' : 'Sin proyecto', v, dot: k ? projColor(k) : 'var(--ink3)' })))}</div>
      <div class="chart"><h3>Por día de la semana</h3>${hbars(byDow)}</div>
      <div class="chart"><h3>Por franja horaria</h3>${hbars(byHour)}</div>` : ''}`;
}
function statsProject() {
  const ps = S.projects; if (!ps.length) return empty('Aún no hay proyectos');
  const p = PJ(VIEW.id) || ps[0]; VIEW.id = p.id;
  const all = S.tasks.filter((t) => t.project_id === p.id), done = all.filter((t) => !isOpen(t)), open = all.filter(isOpen);
  const withDl = done.filter((t) => t.deadline && t.completed_at), onTime = withDl.filter((t) => localDay(t.completed_at) <= t.deadline);
  const lead = done.filter((t) => t.completed_at).map((t) => diffDays(localDay(t.completed_at), t.created_on || localDay(t.created_at))).filter((x) => x >= 0);
  const focusMin = S.focus.filter((f) => f.project_id === p.id).reduce((a, f) => a + f.minutes, 0) || all.reduce((a, t) => a + (t.focus_min || 0), 0);
  const odOpen = open.filter((t) => (t.due_date && t.due_date < today()) || (t.deadline && t.deadline < today())).length;
  const start = all.reduce((m, t) => { const d = t.created_on || localDay(t.created_at); return d < m ? d : m; }, today());
  const span = Math.max(1, diffDays(today(), start)), steps = Math.min(30, span + 1), step = span / (steps - 1 || 1);
  const pts = Array.from({ length: steps }, (_, i) => addDays(start, Math.round(i * step)));
  const scope = pts.map((d) => all.filter((t) => (t.created_on || localDay(t.created_at)) <= d).length), comp = pts.map((d) => done.filter((t) => t.completed_at && localDay(t.completed_at) <= d).length);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(today(), -7 * (7 - i)));
  const perWeek = weeks.map((w) => done.filter((t) => t.completed_at && localDay(t.completed_at) > addDays(w, -7) && localDay(t.completed_at) <= w).length);
  const prio = [1, 2, 3, 4].map((n) => ({ name: 'P' + n, v: open.filter((t) => t.priority === n).length, dot: ['var(--red)', 'var(--amber)', 'var(--blue)', 'var(--ink3)'][n - 1] }));
  const bySec = [...(p.sections || []), null].map((s) => ({ name: s || '(sin sección)', v: done.filter((t) => (t.section || null) === s).length }));
  const last = done.filter((t) => t.completed_at).sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))).slice(0, 8);
  return `<div class="seclabel" style="padding-bottom:6px">Proyecto</div><select class="field" data-act="sproj">${ps.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
    <div class="proj-sum">${ring(all.length ? done.length / all.length * 100 : 0, p.color, 46)}<div style="flex:1;min-width:0"><h2>${esc(p.name)}</h2><small>${all.length} tareas en total · ${done.length} completadas · ${open.length} abiertas</small></div></div>
    <div style="text-align:right;margin:-4px 0 10px"><button class="btn small" ${goAttr({ name: 'project', id: p.id })}>Abrir proyecto</button></div>
    <div class="kpis"><div class="kpi"><span class="l">A tiempo</span><b>${withDl.length ? Math.round(onTime.length / withDl.length * 100) + '<small>%</small>' : '—'}</b><span class="s">de las que tenían fecha límite</span></div><div class="kpi"><span class="l">Lead time medio</span><b>${lead.length ? (lead.reduce((a, b) => a + b, 0) / lead.length).toFixed(1) : '—'}<small>días</small></b></div>
    <div class="kpi"><span class="l">Tiempo de enfoque</span><b>${(focusMin / 60).toFixed(1)}<small>h</small></b></div><div class="kpi"><span class="l">Vencidas abiertas</span><b>${odOpen}</b></div></div>
    <div class="chart"><h3>Burn-up</h3><div class="s">Alcance frente a completado</div>${lineChart([{ vals: scope, color: 'var(--ink3)', dash: true }, { vals: comp, color: 'var(--sage)' }], pts.map(shortD))}<div class="legend"><span><i style="background:var(--ink3)"></i>Alcance</span><span><i style="background:var(--sage)"></i>Completado</span></div></div>
    <button class="card expand" data-act="sfull"><span>Ver análisis completo</span><small>ritmo, prioridades, secciones, historial</small><span>${VIEW.full ? '⌄' : '›'}</span></button>
    ${VIEW.full ? `<div class="chart"><h3>Ritmo semanal</h3><div class="s">Tareas completadas por semana</div>${barChart(perWeek, weeks.map(shortD))}</div>
      <div class="chart"><h3>Abiertas por prioridad</h3>${hbars(prio)}</div>
      <div class="chart"><h3>Completadas por sección</h3><div class="s">Histórico del proyecto</div>${hbars(bySec)}</div>
      <div class="chart"><h3>Últimas completadas <span class="muted" style="font-weight:400;font-size:12px">${last.length}</span></h3><div class="list">${last.map((t) => row(t, { noProject: true, log: true })).join('')}</div></div>` : ''}`;
}

/* ---------- Ajustes ---------- */
function settingsView() {
  const s = settings(), page = VIEW.page;
  if (page === 'tutorial') return tutorialView();
  const back = `<button class="btn ghost small" ${goAttr({ name: 'settings' })} style="margin:10px 0 0 -8px">‹ Ajustes</button>`;
  const themeL = { system: 'Sistema', light: 'Claro', dark: 'Oscuro' };
  if (!page) {
    const r = (pg, icon, label, val = '') => `<button class="r" ${goAttr({ name: 'settings', page: pg })}>${icon}<span class="grow">${label}</span><span class="val">${esc(val)}</span><span class="chev">›</span></button>`;
    const tr = tutRead().filter((id) => TUT_ALL.some((c) => c.id === id)).length;
    return head('Ajustes') + `<div class="rows" style="margin-bottom:10px">
      ${r('tutorial', I.book, 'Tutorial', tr ? `${tr}/${TUT_ALL.length} vistos` : `${TUT_ALL.length} recorridos`)}
    </div><div class="rows">
      ${r('cuenta', I.user.replace('class="ic"', ''), 'Cuenta', s && S.profile.name)}
      ${r('apariencia', SUN, 'Apariencia', themeL[s.theme || 'system'])}
      ${r('avisos', '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/></svg>', 'Avisos', `${s.leadDays ?? 2} días antes`)}
      ${r('planificacion', I.focus, 'Planificación')}
      ${r('areas', '<svg viewBox="0 0 24 24"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>', 'Áreas y contextos', `${S.areas.length} áreas · ${contexts().length} contextos`)}
      ${r('atajos', '<svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>', 'Atajos de iPhone')}
      ${r('claude', '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>', 'Claude', LS.get('summit-claude-on-' + ME, false) ? 'Conectado' : '')}
      <button class="r" data-act="shortcuts"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/></svg><span class="grow">Atajos de teclado</span><span class="val">?</span><span class="chev">›</span></button>
      ${r('datos', '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>', 'Datos', Q.length ? `${Q.length} pendientes` : 'Sincronizado')}
    </div><div class="ver">Summit ${APP_VERSION}</div>`;
  }
  const toggle = (k, label, val) => `<label class="kv" style="padding:0 12px"><span class="grow" style="text-align:left">${label}</span><input type="checkbox" data-act="stoggle" data-k="${k}" ${val ? 'checked' : ''} style="width:auto;accent-color:var(--sage)"></label>`;
  const P = {
    cuenta: () => head('Cuenta') + `<div class="card set-page" style="padding:12px;display:flex;flex-direction:column;gap:10px"><label class="seclabel">Nombre</label><input class="field" data-act="sname" value="${esc(S.profile.name)}">
      <label class="seclabel">Correo</label><div class="code">${esc(MEMAIL)}</div>
      <label class="seclabel">Cambiar contraseña</label><div class="row"><input class="field grow" type="password" id="s-pass" placeholder="Contraseña nueva" autocomplete="new-password"><button class="btn" data-act="spass">Guardar</button></div>
      <button class="btn danger" data-act="signout">${I.out.replace('<svg', '<svg class="ic"')} Cerrar sesión</button></div>`,
    apariencia: () => head('Apariencia') + `<div class="seg" style="display:flex">${Object.entries(themeL).map(([k, v]) => `<button class="${(s.theme || 'system') === k ? 'on' : ''}" style="flex:1" data-act="stheme" data-t="${k}">${v}</button>`).join('')}</div>`,
    avisos: () => head('Avisos') + `<div class="card">
      <div class="kv" style="padding:0 12px"><span class="grow" style="text-align:left">Avisar de fechas límite</span><select data-act="sset" data-k="leadDays" style="width:auto">${[1, 2, 3, 5, 7].map((n) => `<option value="${n}" ${(s.leadDays ?? 2) === n ? 'selected' : ''}>${n} ${n === 1 ? 'día' : 'días'} antes</option>`).join('')}</select></div>
      ${toggle('notifyOverdue', 'Avisar de tareas vencidas', s.notifyOverdue !== false)}
      ${toggle('sysNotif', 'Notificaciones del sistema al abrir', !!s.sysNotif)}
      <div class="kv" style="padding:0 12px"><span class="grow" style="text-align:left">Resumen diario del atajo</span><input type="time" data-act="sset" data-k="dailyDigest" value="${esc(s.dailyDigest || '07:00')}" style="width:auto"></div></div>
      <p class="hint">En iPhone, las notificaciones del sistema solo funcionan con Summit añadida a la pantalla de inicio. Para recibir el resumen a una hora fija, usa el atajo de iPhone con una automatización.</p>`,
    planificacion: () => head('Planificación') + `<div class="card">
      <div class="kv" style="padding:0 12px"><span class="grow" style="text-align:left">Día de la revisión semanal</span><select data-act="sset" data-k="reviewDay" style="width:auto">${[1, 2, 3, 4, 5, 6, 0].map((n) => `<option value="${n}" ${(s.reviewDay ?? 5) === n ? 'selected' : ''}>${DIAS[n]}</option>`).join('')}</select></div>
      <div class="kv" style="padding:0 12px"><span class="grow" style="text-align:left">Capacidad diaria</span><select data-act="sset" data-k="capacity" style="width:auto">${[240, 360, 480, 600].map((n) => `<option value="${n}" ${(s.capacity || 480) === n ? 'selected' : ''}>${n / 60} h</option>`).join('')}</select></div>
      ${toggle('twoMinute', 'Regla de los 2 minutos al procesar', s.twoMinute !== false)}
      <div class="kv" style="padding:0 12px"><span class="grow" style="text-align:left">Zona horaria</span><select data-act="sset" data-k="tz" style="width:auto">${['America/Havana', 'America/Mexico_City', 'Europe/Madrid', 'America/New_York', 'America/Bogota', 'Europe/London', 'UTC'].concat([s.tz]).filter((v, i, a) => v && a.indexOf(v) === i).map((z) => `<option ${z === tz() ? 'selected' : ''}>${z}</option>`).join('')}</select></div></div>`,
    areas: () => head('Áreas y contextos') + `<div class="seclabel">Áreas</div><div class="rows">${S.areas.map((a) => `<div class="r"><span class="grow">${esc(a.name)}</span><button class="btn ghost small" data-act="arename" data-id="${a.id}">Renombrar</button><button class="btn ghost small danger" data-act="adel" data-id="${a.id}">✕</button></div>`).join('')}</div>
      <div class="row" style="margin-top:8px"><input class="field grow" id="s-area" placeholder="Nueva área"><button class="btn" data-act="aadd">Añadir</button></div>
      <div class="seclabel" style="margin-top:16px">Contextos</div><div class="rows">${contexts().map((c, i) => `<div class="r"><span class="grow">@${esc(c)}</span><button class="btn ghost small danger" data-act="cdel" data-i="${i}">✕</button></div>`).join('')}</div>
      <div class="row" style="margin-top:8px"><input class="field grow" id="s-ctx" placeholder="Nuevo contexto"><button class="btn" data-act="cadd">Añadir</button></div>`,
    atajos: () => head('Atajos de iPhone') + `<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:10px">
      <p class="hint" style="margin:0">Con un código personal puedes capturar tareas en tu bandeja desde Siri o el Botón de Acción, y recibir un resumen de tus fechas límite.</p>
      ${VIEW.code ? `<div class="seclabel">Tu código (cópialo ahora, no se vuelve a mostrar)</div><div class="code">${esc(VIEW.code)}</div>` : ''}
      <div class="row"><button class="btn primary grow" data-act="gencode">${VIEW.code ? 'Generar otro' : 'Generar código'}</button><button class="btn danger" data-act="revcode">Revocar</button></div>
      <div class="seclabel">Capturar en la bandeja</div><div class="hint">Acción «Obtener contenido de URL» · Método POST · URL:</div><div class="code">${esc(CFG.SUPABASE_URL)}/rest/v1/rpc/summit_capturar_tarea</div>
      <div class="hint">Encabezados: <b>apikey</b> = <span class="mono" style="word-break:break-all">${esc(CFG.SUPABASE_KEY)}</span> y <b>Content-Type</b> = application/json. Cuerpo JSON: <b>p_codigo</b> = tu código, <b>p_texto</b> = el texto dictado.</div>
      <div class="seclabel">Resumen del día</div><div class="code">${esc(CFG.SUPABASE_URL)}/rest/v1/rpc/summit_resumen</div><div class="hint">Mismos encabezados. Cuerpo JSON: <b>p_codigo</b> = tu código. Devuelve el texto listo para «Mostrar notificación».</div></div>`,
    claude: () => head('Claude') + `<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:10px">
      <p class="hint" style="margin:0">Conecta Summit con Claude para preguntarle por tus tareas y pedirle que cree o actualice cosas. Solo accede a tus datos y a los proyectos compartidos contigo.</p>
      ${VIEW.key ? `<div class="seclabel">URL del conector (cópiala ahora, no se vuelve a mostrar)</div><div class="code">${esc(CFG.SUPABASE_URL)}/functions/v1/summit-mcp?key=${esc(VIEW.key)}</div><p class="hint">En Claude: Ajustes → Conectores → Añadir conector personalizado, y pega esta URL.</p>` : ''}
      <div class="row"><button class="btn primary grow" data-act="genkey">${VIEW.key ? 'Generar otra clave' : 'Generar clave'}</button><button class="btn danger" data-act="revkey">Revocar</button></div>
      <p class="hint" style="margin:0">Generar una clave nueva invalida la anterior.</p></div>`,
    datos: () => head('Datos') + `<div class="rows"><div class="r"><span class="grow">Cambios pendientes de subir</span><span class="val">${Q.length}</span></div><div class="r"><span class="grow">Tareas en este dispositivo</span><span class="val">${S.tasks.length}</span></div><div class="r"><span class="grow">Estado</span><span class="val">${OFFLINE ? 'Sin conexión' : 'En línea'}</span></div></div>
      <div class="row" style="margin-top:10px"><button class="btn grow" data-act="dsync">Sincronizar ahora</button><button class="btn grow" data-act="dexport">Exportar (JSON)</button></div>
      <p class="hint">Summit guarda una copia en este dispositivo para funcionar sin conexión. Los cambios se suben solos cuando vuelve la red.</p>`,
  };
  return back + (P[page] ? P[page]() : '');
}
Object.assign(ACT, {
  shortcuts: () => openShortcuts(),
  stoggle: (d, el) => { const v = el.checked; if (d.k === 'sysNotif' && v && window.Notification && Notification.permission !== 'granted') Notification.requestPermission().then((p) => { if (p !== 'granted') toast('Permiso de notificaciones denegado'); }); saveSettings({ [d.k]: v }); },
  sset: (d, el) => { el.onchange = () => { const v = ['leadDays', 'reviewDay', 'capacity'].includes(d.k) ? Number(el.value) : el.value; saveSettings({ [d.k]: v }); render(); }; },
  sname: (d, el) => { el.onchange = () => { const v = el.value.trim(); if (v) upd('profiles', ME, { name: v.slice(0, 80) }); render(); }; },
  spass: async () => { const v = $('#s-pass').value; if (v.length < 8) return toast('Mínimo 8 caracteres', null, null, true); const r = await sb.auth.updateUser({ password: v }); if (r.error) return toast(traducir(r.error), null, null, true); $('#s-pass').value = ''; toast('Contraseña cambiada'); },
  signout: () => signOut(),
  stheme: (d) => { saveSettings({ theme: d.t }); applyTheme(d.t); render(); },
  aadd: () => { const v = $('#s-area').value.trim(); if (v) { ins('areas', { id: uid(), user_id: ME, name: v.slice(0, 80), position: S.areas.length, created_at: new Date().toISOString() }); render(); } },
  arename: (d) => { const a = S.areas.find((x) => x.id === d.id); const v = (prompt('Nombre del área', a.name) || '').trim(); if (v) { upd('areas', d.id, { name: v.slice(0, 80) }); render(); } },
  adel: (d) => { if (!confirm('¿Eliminar esta área? Sus proyectos quedarán sin área.')) return; for (const p of S.projects.filter((x) => x.area_id === d.id)) upd('projects', p.id, { area_id: null }); del('areas', d.id); render(); },
  cadd: () => { const v = $('#s-ctx').value.trim().replace(/^@/, ''); if (v && !contexts().includes(v)) { saveSettings({ contexts: [...contexts(), v.slice(0, 40)] }); render(); } },
  cdel: (d) => { const c = contexts().slice(); c.splice(Number(d.i), 1); saveSettings({ contexts: c }); render(); },
  gencode: async () => { if (!navigator.onLine) return toast('Necesitas conexión', null, null, true); const r = await sb.rpc('generar_codigo_atajo'); if (r.error) return toast(r.error.message, null, null, true); VIEW.code = r.data; render(); },
  revcode: async () => { if (!confirm('¿Revocar el código? Los atajos dejarán de funcionar.')) return; const r = await sb.rpc('revocar_codigo_atajo'); if (r.error) return toast(r.error.message, null, null, true); VIEW.code = null; toast('Código revocado'); render(); },
  genkey: async () => { if (!navigator.onLine) return toast('Necesitas conexión', null, null, true); const r = await sb.rpc('generar_clave_claude'); if (r.error) return toast(r.error.message, null, null, true); VIEW.key = r.data; LS.set('summit-claude-on-' + ME, true); render(); },
  revkey: async () => { if (!confirm('¿Revocar la clave? El conector de Claude dejará de funcionar.')) return; const r = await sb.rpc('revocar_clave_claude'); if (r.error) return toast(r.error.message, null, null, true); VIEW.key = null; LS.set('summit-claude-on-' + ME, false); toast('Clave revocada'); render(); },
  dsync: async () => { await flush(); try { await loadAll(); setOffline(false); toast('Sincronizado'); } catch (e) { toast(isNetErr(e) ? 'Sin conexión' : e.message, null, null, true); } render(); },
  dexport: () => { const b = new Blob([JSON.stringify({ exportado: new Date().toISOString(), version: APP_VERSION, ...S }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `summit-${today()}.json`; a.click(); },
});
// El estado del conector se lee de la base de datos (la clave en sí nunca se guarda en claro)
async function checkClaude() { try { const r = await sb.from('claude_keys').select('created_at').eq('user_id', ME).maybeSingle(); if (!r.error) LS.set('summit-claude-on-' + ME, !!r.data); } catch (_) { /* sin red */ } }

/* ---------- Búsqueda y avisos ---------- */
const VIEW_LIST = [['Bandeja de entrada', { name: 'inbox' }, I.inbox], ['Hoy', { name: 'today' }, SUN], ['Próximos', { name: 'upcoming' }, I.soon], ['Calendario', { name: 'calendar' }, I.soon], ['Próximas acciones', { name: 'next' }, I.focus], ['En espera', { name: 'waiting' }, I.hourglass], ['Algún día / Quizás', { name: 'someday' }, I.cloud], ['Revisión semanal', { name: 'review' }, I.review], ['Matriz Eisenhower', { name: 'matrix' }, I.done], ['Enfoque', { name: 'focus' }, I.focus], ['Estadísticas', { name: 'stats' }, '<svg viewBox="0 0 24 24"><path d="M4 20h16M7 17V10M12 17V5M17 17v-4"/></svg>'], ['Registro', { name: 'log' }, I.book], ['Ajustes', { name: 'settings' }, I.gear]];
function openOverlay(html) { closePop(); const o = $('#overlay'); o.innerHTML = `<div id="ov-scrim" style="position:fixed;inset:0;z-index:44;background:rgba(5,8,6,.5)"></div><div class="overlay-card">${html}</div>`; o.hidden = false; $('#ov-scrim').onclick = closeOverlay; return o; }
function closeOverlay() { const o = $('#overlay'); if (o) { o.hidden = true; o.innerHTML = ''; } }
function openSearch() {
  const o = openOverlay(`<div class="head"><input id="sr-in" placeholder="Buscar tareas, proyectos o vistas…" autocomplete="off"></div><div class="list" id="sr-list"></div>`);
  const draw = (q) => {
    const nq = norm(q); let html = '';
    const views = VIEW_LIST.filter(([n]) => !nq || norm(n).includes(nq));
    html += views.map(([n, v, ic]) => `<button class="pop-i" data-v='${esc(JSON.stringify(v))}'>${ic}<span>${esc(n)}</span><span class="k">Vista</span></button>`).join('');
    if (nq) {
      html += S.projects.filter((p) => norm(p.name).includes(nq)).map((p) => `<button class="pop-i" data-v='${esc(JSON.stringify({ name: 'project', id: p.id }))}'><i class="pdot" style="background:${esc(p.color)};margin:0 4px"></i><span>${esc(p.name)}</span><span class="k">Proyecto</span></button>`).join('');
      html += S.tasks.filter((t) => !veiled(t) && norm(t.title + ' ' + (t.notes || '')).includes(nq)).slice(0, 40).map((t) => `<button class="pop-i" data-t="${t.id}"><span class="check p${t.priority}${t.status === 'done' ? ' on' : ''}" style="width:16px;height:16px"></span><span style="${t.status === 'done' ? 'text-decoration:line-through;color:var(--ink3)' : ''}">${esc(t.title)}</span><span class="k">${t.project_id && PJ(t.project_id) ? esc(PJ(t.project_id).name) : 'Tarea'}</span></button>`).join('');
    }
    $('#sr-list', o).innerHTML = html || '<div class="hint" style="padding:10px">Sin resultados</div>';
    $$('[data-v]', o).forEach((b) => b.onclick = () => go(JSON.parse(b.dataset.v)));
    $$('[data-t]', o).forEach((b) => b.onclick = () => { closeOverlay(); openTask(b.dataset.t); });
  };
  const i = $('#sr-in', o); i.oninput = () => draw(i.value); i.onkeydown = (e) => { if (e.key === 'Escape') closeOverlay(); if (e.key === 'Enter') { const f = $('#sr-list .pop-i', o); if (f) f.click(); } };
  draw(''); i.focus();
}
function openBell() {
  const a = alerts();
  const o = openOverlay(`<div class="head"><b>Notificaciones</b><button class="icon-btn" id="bl-x">${I.close}</button></div>
    ${a.length ? `<div class="list">${a.map((x, i) => `<button class="pop-i" data-i="${i}">${x.task ? I.flag.replace('class="ic"', '') : SUN}<span>${esc(x.txt)}</span></button>`).join('')}</div>` : '<div class="notice">Sin avisos pendientes.</div>'}
    <div style="padding:0 8px 10px"><button class="pop-i" id="bl-cfg">${I.gear}<span style="font-size:13px">Configurar avisos</span></button></div>`);
  $('#bl-x', o).onclick = closeOverlay;
  $('#bl-cfg', o).onclick = () => go({ name: 'settings', page: 'avisos' });
  $$('[data-i]', o).forEach((b) => b.onclick = () => { const x = a[Number(b.dataset.i)]; if (x.task) { const t = S.tasks.find((y) => y.id === x.task); if (t && veiled(t)) REVEAL.add(t.project_id); closeOverlay(); openTask(x.task); } else go(x.go); });
}

/* ---------- Gestos, teclado y pantalla ---------- */
function bindGestures() {
  // drag: la hoja sigue al dedo. Hoja inferior → arrastrar hacia abajo; tarjeta superior (añadir rápido) → hacia arriba
  let sx = 0, sy = 0, t0 = 0, edge = false, drag = null;
  const sc = () => $('#sheet-scrim');
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); drag = null;
    edge = sx < 24 && !$('#app').hidden && !sheetOpen() && $('#drawer').hidden;
    const sh = $('#sheet'); if (!sheetOpen() || !sh.contains(e.target)) return;
    const typing = e.target.closest('input,textarea,select,[contenteditable]') && document.activeElement === e.target.closest('input,textarea,select,[contenteditable]');
    if (sh.classList.contains('top')) { if (!typing && !e.target.closest('.qa-chips,.suggest')) drag = { el: sh, up: true, active: false, off: 0 }; return; }
    const body = $('.sheet-body', sh);
    if (e.target.closest('.sheet-grab,.sheet-head') || (!typing && (!body || body.scrollTop <= 0))) drag = { el: sh, up: false, active: false, off: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!drag) return;
    const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (!drag.active) {
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return;
      if ((drag.up && dy > 0) || (!drag.up && dy < 0)) { drag = null; return; } // es un scroll normal
      drag.active = true; drag.el.style.transition = 'none'; sc().style.transition = 'none';
    }
    e.preventDefault();
    const off = drag.up ? Math.min(0, dy) : Math.max(0, dy);
    drag.off = off;
    // un poco de resistencia al principio para que no se dispare con un roce
    drag.el.style.transform = `translateY(${off}px)`;
    sc().style.opacity = String(Math.max(0.15, 1 - Math.abs(off) / Math.max(320, drag.el.offsetHeight || 400)));
  }, { passive: false });
  document.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (edge && dx > 60 && Math.abs(dy) < 50) openDrawer();
    if (!$('#drawer').hidden && dx < -60 && Math.abs(dy) < 50) closeDrawer();
    if (drag && drag.active) {
      const d = drag, h = d.el.offsetHeight || 400, v = Math.abs(d.off) / Math.max(1, Date.now() - t0);
      if (Math.abs(d.off) > Math.min(140, h * 0.3) || v > 0.55) {
        d.el.style.transition = 'transform .2s cubic-bezier(.4,0,1,1)'; sc().style.transition = 'opacity .2s'; sc().style.opacity = '0';
        d.el.style.transform = d.up ? 'translateY(calc(-100% - 24px))' : 'translateY(100%)';
        if (navigator.vibrate) navigator.vibrate(8);
        setTimeout(() => closeSheet(true), 190);
      } else {
        d.el.style.transition = 'transform .25s cubic-bezier(.2,.9,.3,1.2)'; sc().style.transition = 'opacity .25s';
        d.el.style.transform = ''; sc().style.opacity = '';
      }
    }
    edge = false; drag = null;
  }, { passive: true });
}
/* ---------- Atajos de teclado (los mismos que en Todoist) ---------- */
const hoverOk = () => !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
function setFocus(id, scroll = true) {
  FOCUS = id;
  $$('#view .task.focused').forEach((r) => r.classList.remove('focused'));
  const r = id && $(`#view .task[data-task="${id}"]`);
  if (r) { r.classList.add('focused'); if (scroll && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' }); }
}
function moveFocus(step) {
  const rows = $$('#view .task'); if (!rows.length) return;
  let i = rows.findIndex((r) => r.dataset.task === FOCUS);
  i = i < 0 ? (step > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + step));
  setFocus(rows[i].dataset.task);
}
// Acciones sobre una tarea (la abierta o la seleccionada). Devuelve true si la tecla se ha usado
function taskKey(e, id) {
  const t = S.tasks.find((x) => x.id === id); if (!t) return false;
  const k = e.key, K = k.toLowerCase(), sh = e.shiftKey, mod = e.metaKey || e.ctrlKey;
  const save = (patch) => { upd('tasks', id, patch); render(); refreshSheet(); };
  if (mod && (k === 'Backspace' || k === 'Delete') || (sh && k === 'Delete')) {
    if (t.user_id !== ME && !isOwner(t.project_id)) { toast('Solo puede eliminarla quien la creó'); }
    else if (confirm('¿Eliminar esta tarea?')) { for (const ph of t.photos || []) mut({ k: 'unphoto', path: ph.path }); del('tasks', id); if (sheetCtx && sheetCtx.taskId === id) closeSheet(); render(); toast('Tarea eliminada'); }
  } else if (mod) return false;
  else if (!sh && K === 't') pickDate('Fecha', t.due_date, (v) => save({ due_date: v, due_time: v ? t.due_time : null, inbox: v ? false : (!t.project_id && t.inbox) }));
  else if (sh && K === 't') { save({ due_date: null, due_time: null }); toast('Fecha quitada'); }
  else if (sh && K === 'd') pickDate('Fecha límite', t.deadline, (v) => save({ deadline: v }));
  else if (!sh && K === 'v') pickProject(t.project_id, (v) => save({ project_id: v, section: null, inbox: !v && !t.due_date, assignee_id: null }));
  else if (!sh && K === 'y') pickPriority(t.priority, (v) => save({ priority: v }));
  else if (!sh && ['1', '2', '3', '4'].includes(k)) save({ priority: Number(k) });
  else if (!sh && K === 'l') pickContexts(t.contexts, (v) => save({ contexts: v }));
  else if (sh && K === 'r') pickAssignee(t.project_id, t.assignee_id, (v) => save({ assignee_id: v }));
  else if (!sh && K === 'e') toggleDone(id);
  else if (!sh && k === 'Enter') { if (!(sheetCtx && sheetCtx.taskId === id)) openTask(id); }
  else return false;
  e.preventDefault(); return true;
}
let gPrefix = 0, oPrefix = 0;
function bindKeys() {
  document.addEventListener('keydown', (e) => {
    if (popKey(e)) return;
    const k = e.key, K = k.toLowerCase(), mod = e.metaKey || e.ctrlKey;
    // Ctrl/Cmd + K: buscar (como Quick Find de Todoist)
    if (mod && K === 'k') { e.preventDefault(); openSearch(); return; }
    // Detalle abierto: Ctrl/Cmd + Enter guarda y cierra
    if (mod && k === 'Enter' && sheetCtx && sheetCtx.taskId) { e.preventDefault(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); closeSheet(); return; }
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.altKey) return;
    if (k === 'Escape') { if (!$('#overlay').hidden) closeOverlay(); else if (sheetOpen()) closeSheet(); else if (!$('#drawer').hidden && !pinnedNow()) closeDrawer(); else setFocus(null); return; }
    if (!$('#overlay').hidden) return;
    // Con una tarea abierta, las teclas actúan sobre ella
    if (sheetOpen()) { if (sheetCtx && sheetCtx.taskId) taskKey(e, sheetCtx.taskId); return; }
    if ($('#app').hidden) return;
    const now = Date.now();
    if (now - gPrefix < 1200 && !mod) {
      gPrefix = 0;
      const dest = { i: { name: 'inbox' }, t: { name: 'today' }, u: { name: 'upcoming' }, p: { name: 'projects' }, a: { name: 'stats' }, f: { name: 'focus' }, c: { name: 'calendar' }, r: { name: 'review' }, w: { name: 'waiting' }, n: { name: 'next' } }[K];
      if (dest) { e.preventDefault(); go(dest); } return;
    }
    if (now - oPrefix < 1200 && !mod) { oPrefix = 0; if (K === 's') { e.preventDefault(); go({ name: 'settings' }); } else if (K === 't') { e.preventDefault(); const th = (settings().theme || 'system') === 'dark' ? 'light' : 'dark'; saveSettings({ theme: th }); applyTheme(th); render(); } return; }
    if (mod) return;
    // Tarea seleccionada (o la última creada): T, V, Y, L, 1–4, E, Enter…
    if (FOCUS && S.tasks.some((x) => x.id === FOCUS) && taskKey(e, FOCUS)) return;
    if (K === 'j' || k === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
    else if (K === 'k' || k === 'ArrowUp') { e.preventDefault(); moveFocus(-1); }
    else if (K === 'q' || K === 'a') { e.preventDefault(); openQuick(); }
    else if (K === 'm') { e.preventDefault(); toggleSidebar(); }
    else if (k === '/' || K === 'f') { e.preventDefault(); openSearch(); }
    else if (k === '?') { e.preventDefault(); openShortcuts(); }
    else if (K === 'h') { e.preventDefault(); go({ name: 'today' }); }
    else if (K === 'g' && !e.shiftKey) gPrefix = now;
    else if (K === 'o' && !e.shiftKey) oPrefix = now;
  });
}
const SHORTCUTS = [
  ['Crear tareas', [['Q / A', 'Añadir tarea'], ['#', 'Proyecto (al escribir)'], ['/', 'Sección'], ['@ o %', 'Contexto'], ['+', 'Asignar a alguien (proyecto compartido)'], ['p1 – p4', 'Prioridad'], ['mañana 10:00', 'Fecha y hora en lenguaje natural'], ['{viernes}', 'Fecha límite'], ['Enter', 'Guardar la tarea'], ['↑ ↓ y Tab', 'Elegir una sugerencia']]],
  ['Tarea seleccionada o abierta', [['T', 'Poner fecha'], ['Shift + T', 'Quitar la fecha'], ['Shift + D', 'Fecha límite (propio de Summit)'], ['V', 'Mover a proyecto'], ['Y', 'Cambiar prioridad'], ['1 – 4', 'Prioridad directa'], ['L', 'Contextos'], ['Shift + R', 'Asignar'], ['E', 'Completar'], ['Enter', 'Abrir la tarea'], ['Ctrl/⌘ + Enter', 'Guardar y cerrar'], ['Ctrl/⌘ + Supr', 'Eliminar'], ['Esc', 'Cerrar']]],
  ['Navegación', [['J / K o ↑ ↓', 'Moverse entre tareas'], ['M', 'Mostrar, ocultar o fijar el menú'], ['/ · F · Ctrl/⌘ + K', 'Buscar'], ['H o G → T', 'Hoy'], ['G → I', 'Bandeja de entrada'], ['G → U', 'Próximos'], ['G → P', 'Proyectos'], ['G → A', 'Estadísticas'], ['G → F', 'Enfoque'], ['O → S', 'Ajustes'], ['O → T', 'Cambiar tema'], ['?', 'Esta ayuda']]],
];
function openShortcuts() {
  const o = openOverlay(`<div class="head"><b>Atajos de teclado</b><button class="icon-btn" id="sc-x">${I.close}</button></div>
    <div class="list sc-list">${SHORTCUTS.map(([h, l]) => `<div class="seclabel" style="padding:8px 4px 4px">${esc(h)}</div>${l.map(([key, d]) => `<div class="sc-row"><span>${esc(d)}</span><span class="keys">${key.split(/(\s(?:\/|o|\+|→|·|–)\s)/).map((p, i) => (i % 2 ? `<i>${esc(p.trim())}</i>` : `<kbd>${esc(p)}</kbd>`)).join('')}</span></div>`).join('')}`).join('')}
    <p class="hint" style="padding:8px 4px 4px">Son los mismos atajos que Todoist. Al escribir una tarea se usan los símbolos; con la tarea ya creada o seleccionada, las teclas.</p></div>`);
  $('#sc-x', o).onclick = closeOverlay;
}
function bindViewport() {
  const vv = window.visualViewport; if (!vv) return;
  const f = () => { document.documentElement.style.setProperty('--vvh', vv.height + 'px'); document.documentElement.style.setProperty('--vvtop', vv.offsetTop + 'px'); };
  vv.addEventListener('resize', f); vv.addEventListener('scroll', f); f();
}


/* ---------- Tutorial: recorridos guiados (Ajustes → Tutorial) ----------
   Recorridos cortos e interactivos: Summit te lleva a la pantalla, resalta el botón y te explica qué hace.
   En los pasos marcados con «tap» se pulsa el propio botón resaltado para seguir. Se sale siempre con la ✕
   de arriba a la derecha (o Esc). Los recorridos vistos se guardan en el perfil y se sincronizan. */
const TOURS = [
  { id: 'mover', title: 'Moverte por Summit', icon: I.mount, steps: [
    { go: { name: 'today' }, sel: '#tabbar', t: 'Menú inferior', x: 'Lo esencial siempre a mano: Bandeja, Proyectos y Enfoque.' },
    { sel: '#btn-menu', t: 'Menú lateral', x: 'Aquí está todo lo demás: Hoy, Próximos, Calendario, contextos, filtros, revisión y Ajustes.' },
    { sel: '#btn-search', t: 'Buscar', x: 'Busca en tareas, proyectos y pantallas. En el ordenador, tecla /.' },
    { sel: '#btn-stats', t: 'Estadísticas', x: 'Cómo vas: completadas, racha, fechas límite cumplidas y avance por proyecto.' },
    { sel: '#btn-bell', t: 'Avisos', x: 'Vencidas, fechas límite cercanas y el día de revisión. El punto indica que hay algo.' },
    { t: 'Sin conexión', x: 'Summit funciona sin internet. Arriba verás «sin conexión» y cuántos cambios esperan: se suben solos al volver la red.' },
  ] },
  { id: 'capturar', title: 'Capturar tareas rápido', icon: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>', steps: [
    { go: { name: 'inbox' }, sel: '#fab', tap: true, t: 'Captura en un toque', x: 'Pulsa + para apuntar una tarea. Pruébalo ahora.' },
    { sel: '#qa-title', t: 'Escribe y sigue', x: 'Empieza por un verbo. Puedes añadir #proyecto, @contexto, p1–p4 o «mañana 10:00».' },
    { sel: '#qa-add', tap: true, t: 'Guardar', x: 'Pulsa Añadir o Enter. El aviso aparece arriba, así el + queda libre para capturar la siguiente.' },
  ] },
  { id: 'procesar', title: 'Procesar la bandeja (y cualquier lista)', icon: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>', steps: [
    { go: { name: 'inbox' }, close: true, sel: '[data-act="clarify"]', alt: '#view .v-head', t: 'Procesar', x: 'Decide qué es cada cosa, una a una: Hoy, Próxima acción, 2 minutos, Delegar, Algún día o Eliminar.' },
    { go: { name: 'today' }, sel: '[data-act="clarify"]', alt: '#view .v-head', t: 'En cualquier lista', x: 'El botón Procesar también está en Hoy, Próximos, Calendario, proyectos y contextos. «Saltar» deja una tarea como está.' },
  ] },
  { id: 'proyectos', title: 'Proyectos', icon: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>', steps: [
    { go: { name: 'projects' }, close: true, sel: '[data-act="newproj"]', t: 'Nuevo proyecto', x: 'Cualquier resultado de más de un paso. Ponle el resultado deseado y cada cuántos días revisarlo.' },
    { sel: '[data-act="join"]', t: 'Proyectos compartidos', x: 'Únete con un código SUM- que te envíe otra persona. Cada uno añade sus tareas.' },
    { sel: '#view .rows', alt: '#view .v-head', t: 'Dentro del proyecto', x: 'Añade secciones al final, toca su nombre para renombrar y usa ⋯ para moverlas. Con el ojo ocultas las tareas de un proyecto privado.' },
  ] },
  { id: 'dia', title: 'Planificar el día', icon: SUN, steps: [
    { go: { name: 'today' }, close: true, sel: '#view .v-head', t: 'Hoy', x: 'Lo de hoy y lo vencido. Toca el círculo para completar; aparece «Deshacer» por si acaso.' },
    { go: { name: 'calendar' }, sel: '#view .cal', t: 'Calendario', x: 'Verde: fechas. Rojo: fechas límite. Toca un día para ver sus tareas y añadir una.' },
    { go: { name: 'next' }, sel: '[data-act="nextfilter"]', alt: '#view .v-head', t: 'Próximas acciones', x: 'Todo lo que puedes hacer ya, por contexto. Filtra por energía o por tareas cortas.' },
  ] },
  { id: 'enfoque', title: 'Enfoque (Pomodoro)', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>', steps: [
    { go: { name: 'focus' }, close: true, sel: '#view .seg', t: 'Elige el ritmo', x: '25/5, 50/10 o 90/15 minutos de trabajo y descanso.' },
    { sel: '#pomo-task', t: 'La tarea', x: 'Opcional: los minutos se suman a la tarea elegida.' },
    { sel: '[data-act="pstart"]', t: 'Empezar', x: 'Summit avisa al terminar y registra la sesión en tus estadísticas.' },
  ] },
  { id: 'revision', title: 'Revisión semanal', icon: I.review, steps: [
    { go: { name: 'review' }, close: true, sel: '#view .card.rev', t: 'La lista', x: 'Vacía la cabeza, ponte al día y revisa ideas. Marca cada paso al hacerlo.' },
    { sel: '[data-act="revdone"]', t: 'Terminar', x: 'Al acabar, márcala como completada. Debajo verás los proyectos sin próxima acción.' },
  ] },
  { id: 'conectar', title: 'Atajo de iPhone y Claude', icon: '<svg viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>', steps: [
    { go: { name: 'settings', page: 'atajos' }, close: true, sel: '[data-act="gencode"]', t: 'Atajo de iPhone', x: 'Genera tu código SMT- y úsalo en la app Atajos para capturar con Siri o el Botón de Acción. Toca una dirección para copiarla.' },
    { go: { name: 'settings', page: 'claude' }, sel: '[data-act="genkey"]', t: 'Claude', x: 'Genera la clave, copia la URL y añádela en Claude como conector personalizado.' },
  ] },
];
const TUT_ALL = TOURS;
const tutRead = () => settings().tutorialRead || [];
function tutorialView() {
  const read = tutRead(), done = TOURS.filter((c) => read.includes(c.id)).length;
  return `<button class="btn ghost small" ${goAttr({ name: 'settings' })} style="margin:10px 0 0 -8px">‹ Ajustes</button>` + head('Tutorial') +
    `<div class="card tut-hero"><div class="tut-hero-t"><span class="tut-logo">${LOGO}</span><div><b>Recorridos guiados</b><small>Elige qué quieres ver: Summit te lleva y te lo enseña. Menos de un minuto cada uno.</small></div></div>
      <div class="progress"><i style="width:${(done / TOURS.length * 100).toFixed(0)}%"></i></div><small class="muted">${done} de ${TOURS.length} vistos · sal cuando quieras con la ✕</small></div>
    <div class="rows">${TOURS.map((c) => { const r = read.includes(c.id); return `<button class="r tut-r" data-act="tour" data-id="${c.id}"><span class="tut-ic${r ? ' read' : ''}">${r ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : c.icon}</span><span class="grow"><span class="name">${esc(c.title)}</span></span><span class="val">${c.steps.length} pasos</span><span class="chev">▶</span></button>`; }).join('')}</div>` +
    (done ? `<p class="hint" style="text-align:center"><button class="btn ghost small" data-act="tutreset">Marcar todos como no vistos</button></p>` : '');
}
Object.assign(ACT, { tutreset: () => { saveSettings({ tutorialRead: [] }); render(); }, tour: (d) => startTour(d.id) });

let TOUR = null;
function startTour(id) {
  const tour = TOURS.find((x) => x.id === id); if (!tour) return;
  endTour(true);
  const root = document.createElement('div'); root.id = 'tour';
  root.innerHTML = `<div class="tour-hole" hidden></div><div class="tour-dim" hidden></div><div class="tour-tip" role="dialog" aria-live="polite"></div>`;
  document.body.appendChild(root);
  TOUR = { tour, i: 0, root, raf: 0, target: null };
  // Mientras dura el recorrido solo responden el globo, la ✕ y (en los pasos «tap») el botón resaltado
  TOUR.block = (e) => {
    if (!TOUR) return;
    if (e.target.closest && e.target.closest('#tour .tour-tip')) return;
    const st = TOUR.tour.steps[TOUR.i];
    if (st && st.tap && TOUR.target && TOUR.target.contains(e.target)) { if (e.type === 'click') setTimeout(() => tourNext(), 380); return; }
    if (st && st.sel && st.sel.startsWith('#qa-') && e.target.closest && e.target.closest('#sheet')) return; // se puede escribir en la tarea nueva
    e.preventDefault(); e.stopPropagation();
  };
  for (const ev of ['click', 'pointerdown', 'touchstart']) document.addEventListener(ev, TOUR.block, { capture: true, passive: false });
  TOUR.key = (e) => { if (!TOUR) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endTour(); } };
  document.addEventListener('keydown', TOUR.key, true);
  showStep();
}
function tourNext() { if (!TOUR) return; if (TOUR.i >= TOUR.tour.steps.length - 1) { endTour(); return; } TOUR.i++; showStep(); }
function tourPrev() { if (!TOUR || TOUR.i === 0) return; TOUR.i--; showStep(); }
function showStep() {
  const T = TOUR, st = T.tour.steps[T.i], n = T.tour.steps.length;
  if (st.close && sheetOpen()) closeSheet(true);
  if (st.go && (VIEW.name !== st.go.name || (st.go.page || null) !== (VIEW.page || null))) { if (sheetOpen()) closeSheet(true); go(st.go); }
  const tip = $('.tour-tip', T.root);
  tip.innerHTML = `<button class="tour-x" aria-label="Salir del tutorial">${I.close}</button><small class="tour-n">${esc(T.tour.title)} · ${T.i + 1} de ${n}</small><b>${esc(st.t)}</b><p>${esc(st.x)}</p>
    <div class="tour-nav"><div class="tour-dots">${T.tour.steps.map((_, j) => `<i class="${j === T.i ? 'on' : ''}"></i>`).join('')}</div>${T.i ? '<button class="btn small ghost" data-tb="prev">Atrás</button>' : ''}${st.tap && T.i < n - 1 ? '<button class="btn small" data-tb="next">Saltar</button>' : `<button class="btn small primary" data-tb="next">${T.i === n - 1 ? 'Terminar' : 'Siguiente'}</button>`}</div>`;
  $('.tour-x', tip).onclick = (e) => { e.stopPropagation(); endTour(); };
  $('[data-tb="next"]', tip).onclick = () => tourNext();
  const pb = $('[data-tb="prev"]', tip); if (pb) pb.onclick = () => tourPrev();
  // El elemento puede tardar en aparecer (por ejemplo, la hoja de nueva tarea): se busca durante un momento
  let tries = 0; T.target = null;
  const find = () => {
    if (TOUR !== T) return;
    const el = (st.sel && visibleEl(st.sel)) || (st.alt && visibleEl(st.alt));
    if (el || ++tries > 20 || !st.sel) { T.target = el || null; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); placeTour(); return; }
    setTimeout(find, 80);
  };
  find();
  cancelAnimationFrame(T.raf);
  const loop = () => { if (TOUR !== T) return; placeTour(); T.raf = requestAnimationFrame(loop); };
  T.raf = requestAnimationFrame(loop);
}
function visibleEl(sel) { return $$(sel).find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || null; }
function placeTour() {
  const T = TOUR; if (!T) return;
  const hole = $('.tour-hole', T.root), dim = $('.tour-dim', T.root), tip = $('.tour-tip', T.root);
  const vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const el = T.target && document.contains(T.target) ? T.target : null;
  const tw = Math.min(340, vw - 24); tip.style.width = tw + 'px';
  if (!el) { hole.hidden = true; dim.hidden = false; tip.style.left = Math.round((vw - tw) / 2) + 'px'; tip.style.top = Math.round(vh / 2 - tip.offsetHeight / 2) + 'px'; return; }
  const r = el.getBoundingClientRect(), pad = 6;
  hole.hidden = false; dim.hidden = true;
  Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
  const th = tip.offsetHeight, below = r.bottom + pad + 12, above = r.top - pad - 12 - th;
  let top = below + th < vh - 8 ? below : above > 8 ? above : Math.max(8, vh - th - 8);
  let left = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), vw - tw - 12);
  tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px';
}
function endTour(silent) {
  const T = TOUR; if (!T) return;
  TOUR = null; cancelAnimationFrame(T.raf);
  for (const ev of ['click', 'pointerdown', 'touchstart']) document.removeEventListener(ev, T.block, { capture: true });
  document.removeEventListener('keydown', T.key, true);
  T.root.remove();
  if (!silent) { const read = tutRead(); if (!read.includes(T.tour.id)) saveSettings({ tutorialRead: [...read, T.tour.id] }); if (VIEW.name === 'settings' && VIEW.page === 'tutorial') render(); }
}

// Tocar una dirección o clave (Atajos de iPhone, Claude) la copia al portapapeles
document.addEventListener('click', (e) => {
  const c = e.target.closest && e.target.closest('#view .code, #view .mono'); if (!c) return;
  const txt = c.textContent.trim(); if (!txt || !navigator.clipboard) return;
  navigator.clipboard.writeText(txt).then(() => toast('Copiado')).catch(() => null);
});

// Tras cargar los datos: comprobar el conector y los avisos del día
const _render = render;
let firstRenderDone = false;
render = function () { _render(); if (!firstRenderDone && S.profile && !$('#app').hidden) { firstRenderDone = true; checkClaude(); dailyNotice(); } };
