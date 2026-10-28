import {
  CanvasTexture,
  ClampToEdgeWrapping,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { PALETTE } from '../palette';

/** PRNG deterministik agar tekstur identik tiap muat. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tekstur rumput prosedural yang dapat diulang (blob warna lembut, tanpa noise halus). */
export function makeGrassTexture(): Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  const rand = mulberry32(20250605);
  ctx.fillStyle = PALETTE.grassLight;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 18 + rand() * 38;
    const dark = rand() < 0.55;
    const rgb = dark ? '95,166,70' : '170,214,106';
    const alpha = 0.22 + rand() * 0.2;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, `rgba(${rgb},${alpha})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return registerCanvasTexture(tex);
}

/** Registry untuk me-refresh CanvasTexture jika terjadi WebGL context loss/restore */
const activeCanvasTextures = new Set<CanvasTexture>();

export function registerCanvasTexture(tex: CanvasTexture): CanvasTexture {
  activeCanvasTextures.add(tex);
  return tex;
}

export function refreshAllCanvasTextures(): void {
  for (const t of activeCanvasTextures) {
    t.needsUpdate = true;
  }
}

/** Bayangan kontak bulat lembut untuk pion. */
export function makeBlobShadowTexture(): Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(30,25,15,0.85)');
  g.addColorStop(0.55, 'rgba(30,25,15,0.35)');
  g.addColorStop(1, 'rgba(30,25,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping;
  return registerCanvasTexture(tex);
}
