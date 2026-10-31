/**
 * Menus.tsx — Main Menu (Pusat Kustomisasi Arena, Dice, & Pawn), Setup Pemain, dan Panel Pengaturan.
 * Semua kontrol berupa <button> asli (bisa difokus keyboard, target sentuh >= 44px).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PLAYER_ORDER, type PlayerColor } from '../../game/board/boardLayout';
import { PLAYER_THEME } from '../../game/palette';
import { PERSONAL } from '../../config/personal';
import type { Settings } from '../../app/useSettings';
import {
  ARENA_CATALOG,
  DICE_CATALOG,
  PAWN_CATALOG,
  useCustomization,
  type ArenaSkinDef,
  type CustomizationCategory,
  type DiceSkinDef,
  type PawnSkinDef,
} from '../../game/customization';

/** Escape menutup, Tab berputar di dalam dialog, fokus awal ke elemen pertama. */
function useDialogFocus(onClose?: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      );
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

// ─── Komponen Preview Visual Item ─────────────────────────────────────────────

function ArenaPreviewSvg({ arena }: { arena: ArenaSkinDef }) {
  const { colors } = arena;
  return (
    <svg viewBox="0 0 180 120" className="cust-preview-svg cust-preview-svg--arena" aria-hidden="true">
      <defs>
        <linearGradient id={`sea-${arena.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.oceanShallow} />
          <stop offset="100%" stopColor={colors.oceanDeep} />
        </linearGradient>
      </defs>
      {/* Laut / Background Arena */}
      <rect x="2" y="2" width="176" height="116" rx="14" fill={`url(#sea-${arena.id})`} />
      {/* Efek Buih Laut */}
      <rect
        x="18"
        y="12"
        width="144"
        height="96"
        rx="16"
        fill="none"
        stroke={colors.foam}
        strokeWidth="2.5"
        strokeDasharray="8 5"
        opacity="0.65"
      />
      {/* Lapisan Tanah & Rumput Pulau */}
      <rect x="24" y="18" width="132" height="88" rx="12" fill={colors.soil} />
      <rect x="24" y="14" width="132" height="86" rx="12" fill={colors.grass} />

      {/* Jalur Salib Ubin Ludo */}
      <rect x="74" y="16" width="32" height="82" rx="3" fill={colors.tileLight} stroke={colors.tileShade} strokeWidth="1.5" />
      <rect x="28" y="43" width="124" height="28" rx="3" fill={colors.tileLight} stroke={colors.tileShade} strokeWidth="1.5" />

      {/* Jalur Home 4 Warna */}
      <rect x="34" y="53" width="38" height="8" rx="2" fill="#eab308" />
      <rect x="86" y="21" width="8" height="22" rx="2" fill="#3b82f6" />
      <rect x="108" y="53" width="38" height="8" rx="2" fill="#ef4444" />
      <rect x="86" y="71" width="8" height="22" rx="2" fill="#22c55e" />

      {/* 4 Base Pemain */}
      <rect x="30" y="19" width="38" height="21" rx="5" fill="#eab308" stroke="#a16207" strokeWidth="1.5" />
      <rect x="112" y="19" width="38" height="21" rx="5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
      <rect x="112" y="74" width="38" height="21" rx="5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
      <rect x="30" y="74" width="38" height="21" rx="5" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />

      {/* Pusat Papan */}
      <rect x="76" y="45" width="28" height="24" rx="3" fill="#ffffff" stroke={colors.tileShade} strokeWidth="1.5" />
      <circle cx="90" cy="57" r="6" fill="#facc15" />
    </svg>
  );
}

function DicePreviewSvg({ dice }: { dice: DiceSkinDef }) {
  const { body, pip, pipOne, border } = dice.colors;
  return (
    <svg viewBox="0 0 100 100" className="cust-preview-svg cust-preview-svg--dice" aria-hidden="true">
      {/* Bayangan Bawah */}
      <ellipse cx="50" cy="86" rx="28" ry="7" fill="rgba(15, 23, 42, 0.28)" />
      {/* Badan Dadu 3D Miring */}
      <g transform="rotate(-10 50 48)">
        <rect
          x="18"
          y="16"
          width="64"
          height="64"
          rx="16"
          fill={body}
          stroke={border}
          strokeWidth="4"
        />
        {/* Kilau Atas */}
        <path
          d="M26 22h48a8 8 0 0 1 8 8v10c-18 6-46 6-64 0V30a8 8 0 0 1 8-8z"
          fill="rgba(255,255,255,0.28)"
        />
        {/* Mata Dadu (5 Pips dengan Pip Tengah Spesial) */}
        <circle cx="34" cy="32" r="5" fill={pip} />
        <circle cx="66" cy="32" r="5" fill={pip} />
        <circle cx="50" cy="48" r="6.5" fill={pipOne} />
        <circle cx="34" cy="64" r="5" fill={pip} />
        <circle cx="66" cy="64" r="5" fill={pip} />
      </g>
    </svg>
  );
}

function PawnPreviewSvg({ pawn }: { pawn: PawnSkinDef }) {
  return (
    <svg viewBox="0 0 100 100" className="cust-preview-svg cust-preview-svg--pawn" aria-hidden="true">
      {/* Bayangan Bawah */}
      <ellipse cx="50" cy="84" rx="26" ry="6" fill="rgba(15, 23, 42, 0.28)" />

      {/* 4 Titik Identitas Warna Ludo di Sudut Bawah */}
      <circle cx="22" cy="82" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="35" cy="86" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="65" cy="86" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="78" cy="82" r="5" fill="#eab308" stroke="#ffffff" strokeWidth="1.5" />

      {pawn.id === 'classic' && (
        <g>
          <path d="M30 76c2-16 10-26 14-36h12c4 10 12 20 14 36H30z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="3" />
          <ellipse cx="50" cy="76" rx="22" ry="5" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="2.5" />
          <circle cx="50" cy="30" r="14" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="3" />
          <circle cx="45" cy="25" r="4" fill="rgba(255,255,255,0.65)" />
        </g>
      )}

      {pawn.id === 'crystal' && (
        <g>
          <polygon points="50,12 68,34 62,76 38,76 32,34" fill="#38bdf8" stroke="#0369a1" strokeWidth="3" />
          <polygon points="50,12 50,76 38,76 32,34" fill="#7dd3fc" opacity="0.65" />
          <polygon points="50,12 68,34 50,44 32,34" fill="#bae6fd" opacity="0.75" />
        </g>
      )}

      {pawn.id === 'robot' && (
        <g>
          <rect x="32" y="46" width="36" height="30" rx="5" fill="#64748b" stroke="#1e293b" strokeWidth="3" />
          <rect x="38" y="53" width="24" height="14" rx="3" fill="#38bdf8" />
          <rect x="34" y="22" width="32" height="22" rx="6" fill="#94a3b8" stroke="#1e293b" strokeWidth="3" />
          <rect x="40" y="29" width="20" height="7" rx="3" fill="#22d3ee" />
          <line x1="50" y1="12" x2="50" y2="22" stroke="#1e293b" strokeWidth="3" />
          <circle cx="50" cy="11" r="4" fill="#ef4444" />
        </g>
      )}

      {pawn.id === 'knight' && (
        <g>
          <path d="M32 76l5-34 13-8 13 8 5 34H32z" fill="#eab308" stroke="#713f12" strokeWidth="3" />
          <polygon points="34,26 42,14 50,22 58,14 66,26 62,38 38,38" fill="#facc15" stroke="#713f12" strokeWidth="2.8" />
          <circle cx="50" cy="31" r="3.5" fill="#dc2626" />
        </g>
      )}

      {pawn.id === 'neon' && (
        <g>
          <path d="M31 76c3-16 10-26 13-36h12c3 10 10 20 13 36H31z" fill="#1e1b4b" stroke="#22d3ee" strokeWidth="3.5" />
          <circle cx="50" cy="29" r="14" fill="#1e1b4b" stroke="#f43f5e" strokeWidth="3.5" />
          <ellipse cx="50" cy="58" rx="14" ry="4" fill="none" stroke="#a855f7" strokeWidth="3" />
          <circle cx="50" cy="29" r="6" fill="#22d3ee" />
        </g>
      )}

      {pawn.id === 'cute' && (
        <g>
          <path d="M32 76c0-14 8-24 18-24s18 10 18 24H32z" fill="#f472b6" stroke="#831843" strokeWidth="3" />
          <circle cx="37" cy="22" r="7" fill="#f472b6" stroke="#831843" strokeWidth="2.5" />
          <circle cx="63" cy="22" r="7" fill="#f472b6" stroke="#831843" strokeWidth="2.5" />
          <circle cx="50" cy="36" r="18" fill="#fbcfe8" stroke="#831843" strokeWidth="3" />
          <circle cx="43" cy="35" r="3" fill="#1e293b" />
          <circle cx="57" cy="35" r="3" fill="#1e293b" />
          <path d="M46 42c2 2 6 2 8 0" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

// ─── Layar Utama: Main Menu & Kustomisasi (Arena, Dice, Pawn) ─────────────────

interface PendingPurchase {
  readonly category: CustomizationCategory;
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly price: number;
}

export function TitleScreen(props: {
  canResume: boolean;
  onPlay: () => void;
  onResume: () => void;
  onSettings: () => void;
}) {
  const ref = useDialogFocus();
  const { state, arenaDef, diceDef, pawnDef, selectItem, buyItem } = useCustomization();
  const [activeTab, setActiveTab] = useState<CustomizationCategory>('arena');
  const [pendingBuy, setPendingBuy] = useState<PendingPurchase | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);

  const handleCardClick = (
    category: CustomizationCategory,
    id: string,
    name: string,
    subtitle: string,
    price: number,
  ) => {
    const isOwned = (state.owned[category] as readonly string[]).includes(id);
    if (isOwned) {
      selectItem(category, id);
      return;
    }
    setBuyError(null);
    setPendingBuy({ category, id, name, subtitle, price });
  };

  const confirmPurchase = () => {
    if (!pendingBuy) return;
    const res = buyItem(pendingBuy.category, pendingBuy.id);
    if (res.ok) {
      setPendingBuy(null);
      setBuyError(null);
    } else if (res.reason === 'INSUFFICIENT_COINS') {
      setBuyError('Koin kamu belum mencukupi untuk membeli item ini.');
    }
  };

  return (
    <div className="cust-menu" role="dialog" aria-modal="true" aria-label={PERSONAL.title} ref={ref}>
      <div className="cust-menu__container">
        {/* ── Header: Judul, Koin, & Pengaturan ── */}
        <header className="cust-header">
          <div className="cust-header__brand">
            <span className="cust-header__logo-badge" aria-hidden="true">🎲</span>
            <div>
              <h1 className="cust-header__title">LUDO COLLECTION</h1>
              <p className="cust-header__sub">{PERSONAL.title} · Pilih gaya permainanmu</p>
            </div>
          </div>

          <div className="cust-header__right">
            <div className="cust-coin-pill" aria-label={`Saldo koin: ${state.coins}`}>
              <span className="cust-coin-pill__dot" aria-hidden="true">🪙</span>
              <span className="cust-coin-pill__amount">{state.coins} Coins</span>
            </div>

            <button
              type="button"
              id="settings-btn"
              className="cust-icon-btn"
              onClick={props.onSettings}
              aria-label="Pengaturan"
              title="Pengaturan"
            >
              ⚙️
            </button>
          </div>
        </header>

        {/* ── Navigasi 3 Kategori Utama: Arena, Dice, Pawn (Tanpa Horse) ── */}
        <nav className="cust-tabs" aria-label="Kategori Kustomisasi">
          <button
            type="button"
            id="tab-arena"
            className={`cust-tab${activeTab === 'arena' ? ' cust-tab--active' : ''}`}
            onClick={() => setActiveTab('arena')}
            aria-pressed={activeTab === 'arena'}
          >
            <span className="cust-tab__icon" aria-hidden="true">🗺️</span>
            <span className="cust-tab__label">Arena</span>
          </button>

          <button
            type="button"
            id="tab-dice"
            className={`cust-tab${activeTab === 'dice' ? ' cust-tab--active' : ''}`}
            onClick={() => setActiveTab('dice')}
            aria-pressed={activeTab === 'dice'}
          >
            <span className="cust-tab__icon" aria-hidden="true">🎲</span>
            <span className="cust-tab__label">Dice</span>
          </button>

          <button
            type="button"
            id="tab-pawn"
            className={`cust-tab${activeTab === 'pawn' ? ' cust-tab--active' : ''}`}
            onClick={() => setActiveTab('pawn')}
            aria-pressed={activeTab === 'pawn'}
          >
            <span className="cust-tab__icon" aria-hidden="true">♟️</span>
            <span className="cust-tab__label">Pawn</span>
          </button>
        </nav>

        {/* ── Katalog Item per Kategori ── */}
        <div className="cust-catalog" role="region" aria-label={`Katalog ${activeTab}`}>
          {activeTab === 'arena' && (
            <div className="cust-grid cust-grid--arena">
              {ARENA_CATALOG.map((arena) => {
                const isOwned = state.owned.arena.includes(arena.id);
                const isActive = state.selected.arena === arena.id;
                return (
                  <button
                    key={arena.id}
                    type="button"
                    id={`item-arena-${arena.id}`}
                    className={`cust-card cust-card--arena${isActive ? ' cust-card--active' : ''}${!isOwned ? ' cust-card--locked' : ''}`}
                    onClick={() => handleCardClick('arena', arena.id, arena.name, arena.subtitle, arena.price)}
                  >
                    {arena.tag && (
                      <span className={`cust-tag cust-tag--${arena.tag.toLowerCase()}`}>{arena.tag}</span>
                    )}
                    {isActive && (
                      <span className="cust-check-badge" aria-hidden="true">✓</span>
                    )}

                    <div className="cust-card__preview cust-card__preview--arena">
                      <ArenaPreviewSvg arena={arena} />
                    </div>

                    <div className="cust-card__info">
                      <span className="cust-card__title">{arena.name}</span>
                      <span className="cust-card__subtitle">{arena.subtitle}</span>

                      {isActive ? (
                        <span className="cust-status cust-status--active">Active</span>
                      ) : isOwned ? (
                        <span className="cust-status cust-status--owned">Owned</span>
                      ) : (
                        <span className="cust-status cust-status--price">🔒 {arena.price} Coins</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'dice' && (
            <div className="cust-grid cust-grid--items">
              {DICE_CATALOG.map((dice) => {
                const isOwned = state.owned.dice.includes(dice.id);
                const isActive = state.selected.dice === dice.id;
                return (
                  <button
                    key={dice.id}
                    type="button"
                    id={`item-dice-${dice.id}`}
                    className={`cust-card cust-card--item${isActive ? ' cust-card--active' : ''}${!isOwned ? ' cust-card--locked' : ''}`}
                    onClick={() => handleCardClick('dice', dice.id, dice.name, dice.subtitle, dice.price)}
                  >
                    <div className="cust-card__header">
                      <span className="cust-card__header-name">{dice.name.toUpperCase()}</span>
                    </div>

                    {dice.tag && (
                      <span className={`cust-tag cust-tag--${dice.tag.toLowerCase()}`}>{dice.tag}</span>
                    )}
                    {isActive && (
                      <span className="cust-check-badge" aria-hidden="true">✓</span>
                    )}

                    <div className="cust-card__preview cust-card__preview--item">
                      <DicePreviewSvg dice={dice} />
                    </div>

                    <div className="cust-card__footer">
                      {isActive ? (
                        <span className="cust-status cust-status--active">Active</span>
                      ) : isOwned ? (
                        <span className="cust-status cust-status--owned">Owned</span>
                      ) : (
                        <span className="cust-status cust-status--price">🔒 {dice.price} Coins</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'pawn' && (
            <div className="cust-grid cust-grid--items">
              {PAWN_CATALOG.map((pawn) => {
                const isOwned = state.owned.pawn.includes(pawn.id);
                const isActive = state.selected.pawn === pawn.id;
                return (
                  <button
                    key={pawn.id}
                    type="button"
                    id={`item-pawn-${pawn.id}`}
                    className={`cust-card cust-card--item${isActive ? ' cust-card--active' : ''}${!isOwned ? ' cust-card--locked' : ''}`}
                    onClick={() => handleCardClick('pawn', pawn.id, pawn.name, pawn.subtitle, pawn.price)}
                  >
                    <div className="cust-card__header">
                      <span className="cust-card__header-name">{pawn.name.toUpperCase()}</span>
                    </div>

                    {pawn.tag && (
                      <span className={`cust-tag cust-tag--${pawn.tag.toLowerCase()}`}>{pawn.tag}</span>
                    )}
                    {isActive && (
                      <span className="cust-check-badge" aria-hidden="true">✓</span>
                    )}

                    <div className="cust-card__preview cust-card__preview--item">
                      <PawnPreviewSvg pawn={pawn} />
                    </div>

                    <div className="cust-card__footer">
                      {isActive ? (
                        <span className="cust-status cust-status--active">Active</span>
                      ) : isOwned ? (
                        <span className="cust-status cust-status--owned">Owned</span>
                      ) : (
                        <span className="cust-status cust-status--price">🔒 {pawn.price} Coins</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer: Ringkasan Pilihan Aktif & Tombol MAIN SEKARANG ── */}
        <footer className="cust-footer">
          <div className="cust-summary" aria-label="Pilihan Aktif Saat Ini">
            <span className="cust-summary__chip">🗺️ {arenaDef.name}</span>
            <span className="cust-summary__chip">🎲 {diceDef.name}</span>
            <span className="cust-summary__chip">♟️ {pawnDef.name}</span>
          </div>

          <div className="cust-footer__actions">
            {props.canResume && (
              <button
                type="button"
                id="resume-btn"
                className="cust-resume-btn"
                onClick={props.onResume}
              >
                Lanjutkan
              </button>
            )}
            <button
              type="button"
              id="play-btn"
              className="cust-play-btn"
              data-autofocus
              onClick={props.onPlay}
            >
              MAIN SEKARANG
            </button>
          </div>
        </footer>
      </div>

      {/* ── Modal Konfirmasi Pembelian Item Terkunci ── */}
      {pendingBuy && (
        <div className="cust-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Beli ${pendingBuy.name}`}>
          <div className="cust-modal">
            <h2 className="cust-modal__title">Buka Item Baru</h2>
            <p className="cust-modal__name">{pendingBuy.name}</p>
            <p className="cust-modal__sub">{pendingBuy.subtitle}</p>

            <div className="cust-modal__price-box">
              <span>Harga:</span>
              <strong>🪙 {pendingBuy.price} Coins</strong>
            </div>

            {buyError && (
              <p className="cust-modal__error" role="alert">{buyError}</p>
            )}

            <div className="cust-modal__actions">
              <button
                type="button"
                id="confirm-buy-btn"
                className="cust-play-btn cust-modal__buy-btn"
                onClick={confirmPurchase}
              >
                Beli & Gunakan
              </button>
              <button
                type="button"
                id="cancel-buy-btn"
                className="cust-resume-btn"
                onClick={() => {
                  setPendingBuy(null);
                  setBuyError(null);
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
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
