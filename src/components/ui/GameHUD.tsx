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

function PlayerLegend() {
  const { state } = useGame();

  return (
    <ul className="legend" aria-label="Warna pemain">
      {state.players.map((c) => {
        const place = state.finishOrder.indexOf(c);
        const finished = place !== -1;
        return (
          <li key={c} className={finished ? 'legend__item--finished' : ''}>
            <span className="legend__dot" style={{ background: PLAYER_THEME[c].main }} />
            {PLAYER_THEME[c].label}
            {finished && <span className="legend__place">{PLACE_EMOJI[place] ?? ''}</span>}
          </li>
        );
      })}
    </ul>
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
      <header className="hud__top">
        <div className="hud__title">
          <h1>{PERSONAL.title}</h1>
        </div>

        <TurnBadge />

        <div className="hud__actions">
          <button id="menu-btn" type="button" className="hud__button hud__button--quiet" onClick={onOpenMenu}>
            Menu
          </button>
          <button id="open-settings-btn" type="button" className="hud__button hud__button--quiet" onClick={onOpenSettings}>
            Pengaturan
          </button>
          <button id="reset-camera-btn" type="button" className="hud__button hud__button--quiet" onClick={onResetCamera}>
            Kamera
          </button>
        </div>
      </header>

      <footer className="hud__bottom">
        <RollControls />
        <p className="hud__hint">Ketuk dadu atau pion bercincin · geser untuk memutar · cubit/gulir untuk zoom</p>
        <PlayerLegend />
      </footer>

      <VictoryOverlay onOpenSetup={onOpenSetup} onOpenMenu={onOpenMenu} />
    </div>
  );
}
