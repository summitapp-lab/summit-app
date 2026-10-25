-- Summit 1.3.0 · fotos en las tareas (ya aplicado en el proyecto el 25-10-2026)
alter table summit.tasks add column if not exists photos jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('summit-fotos', 'summit-fotos', false, 2097152, array['image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;

-- Cada foto vive en <id de la tarea>/<id de la foto>.jpg. Solo quien puede ver la tarea
-- (por las reglas RLS de summit.tasks) puede ver, subir o borrar sus fotos.
create policy "summit fotos ver" on storage.objects for select to authenticated
using (bucket_id = 'summit-fotos' and exists (select 1 from summit.tasks t where t.id::text = (storage.foldername(name))[1]));
create policy "summit fotos subir" on storage.objects for insert to authenticated
with check (bucket_id = 'summit-fotos' and exists (select 1 from summit.tasks t where t.id::text = (storage.foldername(name))[1]));
create policy "summit fotos borrar" on storage.objects for delete to authenticated
using (bucket_id = 'summit-fotos' and exists (select 1 from summit.tasks t where t.id::text = (storage.foldername(name))[1]));
