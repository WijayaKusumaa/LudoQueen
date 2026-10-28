import type { PlayerColor } from './board/boardLayout';

/** Token warna dunia 3D. Palet kecil: pasir, toska, rumput, empat warna pemain. */
export const PALETTE = {
  oceanShallow: '#3fc8c4',
  oceanDeep: '#0f7f95',
  foam: '#e9fbf6',
  grassLight: '#8cc65a',
  grassDark: '#5fa646',
  soil: '#8a5a3b',
  stone: '#d9cfb7',
  stoneShade: '#c4b99e',
  wood: '#a8713f',
  woodDark: '#7c5129',
  mark: '#efe6cf',
  star: '#d8a53a',
} as const;

export interface PlayerTheme {
  readonly label: string;
  /** warna cat pion dan jalur rumah */
  readonly main: string;
  /** nuansa lebih terang untuk pad base */
  readonly light: string;
  /** nuansa gelap untuk rim/bayangan */
  readonly dark: string;
}

export const PLAYER_THEME: Readonly<Record<PlayerColor, PlayerTheme>> = {
  yellow: { label: 'Kuning', main: '#f2b92a', light: '#f9d56a', dark: '#c58d0f' },
  blue: { label: 'Biru', main: '#3b7be0', light: '#6fa2ef', dark: '#2559b0' },
  red: { label: 'Merah', main: '#e2483d', light: '#ee7a6e', dark: '#b02e25' },
  green: { label: 'Hijau', main: '#2fa75a', light: '#5cc382', dark: '#1d7a40' },
};
