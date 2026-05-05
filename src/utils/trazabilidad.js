const STORAGE_KEY = 'trazabilidad.log.v1';
const MAX_ENTRIES = 500;

export const logTraza = ({ password = '—', module, action }) => {
  if (!module || !action) return;
  try {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      password,
      module,
      action,
    };
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

export const getTrazas = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const clearTrazas = () => {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
};
