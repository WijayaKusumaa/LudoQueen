import { useCallback, useEffect, useState } from 'react';

export interface Settings {
  sound: boolean;
  music: boolean;
  /** null = ikuti preferensi sistem. */
  reducedMotion: boolean | null;
}

const KEY = 'olivias-little-island:settings';
const DEFAULTS: Settings = { sound: true, music: false, reducedMotion: null };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* storage tidak tersedia / rusak: pakai default */
  }
  return DEFAULTS;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);
  const [system, setSystem] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* abaikan */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  return { settings, update, reducedMotion: settings.reducedMotion ?? system };
}
