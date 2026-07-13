-- 0012: lead-list run visibility (John 7/12 — his list sat "queued · 0 found"
-- with no explanation and read as broken). The runner now reports progress as
-- it works; these columns carry that state to the UI. Degrades gracefully:
-- run_leadgen.js probes for the columns and skips progress writes until applied.

alter table lead_lists
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists progress_note text,     -- "serper 50 · osm 12 candidates…"
  add column if not exists candidates_found integer not null default 0,
  add column if not exists last_error text;
