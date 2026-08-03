-- 0022 — PER-ROW RUN OUTCOMES (John 7/31: "I queued 80… I never really know
-- when it's done, and I don't know how to go back and look at the ones I
-- actually enriched.")
--
-- results: per-row outcome map keyed by deal_id (guides) / lead id (leads):
--   { "<id>": { gained_email?, gained_phone?, gained_linkedin?, gained_owner?,
--               escalated_paid?, nothing_new? } }   (only-true keys stored)
-- queued_by: who clicked Enrich (John | Tom | worker)
-- label: human run label auto-built from queue-time filters
--   ("Tree Care · Call now · 80 selected")
--
-- Workers + APIs degrade cleanly until this is applied.

alter table river_guide_runs add column if not exists results jsonb;
alter table river_guide_runs add column if not exists queued_by text;
alter table river_guide_runs add column if not exists label text;

alter table enrichment_jobs add column if not exists results jsonb;
alter table enrichment_jobs add column if not exists queued_by text;
alter table enrichment_jobs add column if not exists label text;
