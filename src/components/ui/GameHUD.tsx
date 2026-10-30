/**
 * GameHUD.tsx
 *
 * Overlay DOM:
 *  - judul, tombol kamera & animasi (atas)
 *  - indikator giliran pemain + status (atas-tengah)
 *  - tombol lempar dadu (bisa dipakai keyboard/sentuh), hasil dadu, tombol lewati animasi
 *  - legenda pemain + urutan selesai
 *  - layar kemenangan + Main Lagi (muncul setelah animasi terakhir selesai)
 */

import { useEffect, type CSSProperties } from 'react';
import { type PlayerColor } from '../../game/board/boardLayout';
import { PLAYER_THEME } from '../../game/palette';
import { PERSONAL } from '../../config/personal';
import { useGame } from '../../game/store/GameContext';

export interface GameHUDProps {
  onResetCamera: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onOpenSetup: () => void;
}

const PLAYER_NAMES: Record<PlayerColor, string> = {
  yellow: 'Kuning',
  blue: 'Biru',
  red: 'Merah',
  green: 'Hijau',
};

const PLACE_EMOJI = ['🥇', '🥈', '🥉', '4️⃣'];

const PLAYER_SLOTS: Record<
  PlayerColor,
  { label: string; sub: string; corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }
> = {
  yellow: { label: 'PLAYER_1', sub: 'Kuning', corner: 'top-left' },
  blue: { label: 'PLAYER_2', sub: 'Biru', corner: 'top-right' },
  red: { label: 'PLAYER_3', sub: 'Merah', corner: 'bottom-right' },
  green: { label: 'PLAYER_4', sub: 'Hijau', corner: 'bottom-left' },
};

function PlayerCornerCard({ color }: { color: PlayerColor }) {
  const { state, anim, locked, roll } = useGame();
  if (!state.players.includes(color)) return null;

  const slot = PLAYER_SLOTS[color];
  const isTurn = (anim.holdPlayer ?? state.current) === color;
  const finishIndex = state.finishOrder.indexOf(color);
  const isFinished = finishIndex !== -1;
  const theme = PLAYER_THEME[color];
  const canRollHere = isTurn && !locked && state.phase === 'awaitingRoll';
  const lastRollVal = state.lastRoll?.player === color ? state.lastRoll.value : null;

  return (
    <aside
      className={`player-hud-card player-hud-card--${slot.corner} ${isTurn ? 'player-hud-card--active' : ''} ${isFinished ? 'player-hud-card--finished' : ''}`}
      style={
        {
          '--p-color': theme.main,
          '--p-dark': theme.dark,
          '--p-light': theme.light,
        } as CSSProperties
      }
      aria-label={`${slot.label} (${PLAYER_NAMES[color]})${isTurn ? ' - Giliran aktif' : ''}`}
    >
      <div className="player-hud-card__body">
        {/* Avatar Box */}
        <div className="player-hud-card__avatar-box">
          <svg viewBox="0 0 36 36" className="player-hud-card__avatar-svg" fill={theme.main}>
            <circle cx="18" cy="11" r="7" />
            <path d="M6 31c0-6.6 5.4-12 12-12s12 5.4 12 12v1H6v-1z" />
          </svg>
          <span className="player-hud-card__badge-icon" aria-hidden="true">
            🎁
          </span>
        </div>

        {/* Dice / Action Box */}
        <div
          className={`player-hud-card__dice-box ${canRollHere ? 'player-hud-card__dice-box--interactive' : ''}`}
          onClick={canRollHere ? () => roll() : undefined}
          role={canRollHere ? 'button' : undefined}
          tabIndex={canRollHere ? 0 : undefined}
          onKeyDown={
            canRollHere
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    roll();
                  }
                }
              : undefined
          }
          title={canRollHere ? 'Ketuk untuk melempar dadu' : undefined}
        >
          {isFinished ? (
            <span className="player-hud-card__medal">{PLACE_EMOJI[finishIndex] ?? '🏆'}</span>
          ) : isTurn && anim.rolling ? (
            <span className="player-hud-card__rolling-dice" aria-label="Mengocok dadu">
              🎲
            </span>
          ) : isTurn && state.phase === 'awaitingMove' && state.dice ? (
            <span className="player-hud-card__dice-num">{state.dice}</span>
          ) : isTurn && state.phase === 'awaitingRoll' ? (
            <span className="player-hud-card__timer-ring" aria-label="Menunggu lemparan dadu" />
          ) : lastRollVal !== null ? (
            <span className="player-hud-card__last-roll-num">{lastRollVal}</span>
          ) : (
            <span className="player-hud-card__empty-slot" />
          )}
        </div>
      </div>

      {/* Pill Name Badge at bottom */}
      <div className="player-hud-card__pill">
        <span className="player-hud-card__pill-text">{slot.label}</span>
      </div>
    </aside>
  );
}

function TurnBadge() {
  const { state, anim } = useGame();
  if (state.phase === 'finished') return null;

  // Selama animasi, tampilkan pemain yang sedang bergerak (bukan pemain berikutnya).
  const player = anim.holdPlayer ?? state.current;
  const theme = PLAYER_THEME[player];

  let phaseLabel: string;
  if (anim.busy) {
    phaseLabel = anim.rolling
      ? 'Mengocok dadu…'
      : anim.notice === 'noMove'
        ? 'Tidak ada langkah'
        : anim.notice === 'forfeit'
          ? 'Tiga angka 6 — giliran hangus'
          : 'Bergerak…';
  } else if (state.phase === 'awaitingRoll') {
    phaseLabel = 'Lempar dadu';
  } else {
    phaseLabel = `Pilih pion · 🎲 ${state.dice}`;
  }

  return (
    <div
      className="turn-badge"
      style={{ '--turn-color': theme.main, '--turn-dark': theme.dark } as CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={`Giliran ${PLAYER_NAMES[player]}: ${phaseLabel}`}
    >
      <span
        className="turn-badge__dot"
        style={{ background: theme.main, boxShadow: `0 0 0 3px ${theme.dark}` }}
      />
      <div>
        <strong>Giliran {PLAYER_NAMES[player]}</strong>
        <span className="turn-badge__phase">{phaseLabel}</span>
      </div>
    </div>
  );
}

function RollControls() {
  const { state, anim, locked, roll, skipAnimation } = useGame();
  const last = state.lastRoll;
  const canRoll = !locked && state.phase === 'awaitingRoll';

  return (
    <div className="roll-controls">
      {last && !anim.rolling && (
        <div className="dice-result" aria-label={`Hasil dadu terakhir: ${last.value}`}>
          <span className="dice-result__icon">🎲</span>
          <span className="dice-result__label">
            {PLAYER_NAMES[last.player]}: <strong>{last.value}</strong>
          </span>
        </div>
      )}
      {anim.busy ? (
        <button
          id="skip-animation-btn"
          type="button"
          className="hud__button hud__button--quiet"
          onClick={skipAnimation}
        >
          Lewati
        </button>
      ) : (
        <button
          id="roll-btn"
          type="button"
          className="hud__button"
          onClick={roll}
          disabled={!canRoll}
        >
          Lempar dadu
        </button>
      )}
    </div>
  );
}

function VictoryOverlay({ onOpenSetup, onOpenMenu }: Pick<GameHUDProps, 'onOpenSetup' | 'onOpenMenu'>) {
  const { state, anim, rematch } = useGame();
  // Tunggu langkah terakhir (mis. pion masuk home) selesai sebelum layar kemenangan.
  if (!state.winner || anim.busy) return null;

  const winner = state.winner;
  const theme = PLAYER_THEME[winner];

  return (
    <div
      className="victory-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${PLAYER_NAMES[winner]} menang!`}
    >
      <div
        className="victory-card"
        style={{ '--winner-color': theme.main, '--winner-dark': theme.dark } as CSSProperties}
      >
        <div className="victory-card__trophy">🏆</div>
        <h2 className="victory-card__title">
          <span style={{ color: theme.main }}>{PLAYER_NAMES[winner]}</span> Menang!
        </h2>
        <p className="victory-card__sub">{PERSONAL.winMessage}</p>

        {state.finishOrder.length > 1 && (
          <ol className="victory-ranking">
            {state.finishOrder.map((c, i) => (
              <li key={c}>
                <span className="victory-ranking__place">{PLACE_EMOJI[i]}</span>
                <span style={{ color: PLAYER_THEME[c].main, fontWeight: 700 }}>{PLAYER_NAMES[c]}</span>
              </li>
            ))}
          </ol>
        )}

        <button
          id="rematch-btn"
          type="button"
          className="hud__button victory-card__rematch"
          onClick={() => rematch()}
          autoFocus
        >
          Main Lagi
        </button>
        <div className="victory-card__secondary">
          <button type="button" className="hud__button hud__button--quiet" onClick={onOpenSetup}>
            Ganti pemain
          </button>
          <button type="button" className="hud__button hud__button--quiet" onClick={onOpenMenu}>
            Menu utama
          </button>
        </div>
      </div>
    </div>
  );
}

export function GameHUD({ onResetCamera, onOpenSettings, onOpenMenu, onOpenSetup }: GameHUDProps) {
  const { anim, skipAnimation } = useGame();

  // Escape melewati animasi yang sedang berjalan.
  useEffect(() => {
    if (!anim.busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipAnimation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anim.busy, skipAnimation]);

  return (
    <div className="hud">
      {/* 4 Corner Player Cards (seperti di screenshot Ludo modern) */}
      <PlayerCornerCard color="yellow" />
      <PlayerCornerCard color="blue" />
      <PlayerCornerCard color="green" />
      <PlayerCornerCard color="red" />

      <header className="hud__top-center">
        <div className="hud__top-bar">
          <div className="hud__title">
            <h1>{PERSONAL.title}</h1>
          </div>

          <div className="hud__actions">
            <button
              id="menu-btn"
              type="button"
              className="hud__button hud__button--quiet"
              onClick={onOpenMenu}
              title="Menu utama"
              aria-label="Menu utama"
            >
              <span className="hud__btn-icon">☰</span>
              <span className="hud__btn-text">Menu</span>
            </button>
            <button
              id="open-settings-btn"
              type="button"
              className="hud__button hud__button--quiet"
              onClick={onOpenSettings}
              title="Pengaturan"
              aria-label="Pengaturan"
            >
              <span className="hud__btn-icon">⚙️</span>
              <span className="hud__btn-text">Pengaturan</span>
            </button>
            <button
              id="reset-camera-btn"
              type="button"
              className="hud__button hud__button--quiet"
              onClick={onResetCamera}
              title="Reset sudut kamera"
              aria-label="Reset kamera"
            >
              <span className="hud__btn-icon">📷</span>
              <span className="hud__btn-text">Kamera</span>
            </button>
          </div>
        </div>

        <TurnBadge />
      </header>

      <footer className="hud__bottom-center">
        <RollControls />
      </footer>

      <VictoryOverlay onOpenSetup={onOpenSetup} onOpenMenu={onOpenMenu} />
    </div>
  );
}
