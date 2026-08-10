import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sampleSystemAlerts } from '../mock/sampleData';

export const getAlerts = async () => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('system_alerts')
      .select(`
        *,
        machine:machines (name, device_id),
        product:products (name)
      `)
      .order('created_at', { ascending: false });

    if (!error) return data;
  }
  return sampleSystemAlerts;
};

export const resolveAlert = async (alertId) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('system_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select();

    if (error) throw error;
    return data[0];
  }

  const alert = sampleSystemAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.is_resolved = true;
    alert.resolved_at = new Date().toISOString();
  }
  return alert;
};
