import { useCallback, useEffect, useState } from 'react';

export interface Settings {
  sound: boolean;
  music: boolean;
  /** null = ikuti preferensi sistem. */
  reducedMotion: boolean | null;
}

const KEY = 'olivias-little-island:settings';
const DEFAULTS: Settings = { sound: true, music: false, reducedMotion: false };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULTS, ...parsed, reducedMotion: parsed.reducedMotion === true };
    }
  } catch {
    /* storage tidak tersedia / rusak: pakai default */
  }
  return DEFAULTS;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* abaikan */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  return { settings, update, reducedMotion: settings.reducedMotion === true };
}
