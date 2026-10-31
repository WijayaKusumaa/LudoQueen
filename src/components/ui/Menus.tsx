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

// ─── Daftar Arena Game (siap dikembangkan untuk pilihan arena ke depannya) ───

export interface ArenaItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly theme: 'green' | 'cyan' | 'purple';
  readonly locked?: boolean;
}

export const GAME_ARENAS: readonly ArenaItem[] = [
  {
    id: 'classic-island',
    title: 'Pulau Klasik',
    subtitle: '2–4 Pemain',
    theme: 'green',
  },
  {
    id: 'team-2v2',
    title: '2 vs. 2',
    subtitle: 'Arena Tim',
    theme: 'cyan',
  },
  {
    id: 'royal-arena',
    title: 'Arena Kerajaan',
    subtitle: 'Segera Hadir',
    theme: 'purple',
    locked: true,
  },
];

// ─── Layar judul (Lobby Utama bergaya Ludo Modern) ───────────────────────────

export function TitleScreen(props: {
  canResume: boolean;
  onPlay: () => void;
  onResume: () => void;
  onSettings: () => void;
}) {
  const ref = useDialogFocus();

  return (
    <div className="lobby" role="dialog" aria-modal="true" aria-label={PERSONAL.title} ref={ref}>
      {/* ── Top Bar: Profil, Level, Koin, Cash, & Pengaturan ── */}
      <header className="lobby-topbar">
        <div className="lobby-profile">
          <div className="lobby-profile__avatar" aria-hidden="true">
            <svg viewBox="0 0 40 40" className="lobby-profile__avatar-svg">
              <rect width="40" height="40" rx="8" fill="#ffe4c4" />
              <circle cx="20" cy="15" r="8" fill="#5c3a21" />
              <circle cx="20" cy="16" r="6.5" fill="#f5cfa0" />
              <circle cx="17.5" cy="15" r="1" fill="#2c1d11" />
              <circle cx="22.5" cy="15" r="1" fill="#2c1d11" />
              <path d="M17.5 18.5c1.5 1.2 3.5 1.2 5 0" stroke="#2c1d11" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M9 38c0-6 5-10 11-10s11 4 11 10" fill="#ffffff" />
            </svg>
          </div>
          <div className="lobby-profile__info">
            <span className="lobby-profile__name">{PERSONAL.recipient}</span>
            <div className="lobby-profile__xp-bar">
              <span className="lobby-profile__star" aria-label="Level 1">1</span>
              <div className="lobby-profile__xp-track">
                <div className="lobby-profile__xp-fill" />
              </div>
            </div>
          </div>
        </div>

        <div className="lobby-currencies">
          <div className="lobby-currency" aria-label="Koin: 26,484">
            <span className="lobby-currency__icon lobby-currency__icon--coin" aria-hidden="true" />
            <span className="lobby-currency__value">26,484</span>
            <button type="button" className="lobby-currency__add" aria-label="Tambah koin" onClick={props.onPlay}>+</button>
          </div>

          <div className="lobby-currency" aria-label="Permata: 41">
            <span className="lobby-currency__icon lobby-currency__icon--cash" aria-hidden="true">💵</span>
            <span className="lobby-currency__value">41</span>
            <button type="button" className="lobby-currency__add" aria-label="Tambah uang" onClick={props.onPlay}>+</button>
          </div>
        </div>

        <button
          type="button"
          id="settings-btn"
          className="lobby-settings-btn"
          onClick={props.onSettings}
          aria-label="Pengaturan"
          title="Pengaturan"
        >
          ⚙️
        </button>
      </header>

      {/* ── Area Tengah: Banner, Tombol Samping, Logo, & Pilihan Arena ── */}
      <div className="lobby-main">
        {/* Banner Klasifikasi + Tombol Samping */}
        <div className="lobby-upper-grid">
          {/* Kolom Kiri */}
          <div className="lobby-side lobby-side--left">
            <button type="button" className="lobby-side-btn lobby-side-btn--grey" title="Video Hadiah" onClick={props.onPlay}>
              <span aria-hidden="true">🎬</span>
            </button>
            <button type="button" className="lobby-side-btn lobby-side-btn--blue" title="Hadiah Harian" onClick={props.onPlay}>
              <span aria-hidden="true">🎁</span>
            </button>
            <button type="button" className="lobby-like-badge" onClick={props.onPlay}>
              <span aria-hidden="true">👍</span> Suka
            </button>
            <button type="button" className="lobby-side-btn lobby-side-btn--blue" title="Mode Cepat" onClick={props.onPlay}>
              <span aria-hidden="true">🎮</span>
            </button>
          </div>

          {/* Tengah: Banner Klasifikasi + Logo LUDO */}
          <div className="lobby-center-hero">
            <div className="lobby-rank-banner">
              <div className="lobby-rank-banner__emblem" aria-hidden="true">
                🔒
              </div>
              <div className="lobby-rank-banner__text">
                <div className="lobby-rank-banner__title">Klasifikasi</div>
                <div className="lobby-rank-banner__sub">Terbuka di level 5</div>
              </div>
            </div>

            {/* Logo Dadu & LUDO */}
            <div className="lobby-logo">
              <div className="lobby-logo__dice" aria-hidden="true">
                <svg viewBox="0 0 64 64" className="lobby-logo__dice-svg">
                  <rect x="8" y="8" width="48" height="48" rx="11" fill="#f8fafc" stroke="#1e293b" strokeWidth="3.5" transform="rotate(-12 32 32)" />
                  <circle cx="22" cy="20" r="3.6" fill="#0f172a" />
                  <circle cx="38" cy="17" r="3.6" fill="#0f172a" />
                  <circle cx="32" cy="31" r="3.6" fill="#0f172a" />
                  <circle cx="25" cy="44" r="3.6" fill="#0f172a" />
                  <circle cx="41" cy="41" r="3.6" fill="#0f172a" />
                </svg>
              </div>
              <h1 className="lobby-logo__text">LUDO</h1>
            </div>

            {props.canResume && (
              <button
                type="button"
                id="resume-btn"
                className="lobby-resume-btn"
                onClick={props.onResume}
              >
                ▶ Lanjutkan Permainan
              </button>
            )}
          </div>

          {/* Kolom Kanan */}
          <div className="lobby-side lobby-side--right">
            <button type="button" className="lobby-side-btn lobby-side-btn--blue" title="Kunci Peti" onClick={props.onPlay}>
              <span aria-hidden="true">🔑</span>
            </button>
            <button type="button" className="lobby-side-btn lobby-side-btn--blue" title="Celengan" onClick={props.onPlay}>
              <span aria-hidden="true">🐷</span>
            </button>
            <button type="button" className="lobby-side-btn lobby-side-btn--grey" title="Jadwal Acara" onClick={props.onPlay}>
              <span aria-hidden="true">📅</span>
            </button>
          </div>
        </div>

        {/* ── Carousel Kartu Pilihan Arena Game ── */}
        <section className="lobby-arenas" aria-label="Pilih Arena Permainan">
          <div className="lobby-arenas__track">
            {GAME_ARENAS.map((arena, idx) => {
              const isPrimary = idx === 0;
              return (
                <button
                  key={arena.id}
                  type="button"
                  id={isPrimary ? 'play-btn' : `arena-${arena.id}-btn`}
                  data-autofocus={isPrimary ? true : undefined}
                  className={`arena-card arena-card--${arena.theme}${arena.locked ? ' arena-card--locked' : ''}`}
                  onClick={props.onPlay}
                >
                  <div className="arena-card__gloss" />
                  <div className="arena-card__art" aria-hidden="true">
                    {arena.theme === 'green' && (
                      <svg viewBox="0 0 120 90" className="arena-card__svg">
                        {/* Dua karakter & bola dunia/pulau seperti referensi */}
                        <circle cx="40" cy="30" r="13" fill="#f5cfa0" stroke="#1e293b" strokeWidth="2.5" />
                        <path d="M27 25c2-9 18-11 24-2" fill="#3b2314" />
                        <path d="M24 62c0-10 7-17 16-17s16 7 16 17" fill="#f59e0b" stroke="#1e293b" strokeWidth="2.5" />
                        <circle cx="80" cy="30" r="13" fill="#f5cfa0" stroke="#1e293b" strokeWidth="2.5" />
                        <path d="M66 32c0-13 28-13 28 0v8H66z" fill="#1e293b" />
                        <circle cx="80" cy="31" r="11" fill="#f5cfa0" />
                        <path d="M64 62c0-10 7-17 16-17s16 7 16 17" fill="#ef4444" stroke="#1e293b" strokeWidth="2.5" />
                        <circle cx="60" cy="60" r="16" fill="#38bdf8" stroke="#1e293b" strokeWidth="2.5" />
                        <path d="M50 56c4-3 8 2 12-1s6-4 9 1v8c-5 4-15 3-21-2z" fill="#4ade80" />
                      </svg>
                    )}
                    {arena.theme === 'cyan' && (
                      <svg viewBox="0 0 120 90" className="arena-card__svg">
                        {/* Mini papan Ludo & tim */}
                        <rect x="42" y="10" width="36" height="36" rx="4" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                        <rect x="45" y="13" width="12" height="12" fill="#eab308" />
                        <rect x="63" y="13" width="12" height="12" fill="#3b82f6" />
                        <rect x="45" y="31" width="12" height="12" fill="#22c55e" />
                        <rect x="63" y="31" width="12" height="12" fill="#ef4444" />
                        <circle cx="34" cy="56" r="10" fill="#f5cfa0" stroke="#1e293b" strokeWidth="2" />
                        <path d="M22 76c0-7 5-12 12-12s12 5 12 12" fill="#22c55e" stroke="#1e293b" strokeWidth="2" />
                        <circle cx="60" cy="58" r="10" fill="#f5cfa0" stroke="#1e293b" strokeWidth="2" />
                        <path d="M48 78c0-7 5-12 12-12s12 5 12 12" fill="#3b82f6" stroke="#1e293b" strokeWidth="2" />
                        <circle cx="86" cy="56" r="10" fill="#f5cfa0" stroke="#1e293b" strokeWidth="2" />
                        <path d="M74 76c0-7 5-12 12-12s12 5 12 12" fill="#f97316" stroke="#1e293b" strokeWidth="2" />
                      </svg>
                    )}
                    {arena.theme === 'purple' && (
                      <svg viewBox="0 0 120 90" className="arena-card__svg">
                        {/* Mahkota & Pulau Arena Baru */}
                        <ellipse cx="60" cy="65" rx="34" ry="12" fill="#4ade80" stroke="#1e293b" strokeWidth="2.5" />
                        <path d="M36 52l8-22 16 12 16-12 8 22z" fill="#facc15" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
                        <circle cx="44" cy="26" r="3.5" fill="#fef08a" />
                        <circle cx="60" cy="22" r="4" fill="#ef4444" />
                        <circle cx="76" cy="26" r="3.5" fill="#fef08a" />
                      </svg>
                    )}
                  </div>
                  <span className="arena-card__title">{arena.title}</span>
                  <span className="arena-card__sub">{arena.subtitle}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mini-island dekoratif di kiri bawah seperti referensi */}
        <div className="lobby-island-deco" aria-hidden="true">
          <div className="lobby-island-deco__figure">
            <span className="lobby-island-deco__cube">🎲</span>
            <span className="lobby-island-deco__flower">🌸</span>
            <span className="lobby-island-deco__lock">🔒</span>
          </div>
          <span className="lobby-island-deco__label">Terbuka di level 3</span>
        </div>

        {/* ── 4 Slot Peti (Ranura de cofre) ── */}
        <div className="lobby-chests" aria-label="Slot Peti Hadiah">
          {[1, 2, 3, 4].map((slot) => (
            <div key={slot} className="lobby-chest-slot">
              <span>Slot<br />Peti</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigasi Bawah (5 Tab) ── */}
      <nav className="lobby-bottom-nav" aria-label="Navigasi Utama">
        <button type="button" className="lobby-nav-item" onClick={props.onPlay}>
          <span className="lobby-nav-item__icon" aria-hidden="true">🏪</span>
          <span className="lobby-nav-item__label">TOKO</span>
        </button>
        <button type="button" className="lobby-nav-item" onClick={props.onPlay}>
          <span className="lobby-nav-item__icon" aria-hidden="true">🎲</span>
          <span className="lobby-nav-item__label">INVENTARIS</span>
        </button>
        <button type="button" className="lobby-nav-item lobby-nav-item--active" onClick={props.onPlay}>
          <span className="lobby-nav-item__icon" aria-hidden="true">🏠</span>
          <span className="lobby-nav-item__label">BERANDA</span>
        </button>
        <button type="button" className="lobby-nav-item" onClick={props.onPlay}>
          <span className="lobby-nav-item__icon" aria-hidden="true">👥</span>
          <span className="lobby-nav-item__label">TEMAN</span>
        </button>
        <button type="button" className="lobby-nav-item" onClick={props.onPlay}>
          <span className="lobby-nav-item__icon" aria-hidden="true">🕹️</span>
          <span className="lobby-nav-item__label">MINIGAME</span>
        </button>
      </nav>
    </div>
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
