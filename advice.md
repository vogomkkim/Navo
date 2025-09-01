가능. auth.uid()만 GUC 기반 함수로 바꾸면 돼. 아래 그대로 실행하면 돼.

-- 0) Supabase 없이 쓸 "현재 유저ID" 헬퍼 (표준 Postgres)
create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- (필요 시) RLS 켜기
alter table user_sessions enable row level security;
alter table chat_messages enable row level security;
alter table chat_session_summaries enable row level security;

-- 1) 기존 정책 제거
drop policy if exists "user_sessions_user_policy" on "user_sessions";
drop policy if exists "chat_messages_user_policy" on "chat_messages";
drop policy if exists "chat_session_summaries_user_policy" on "chat_session_summaries";

-- 2) 대체 정책 생성 (READ/UPDATE/DELETE)
create policy "user_sessions_user_policy_rw" on "user_sessions"
  for select, update, delete
  using (user_id = app.current_user_id());

create policy "chat_messages_user_policy_rw" on "chat_messages"
  for select, update, delete
  using (
    session_id in (
      select session_id from user_sessions where user_id = app.current_user_id()
    )
  );

create policy "chat_session_summaries_user_policy_rw" on "chat_session_summaries"
  for select, update, delete
  using (
    session_id in (
      select session_id from user_sessions where user_id = app.current_user_id()
    )
  );

-- 3) INSERT까지 안전하게 막기(반드시 WITH CHECK 추가)
create policy "user_sessions_user_policy_ins" on "user_sessions"
  for insert
  with check (user_id = app.current_user_id());

create policy "chat_messages_user_policy_ins" on "chat_messages"
  for insert
  with check (
    session_id in (
      select session_id from user_sessions where user_id = app.current_user_id()
    )
  );

create policy "chat_session_summaries_user_policy_ins" on "chat_session_summaries"
  for insert
  with check (
    session_id in (
      select session_id from user_sessions where user_id = app.current_user_id()
    )
  );


앱 코드에서 요청마다 트랜잭션 시작 직후 아래처럼 세팅해야 한다:

SET LOCAL app.user_id = '<uuid-of-authenticated-user>';


(Node/Java 등에서 파라미터 바인딩으로 설정. PgBouncer 쓰면 반드시 SET LOCAL 사용.)

참고
만약 chat_messages/chat_session_summaries가 user_sessions.id(uuid)를 FK로 쓰는 구조라면, 위의 session_id 대신 session_id→session_id 조인 로직을 다음처럼 바꾸면 더 견고함:

using (
  session_id in (select id from user_sessions where user_id = app.current_user_id())
)
