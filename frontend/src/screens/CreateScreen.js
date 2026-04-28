// Alchemy AI — Create Screen (Party Mode)
// Matches hi-fi wireframe: full-screen featured card, swipe carousel,
// Quick Style pills, and "Make This Cocktail" CTA.
// Design tokens from src/theme/index.js

import React, { useState, useRef, useCallback } from 'react';
import { useFonts, CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  ImageBackground,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - Spacing.lg * 2;

// ── Mock cocktails ──────────────────────────────────────────────────────────
const PARTY_COCKTAILS = [
  {
    id: '1',
    name: 'Dark & Stormy',
    ingredients: 'Dark Rum · Ginger Beer · Lime',
    tags: ['Strong', '5 min', 'Built'],
    image: 'https://www.thecocktaildb.com/images/media/drink/fl35sn1504832315.jpg',
    style: 'Strong',
    time: '5 min',
    method: 'Built',
    steps: ['Fill a glass with ice.', 'Pour dark rum over ice.', 'Top with ginger beer.', 'Squeeze lime and garnish.'],
  },
  {
    id: '2',
    name: 'Negroni',
    ingredients: 'Gin · Sweet Vermouth · Campari',
    tags: ['Bitter', '3 min', 'Stirred'],
    image: 'https://www.thecocktaildb.com/images/media/drink/qgdu971561574065.jpg',
    style: 'Bitter',
    time: '3 min',
    method: 'Stirred',
    steps: ['Add gin, vermouth and Campari to a mixing glass.', 'Add ice and stir for 30 seconds.', 'Strain into a glass over ice.', 'Garnish with orange peel.'],
  },
  {
    id: '3',
    name: 'Margarita',
    ingredients: 'Tequila · Triple Sec · Lime',
    tags: ['Citrus', '5 min', 'Shaken'],
    image: 'https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg',
    style: 'Citrus',
    time: '5 min',
    method: 'Shaken',
    steps: ['Salt the rim of a glass.', 'Shake tequila, triple sec and lime with ice.', 'Strain into the glass over ice.', 'Garnish with lime wheel.'],
  },
  {
    id: '4',
    name: 'Old Fashioned',
    ingredients: 'Bourbon · Bitters · Sugar',
    tags: ['Classic', '4 min', 'Stirred'],
    image: 'https://www.thecocktaildb.com/images/media/drink/vrwquq1478252802.jpg',
    style: 'Classic',
    time: '4 min',
    method: 'Stirred',
    steps: ['Add sugar and bitters to a rocks glass.', 'Add bourbon and a large ice cube.', 'Stir gently for 20 seconds.', 'Express orange peel over the glass and garnish.'],
  },
  {
    id: '5',
    name: 'Mojito',
    ingredients: 'Rum · Lime · Mint · Soda',
    tags: ['Fresh', '6 min', 'Built'],
    image: 'https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg',
    style: 'Fresh',
    time: '6 min',
    method: 'Built',
    steps: ['Muddle mint and lime juice in a glass.', 'Add rum and simple syrup.', 'Fill with ice and top with soda water.', 'Stir gently and garnish with mint.'],
  },
];

const QUICK_STYLES = ['Mocktail', 'Strong', 'Classic', 'Citrus', 'Fresh'];

// ── Tag Pill ────────────────────────────────────────────────────────────────
const TagPill = ({ label }) => (
  <View style={styles.tagPill}>
    <Text style={styles.tagPillText}>{label}</Text>
  </View>
);

// ── Cocktail Card ───────────────────────────────────────────────────────────
const CocktailCard = ({ item }) => (
  <View style={styles.featuredCard}>
    <ImageBackground
      source={{ uri: item.image }}
      style={styles.cardImage}
      imageStyle={styles.cardImageRadius}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['transparent', 'rgba(10,0,8,0.55)', 'rgba(10,0,8,0.95)']}
        locations={[0.35, 0.65, 1]}
        style={styles.cardGradient}
      />
    </ImageBackground>

    <View style={styles.cardInfo}>
      <Text style={styles.cocktailName}>{item.name}</Text>
      <Text style={styles.ingredientsLine}>{item.ingredients}</Text>
      <View style={styles.tagRow}>
        {item.tags.map((t) => (
          <TagPill key={t} label={t} />
        ))}
      </View>
    </View>
  </View>
);

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function CreateScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStyle, setActiveStyle] = useState('Strong');
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef(null);

  const scrollTimer = useRef(null);
  const onScroll = useCallback((e) => {
    const offset = e.nativeEvent.contentOffset.x;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const index = Math.round(offset / (CARD_W + Spacing.sm));
      setActiveIndex(Math.max(0, Math.min(index, PARTY_COCKTAILS.length - 1)));
    }, 50);
  }, []);

  const handleStylePress = useCallback(
    (style) => {
      setActiveStyle(style);
      // Filter to the first cocktail matching this style
      const idx = PARTY_COCKTAILS.findIndex(
        (c) => c.style.toLowerCase() === style.toLowerCase()
      );
      if (idx !== -1 && flatRef.current) {
        flatRef.current.scrollToIndex({ index: idx, animated: true });
      }
    },
    []
  );

  const currentCocktail = PARTY_COCKTAILS[activeIndex];

  // Font guard — must render null until fonts load or web shows blank screen
  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Party Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── PARTY MODE headline ── */}
      <View style={styles.headlineBlock}>
        {/* Ambient gold glow */}
        <View style={styles.glowOrb} pointerEvents="none" />
        <Text style={styles.partyLine1}>PARTY</Text>
        <Text style={styles.partyLine2}>MODE</Text>
      </View>

      {/* ── Swipeable card carousel ── */}
      <Animated.FlatList
        ref={flatRef}
        data={PARTY_COCKTAILS}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + Spacing.sm}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
        onScroll={(e) => {
          Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )(e);
          onScroll(e);
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => <CocktailCard item={item} />}
      />

      {/* ── Dot indicators ── */}
      <View style={styles.dotsRow}>
        {PARTY_COCKTAILS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* ── CTA row: Scan Ingredient (secondary) + Make This Cocktail (primary) ── */}
      <View style={styles.ctaRow}>
        {/* SCRUM-151: Scan Ingredient — navigates to Scan screen (camera-based ingredient input) */}
        <TouchableOpacity
          style={styles.scanButton}
          activeOpacity={0.85}
          accessibilityLabel="Scan ingredient with camera"
          onPress={() => (navigation.getParent() ?? navigation).navigate('Scan')}
        >
          <Ionicons
            name="camera-outline"
            size={18}
            color={Colors.accent}
            style={styles.scanIcon}
          />
          <Text style={styles.scanText}>Scan Ingredient</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          accessibilityLabel="Make this cocktail"
          onPress={() =>
            (navigation.getParent() ?? navigation).navigate('RecipeDetail', { cocktail: currentCocktail })
          }
        >
          <LinearGradient
            colors={[Colors.goldGradientStart, Colors.goldGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Make This Cocktail</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Quick Style pills ── */}
      <View style={styles.quickStyleBlock}>
        <Text style={styles.quickStyleLabel}>QUICK STYLE</Text>
        <View style={styles.quickStyleRow}>
          {QUICK_STYLES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.stylePill,
                activeStyle === s && styles.stylePillActive,
              ]}
              onPress={() => handleStylePress(s)}
              accessibilityLabel={`Filter by ${s}`}
            >
              <Text
                style={[
                  styles.stylePillText,
                  activeStyle === s && styles.stylePillTextActive,
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundParty,
    paddingTop: Platform.OS === 'ios' ? 50 : 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.navTitle,
    color: Colors.accent,
    letterSpacing: 2,
    fontSize: 16,
  },

  // Party Mode Headline
  headlineBlock: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    top: -20,
    right: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.goldGradientStart,
    opacity: 0.18,
    // blur via shadow on iOS; just opacity on Android
    ...Platform.select({
      ios: {
        shadowColor: Colors.goldGradientStart,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 60,
        shadowOpacity: 0.6,
      },
    }),
  },
  partyLine1: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 56,
    letterSpacing: 10,
    color: Colors.accentLight,
    lineHeight: 60,
    textAlign: 'center',
  },
  partyLine2: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 56,
    letterSpacing: 10,
    color: Colors.accentLight,
    lineHeight: 60,
    textAlign: 'center',
  },

  // Carousel
  carouselContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  featuredCard: {
    width: CARD_W,
    height: SCREEN_H * 0.36,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
    marginRight: Spacing.sm,
  },
  cardImage: {
    width: '100%',
    height: '60%',
  },
  cardImageRadius: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
  },
  cocktailName: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  ingredientsLine: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  tagPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  tagPillText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },

  // Dot indicators
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textFaint,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 16,
  },

  // CTA Row (Scan + Make This Cocktail)
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },

  // Scan Ingredient (secondary CTA — SCRUM-151)
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  scanIcon: {
    marginRight: 6,
  },
  scanText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 0.3,
  },

  // CTA Button (Make This Cocktail — primary)
  ctaButton: {
    flex: 1,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  ctaText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.background,
    letterSpacing: 0.5,
  },

  // Quick Style
  quickStyleBlock: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  quickStyleLabel: {
    ...Typography.sectionHeader,
    marginBottom: Spacing.sm,
    letterSpacing: 3,
  },
  quickStyleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  stylePill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  stylePillActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  stylePillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  stylePillTextActive: {
    color: Colors.accent,
  },
});
