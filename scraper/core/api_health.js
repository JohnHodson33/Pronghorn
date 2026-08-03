// Paid-API health beacon — the Serper lesson (7/31): the account ran out of
// credits ~7/22 and NOTHING surfaced it for 9 days, because every CI step is
// continue-on-error (green runs, dead workers). Workers report hard API
// failures here; the dashboard raises an api_dead Key Action until the next
// success clears it. Same app_config pattern as sync_health.js. Best-effort:
// a beacon failure never breaks the job it's reporting on.
const { supabase } = require('./db');

async function reportApiHealth(service, ok, error = null) {
  try {
    await supabase.from('app_config').upsert({
      key: `api_health_${service}`,
      value: JSON.stringify({ ok, error: ok ? null : String(error || 'unknown').slice(0, 200), at: new Date().toISOString() }),
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch { return false; } // pre-0018 or transient
}

module.exports = { reportApiHealth };
