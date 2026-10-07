// Golden Winter — Design Tokens cho React Native.
// Đồng bộ với webapp (grottoworks/tailwind.config.ts). Dùng chung palette,
// radius, spacing và type scale; chỉ khác đơn vị (số cho RN thay vì px/rem).
export const colors = {
  // Brand
  pine: '#0A5C36',
  pineHover: '#0D7344',
  pineLight: '#E8F5E9',
  gold: '#EEB902',
  goldLight: '#FEF9C3',
  warm: '#F4A261',

  // Surface / text
  canvas: '#F8F9FA',
  panel: '#FFFFFF',
  tableHeader: '#F1F5F2',
  ink: '#2B2D42',
  muted: '#6C757D',
  faint: '#ADB5BD',
  hairline: '#E9ECEF',

  // Status
  passedBg: '#E8F5E9',
  passedFg: '#0A5C36',
  pendingBg: '#FEF3C7',
  pendingFg: '#B45309',
  revisionBg: '#FFEEDD',
  revisionFg: '#D97706',
  dangerBg: '#FEE2E2',
  dangerFg: '#991B1B',
  neutralBg: '#F1F3F5',
  neutralFg: '#495057',
} as const;

// Nền dải màu đặc trưng của app: đậm hơn ở trên (đầu màn hình) rồi nhạt dần
// xuống dưới về đúng màu canvas. Dùng cho <Screen>.
export const screenGradient = ['#D6EBDB', colors.canvas] as const;

// Radius scale (mục 26) — input 6, button/card nhỏ 10, card 12, mobile card 16.
export const radius = {
  sm: 6,
  md: 10,
  card: 12,
  lg: 16,
  pill: 999,
} as const;

// Spacing scale (mục 25).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// Mobile type scale (mục 4.1).
export const fontSize = {
  display: 28,
  h1: 20,
  h2: 16,
  body: 14,
  sub: 12,
  badge: 11,
} as const;

// Elevation (mục 27) — RN dùng shadow* + elevation (Android).
export const elevation = {
  card: {
    shadowColor: colors.pine,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
} as const;

export const theme = { colors, radius, spacing, fontSize, elevation } as const;
export type Theme = typeof theme;
