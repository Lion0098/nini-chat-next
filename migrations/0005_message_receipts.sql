-- Phase 4: per-recipient message delivery/read receipts. Existing messages are preserved.
create table if not exists message_receipts (
  message_id text not null references messages(id) on delete cascade,
  recipient_id text not null,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, recipient_id),
  check (read_at is null or delivered_at is not null)
);

create index if not exists message_receipts_recipient_unread_idx
  on message_receipts (recipient_id, message_id) where read_at is null;

