-- =====================================================================
-- B1 Passport – Cơ sở dữ liệu Supabase
-- Chạy TOÀN BỘ file này một lần trong Supabase → SQL Editor → New query → Run.
-- Có thể chạy lại nhiều lần (an toàn: dùng IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- Bảng ----------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  code        text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  teacher_id  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text check (char_length(full_name) <= 120),
  role        text not null default 'student' check (role in ('student','teacher','admin')),
  class_id    uuid references public.classes(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Nội dung do quản trị viên thêm/sửa. Ghi đè hoặc bổ sung cho học liệu có sẵn trong data.js / vstep.js.
--   kind = 'lesson'  : một bài học (skill = listening | speaking | reading | writing)
--   kind = 'grammar' : một câu hỏi ngữ pháp trong ngân hàng
--   kind = 'bank'    : một khối dữ liệu lớn (id = 'vstepSpeaking' hoặc 'plan')
create table if not exists public.content (
  id          text primary key check (id ~ '^[A-Za-z0-9-]{1,40}$'),
  kind        text not null default 'lesson' check (kind in ('lesson','grammar','bank')),
  skill       text check (skill in ('listening','speaking','reading','writing')),
  data        jsonb not null default '{}'::jsonb,
  hidden      boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

-- Mỗi lần làm bài / nộp bài là một dòng.
--   kind = 'auto'     : điểm tự chấm (trắc nghiệm, nhận xét tự động, tự đánh giá)
--   kind = 'writing'  : bài viết nộp cho giáo viên (detail.text)
--   kind = 'speaking' : bản ghi âm nộp cho giáo viên (detail.path, detail.transcript)
--   kind = 'test'     : bài kiểm tra nhanh
create table if not exists public.results (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  lesson_id      text not null,
  kind           text not null default 'auto' check (kind in ('auto','writing','speaking','test')),
  score          numeric,
  total          numeric,
  detail         jsonb not null default '{}'::jsonb,
  feedback       text,
  teacher_score  numeric,
  reviewed_by    uuid references auth.users(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists results_user_idx on public.results(user_id, created_at desc);
create index if not exists results_kind_idx on public.results(kind, reviewed_at);

-- Trạng thái học tập đầy đủ của mỗi học viên (đồng bộ từ trình duyệt).
create table if not exists public.progress (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------- Hàm phân quyền ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin'
$$;

-- Người đang đăng nhập có được xem dữ liệu của học viên uid không?
create or replace function public.can_view(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = uid
      or public.is_admin()
      or exists (
        select 1 from public.profiles p
        join public.classes c on c.id = p.class_id
        where p.id = uid and c.teacher_id = auth.uid()
      )
$$;

-- ---------- Tạo hồ sơ khi đăng ký ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, class_id)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120),
    (select id from public.classes where code = upper(trim(coalesce(new.raw_user_meta_data->>'class_code', ''))))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RPC ----------
-- Học viên tham gia lớp bằng mã lớp
create or replace function public.join_class(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập'; end if;
  select id, name into c from public.classes where code = upper(trim(p_code));
  if c.id is null then raise exception 'Mã lớp không tồn tại'; end if;
  update public.profiles set class_id = c.id where id = auth.uid();
  return json_build_object('id', c.id, 'name', c.name);
end $$;

-- Quản trị viên đổi vai trò
create or replace function public.set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Chỉ quản trị viên được đổi vai trò'; end if;
  if p_role not in ('student','teacher','admin') then raise exception 'Vai trò không hợp lệ'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'Không thể tự bỏ quyền quản trị của chính mình'; end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- Chuyển lớp / xóa khỏi lớp (p_class = null).
-- Quản trị viên: mọi học viên. Giáo viên: học viên đang ở lớp của mình, chuyển sang lớp của mình hoặc xóa khỏi lớp.
create or replace function public.set_class(p_user uuid, p_class uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if public.my_role() <> 'teacher' then raise exception 'Không có quyền'; end if;
    if not exists (select 1 from public.profiles p join public.classes c on c.id = p.class_id
                   where p.id = p_user and c.teacher_id = auth.uid()) then
      raise exception 'Học viên không thuộc lớp của bạn';
    end if;
    if p_class is not null and not exists (select 1 from public.classes where id = p_class and teacher_id = auth.uid()) then
      raise exception 'Bạn chỉ có thể chuyển học viên sang lớp của mình';
    end if;
  end if;
  update public.profiles set class_id = p_class where id = p_user;
end $$;

-- ---------- Bảo mật theo dòng (RLS) ----------
alter table public.classes  enable row level security;
alter table public.profiles enable row level security;
alter table public.content  enable row level security;
alter table public.results  enable row level security;
alter table public.progress enable row level security;

-- profiles: chỉ được sửa họ tên của chính mình; vai trò và lớp đổi qua RPC ở trên
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (public.can_view(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- classes
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select to authenticated using (
  public.is_admin() or teacher_id = auth.uid()
  or id = (select class_id from public.profiles where id = auth.uid())
);
drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert to authenticated with check (
  public.is_admin() or (public.my_role() = 'teacher' and teacher_id = auth.uid())
);
drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes for update to authenticated
  using (public.is_admin() or (public.my_role() = 'teacher' and teacher_id = auth.uid()))
  with check (public.is_admin() or teacher_id = auth.uid());
drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes for delete to authenticated using (
  public.is_admin() or (public.my_role() = 'teacher' and teacher_id = auth.uid())
);

-- content: ai cũng đọc được (kể cả khách chưa đăng nhập); chỉ quản trị viên được ghi
drop policy if exists content_select on public.content;
create policy content_select on public.content for select to anon, authenticated using (true);
drop policy if exists content_write on public.content;
create policy content_write on public.content for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- results: học viên thêm/xem của mình; giáo viên/quản trị xem và nhận xét
revoke update on public.results from anon, authenticated;
grant update (feedback, teacher_score, reviewed_by, reviewed_at) on public.results to authenticated;

drop policy if exists results_insert on public.results;
create policy results_insert on public.results for insert to authenticated with check (user_id = auth.uid());
drop policy if exists results_select on public.results;
create policy results_select on public.results for select to authenticated using (public.can_view(user_id));
drop policy if exists results_review on public.results;
create policy results_review on public.results for update to authenticated
  using (public.my_role() in ('teacher','admin') and public.can_view(user_id) and user_id <> auth.uid())
  with check (reviewed_by = auth.uid());
drop policy if exists results_delete on public.results;
create policy results_delete on public.results for delete to authenticated using (public.is_admin());

-- progress
drop policy if exists progress_select on public.progress;
create policy progress_select on public.progress for select to authenticated using (public.can_view(user_id));
drop policy if exists progress_insert on public.progress;
create policy progress_insert on public.progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists progress_update on public.progress;
create policy progress_update on public.progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Lưu trữ bản ghi âm ----------
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists rec_insert on storage.objects;
create policy rec_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists rec_select on storage.objects;
create policy rec_select on storage.objects for select to authenticated using (
  bucket_id = 'recordings' and public.can_view(((storage.foldername(name))[1])::uuid)
);
drop policy if exists rec_delete on storage.objects;
create policy rec_delete on storage.objects for delete to authenticated using (
  bucket_id = 'recordings' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- =====================================================================
-- SAU KHI CHẠY XONG: đăng ký một tài khoản trên website, rồi chạy dòng dưới
-- (thay email của bạn) để trở thành quản trị viên đầu tiên:
--
--   update public.profiles set role = 'admin' where email = 'email.cua.ban@example.com';
-- =====================================================================
