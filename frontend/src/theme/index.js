// src/theme/index.js
// Alchemy AI — Design System
// Dark luxury minimalist aesthetic
// Updated: font corrected to Cormorant Garamond, all missing tokens added

export const Colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  background:      '#0D0D0D',  // Main screen background (all screens)
  backgroundParty: '#0A0008',  // Party Mode only — deeper purple-tinted black
  surface:         '#1A1A1A',  // Card / panel background
  surfaceRaised:   '#2A2A2A',  // Elevated elements, card image placeholders
  surfaceElevated: '#13131A',  // Navigation panel backgrounds (left + right)
  surfaceDark:     '#080810',  // Bottom of left nav panel (Sign Out area)
  surfaceWarm:     '#1E1A14',  // Recipe Detail hero image placeholder
  surfaceInput:    '#1E1208',  // Party Mode featured card image placeholder

  // ── Gold Accents ───────────────────────────────────────────────────────────
  accent:          '#C9A84C',  // All gold accents — borders, active states, icons
  accentLight:     '#E8C97A',  // Logo text "ALCHEMY", headings with warmth
  accentDark:      '#A8843A',  // Right stop of gold gradient buttons
  accentDim:       '#C9A84C33', // Gold at 20% opacity
  accentGlow:      '#C9A84C18', // Gold at ~10% opacity — glow effects
  accentSubtle:    '#C9A84C15', // Very subtle gold tint — selected pill backgrounds

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:     '#F5F5F5',  // All primary white text
  textSecondary:   '#888888',  // Muted text — subtitles, star ratings
  textHint:        '#7A7870',  // Placeholder text in inputs, subtle labels
  textFaint:       '#555555',  // Very muted — section headers, divider labels
  textUltraFaint:  '#5A5855',  // Tagline "The art of the perfect pour"
  textMuted:       '#4A4A4A',  // Very muted (alias for textFaint)

  // ── Borders ───────────────────────────────────────────────────────────────
  border:          '#2A2A2A',  // Subtle borders
  borderDefault:   '#2A2A2A',  // Alias — used in FormComponents

  // ── Special ───────────────────────────────────────────────────────────────
  navActive:       '#C9A84C',  // Active nav item in bottom bar
  purpleGlow:      '#6B21A8',  // Party Mode ambient glow

  // ── Semantic ──────────────────────────────────────────────────────────────
  success:         '#4CAF72',
  error:           '#CF6679',
  errorSurface:    '#CF667922', // Error background tint
  white:           '#FFFFFF',

  // ── Gradient stops (use with LinearGradient) ──────────────────────────────
  goldGradientStart: '#C9A84C',
  goldGradientEnd:   '#A8843A',

  // ── Legacy aliases (kept for FormComponents compatibility) ─────────────────
  goldPrimary:       '#C9A84C',
  goldDark:          '#A8843A',
  backgroundPrimary: '#0D0D0D',
  surfacePrimary:    '#1A1A1A',
  surfaceSecondary:  '#2A2A2A',
};

export const Typography = {
  // ── Display — Cormorant Garamond (serif, editorial) ────────────────────────
  display: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 52,
    color: Colors.textPrimary,
    letterSpacing: 15,               // 30% of ~52px
  },
  headingXL: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 48,
    color: Colors.textPrimary,
    letterSpacing: 4,                // 10% of 48px
    lineHeight: 52,
  },
  headingL: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 38,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  headingM: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  headingS: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  heading: {                         // General heading alias
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  headingXS: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  navTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  cardTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  cardTitleS: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  measurement: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  subheading: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: 0,
  },

  // ── Body — DM Sans (clean, modern UI) ─────────────────────────────────────
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  caption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  labelMedium: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  labelSmall: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0,
  },
  button: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  navBar: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 22,
    letterSpacing: 8,                // 40% letter spacing
  },
  sectionHeader: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    letterSpacing: 2,                // 20% letter spacing
    textTransform: 'uppercase',
    color: Colors.textFaint,
  },

  // ── Legacy aliases (kept for FormComponents compatibility) ─────────────────
  labelButtonS: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    letterSpacing: 0,
  },
};

// ── Legacy BodyText alias (FormComponents uses this) ──────────────────────────
export const BodyText = {
  regular:      Typography.body,
  small:        Typography.bodySmall,
  xSmall:       Typography.caption,
  labelButtonS: Typography.labelButtonS,
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
  pill: 999,   // Full pill / capsule shape
  full: 999,   // Alias
};

export const Opacity = {
  goldBorder:   0.22,  // Gold borders on cards
  goldDivider:  0.40,  // Gold nav divider lines
  glassCard:    0.06,  // Glass card fill
  inputField:   0.06,  // Input field fill
  sectionDiv:   0.10,  // Section dividers
};
