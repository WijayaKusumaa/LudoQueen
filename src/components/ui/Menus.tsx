/**
 * Menus.tsx — layar judul, setup pemain, dan panel pengaturan.
 * Semua kontrol berupa <button> asli (bisa difokus keyboard, target sentuh ≥ 44px).
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { PLAYER_ORDER, type PlayerColor } from '../../game/board/boardLayout';
import { PLAYER_THEME } from '../../game/palette';
import { PERSONAL } from '../../config/personal';
import type { Settings } from '../../app/useSettings';

/** Escape menutup, Tab berputar di dalam dialog, fokus awal ke elemen pertama. */
function useDialogFocus(onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, [tabindex]:not([tabindex="-1"])'));
    (root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0]!;
        const last = list[list.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);
  return ref;
}

function Screen({ label, children, onClose }: { label: string; children: ReactNode; onClose?: () => void }) {
  const ref = useDialogFocus(onClose);
  return (
    <div className="screen" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
      {children}
    </div>
  );
}

// ─── Layar judul ──────────────────────────────────────────────────────────────

export function TitleScreen(props: {
  canResume: boolean;
  onPlay: () => void;
  onResume: () => void;
  onSettings: () => void;
}) {
  return (
    <Screen label={PERSONAL.title}>
      <div className="panel panel--title">
        <h1 className="title__name">{PERSONAL.title}</h1>
        <p className="title__for">untuk {PERSONAL.recipient}</p>
        {PERSONAL.welcomeMessage && <p className="title__message">{PERSONAL.welcomeMessage}</p>}
        <div className="panel__actions">
          <button type="button" id="play-btn" className="hud__button btn--lg" data-autofocus onClick={props.onPlay}>
            {props.canResume ? 'Permainan baru' : 'Main'}
          </button>
          {props.canResume && (
            <button type="button" id="resume-btn" className="hud__button hud__button--quiet btn--lg" onClick={props.onResume}>
              Lanjutkan
            </button>
          )}
          <button type="button" id="settings-btn" className="hud__button hud__button--quiet btn--lg" onClick={props.onSettings}>
            Pengaturan
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─── Setup pemain ─────────────────────────────────────────────────────────────

export const MIN_PLAYERS = 2;

export function SetupScreen(props: {
  selected: readonly PlayerColor[];
  onChange: (players: PlayerColor[]) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const { selected } = props;
  const toggle = (c: PlayerColor) => {
    const on = selected.includes(c);
    if (on && selected.length <= MIN_PLAYERS) return;
    // Urutan giliran selalu mengikuti urutan papan.
    props.onChange(PLAYER_ORDER.filter((p) => (p === c ? !on : selected.includes(p))));
  };

  return (
    <Screen label="Pengaturan pemain" onClose={props.onBack}>
      <div className="panel">
        <h2 className="panel__title">Siapa yang bermain?</h2>
        <p className="panel__hint">Pilih {MIN_PLAYERS}–4 warna. Giliran berjalan searah jarum jam.</p>
        <ul className="setup-grid">
          {PLAYER_ORDER.map((c) => {
            const on = selected.includes(c);
            const locked = on && selected.length <= MIN_PLAYERS;
            return (
              <li key={c}>
                <button
                  type="button"
                  className={`player-card${on ? ' player-card--on' : ''}`}
                  style={{ '--c': PLAYER_THEME[c].main, '--c-dark': PLAYER_THEME[c].dark } as React.CSSProperties}
                  aria-pressed={on}
                  aria-disabled={locked}
                  onClick={() => toggle(c)}
                >
                  <span className="player-card__dot" />
                  <span className="player-card__name">{PLAYER_THEME[c].label}</span>
                  <span className="player-card__state">{on ? 'Ikut' : 'Tidak ikut'}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="panel__actions">
          <button type="button" id="start-btn" className="hud__button btn--lg" data-autofocus onClick={props.onStart}>
            Mulai bermain
          </button>
          <button type="button" className="hud__button hud__button--quiet btn--lg" onClick={props.onBack}>
            Kembali
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─── Pengaturan ───────────────────────────────────────────────────────────────

function Switch(props: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="switch-row">
      <div>
        <div className="switch-row__label" id={`${props.id}-l`}>{props.label}</div>
        {props.hint && <div className="switch-row__hint">{props.hint}</div>}
      </div>
      <button
        type="button"
        id={props.id}
        role="switch"
        aria-checked={props.checked}
        aria-labelledby={`${props.id}-l`}
        className={`switch${props.checked ? ' switch--on' : ''}`}
        onClick={() => props.onChange(!props.checked)}
      >
        <span className="switch__knob" />
      </button>
    </div>
  );
}

export function SettingsPanel(props: {
  settings: Settings;
  reducedMotion: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  return (
    <Screen label="Pengaturan" onClose={props.onClose}>
      <div className="panel">
        <h2 className="panel__title">Pengaturan</h2>
        <Switch id="set-sound" label="Efek suara" checked={props.settings.sound} onChange={(sound) => props.onChange({ sound })} />
        <Switch id="set-music" label="Musik latar" checked={props.settings.music} onChange={(music) => props.onChange({ music })} />
        <Switch
          id="set-motion"
          label="Kurangi gerakan"
          hint="Pion berpindah langsung tanpa animasi."
          checked={props.reducedMotion}
          onChange={(reducedMotion) => props.onChange({ reducedMotion })}
        />
        <div className="panel__actions">
          <button type="button" id="settings-close-btn" className="hud__button btn--lg" data-autofocus onClick={props.onClose}>
            Selesai
          </button>
        </div>
      </div>
    </Screen>
  );
}
