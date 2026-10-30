-- Phase 10: metadata-only file records, per-extension policy and usage accounting.
CREATE TABLE IF NOT EXISTS stored_files (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  chat_id text REFERENCES chats(id) ON DELETE CASCADE,
  message_id text REFERENCES messages(id) ON DELETE SET NULL,
  storage_key text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('images','videos','audio','documents','archives','executables','other')),
  original_name text NOT NULL,
  extension text NOT NULL,
  detected_mime text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','quarantined','deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS stored_files_owner_created_idx ON stored_files(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stored_files_chat_created_idx ON stored_files(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stored_files_status_idx ON stored_files(status, created_at);

CREATE TABLE IF NOT EXISTS file_type_policies (
  extension text PRIMARY KEY CHECK (extension = lower(extension) AND extension ~ '^[a-z0-9]{1,16}$'),
  category text NOT NULL CHECK (category IN ('images','videos','audio','documents','archives','executables','other')),
  enabled boolean NOT NULL DEFAULT false,
  max_bytes bigint NOT NULL DEFAULT 0 CHECK (max_bytes >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
INSERT INTO file_type_policies(extension, category, enabled, max_bytes) VALUES
('jpg','images',true,15728640),('jpeg','images',true,15728640),('png','images',true,15728640),('webp','images',true,15728640),('gif','images',true,15728640),('bmp','images',true,15728640),
('mp4','videos',true,524288000),('webm','videos',true,524288000),('mov','videos',true,524288000),('mkv','videos',false,0),('avi','videos',false,0),
('mp3','audio',true,52428800),('wav','audio',true,52428800),('aac','audio',true,52428800),('ogg','audio',true,52428800),('flac','audio',true,52428800),('m4a','audio',true,52428800),
('pdf','documents',true,31457280),('txt','documents',true,10485760),('doc','documents',false,0),('docx','documents',true,31457280),('xls','documents',false,0),('xlsx','documents',true,31457280),('ppt','documents',false,0),('pptx','documents',true,31457280),
('zip','archives',true,209715200),('7z','archives',true,209715200),('rar','archives',false,0),('tar','archives',false,0),('gz','archives',false,0),
('exe','executables',false,0),('msi','executables',false,0),('apk','executables',false,0),('deb','executables',false,0),('rpm','executables',false,0),
('html','other',false,0),('htm','other',false,0),('svg','other',false,0),('js','other',false,0),('mjs','other',false,0),('php','other',false,0),('phtml','other',false,0),('sh','other',false,0),('bat','other',false,0),('cmd','other',false,0),('ps1','other',false,0)
ON CONFLICT (extension) DO NOTHING;

INSERT INTO system_settings(key, value) VALUES
('file_storage_driver','local'),('file_storage_enabled','false'),('file_storage_root','/var/lib/nini-chat/storage'),
('file_upload_default_max_bytes','20971520'),('file_upload_daily_quota_bytes','536870912'),
('file_upload_weekly_quota_bytes','2147483648'),('file_upload_monthly_quota_bytes','5368709120'),
('file_upload_quota_enabled','true'),('file_upload_max_count_per_message','10'),
('file_upload_max_concurrent','3'),('file_upload_scan_required','false')
ON CONFLICT (key) DO NOTHING;
