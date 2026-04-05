// =============================================================
// Alchemy AI — Design System
// Owner: Allisa Warren | SCRUM-105
// Overwrites Sprint 1 placeholder theme
// Fonts: Cormorant Garamond (display) + DM Sans (UI/body)
// =============================================================

export const Colors = {
  // Backgrounds
  backgroundPrimary:  '#0D0D0D',  // main screen background
  backgroundParty:    '#0A0008',  // Party Mode only — purple-tinted black

  // Surfaces
  surfacePrimary:     '#1A1A1A',  // nav bars, settings rows
  surfaceSecondary:   '#2A2A2A',  // card image placeholders, avatars
  surfaceElevated:    '#13131A',  // nav panel backgrounds
  surfaceDark:        '#080810',  // bottom of left nav panel
  surfaceWarm:        '#1E1A14',  // Recipe Detail hero placeholder
  surfaceInput:       '#1E1208',  // Party Mode card placeholder

  // Gold accents
  goldPrimary:        '#C9A84C',  // borders, active states, icons, arrows
  goldLight:          '#E8C97A',  // logo text "ALCHEMY", warm headings
  goldDark:           '#A8843A',  // button gradient right stop

  // Text
  textPrimary:        '#F5F5F5',  // headings, labels, ingredient names
  textSecondary:      '#888888',  // subtitles, star ratings
  textHint:           '#7A7870',  // input placeholders, subtle labels
  textFaint:          '#555555',  // section headers, divider labels
  textUltraFaint:     '#5A5855',  // tagline text

  // Accents & special
  purpleGlow:         '#6B21A8',  // Party Mode ambient glow
  navActive:          '#C9A84C',  // active bottom nav item
  overlayDark:        'rgba(0,0,0,0.55)', // dim behind nav panels

  // Borders
  borderDefault:      '#2E2E2E',
  borderStrong:       '#444444',
  borderGold:         '#C9A84C',
};

// Cormorant Garamond — display/headings (all Light weight)
export const DisplayText = {
  logo:        { fontFamily: 'CormorantGaramond_300Light', fontSize: 52, letterSpacing: 15.6 },
  headingXL:   { fontFamily: 'CormorantGaramond_300Light', fontSize: 48, letterSpacing: 4.8, lineHeight: 52 },
  headingL:    { fontFamily: 'CormorantGaramond_300Light', fontSize: 38, letterSpacing: 0 },
  headingM:    { fontFamily: 'CormorantGaramond_300Light', fontSize: 34, letterSpacing: 0 },
  headingS:    { fontFamily: 'CormorantGaramond_300Light', fontSize: 28, letterSpacing: 0 },
  headingXS:   { fontFamily: 'CormorantGaramond_300Light', fontSize: 24, letterSpacing: 0 },
  navTitle:    { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, letterSpacing: 0 },
  cardTitle:   { fontFamily: 'CormorantGaramond_300Light', fontSize: 18, letterSpacing: 0 },
  cardTitleS:  { fontFamily: 'CormorantGaramond_300Light', fontSize: 14, letterSpacing: 0 },
  measurement: { fontFamily: 'CormorantGaramond_300Light', fontSize: 13, letterSpacing: 0 },
  initials:    { fontFamily: 'CormorantGaramond_300Light', fontSize: 32, letterSpacing: 0 },
  logoSub:     { fontFamily: 'CormorantGaramond_300Light', fontSize: 11, letterSpacing: 4.4 },
};

// DM Sans — UI / body text
export const BodyText = {
  navTitle:     { fontFamily: 'DMSans_400Regular', fontSize: 22, letterSpacing: 8.8 },
  primary:      { fontFamily: 'DMSans_500Medium',  fontSize: 15, letterSpacing: 0 },
  regular:      { fontFamily: 'DMSans_400Regular', fontSize: 14, letterSpacing: 0 },
  secondary:    { fontFamily: 'DMSans_400Regular', fontSize: 13, letterSpacing: 0 },
  small:        { fontFamily: 'DMSans_400Regular', fontSize: 12, letterSpacing: 0.9 },
  xSmall:       { fontFamily: 'DMSans_400Regular', fontSize: 11, letterSpacing: 0 },
  tiny:         { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 3 },
  micro:        { fontFamily: 'DMSans_400Regular', fontSize: 9,  letterSpacing: 1.8 },
  labelButtonS: { fontFamily: 'DMSans_500Medium',  fontSize: 14, letterSpacing: 0 },
  labelBadge:   { fontFamily: 'DMSans_500Medium',  fontSize: 10, letterSpacing: 2 },
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 999,
};
