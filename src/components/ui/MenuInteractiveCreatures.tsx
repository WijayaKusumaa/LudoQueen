/**
 * MenuInteractiveCreatures.tsx
 *
 * Animasi hewan laut & pantai hidup dan interaktif di layar utama (Main Screen)
 * di belakang & sela-sela kartu arena game.
 *
 * Hewan-hewan ini bergerak secara dinamis dan dapat disentuh/diklik oleh pemain:
 * - Lumba-lumba (Dolphin): Meluncur di air, melompat berputar 360° + cipratan air saat disentuh.
 * - Penyu Laut (Turtle): Mendayung santai, berputar gembira + bintang berkilau saat disentuh.
 * - Kepiting Pantai (Crab): Berjalan menyamping, melompat & melambaikan capit + love saat disentuh.
 * - Burung Camar (Seagull): Terbang melayang di angkasa, bermanuver loop akrobatik saat disentuh.
 * - Ikan Buntal (Pufferfish): Berenang mengapung, mengembang bulat membal (boing!) saat disentuh.
 */

import React, { useState, useCallback, useRef } from 'react';
import { audio } from '../../game/audio/audio';

interface ParticleEffect {
  id: number;
  x: number;
  y: number;
  emoji: string;
  text?: string;
}

export function MenuInteractiveCreatures(): React.ReactElement {
  const [particles, setParticles] = useState<ParticleEffect[]>([]);
  const nextParticleId = useRef(1);

  const spawnReaction = useCallback((clientX: number, clientY: number, emoji: string, text?: string) => {
    audio.unlock();
    const id = nextParticleId.current++;
    setParticles((prev) => [...prev.slice(-6), { id, x: clientX, y: clientY, emoji, text }]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1400);
  }, []);

  return (
    <div className="menu-creatures-layer" aria-hidden="false">
      {/* Gelombang air laut lembut di latar belakang */}
      <div className="menu-sea-ambience">
        <div className="menu-sea-ripple menu-sea-ripple--1" />
        <div className="menu-sea-ripple menu-sea-ripple--2" />
        <div className="menu-sea-ripple menu-sea-ripple--3" />
      </div>

      {/* Burung Camar di langit atas */}
      <InteractiveSeagull onInteract={spawnReaction} />

      {/* Lumba-lumba berenang melintasi tengah layar */}
      <InteractiveDolphin onInteract={spawnReaction} />

      {/* Penyu laut mendayung santai */}
      <InteractiveTurtle onInteract={spawnReaction} />

      {/* Ikan buntal mengapung lucu */}
      <InteractivePufferfish onInteract={spawnReaction} />

      {/* Kepiting pantai berjalan di bagian bawah */}
      <InteractiveCrab onInteract={spawnReaction} />

      {/* Partikel efek saat hewan disentuh */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="menu-creature-reaction"
          style={{ left: `${p.x}px`, top: `${p.y}px` }}
        >
          <span className="menu-creature-reaction__emoji">{p.emoji}</span>
          {p.text && <span className="menu-creature-reaction__text">{p.text}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── 1. LUMBA-LUMBA CERIA (Interactive Dolphin) ──────────────────────────────
function InteractiveDolphin({
  onInteract,
}: {
  onInteract: (x: number, y: number, emoji: string, text: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    audio.cue('hop');
    setFlipped(true);
    const rect = e.currentTarget.getBoundingClientRect();
    onInteract(rect.left + rect.width / 2, rect.top + 10, '💦 🐬', 'Splaaash!');
    setTimeout(() => setFlipped(false), 900);
  };

  return (
    <div className="menu-creature menu-creature--dolphin">
      <button
        type="button"
        className={`creature-btn creature-btn--dolphin${flipped ? ' creature--jump-flip' : ''}`}
        onPointerDown={handleClick}
        title="Sentuh Lumba-lumba!"
        aria-label="Lumba-lumba ceria"
      >
        <svg viewBox="0 0 120 70" className="creature-svg">
          <defs>
            <linearGradient id="dolphin-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="65%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>
          {/* Ekor & Sirip Belakang */}
          <path
            d="M 22 36 C 14 30, 2 24, 4 14 C 10 20, 18 26, 26 32 C 18 38, 10 44, 4 50 C 2 40, 14 34, 22 36 Z"
            fill="#0284c7"
          />
          {/* Badan Utama Lumba-lumba */}
          <path
            d="M 22 36 C 35 22, 60 12, 85 18 C 102 22, 114 30, 118 36 C 112 40, 96 48, 75 48 C 50 48, 32 44, 22 36 Z"
            fill="url(#dolphin-body)"
          />
          {/* Perut Putih */}
          <path
            d="M 36 38 C 52 44, 76 46, 95 39 C 105 35, 112 37, 118 36 C 108 43, 90 48, 70 48 C 48 48, 38 43, 36 38 Z"
            fill="#ffffff"
            opacity="0.9"
          />
          {/* Sirip Punggung */}
          <path d="M 62 14 C 68 4, 78 2, 80 16 Z" fill="#0369a1" />
          {/* Sirip Dada */}
          <path d="M 72 38 C 76 48, 86 52, 84 40 Z" fill="#0284c7" />
          {/* Mata Ceria */}
          <circle cx="102" cy="27" r="3.5" fill="#0f172a" />
          <circle cx="103" cy="26" r="1.2" fill="#ffffff" />
          {/* Senyum */}
          <path d="M 106 33 Q 111 36 114 34" stroke="#0369a1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── 2. PENYU LAUT BERSAHABAT (Interactive Turtle) ───────────────────────────
function InteractiveTurtle({
  onInteract,
}: {
  onInteract: (x: number, y: number, emoji: string, text: string) => void;
}) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    audio.cue('land');
    setSpinning(true);
    const rect = e.currentTarget.getBoundingClientRect();
    onInteract(rect.left + rect.width / 2, rect.top + 10, '✨ 🐢', 'Halo!');
    setTimeout(() => setSpinning(false), 900);
  };

  return (
    <div className="menu-creature menu-creature--turtle">
      <button
        type="button"
        className={`creature-btn creature-btn--turtle${spinning ? ' creature--spin-roll' : ''}`}
        onPointerDown={handleClick}
        title="Sentuh Penyu Laut!"
        aria-label="Penyu laut bersahabat"
      >
        <svg viewBox="0 0 90 90" className="creature-svg">
          <defs>
            <radialGradient id="turtle-shell" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </radialGradient>
          </defs>
          {/* 4 Kaki / Sirip Renang */}
          <ellipse cx="26" cy="26" rx="14" ry="7" transform="rotate(-30 26 26)" fill="#86efac" />
          <ellipse cx="64" cy="26" rx="14" ry="7" transform="rotate(30 64 26)" fill="#86efac" />
          <ellipse cx="28" cy="64" rx="11" ry="6" transform="rotate(35 28 64)" fill="#4ade80" />
          <ellipse cx="62" cy="64" rx="11" ry="6" transform="rotate(-35 62 64)" fill="#4ade80" />
          {/* Ekor Mini */}
          <polygon points="45,74 41,83 49,83" fill="#4ade80" />
          {/* Kepala */}
          <ellipse cx="45" cy="18" rx="10" ry="12" fill="#86efac" />
          <circle cx="41" cy="14" r="2.2" fill="#064e3b" />
          <circle cx="49" cy="14" r="2.2" fill="#064e3b" />
          <circle cx="41.5" cy="13.5" r="0.8" fill="#ffffff" />
          <circle cx="49.5" cy="13.5" r="0.8" fill="#ffffff" />
          {/* Tempurung Karapas */}
          <ellipse cx="45" cy="46" rx="24" ry="26" fill="url(#turtle-shell)" stroke="#166534" strokeWidth="2" />
          {/* Motif Tempurung */}
          <polygon points="45,30 55,38 55,52 45,60 35,52 35,38" fill="#22c55e" opacity="0.85" />
          <line x1="45" y1="30" x2="45" y2="20" stroke="#14532d" strokeWidth="1.5" />
          <line x1="55" y1="38" x2="68" y2="34" stroke="#14532d" strokeWidth="1.5" />
          <line x1="55" y1="52" x2="68" y2="58" stroke="#14532d" strokeWidth="1.5" />
          <line x1="45" y1="60" x2="45" y2="72" stroke="#14532d" strokeWidth="1.5" />
          <line x1="35" y1="52" x2="22" y2="58" stroke="#14532d" strokeWidth="1.5" />
          <line x1="35" y1="38" x2="22" y2="34" stroke="#14532d" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
}

// ─── 3. KEPITING PANTAI LUCU (Interactive Beach Crab) ────────────────────────
function InteractiveCrab({
  onInteract,
}: {
  onInteract: (x: number, y: number, emoji: string, text: string) => void;
}) {
  const [cheering, setCheering] = useState(false);

  const handleClick = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    audio.cue('dice');
    setCheering(true);
    const rect = e.currentTarget.getBoundingClientRect();
    onInteract(rect.left + rect.width / 2, rect.top + 10, '💖 🦀', 'Klak Klak!');
    setTimeout(() => setCheering(false), 900);
  };

  return (
    <div className="menu-creature menu-creature--crab">
      <button
        type="button"
        className={`creature-btn creature-btn--crab${cheering ? ' creature--crab-cheer' : ''}`}
        onPointerDown={handleClick}
        title="Sentuh Kepiting Pantai!"
        aria-label="Kepiting pantai lucu"
      >
        <svg viewBox="0 0 96 70" className="creature-svg">
          {/* Kaki-kaki kecil */}
          <path d="M 24 45 Q 12 52 14 62" stroke="#ea580c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 28 50 Q 20 60 24 66" stroke="#ea580c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 72 45 Q 84 52 82 62" stroke="#ea580c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 68 50 Q 76 60 72 66" stroke="#ea580c" strokeWidth="3.5" fill="none" strokeLinecap="round" />

          {/* Lengan & Capit Kiri */}
          <path d="M 32 38 Q 16 26 12 18" stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round" />
          <g className="crab-claw-left">
            <ellipse cx="10" cy="16" rx="8" ry="10" transform="rotate(-25 10 16)" fill="#ef4444" />
            <path d="M 6 10 Q 14 6 14 16 Z" fill="#dc2626" />
          </g>

          {/* Lengan & Capit Kanan */}
          <path d="M 64 38 Q 80 26 84 18" stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round" />
          <g className="crab-claw-right">
            <ellipse cx="86" cy="16" rx="8" ry="10" transform="rotate(25 86 16)" fill="#ef4444" />
            <path d="M 90 10 Q 82 6 82 16 Z" fill="#dc2626" />
          </g>

          {/* Badan Utama Kepiting */}
          <ellipse cx="48" cy="42" rx="24" ry="18" fill="#f97316" stroke="#c2410c" strokeWidth="2" />
          {/* Tangkai Mata */}
          <line x1="41" y1="26" x2="41" y2="20" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="55" y1="26" x2="55" y2="20" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
          {/* Bola Mata */}
          <circle cx="41" cy="18" r="4.5" fill="#ffffff" stroke="#c2410c" strokeWidth="1" />
          <circle cx="55" cy="18" r="4.5" fill="#ffffff" stroke="#c2410c" strokeWidth="1" />
          <circle cx="42" cy="18" r="2.2" fill="#1e293b" />
          <circle cx="54" cy="18" r="2.2" fill="#1e293b" />
          {/* Senyum Imut */}
          <path d="M 43 45 Q 48 50 53 45" stroke="#7c2d12" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Pipi Merona */}
          <circle cx="36" cy="43" r="3" fill="#f87171" opacity="0.75" />
          <circle cx="60" cy="43" r="3" fill="#f87171" opacity="0.75" />
        </svg>
      </button>
    </div>
  );
}

// ─── 4. BURUNG CAMAR LANGIT (Interactive Seagull) ────────────────────────────
function InteractiveSeagull({
  onInteract,
}: {
  onInteract: (x: number, y: number, emoji: string, text: string) => void;
}) {
  const [soaring, setSoaring] = useState(false);

  const handleClick = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    audio.cue('hop');
    setSoaring(true);
    const rect = e.currentTarget.getBoundingClientRect();
    onInteract(rect.left + rect.width / 2, rect.top + 10, '🕊️ 💨', 'Wheee!');
    setTimeout(() => setSoaring(false), 900);
  };

  return (
    <div className="menu-creature menu-creature--seagull">
      <button
        type="button"
        className={`creature-btn creature-btn--seagull${soaring ? ' creature--loop-roll' : ''}`}
        onPointerDown={handleClick}
        title="Sentuh Burung Camar!"
        aria-label="Burung camar angkasa"
      >
        <svg viewBox="0 0 80 45" className="creature-svg">
          {/* Sayap Kiri dan Kanan Kepakan */}
          <path
            className="seagull-wing"
            d="M 40 22 Q 22 4 4 14 Q 20 18 36 24 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
          <path
            className="seagull-wing"
            d="M 40 22 Q 58 4 76 14 Q 60 18 44 24 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
          {/* Ujung Sayap Hitam */}
          <path d="M 4 14 Q 10 12 12 16 Q 7 17 4 14 Z" fill="#1e293b" />
          <path d="M 76 14 Q 70 12 68 16 Q 73 17 76 14 Z" fill="#1e293b" />
          {/* Badan Burung */}
          <ellipse cx="40" cy="24" rx="14" ry="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          {/* Ekor */}
          <polygon points="36,29 44,29 40,36" fill="#f1f5f9" />
          {/* Kepala & Paruh Kuning */}
          <ellipse cx="40" cy="18" rx="6" ry="6" fill="#ffffff" />
          <polygon points="38,13 42,13 40,8" fill="#f59e0b" />
          {/* Mata Hitam Mini */}
          <circle cx="38" cy="17" r="1.2" fill="#0f172a" />
          <circle cx="42" cy="17" r="1.2" fill="#0f172a" />
        </svg>
      </button>
    </div>
  );
}

// ─── 5. IKAN BUNTAL MEMBAL (Interactive Pufferfish) ───────────────────────────
function InteractivePufferfish({
  onInteract,
}: {
  onInteract: (x: number, y: number, emoji: string, text: string) => void;
}) {
  const [puffed, setPuffed] = useState(false);

  const handleClick = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    audio.cue('land');
    setPuffed(true);
    const rect = e.currentTarget.getBoundingClientRect();
    onInteract(rect.left + rect.width / 2, rect.top + 10, '🐡 🫧', 'Boiiing!');
    setTimeout(() => setPuffed(false), 950);
  };

  return (
    <div className="menu-creature menu-creature--puffer">
      <button
        type="button"
        className={`creature-btn creature-btn--puffer${puffed ? ' creature--puff-up' : ''}`}
        onPointerDown={handleClick}
        title="Sentuh Ikan Buntal!"
        aria-label="Ikan buntal membal"
      >
        <svg viewBox="0 0 75 75" className="creature-svg">
          <defs>
            <radialGradient id="puffer-grad" cx="40%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>
          </defs>
          {/* Duri-duri mini di luar */}
          <polygon points="36,12 40,4 44,12" fill="#d97706" />
          <polygon points="56,18 64,12 60,22" fill="#d97706" />
          <polygon points="62,38 72,40 62,44" fill="#d97706" />
          <polygon points="56,58 64,64 58,60" fill="#d97706" />
          <polygon points="36,64 40,72 44,64" fill="#d97706" />
          <polygon points="20,58 14,64 18,56" fill="#d97706" />

          {/* Ekor & Sirip */}
          <path d="M 18 38 C 8 28, 4 48, 18 42 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
          <path d="M 44 48 C 52 56, 56 46, 48 44 Z" fill="#fde047" />

          {/* Badan Bulat */}
          <circle cx="38" cy="38" r="24" fill="url(#puffer-grad)" stroke="#b45309" strokeWidth="1.5" />
          {/* Perut Terang */}
          <ellipse cx="38" cy="46" rx="16" ry="10" fill="#fef9c3" opacity="0.9" />

          {/* Mata Ceria */}
          <circle cx="48" cy="32" r="4.5" fill="#ffffff" stroke="#b45309" strokeWidth="1" />
          <circle cx="49.5" cy="32" r="2.5" fill="#1e293b" />
          <circle cx="50.5" cy="31" r="0.8" fill="#ffffff" />

          {/* Mulut Mungil Membulat */}
          <ellipse cx="58" cy="38" rx="2.5" ry="3.5" fill="#dc2626" />

          {/* Bintik-bintik oranye */}
          <circle cx="32" cy="28" r="1.8" fill="#b45309" opacity="0.6" />
          <circle cx="26" cy="36" r="1.5" fill="#b45309" opacity="0.6" />
          <circle cx="32" cy="42" r="2" fill="#b45309" opacity="0.6" />
        </svg>
      </button>
    </div>
  );
}
