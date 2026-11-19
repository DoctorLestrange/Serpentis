import { ThemeId } from './types';

export interface ThemePalette {
  id: ThemeId;
  name: string;
  tagline: string;
  bgOuter: string;
  boardBg: string;
  boardGridA: string;
  boardGridB: string;
  boardBorder: string;
  wallSolidBorder: string;
  wallWrapBorder: string;
  obstacleFill: string;
  obstacleTop: string;
  obstacleStroke: string;
  snakeHead: string;
  snakeBodyStart: string;
  snakeBodyEnd: string;
  snakeScaleAccent: string;
  snakeEye: string;
  snakeBoostGlow: string;
  appleFill: string;
  appleHighlight: string;
  goldenFill: string;
  chronoFill: string;
  phaseFill: string;
  magnetFill: string;
  hudSurface: string;
  hudBorder: string;
  textPrimary: string;
  textMuted: string;
  outerTextPrimary: string;
  outerTextMuted: string;
  accentPrimary: string;
  accentSecondary: string;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  botanical: {
    id: 'botanical',
    name: 'Botanical Slate',
    tagline: 'Deep moss slate with emerald scales & crimson fruit',
    bgOuter: '#08110E',
    boardBg: '#0D1B16',
    boardGridA: '#10211B',
    boardGridB: '#0D1B16',
    boardBorder: '#1E3A2F',
    wallSolidBorder: '#D97736',
    wallWrapBorder: '#2DD4BF',
    obstacleFill: '#1B3128',
    obstacleTop: '#264438',
    obstacleStroke: '#355E4D',
    snakeHead: '#34D399',
    snakeBodyStart: '#10B981',
    snakeBodyEnd: '#047857',
    snakeScaleAccent: '#A7F3D0',
    snakeEye: '#06100D',
    snakeBoostGlow: '#6EE7B7',
    appleFill: '#F43F5E',
    appleHighlight: '#FDA4AF',
    goldenFill: '#FBBF24',
    chronoFill: '#38BDF8',
    phaseFill: '#C084FC',
    magnetFill: '#FB923C',
    hudSurface: 'rgba(11, 23, 19, 0.94)',
    hudBorder: 'rgba(52, 211, 153, 0.25)',
    textPrimary: '#F2EFE9',
    textMuted: '#8FA89E',
    outerTextPrimary: '#F2EFE9',
    outerTextMuted: '#A7C4B8',
    accentPrimary: '#10B981',
    accentSecondary: '#F59E0B',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Gold',
    tagline: 'Volcanic basalt arena with burnished gold serpent',
    bgOuter: '#090A0F',
    boardBg: '#11131A',
    boardGridA: '#151821',
    boardGridB: '#11131A',
    boardBorder: '#272B3A',
    wallSolidBorder: '#E11D48',
    wallWrapBorder: '#F59E0B',
    obstacleFill: '#1E2230',
    obstacleTop: '#2A3042',
    obstacleStroke: '#3D465E',
    snakeHead: '#FBBF24',
    snakeBodyStart: '#F59E0B',
    snakeBodyEnd: '#B45309',
    snakeScaleAccent: '#FDE68A',
    snakeEye: '#090A0F',
    snakeBoostGlow: '#FDE047',
    appleFill: '#E11D48',
    appleHighlight: '#FDA4AF',
    goldenFill: '#34D399',
    chronoFill: '#38BDF8',
    phaseFill: '#A78BFA',
    magnetFill: '#FB7185',
    hudSurface: 'rgba(15, 17, 24, 0.94)',
    hudBorder: 'rgba(245, 158, 11, 0.28)',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    outerTextPrimary: '#F8FAFC',
    outerTextMuted: '#CBD5E1',
    accentPrimary: '#F59E0B',
    accentSecondary: '#E11D48',
  },
  phosphor: {
    id: 'phosphor',
    name: 'Phosphor CRT',
    tagline: 'Tactile vintage terminal with high-contrast vector cells',
    bgOuter: '#050A06',
    boardBg: '#081209',
    boardGridA: '#0B180D',
    boardGridB: '#081209',
    boardBorder: '#1B4321',
    wallSolidBorder: '#F97316',
    wallWrapBorder: '#4ADE80',
    obstacleFill: '#122915',
    obstacleTop: '#1A3B1E',
    obstacleStroke: '#28592E',
    snakeHead: '#4ADE80',
    snakeBodyStart: '#22C55E',
    snakeBodyEnd: '#15803D',
    snakeScaleAccent: '#BBF7D0',
    snakeEye: '#050A06',
    snakeBoostGlow: '#86EFAC',
    appleFill: '#FB923C',
    appleHighlight: '#FED7AA',
    goldenFill: '#FACC15',
    chronoFill: '#22D3EE',
    phaseFill: '#E879F9',
    magnetFill: '#F43F5E',
    hudSurface: 'rgba(6, 14, 7, 0.95)',
    hudBorder: 'rgba(74, 222, 128, 0.3)',
    textPrimary: '#DCFCE7',
    textMuted: '#74A882',
    outerTextPrimary: '#DCFCE7',
    outerTextMuted: '#86EFAC',
    accentPrimary: '#22C55E',
    accentSecondary: '#FB923C',
  },
  alabaster: {
    id: 'alabaster',
    name: 'Alabaster Studio',
    tagline: 'Warm architectural limestone board with forest ink',
    bgOuter: '#E5E0D5',
    boardBg: '#F4F1EA',
    boardGridA: '#ECE8DF',
    boardGridB: '#F4F1EA',
    boardBorder: '#D0C9B8',
    wallSolidBorder: '#C2410C',
    wallWrapBorder: '#0D9488',
    obstacleFill: '#D6CFC0',
    obstacleTop: '#E2DDD0',
    obstacleStroke: '#B8B09F',
    snakeHead: '#0F766E',
    snakeBodyStart: '#0D9488',
    snakeBodyEnd: '#115E59',
    snakeScaleAccent: '#99F6E4',
    snakeEye: '#F4F1EA',
    snakeBoostGlow: '#14B8A6',
    appleFill: '#DC2626',
    appleHighlight: '#FCA5A5',
    goldenFill: '#D97706',
    chronoFill: '#0284C7',
    phaseFill: '#7C3AED',
    magnetFill: '#EA580C',
    hudSurface: 'rgba(24, 28, 26, 0.94)',
    hudBorder: 'rgba(20, 184, 166, 0.35)',
    textPrimary: '#F5F3EF',
    textMuted: '#9CA3AF',
    outerTextPrimary: '#1C1917',
    outerTextMuted: '#44403C',
    accentPrimary: '#0D9488',
    accentSecondary: '#D97706',
  },
};
