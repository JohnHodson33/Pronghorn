-- 0017: PE ownership becomes first-class on companies (was in Lane C's draft
-- 0016; the applied 0016 didn't carry it). The 433 river-guide consolidator
-- acquisitions are ground truth, and enrichment-detected PE flags graduate
-- from lead jsonb to queryable columns. /api/companies and the ingest already
-- degrade gracefully until this is applied.

alter table companies
  add column if not exists pe_owned boolean,
  add column if not exists pe_owner text;
