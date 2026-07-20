-- 0020: Subscription start_date (John 7/20 — costs Month vs YTD).
-- YTD subscription cost = active subs × months elapsed this year. Without a
-- start_date we assume "active since Jan 1" (an honest floor, disclosed in the
-- /api/costs ytd.note). Setting start_date per sub makes YTD exact — a sub that
-- began mid-year no longer overcounts the months before it existed.
alter table subscriptions add column if not exists start_date date;

-- Best-known starts (leave null to fall back to the Jan-1 assumption):
--  - Hunter (annual, active): billing all year → null = full YTD is correct.
--  - Vercel Pro (planned): not yet billing; set once it starts so YTD reflects
--    real cash, not a projected 12-month run-rate.
