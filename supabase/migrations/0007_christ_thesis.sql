-- CHRIST thesis institutional metadata, stored per-document as JSON.
alter table documents add column if not exists christ_thesis jsonb;
