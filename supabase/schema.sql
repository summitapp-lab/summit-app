-- ============================================================
-- SUMMIT 1.3.0 · Esquema completo de Supabase (proyecto dedicado)
-- Tablas en `public` (expuestas por la Data API, protegidas con RLS)
-- y funciones internas en `private` (no expuestas).
-- ============================================================
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
grant usage on schema private to authenticated, anon;

-- ---------- Tablas ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  color text not null default '#5F7F6A',
  sections text[] not null default '{}',
  status text not null default 'active' check (status in ('active','paused','done')),
  goal text not null default '',
  review_every integer not null default 7,
  last_review date,
  position integer not null default 0,
  share_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  assignee_id uuid references auth.users(id) on delete set null,
  section text,
  inbox boolean not null default false,
  status text not null default 'open' check (status in ('open','waiting','someday','reference','done')),
  priority smallint not null default 4 check (priority between 1 and 4),
  title text not null check (char_length(title) between 1 and 500),
  notes text not null default '',
  start_date date, due_date date, due_time text, deadline date,
  recur text, reminder text,
  contexts text[] not null default '{}',
  energy text, estimate integer,
  waiting_for text, waiting_since date,
  subtasks jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  created_on date not null default current_date,
  completed_at timestamptz, completed_by uuid,
  focus_min integer not null default 0,
  source text not null default 'app',
  needs_parse boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  minutes integer not null check (minutes between 1 and 600),
  task_id uuid, project_id uuid,
  created_at timestamptz not null default now()
);
create table public.shortcut_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now()
);
create table public.claude_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used timestamptz
);
create index tasks_user_idx on public.tasks(user_id);
create index tasks_project_idx on public.tasks(project_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index projects_owner_idx on public.projects(owner_id);
create index projects_area_idx on public.projects(area_id);
create index members_user_idx on public.project_members(user_id);
create index areas_user_idx on public.areas(user_id);
create index focus_user_idx on public.focus_sessions(user_id, day);

-- ---------- Funciones internas ----------
create function private.is_member(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members m where m.project_id = p and m.user_id = (select auth.uid()))
$$;
create function private.c_member(p uuid, u uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members m where m.project_id = p and m.user_id = u)
$$;
create function private.user_today(uid uuid) returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select nullif(settings->>'tz','') from public.profiles where id = uid), 'America/Havana'))::date
$$;
create function private.random_code(prefix text) returns text language sql volatile set search_path = '' as $$
  select prefix || '-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1), '')
  from generate_series(1, 6)
$$;
create function private.next_recur(rule text, d date) returns date language plpgsql immutable set search_path = '' as $$
declare r text := lower(coalesce(rule, '')); n date; i int;
  dias text[] := array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
begin
  if d is null then d := current_date; end if;
  if r like '%laborable%' then n := d + 1; while extract(dow from n) in (0, 6) loop n := n + 1; end loop; return n; end if;
  if r like '%2 semanas%' then return d + 14; end if;
  if r like '%día%' or r like '%dia%' then return d + 1; end if;
  if r like '%semana%' then return d + 7; end if;
  if r like '%mes%' then return (d + interval '1 month')::date; end if;
  if r like '%año%' or r like '%ano%' then return (d + interval '1 year')::date; end if;
  for i in 1..7 loop
    if r like '%' || dias[i] then n := d + 1; while extract(dow from n) <> i - 1 loop n := n + 1; end loop; return n; end if;
  end loop;
  return d + 7;
end $$;
create function private.shortcut_user(p_codigo text) returns uuid language sql stable security definer set search_path = '' as $$
  select user_id from public.shortcut_codes where code_hash = encode(extensions.digest(upper(trim(coalesce(p_codigo, ''))), 'sha256'), 'hex')
$$;
grant execute on all functions in schema private to authenticated, anon;

-- ---------- Disparadores ----------
create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create function private.add_owner_member() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_members (project_id, user_id, role, display_name)
  values (new.id, new.owner_id, 'owner', coalesce((select name from public.profiles where id = new.owner_id), ''))
  on conflict do nothing;
  return new;
end $$;
create function private.sync_member_name() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.name is distinct from old.name then update public.project_members set display_name = new.name where user_id = new.id; end if;
  return new;
end $$;
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function private.touch_updated_at();
create trigger tasks_touch before update on public.tasks for each row execute function private.touch_updated_at();
create trigger projects_owner_member after insert on public.projects for each row execute function private.add_owner_member();
create trigger profiles_sync_name after update on public.profiles for each row execute function private.sync_member_name();

-- ---------- Seguridad (RLS) ----------
alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.shortcut_codes enable row level security;
alter table public.claude_keys enable row level security;

create policy "perfil propio" on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "areas propias" on public.areas for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "enfoque propio" on public.focus_sessions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "codigo propio" on public.shortcut_codes for select to authenticated using (user_id = (select auth.uid()));
create policy "clave claude propia" on public.claude_keys for select to authenticated using (user_id = (select auth.uid()));
create policy "proyectos ver" on public.projects for select to authenticated using (owner_id = (select auth.uid()) or private.is_member(id));
create policy "proyectos crear" on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "proyectos editar" on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "proyectos borrar" on public.projects for delete to authenticated using (owner_id = (select auth.uid()));
create policy "miembros ver" on public.project_members for select to authenticated using (private.is_member(project_id));
create policy "tareas ver" on public.tasks for select to authenticated using (user_id = (select auth.uid()) or (project_id is not null and private.is_member(project_id)));
create policy "tareas crear" on public.tasks for insert to authenticated with check (user_id = (select auth.uid()) and (project_id is null or private.is_member(project_id)));
create policy "tareas editar" on public.tasks for update to authenticated
  using (user_id = (select auth.uid()) or (project_id is not null and private.is_member(project_id)))
  with check ((project_id is null and user_id = (select auth.uid())) or (project_id is not null and private.is_member(project_id)));
create policy "tareas borrar" on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.projects p where p.id = tasks.project_id and p.owner_id = (select auth.uid())));

revoke all on all tables in schema public from anon;

-- ---------- Funciones de la app (usuario con sesión) ----------
create function public.iniciar_cuenta(p_name text default '') returns void language plpgsql security definer set search_path = '' as $$
declare a_personal uuid; a_trabajo uuid; p uuid; nm text; uid uuid := auth.uid(); mail text;
begin
  if uid is null then raise exception 'Inicia sesión primero'; end if;
  if exists (select 1 from public.profiles where id = uid) then return; end if;
  select email into mail from auth.users where id = uid;
  nm := coalesce(nullif(trim(p_name), ''), split_part(coalesce(mail, 'usuario'), '@', 1));
  insert into public.profiles (id, name, settings) values (uid, nm, jsonb_build_object(
    'contexts', jsonb_build_array('Casa','Ordenador','Teléfono','Recados','Reunión','Oficina'),
    'filters', '[]'::jsonb, 'reviews', '[]'::jsonb, 'reviewChecks', '{}'::jsonb,
    'leadDays', 2, 'dailyDigest', '07:00', 'notifyOverdue', true, 'reviewDay', 5,
    'capacity', 480, 'twoMinute', true, 'theme', 'system'))
  on conflict (id) do nothing;
  insert into public.areas (user_id, name, position) values (uid, 'Trabajo', 0) returning id into a_trabajo;
  insert into public.areas (user_id, name, position) values (uid, 'Personal', 1) returning id into a_personal;
  insert into public.projects (owner_id, area_id, name, color, sections, goal, last_review)
  values (uid, a_personal, 'Bienvenida a Summit', '#5F7F6A', array['Empieza aquí','Cuando quieras'], 'Conocer Summit en 10 minutos', current_date)
  returning id into p;
  insert into public.tasks (user_id, project_id, section, title, notes, priority) values
   (uid, p, 'Empieza aquí', 'Captura todo lo que tienes en la cabeza', 'Pulsa + y escribe sin pensar. Todo va a la Bandeja. Prueba: «Llamar al dentista mañana 10:00 !2».', 2),
   (uid, p, 'Empieza aquí', 'Procesa la bandeja', 'En Bandeja, pulsa Procesar y decide qué es cada cosa: hoy, próxima acción, delegar, algún día o eliminar.', 2),
   (uid, p, 'Empieza aquí', 'Crea tu primer proyecto', 'Cualquier resultado que necesite más de un paso es un proyecto. Proyectos → + Nuevo.', 3),
   (uid, p, 'Cuando quieras', 'Configura el atajo de iPhone', 'Ajustes → Atajos de iPhone. Captura con Siri o el Botón de Acción.', 3),
   (uid, p, 'Cuando quieras', 'Haz tu primera revisión semanal', 'Menú → Más → Revisión semanal. Es el hábito que mantiene el sistema fiable.', 3),
   (uid, p, 'Cuando quieras', 'Borra este proyecto cuando termines', 'Abre el proyecto, pulsa ⋯ y elige Eliminar proyecto.', 4);
end $$;

create function public.compartir_proyecto(p_project uuid, p_nuevo boolean default false) returns text language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not exists (select 1 from public.projects where id = p_project and owner_id = auth.uid()) then raise exception 'Solo quien creó el proyecto puede compartirlo'; end if;
  select share_code into c from public.projects where id = p_project;
  if c is null or p_nuevo then
    loop c := private.random_code('SUM'); exit when not exists (select 1 from public.projects where share_code = c); end loop;
    update public.projects set share_code = c where id = p_project;
  end if;
  return c;
end $$;
create function public.dejar_de_compartir(p_project uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.projects where id = p_project and owner_id = auth.uid()) then raise exception 'Solo quien creó el proyecto puede dejar de compartirlo'; end if;
  update public.projects set share_code = null where id = p_project;
end $$;
create function public.unirse_a_proyecto(p_codigo text) returns uuid language plpgsql security definer set search_path = '' as $$
declare p uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  select id into p from public.projects where share_code = upper(trim(p_codigo));
  if p is null then raise exception 'Código no válido o caducado'; end if;
  insert into public.project_members (project_id, user_id, role, display_name)
  values (p, auth.uid(), 'member', coalesce((select name from public.profiles where id = auth.uid()), '')) on conflict do nothing;
  return p;
end $$;
create function public.abandonar_proyecto(p_project uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.projects where id = p_project and owner_id = auth.uid()) then raise exception 'Eres el propietario: elimina el proyecto o deja de compartirlo'; end if;
  update public.tasks set assignee_id = null where project_id = p_project and assignee_id = auth.uid();
  delete from public.project_members where project_id = p_project and user_id = auth.uid();
end $$;
create function public.quitar_miembro(p_project uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.projects where id = p_project and owner_id = auth.uid()) then raise exception 'Solo quien creó el proyecto puede quitar miembros'; end if;
  if p_user = auth.uid() then raise exception 'No puedes quitarte a ti mismo'; end if;
  update public.tasks set assignee_id = null where project_id = p_project and assignee_id = p_user;
  delete from public.project_members where project_id = p_project and user_id = p_user;
end $$;
create function public.generar_codigo_atajo() returns text language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  c := private.random_code('SMT');
  insert into public.shortcut_codes (user_id, code_hash) values (auth.uid(), encode(extensions.digest(c, 'sha256'), 'hex'))
  on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return c;
end $$;
create function public.revocar_codigo_atajo() returns void language sql security definer set search_path = '' as $$
  delete from public.shortcut_codes where user_id = auth.uid()
$$;
create function public.generar_clave_claude() returns text language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  c := 'CLD-' || upper(encode(extensions.gen_random_bytes(12), 'hex'));
  insert into public.claude_keys (user_id, key_hash) values (auth.uid(), encode(extensions.digest(c, 'sha256'), 'hex'))
  on conflict (user_id) do update set key_hash = excluded.key_hash, created_at = now(), last_used = null;
  return c;
end $$;
create function public.revocar_clave_claude() returns void language sql security definer set search_path = '' as $$
  delete from public.claude_keys where user_id = auth.uid()
$$;

-- ---------- Atajos de iPhone (sin sesión, con código personal) ----------
create function public.summit_capturar_tarea(p_codigo text, p_texto text) returns text language plpgsql security definer set search_path = '' as $$
declare u uuid; t text;
begin
  u := private.shortcut_user(p_codigo);
  if u is null then return '⚠️ Código no válido. Genera uno nuevo en Summit → Ajustes → Atajos de iPhone.'; end if;
  t := left(trim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g')), 500);
  if t = '' then return '⚠️ No se ha capturado nada: el texto estaba vacío.'; end if;
  insert into public.tasks (user_id, title, inbox, source, needs_parse, created_on) values (u, t, true, 'atajo', true, private.user_today(u));
  return '✓ Añadido a tu bandeja: ' || t;
end $$;
create function public.summit_resumen(p_codigo text) returns text language plpgsql security definer set search_path = '' as $$
declare u uuid; d date; lead int; nv int; nh int; nb int; lim text; hoy text;
begin
  u := private.shortcut_user(p_codigo);
  if u is null then return '⚠️ Código no válido. Genera uno nuevo en Summit → Ajustes → Atajos de iPhone.'; end if;
  d := private.user_today(u);
  select coalesce((settings->>'leadDays')::int, 2) into lead from public.profiles where id = u;
  select count(*) into nb from public.tasks where user_id = u and inbox and status <> 'done' and project_id is null;
  select count(*) into nv from public.tasks t where t.status in ('open','waiting') and (coalesce(t.assignee_id, t.user_id) = u)
    and ((t.due_date < d) or (t.deadline < d));
  select count(*), string_agg('· ' || t.title, E'\n' order by t.priority) into nh, hoy from public.tasks t
    where t.status in ('open','waiting') and coalesce(t.assignee_id, t.user_id) = u and (t.due_date = d or t.deadline = d);
  select string_agg('⚑ ' || to_char(t.deadline, 'DD/MM') || ' · ' || t.title, E'\n' order by t.deadline) into lim from public.tasks t
    where t.status <> 'done' and coalesce(t.assignee_id, t.user_id) = u and t.deadline > d and t.deadline <= d + lead;
  return format('Hoy: %s · Vencidas: %s · Bandeja: %s', nh, nv, nb)
    || coalesce(E'\n' || hoy, '') || coalesce(E'\nFechas límite próximas:\n' || lim, '');
end $$;

-- Permisos de ejecución
revoke execute on all functions in schema public from public, anon;
grant execute on function public.iniciar_cuenta(text), public.compartir_proyecto(uuid, boolean), public.dejar_de_compartir(uuid),
  public.unirse_a_proyecto(text), public.abandonar_proyecto(uuid), public.quitar_miembro(uuid, uuid),
  public.generar_codigo_atajo(), public.revocar_codigo_atajo(), public.generar_clave_claude(), public.revocar_clave_claude() to authenticated;
grant execute on function public.summit_capturar_tarea(text, text), public.summit_resumen(text) to anon, authenticated;

-- ---------- Tiempo real ----------
alter publication supabase_realtime add table public.tasks, public.projects, public.project_members;

-- ---------- Fotos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('summit-fotos', 'summit-fotos', false, 2097152, array['image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;
create policy "summit fotos ver" on storage.objects for select to authenticated
  using (bucket_id = 'summit-fotos' and exists (select 1 from public.tasks t where t.id::text = (storage.foldername(name))[1]));
create policy "summit fotos subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'summit-fotos' and exists (select 1 from public.tasks t where t.id::text = (storage.foldername(name))[1]));
create policy "summit fotos borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'summit-fotos' and exists (select 1 from public.tasks t where t.id::text = (storage.foldername(name))[1]));
