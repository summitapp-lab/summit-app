-- ============================================================
-- SUMMIT · Lógica del conector de Claude (la llama la Edge Function summit-mcp)
-- public.summit_claude(clave, herramienta, argumentos) → jsonb
-- Solo accede a los datos de la persona dueña de la clave y a los proyectos compartidos con ella.
-- ============================================================
create or replace function private.c_txt(a jsonb, k text) returns text language sql immutable set search_path = '' as $$
  select nullif(trim(a->>k), '')
$$;
create or replace function private.c_date(a jsonb, k text) returns date language plpgsql immutable set search_path = '' as $$
begin
  if nullif(trim(a->>k), '') is null then return null; end if;
  return (a->>k)::date;
exception when others then raise exception 'Fecha no válida en «%»: usa AAAA-MM-DD', k;
end $$;
create or replace function private.c_person(id uuid, u uuid) returns text language sql stable security definer set search_path = '' as $$
  select case when id is null then null when id = u then 'yo' else coalesce((select nullif(name, '') from public.profiles where profiles.id = c_person.id), 'miembro') end
$$;
create or replace function private.c_can_see(t public.tasks, u uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select t.user_id = u or (t.project_id is not null and private.c_member(t.project_id, u))
$$;
create or replace function private.c_task_json(t public.tasks, u uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', t.id, 'titulo', t.title, 'notas', nullif(t.notes, ''),
    'proyecto', (select p.name from public.projects p where p.id = t.project_id), 'seccion', t.section,
    'estado', t.status, 'bandeja', case when t.inbox then true end, 'prioridad', t.priority,
    'fecha', t.due_date, 'hora', t.due_time, 'fecha_limite', t.deadline, 'disponible_desde', t.start_date,
    'repeticion', t.recur, 'recordatorio', t.reminder,
    'contextos', case when cardinality(t.contexts) > 0 then to_jsonb(t.contexts) end,
    'energia', t.energy, 'estimacion_min', t.estimate, 'en_espera_de', t.waiting_for, 'en_espera_desde', t.waiting_since,
    'subtareas', case when jsonb_array_length(t.subtasks) > 0 then t.subtasks end,
    'asignada_a', private.c_person(t.assignee_id, u), 'creada_por', case when t.user_id <> u then private.c_person(t.user_id, u) end,
    'fotos', nullif(jsonb_array_length(t.photos), 0), 'completada', t.completed_at, 'minutos_enfoque', nullif(t.focus_min, 0)))
$$;
create or replace function private.c_find_project(u uuid, ref text) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare r uuid; n int;
begin
  if nullif(trim(ref), '') is null then return null; end if;
  select p.id into r from public.projects p where (p.owner_id = u or private.c_member(p.id, u)) and lower(p.name) = lower(trim(ref)) limit 1;
  if r is not null then return r; end if;
  select count(*), min(p.id::text)::uuid into n, r from public.projects p where (p.owner_id = u or private.c_member(p.id, u)) and p.name ilike '%' || trim(ref) || '%';
  if n = 1 then return r; end if;
  if n = 0 then raise exception 'No encuentro el proyecto «%»', ref; end if;
  raise exception 'Hay % proyectos que coinciden con «%»: sé más concreto', n, ref;
end $$;
create or replace function private.c_find_member(p uuid, u uuid, ref text) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare r uuid;
begin
  if nullif(trim(ref), '') is null then return null; end if;
  if lower(trim(ref)) in ('yo', 'mí', 'mi', 'me') then return u; end if;
  if p is null then raise exception 'Solo se puede asignar en proyectos compartidos'; end if;
  select m.user_id into r from public.project_members m where m.project_id = p and lower(m.display_name) = lower(trim(ref)) limit 1;
  if r is null then select m.user_id into r from public.project_members m where m.project_id = p and m.display_name ilike '%' || trim(ref) || '%' limit 1; end if;
  if r is null then raise exception 'No hay ningún miembro «%» en este proyecto', ref; end if;
  return r;
end $$;
-- Aplica a una tarea los campos presentes en los argumentos (vacío = borrar)
create or replace function private.c_apply_fields(tid uuid, u uuid, a jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare pid uuid; t public.tasks;
begin
  select * into t from public.tasks where id = tid;
  if a ? 'proyecto' then
    pid := private.c_find_project(u, a->>'proyecto');
    update public.tasks set project_id = pid, section = null, inbox = case when pid is null then inbox else false end, assignee_id = null where id = tid;
    t.project_id := pid;
  end if;
  if a ? 'titulo' and private.c_txt(a, 'titulo') is not null then update public.tasks set title = left(private.c_txt(a, 'titulo'), 500) where id = tid; end if;
  if a ? 'notas' then update public.tasks set notes = coalesce(a->>'notas', '') where id = tid; end if;
  if a ? 'seccion' then
    if private.c_txt(a, 'seccion') is not null and t.project_id is not null
       and not exists (select 1 from public.projects p where p.id = t.project_id and private.c_txt(a, 'seccion') = any(p.sections)) then
      update public.projects set sections = array_append(sections, private.c_txt(a, 'seccion')) where id = t.project_id and owner_id = u;
    end if;
    update public.tasks set section = private.c_txt(a, 'seccion') where id = tid;
  end if;
  if a ? 'prioridad' then update public.tasks set priority = greatest(1, least(4, coalesce((a->>'prioridad')::int, 4))) where id = tid; end if;
  if a ? 'fecha' then update public.tasks set due_date = private.c_date(a, 'fecha'), inbox = case when private.c_date(a, 'fecha') is not null then false else inbox end where id = tid; end if;
  if a ? 'hora' then update public.tasks set due_time = private.c_txt(a, 'hora') where id = tid; end if;
  if a ? 'fecha_limite' then update public.tasks set deadline = private.c_date(a, 'fecha_limite') where id = tid; end if;
  if a ? 'disponible_desde' then update public.tasks set start_date = private.c_date(a, 'disponible_desde') where id = tid; end if;
  if a ? 'repeticion' then update public.tasks set recur = private.c_txt(a, 'repeticion') where id = tid; end if;
  if a ? 'recordatorio' then update public.tasks set reminder = private.c_txt(a, 'recordatorio') where id = tid; end if;
  if a ? 'contextos' then update public.tasks set contexts = coalesce((select array_agg(trim(both '@ ' from x)) from jsonb_array_elements_text(case when jsonb_typeof(a->'contextos') = 'array' then a->'contextos' else '[]'::jsonb end) x where trim(x) <> ''), '{}') where id = tid; end if;
  if a ? 'energia' then update public.tasks set energy = private.c_txt(a, 'energia') where id = tid; end if;
  if a ? 'estimacion_min' then update public.tasks set estimate = nullif(a->>'estimacion_min', '')::int where id = tid; end if;
  if a ? 'en_espera_de' then update public.tasks set waiting_for = private.c_txt(a, 'en_espera_de') where id = tid; end if;
  if a ? 'estado' and private.c_txt(a, 'estado') is not null then
    update public.tasks set status = private.c_txt(a, 'estado'),
      inbox = case when private.c_txt(a, 'estado') <> 'open' then false else inbox end,
      waiting_since = case when private.c_txt(a, 'estado') = 'waiting' then coalesce(waiting_since, private.user_today(u)) else waiting_since end,
      completed_at = case when private.c_txt(a, 'estado') = 'done' then coalesce(completed_at, now()) else null end,
      completed_by = case when private.c_txt(a, 'estado') = 'done' then u else null end
    where id = tid;
  end if;
  if a ? 'asignada_a' then
    select project_id into pid from public.tasks where id = tid;
    update public.tasks set assignee_id = private.c_find_member(pid, u, a->>'asignada_a') where id = tid;
  end if;
  if a ? 'bandeja' then update public.tasks set inbox = coalesce((a->>'bandeja')::boolean, false) and project_id is null where id = tid; end if;
end $$;
-- Completa una tarea y, si se repite, crea la siguiente
create or replace function private.c_complete(tid uuid, u uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tasks; nd date; base date; nid uuid;
begin
  select * into t from public.tasks where id = tid;
  if t.status = 'done' then return jsonb_build_object('ok', true, 'aviso', 'Ya estaba completada'); end if;
  update public.tasks set status = 'done', completed_at = now(), completed_by = u, inbox = false where id = tid;
  if t.recur is not null then
    base := coalesce(t.due_date, t.deadline, private.user_today(u));
    nd := private.next_recur(t.recur, base);
    while nd < private.user_today(u) loop nd := private.next_recur(t.recur, nd); end loop;
    insert into public.tasks (user_id, project_id, assignee_id, section, status, priority, title, notes, start_date, due_date, due_time, deadline,
      recur, reminder, contexts, energy, estimate, subtasks, created_on, source)
    values (u, t.project_id, t.assignee_id, t.section, 'open', t.priority, t.title, t.notes, null,
      case when t.due_date is not null then nd end, t.due_time, case when t.deadline is not null then t.deadline + (nd - base) end,
      t.recur, t.reminder, t.contexts, t.energy, t.estimate,
      coalesce((select jsonb_agg(jsonb_build_object('t', s->>'t', 'done', false)) from jsonb_array_elements(t.subtasks) s), '[]'::jsonb),
      private.user_today(u), 'claude')
    returning id into nid;
    return jsonb_build_object('ok', true, 'siguiente', private.c_task_json((select x from public.tasks x where x.id = nid), u));
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function private.dia_es(x date) returns text language sql immutable set search_path = '' as $$
  select (array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])[extract(dow from x)::int + 1]
$$;

create or replace function public.summit_claude(p_key text, p_tool text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid; a jsonb := coalesce(p_args, '{}'::jsonb); d date; pid uuid; tid uuid; t public.tasks; res jsonb; v text; lim int; n int; c text; aid uuid; dias int; p public.projects;
begin
  select user_id into u from public.claude_keys where key_hash = encode(extensions.digest(upper(trim(coalesce(p_key, ''))), 'sha256'), 'hex');
  if u is null then raise exception 'Clave de Summit no válida o revocada. Genera una nueva en Summit → Ajustes → Claude.'; end if;
  update public.claude_keys set last_used = now() where user_id = u;
  if not exists (select 1 from public.profiles where id = u) then raise exception 'Abre Summit una vez con tu cuenta antes de usar el conector.'; end if;
  d := private.user_today(u);

  if p_tool = 'resumen' then
    return jsonb_build_object(
      'hoy', d, 'dia_semana', private.dia_es(d), 'usuario', (select name from public.profiles where id = u),
      'bandeja', (select jsonb_build_object('total', count(*), 'tareas', coalesce(jsonb_agg(private.c_task_json(x, u)) filter (where rn <= 20), '[]')) from (select x, row_number() over (order by x.created_at) rn from public.tasks x where x.user_id = u and x.inbox and x.status <> 'done' and x.project_id is null) s),
      'para_hoy', coalesce((select jsonb_agg(private.c_task_json(x, u) order by x.priority) from public.tasks x where private.c_can_see(x, u) and x.status in ('open','waiting') and coalesce(x.assignee_id, x.user_id) = u and (x.due_date = d or x.deadline = d)), '[]'),
      'vencidas', coalesce((select jsonb_agg(private.c_task_json(x, u) order by coalesce(x.due_date, x.deadline)) from public.tasks x where private.c_can_see(x, u) and x.status in ('open','waiting') and coalesce(x.assignee_id, x.user_id) = u and (x.due_date < d or x.deadline < d)), '[]'),
      'fechas_limite_14_dias', coalesce((select jsonb_agg(private.c_task_json(x, u) order by x.deadline) from public.tasks x where private.c_can_see(x, u) and x.status <> 'done' and x.deadline > d and x.deadline <= d + 14), '[]'),
      'proyectos', coalesce((select jsonb_agg(jsonb_build_object('nombre', p2.name, 'estado', p2.status, 'abiertas', (select count(*) from public.tasks x where x.project_id = p2.id and x.status <> 'done'), 'compartido', (select count(*) from public.project_members m where m.project_id = p2.id) > 1) order by p2.position, p2.name) from public.projects p2 where (p2.owner_id = u or private.c_member(p2.id, u)) and p2.status <> 'done'), '[]'),
      'areas', coalesce((select jsonb_agg(name order by position) from public.areas where user_id = u), '[]'),
      'contextos', coalesce((select settings->'contexts' from public.profiles where id = u), '[]'));

  elsif p_tool = 'listar_tareas' then
    v := coalesce(private.c_txt(a, 'vista'), 'abiertas'); lim := least(300, greatest(1, coalesce((a->>'limite')::int, 50)));
    pid := private.c_find_project(u, a->>'proyecto');
    select jsonb_build_object('vista', v, 'total', count(*), 'tareas', coalesce(jsonb_agg(j) filter (where rn <= lim), '[]')) into res from (
      select private.c_task_json(x, u) j, row_number() over (order by case when v = 'completadas' then extract(epoch from x.completed_at) * -1 else 0 end, x.priority, coalesce(x.due_date, x.deadline, '2999-01-01'), x.created_at) rn
      from public.tasks x
      where private.c_can_see(x, u)
        and (pid is null or x.project_id = pid)
        and (private.c_txt(a, 'texto') is null or (x.title || ' ' || x.notes) ilike '%' || private.c_txt(a, 'texto') || '%')
        and (private.c_txt(a, 'contexto') is null or exists (select 1 from unnest(x.contexts) cx where lower(cx) = lower(trim(both '@ ' from private.c_txt(a, 'contexto')))))
        and case v
          when 'abiertas' then x.status <> 'done'
          when 'hoy' then x.status in ('open','waiting') and (x.due_date = d or x.deadline = d)
          when 'vencidas' then x.status in ('open','waiting') and (x.due_date < d or x.deadline < d)
          when 'proximos' then x.status <> 'done' and (x.due_date > d or x.deadline > d)
          when 'bandeja' then x.inbox and x.status <> 'done' and x.project_id is null and x.user_id = u
          when 'proximas_acciones' then x.status = 'open' and not x.inbox and (x.start_date is null or x.start_date <= d)
          when 'en_espera' then x.status = 'waiting'
          when 'algun_dia' then x.status = 'someday'
          when 'referencia' then x.status = 'reference'
          when 'completadas' then x.status = 'done'
          else true end) s;
    return res;

  elsif p_tool = 'listar_proyectos' then
    return jsonb_build_object('proyectos', coalesce((select jsonb_agg(jsonb_build_object(
      'nombre', p2.name, 'estado', p2.status, 'objetivo', nullif(p2.goal, ''), 'area', (select name from public.areas ar where ar.id = p2.area_id),
      'secciones', p2.sections, 'propietario', private.c_person(p2.owner_id, u),
      'miembros', (select jsonb_agg(private.c_person(m.user_id, u)) from public.project_members m where m.project_id = p2.id),
      'abiertas', (select count(*) from public.tasks x where x.project_id = p2.id and x.status <> 'done'),
      'completadas', (select count(*) from public.tasks x where x.project_id = p2.id and x.status = 'done'),
      'ultima_revision', p2.last_review, 'codigo_compartir', case when p2.owner_id = u then p2.share_code end) order by p2.position, p2.name)
      from public.projects p2 where (p2.owner_id = u or private.c_member(p2.id, u)) and (coalesce((a->>'incluir_completados')::boolean, false) or p2.status <> 'done')), '[]'));

  elsif p_tool = 'ver_proyecto' then
    pid := private.c_find_project(u, a->>'proyecto');
    if pid is null then raise exception 'Indica el proyecto'; end if;
    select * into p from public.projects where id = pid;
    return jsonb_build_object('nombre', p.name, 'estado', p.status, 'objetivo', nullif(p.goal, ''), 'secciones', p.sections,
      'miembros', (select jsonb_agg(private.c_person(m.user_id, u)) from public.project_members m where m.project_id = pid),
      'abiertas', coalesce((select jsonb_agg(private.c_task_json(x, u) order by array_position(p.sections, x.section) nulls first, x.priority, x.created_at) from public.tasks x where x.project_id = pid and x.status <> 'done'), '[]'),
      'ultimas_completadas', coalesce((select jsonb_agg(j) from (select private.c_task_json(x, u) j from public.tasks x where x.project_id = pid and x.status = 'done' order by x.completed_at desc limit 10) s), '[]'));

  elsif p_tool = 'estadisticas' then
    dias := least(730, greatest(1, coalesce((a->>'dias')::int, 30)));
    pid := private.c_find_project(u, a->>'proyecto');
    with base as (select x.* from public.tasks x where private.c_can_see(x, u) and (pid is null or x.project_id = pid) and (pid is not null or x.user_id = u or x.assignee_id = u or x.completed_by = u)),
         hechas as (select * from base where status = 'done' and completed_at >= (d - dias + 1)::timestamptz)
    select jsonb_build_object(
      'periodo_dias', dias, 'proyecto', (select name from public.projects where id = pid),
      'completadas', (select count(*) from hechas),
      'media_diaria', round((select count(*) from hechas)::numeric / dias, 2),
      'creadas', (select count(*) from base where created_on > d - dias),
      'fechas_limite_cumplidas_pct', (select case when count(*) > 0 then round(100.0 * count(*) filter (where (completed_at at time zone 'America/Havana')::date <= deadline) / count(*)) end from hechas where deadline is not null),
      'lead_time_medio_dias', (select round(avg((completed_at::date - created_on))::numeric, 1) from hechas),
      'minutos_enfoque', (select coalesce(sum(minutes), 0) from public.focus_sessions f where f.user_id = u and f.day > d - dias and (pid is null or f.project_id = pid)),
      'abiertas_ahora', (select count(*) from base where status <> 'done'),
      'por_proyecto', (select jsonb_object_agg(k, n2) from (select coalesce((select name from public.projects pp where pp.id = h.project_id), 'Sin proyecto') k, count(*) n2 from hechas h group by 1) s),
      'por_dia_semana', (select jsonb_object_agg(k, n2) from (select private.dia_es((completed_at at time zone 'America/Havana')::date) k, count(*) n2 from hechas group by 1) s)) into res;
    return res;

  elsif p_tool = 'revision_semanal' then
    return jsonb_build_object('hoy', d,
      'bandeja_sin_procesar', (select count(*) from public.tasks x where x.user_id = u and x.inbox and x.status <> 'done' and x.project_id is null),
      'proyectos_sin_proxima_accion', coalesce((select jsonb_agg(p2.name) from public.projects p2 where (p2.owner_id = u or private.c_member(p2.id, u)) and p2.status = 'active' and not exists (select 1 from public.tasks x where x.project_id = p2.id and x.status = 'open')), '[]'),
      'proyectos_por_revisar', coalesce((select jsonb_agg(jsonb_build_object('nombre', p2.name, 'ultima_revision', p2.last_review)) from public.projects p2 where p2.owner_id = u and p2.status = 'active' and (p2.last_review is null or d - p2.last_review >= p2.review_every)), '[]'),
      'esperas_largas', coalesce((select jsonb_agg(private.c_task_json(x, u)) from public.tasks x where private.c_can_see(x, u) and x.status = 'waiting' and x.waiting_since <= d - 7), '[]'),
      'fechas_limite_14_dias', coalesce((select jsonb_agg(private.c_task_json(x, u) order by x.deadline) from public.tasks x where private.c_can_see(x, u) and x.status <> 'done' and x.deadline >= d and x.deadline <= d + 14), '[]'),
      'algun_dia', (select count(*) from public.tasks x where x.user_id = u and x.status = 'someday'),
      'ultima_revision', (select settings->'reviews'->-1 from public.profiles where id = u));

  elsif p_tool = 'crear_tarea' then
    if private.c_txt(a, 'titulo') is null then raise exception 'Falta el título'; end if;
    pid := private.c_find_project(u, a->>'proyecto');
    insert into public.tasks (user_id, project_id, title, inbox, source, created_on, subtasks)
    values (u, pid, left(private.c_txt(a, 'titulo'), 500), pid is null and coalesce((a->>'bandeja')::boolean, true) and private.c_date(a, 'fecha') is null, 'claude', d,
      coalesce((select jsonb_agg(jsonb_build_object('t', value, 'done', false)) from jsonb_array_elements_text(case when jsonb_typeof(a->'subtareas') = 'array' then a->'subtareas' else '[]'::jsonb end)), '[]'::jsonb))
    returning id into tid;
    perform private.c_apply_fields(tid, u, a - 'proyecto' - 'titulo' - 'bandeja');
    return jsonb_build_object('ok', true, 'tarea', private.c_task_json((select x from public.tasks x where x.id = tid), u));

  elsif p_tool in ('actualizar_tarea', 'completar_tarea', 'eliminar_tarea') then
    begin tid := (a->>'id')::uuid; exception when others then raise exception 'Id de tarea no válido'; end;
    select * into t from public.tasks where id = tid;
    if t.id is null or not private.c_can_see(t, u) then raise exception 'No encuentro esa tarea'; end if;
    if p_tool = 'completar_tarea' then return private.c_complete(tid, u); end if;
    if p_tool = 'eliminar_tarea' then
      if t.user_id <> u and not exists (select 1 from public.projects p2 where p2.id = t.project_id and p2.owner_id = u) then raise exception 'Solo puede eliminarla quien la creó o el propietario del proyecto'; end if;
      delete from public.tasks where id = tid;
      return jsonb_build_object('ok', true, 'eliminada', t.title);
    end if;
    perform private.c_apply_fields(tid, u, a - 'id' - 'completar' - 'anadir_subtareas');
    if jsonb_typeof(a->'anadir_subtareas') = 'array' then
      update public.tasks set subtasks = subtasks || coalesce((select jsonb_agg(jsonb_build_object('t', value, 'done', false)) from jsonb_array_elements_text(a->'anadir_subtareas')), '[]'::jsonb) where id = tid;
    end if;
    if coalesce((a->>'completar')::boolean, false) then perform private.c_complete(tid, u); end if;
    return jsonb_build_object('ok', true, 'tarea', private.c_task_json((select x from public.tasks x where x.id = tid), u));

  elsif p_tool = 'crear_proyecto' then
    if private.c_txt(a, 'nombre') is null then raise exception 'Falta el nombre del proyecto'; end if;
    if private.c_txt(a, 'area') is not null then
      select id into aid from public.areas where user_id = u and lower(name) = lower(private.c_txt(a, 'area'));
      if aid is null then insert into public.areas (user_id, name, position) values (u, private.c_txt(a, 'area'), (select count(*) from public.areas where user_id = u)) returning id into aid; end if;
    end if;
    insert into public.projects (owner_id, area_id, name, goal, color, sections, review_every, last_review, position)
    values (u, aid, left(private.c_txt(a, 'nombre'), 120), coalesce(a->>'objetivo', ''), coalesce(private.c_txt(a, 'color'), '#5F7F6A'),
      coalesce((select array_agg(value) from jsonb_array_elements_text(case when jsonb_typeof(a->'secciones') = 'array' then a->'secciones' else '[]'::jsonb end)), '{}'),
      coalesce((a->>'revisar_cada_dias')::int, 7), d, (select count(*) from public.projects where owner_id = u))
    returning id into pid;
    insert into public.tasks (user_id, project_id, title, source, created_on)
    select u, pid, left(value, 500), 'claude', d from jsonb_array_elements_text(case when jsonb_typeof(a->'tareas') = 'array' then a->'tareas' else '[]'::jsonb end) where trim(value) <> '';
    if coalesce((a->>'compartir')::boolean, false) then
      loop c := private.random_code('SUM'); exit when not exists (select 1 from public.projects where share_code = c); end loop;
      update public.projects set share_code = c where id = pid;
    end if;
    return jsonb_build_object('ok', true, 'proyecto', a->>'nombre', 'codigo_compartir', c);

  elsif p_tool in ('actualizar_proyecto', 'compartir_proyecto') then
    pid := private.c_find_project(u, a->>'proyecto');
    if pid is null then raise exception 'Indica el proyecto'; end if;
    if not exists (select 1 from public.projects where id = pid and owner_id = u) then raise exception 'Solo quien creó el proyecto puede cambiarlo o compartirlo'; end if;
    if p_tool = 'compartir_proyecto' then
      select share_code into c from public.projects where id = pid;
      if c is null or coalesce((a->>'nuevo')::boolean, false) then
        loop c := private.random_code('SUM'); exit when not exists (select 1 from public.projects where share_code = c); end loop;
        update public.projects set share_code = c where id = pid;
      end if;
      return jsonb_build_object('ok', true, 'codigo', c, 'instrucciones', 'La otra persona entra en Summit → Proyectos → Unirme y escribe este código.');
    end if;
    update public.projects set
      name = coalesce(left(private.c_txt(a, 'nombre'), 120), name),
      goal = case when a ? 'objetivo' then coalesce(a->>'objetivo', '') else goal end,
      status = coalesce(private.c_txt(a, 'estado'), status),
      color = coalesce(private.c_txt(a, 'color'), color),
      sections = sections || coalesce((select array_agg(value) from jsonb_array_elements_text(case when jsonb_typeof(a->'anadir_secciones') = 'array' then a->'anadir_secciones' else '[]'::jsonb end) where not value = any(sections)), '{}'),
      last_review = case when coalesce((a->>'marcar_revisado')::boolean, false) then d else last_review end
    where id = pid;
    return jsonb_build_object('ok', true, 'proyecto', (select name from public.projects where id = pid));
  end if;
  raise exception 'Herramienta desconocida: %', p_tool;
end $$;

revoke execute on function public.summit_claude(text, text, jsonb) from public;
grant execute on function public.summit_claude(text, text, jsonb) to anon, authenticated;
grant execute on all functions in schema private to authenticated, anon;
