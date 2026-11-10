import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  ready: boolean;
  reducedMotion?: boolean;
}

const HINTS = [
  'Menyiapkan tekstur pulau dan samudra tropis…',
  'Merapikan dadu keberuntungan & pion kerajaan…',
  'Mengalunkan ombak dan angin pesisir…',
  'Menyusun strategi bot yang menantang…',
  'Selamat datang di Olivia’s Little Island!',
];

export function LoadingScreen({ ready, reducedMotion }: LoadingScreenProps) {
  const [progress, setProgress] = useState(12);
  const [hintIdx, setHintIdx] = useState(0);
  const [shouldUnmount, setShouldUnmount] = useState(false);

  // Simulasi progress yang mulus & natural
  useEffect(() => {
    if (ready) {
      setProgress(100);
      const timer = setTimeout(() => {
        setShouldUnmount(true);
      }, 700);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return Math.min(next, 92);
      });
    }, 180);

    return () => clearInterval(interval);
  }, [ready]);

  // Rotasi tips elegan
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      setHintIdx((prev) => (prev + 1) % HINTS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [ready]);

  if (shouldUnmount) return null;

  return (
    <div
      className={`luxury-loader${ready ? ' luxury-loader--done' : ''}`}
      aria-hidden={ready}
      role="status"
      aria-live="polite"
    >
      {/* Background ambient glowing orbs */}
      <div className="luxury-loader__bg">
        <div className="luxury-loader__glow luxury-loader__glow--1" />
        <div className="luxury-loader__glow luxury-loader__glow--2" />
        <div className="luxury-loader__glow luxury-loader__glow--3" />
        <div className="luxury-loader__overlay" />
      </div>

      <div className="luxury-loader__content">
        {/* Emblem Crown & Island Logo */}
        <div className="luxury-loader__brand">
          <div className="luxury-loader__emblem-ring">
            <div className="luxury-loader__ring-pulse" />
            <div className="luxury-loader__crown">👑</div>
          </div>
          <h1 className="luxury-loader__title">
            OLIVIA&apos;S <span className="luxury-loader__title-accent">LITTLE ISLAND</span>
          </h1>
          <p className="luxury-loader__tagline">Eksklusif • Santai • Penuh Petualangan</p>
        </div>

        {/* 4 Player Pawn Jewel Dots */}
        <div className="luxury-loader__pawns">
          <span className="luxury-loader__pawn luxury-loader__pawn--yellow" title="Kuning" />
          <span className="luxury-loader__pawn luxury-loader__pawn--blue" title="Biru" />
          <span className="luxury-loader__pawn luxury-loader__pawn--red" title="Merah" />
          <span className="luxury-loader__pawn luxury-loader__pawn--green" title="Hijau" />
        </div>

        {/* Progress Bar & Percentage */}
        <div className="luxury-loader__progress-box">
          <div className="luxury-loader__bar-track">
            <div
              className="luxury-loader__bar-fill"
              style={{
                width: `${progress}%`,
                transition: reducedMotion ? 'none' : 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            />
          </div>
          <div className="luxury-loader__info">
            <span className="luxury-loader__hint">{ready ? 'Pulau Siap Dimainkan!' : HINTS[hintIdx]}</span>
            <span className="luxury-loader__percent">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
