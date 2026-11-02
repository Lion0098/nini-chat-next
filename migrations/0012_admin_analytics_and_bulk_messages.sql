-- Phase 10 analytics and safe admin direct-message batches.
create table if not exists user_activity_events (
 id bigserial primary key,
 user_id text not null,
 event_type text not null check (event_type in ('signup','login','message_sent','story_published','admin_action')),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists user_activity_user_time_idx on user_activity_events(user_id,created_at desc);
create index if not exists user_activity_type_time_idx on user_activity_events(event_type,created_at desc);

create table if not exists admin_bulk_message_jobs (
 id text primary key,
 admin_id text not null,
 body text not null check(length(body) between 1 and 4000),
 target_filter text not null check(target_filter in ('all','active','inactive','selected')),
 target_count integer not null default 0,
 sent_count integer not null default 0,
 failed_count integer not null default 0,
 state text not null default 'queued' check(state in ('queued','processing','completed','failed')),
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
create index if not exists admin_bulk_jobs_created_idx on admin_bulk_message_jobs(created_at desc);
create table if not exists admin_bulk_message_recipients (
 job_id text not null references admin_bulk_message_jobs(id) on delete cascade,
 recipient_id text not null,
 chat_id text,
 message_id text,
 status text not null check(status in ('sent','failed','skipped')),
 error_code text,
 sent_at timestamptz,
 primary key(job_id,recipient_id)
);
create index if not exists admin_bulk_recipient_status_idx on admin_bulk_message_recipients(job_id,status);
