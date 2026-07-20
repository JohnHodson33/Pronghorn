// Sync heartbeat — records "the Outlook sync last succeeded at <now>" in
// app_config (0018). The dashboard raises an outlook_sync_stale Key Action
// when this is >6h old, so a dead sync is never silent (John 7/16: the
// Fahrenhorst reply sat 24h partly because the sync was red all day and
// nothing surfaced it). Best-effort: never let a heartbeat failure break the
// job it's reporting on.
const { supabase } = require('./db');

async function recordSyncSuccess(key = 'outlook_sync_last_success') {
  try {
    await supabase.from('app_config').upsert({ key, value: new Date().toISOString(), updated_at: new Date().toISOString() });
    return true;
  } catch { return false; } // pre-0018 or transient — the job still succeeded
}

module.exports = { recordSyncSuccess };
