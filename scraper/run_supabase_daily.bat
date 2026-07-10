@echo off
rem Pronghorn daily pipeline (Supabase edition) - scheduled via Windows Task
rem Scheduler task "Pronghorn Supabase Daily" (6:00 AM daily, runs when logged on).
rem The legacy weekly email-digest task ("Pronghorn Deal Sourcing") runs in
rem parallel until John retires it.
cd /d "C:\Users\johnd\Pronghorn\scraper"
if not exist logs mkdir logs
node run_supabase.js >> logs\daily_supabase.log 2>&1
