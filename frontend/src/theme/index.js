// src/theme/index.js
// Alchemy AI - Design System
// Dark luxury minimalist aesthetic

export const Colors = {
  // Core palette
  background:    '#0A0A0A',  // near-black
  surface:       '#141414',  // card/panel background
  surfaceRaised: '#1C1C1C',  // elevated elements
  border:        '#2A2A2A',  // subtle borders

  // Accent - amber/gold (alchemical)
  accent:        '#C9A84C',  // warm gold
  accentDim:     '#C9A84C33', // gold at 20% opacity
  accentGlow:    '#C9A84C18', // gold at ~10% opacity

  // Text
  textPrimary:   '#F5F0E8',  // warm white
  textSecondary: '#8A8A8A',  // muted grey
  textMuted:     '#4A4A4A',  // very muted

  // Status
  success:       '#4CAF72',
  error:         '#CF6679',
};

export const Typography = {
  // Display / headings - Playfair Display (serif, editorial)
  display: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 16,
    color: Colors.textSecondary,
  },

  // Body - DM Sans (clean, modern)
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    letterSpacing: 0.3,
  },
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:   6,
  md:  12,
  lg:  20,
  full: 999,
};
