// Progreso de visualización guardado en el navegador del fan. Sin cuentas: funciona apenas entras.
export interface Progress { t: number; d: number; at: number; series: string }

const KEY = 'broers:progress:v1';

export function readAll(): Record<string, Progress> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function save(id: string, p: Omit<Progress, 'at'>) {
  try {
    const all = readAll();
    all[id] = { ...p, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export const ratio = (p?: Progress) => (p && p.d ? Math.min(1, p.t / p.d) : 0);
export const isFinished = (p?: Progress) => ratio(p) > 0.92;

/** Pinta las barras de progreso de todas las tarjetas [data-ep] de la página. */
export function paintCards(root: ParentNode = document) {
  const all = readAll();
  root.querySelectorAll<HTMLElement>('[data-ep]').forEach((el) => {
    const p = all[el.dataset.ep!];
    if (!p) return;
    el.dataset.progress = isFinished(p) ? 'done' : 'partial';
    el.style.setProperty('--p', `${Math.max(4, ratio(p) * 100)}%`);
  });
}
