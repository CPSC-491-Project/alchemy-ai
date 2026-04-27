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
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { addIngredient } from '../services/cabinetService';
import { useMixer } from '../contexts/MixerContext';

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

  // SCRUM-198: Manual ingredient add — mirrors the modal in CabinetScreen so
  // users can add to their cabinet without going through the Scan flow. The
  // form fields and CATEGORIES list match Cabinet exactly so the UX is
  // consistent in both places, and we POST through the same cabinetService
  // (single source of truth for the /api/cabinet contract).
  const MANUAL_CATEGORIES = ['spirit', 'mixer', 'garnish'];
  const MANUAL_CATEGORY_ICON = { spirit: '🥃', mixer: '🍋', garnish: '🌿' };
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState('spirit');
  const [manualQuantity, setManualQuantity] = useState('');
  const [manualUnit, setManualUnit] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // SCRUM-198: Mixer Space — read items + actions from the shared MixerContext.
  // The same items appear here on Create regardless of where they were added
  // (manual modal here, or Scan Review on ScanScreen).
  const { items: mixerItems, addToMixer, removeFromMixer } = useMixer();

  function openManualModal() {
    setManualName('');
    setManualCategory('spirit');
    setManualQuantity('');
    setManualUnit('');
    setManualModalVisible(true);
  }

  // SCRUM-198: Add to Mixer — local-only, doesn't hit the backend.
  // Goes into the Mixer Space scratchpad, not the user's permanent Cabinet.
  function handleManualAddToMixer() {
    if (!manualName.trim()) {
      Alert.alert('Required', 'Please enter an ingredient name.');
      return;
    }
    addToMixer({
      name: manualName.trim(),
      category: manualCategory,
      quantity: manualQuantity.trim() || null,
      unit: manualUnit.trim() || null,
    });
    setManualModalVisible(false);
  }

  async function handleManualAdd() {
    if (!manualName.trim()) {
      Alert.alert('Required', 'Please enter an ingredient name.');
      return;
    }
    setManualSubmitting(true);
    try {
      await addIngredient({
        name: manualName.trim(),
        category: manualCategory,
        quantity: manualQuantity.trim() || null,
        unit: manualUnit.trim() || null,
      });
      setManualModalVisible(false);
      Alert.alert('Added', `${manualName.trim()} was added to your Cabinet.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add ingredient.');
    } finally {
      setManualSubmitting(false);
    }
  }

  const onViewableChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onViewableItemsChanged={onViewableChanged}
        viewabilityConfig={viewabilityConfig}
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

      {/* ── Primary CTA: Make This Cocktail ── */}
      <View style={styles.primaryCtaRow}>
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

      {/* ── Secondary CTAs: Add Manually + Scan Ingredient ── */}
      <View style={styles.secondaryCtaRow}>
        {/* SCRUM-198: Add Manually — opens a modal that calls the same
            cabinetService.addIngredient as CabinetScreen, so users can add
            without going through the camera/scan flow. */}
        <TouchableOpacity
          style={styles.manualButton}
          activeOpacity={0.85}
          accessibilityLabel="Add ingredient manually"
          accessibilityRole="button"
          onPress={openManualModal}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={Colors.accent}
            style={styles.manualIcon}
          />
          <Text style={styles.manualText}>Add Manually</Text>
        </TouchableOpacity>

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
      </View>

      {/* ── SCRUM-198: Mixer Space ──
          Session-scoped scratchpad for ingredients the user is considering
          for the cocktail they're about to make. Distinct from the permanent
          Cabinet. Items can be added from this screen's manual modal or
          from ScanScreen's Review state. */}
      <View style={styles.mixerSpaceBlock}>
        <View style={styles.mixerSpaceHeader}>
          <Text style={styles.mixerSpaceLabel}>MIXER SPACE</Text>
          {mixerItems.length > 0 && (
            <Text style={styles.mixerSpaceCount}>{mixerItems.length}</Text>
          )}
        </View>
        {mixerItems.length === 0 ? (
          <Text style={styles.mixerSpaceEmpty}>
            Items you tap "Add to Mixer" on will appear here.
          </Text>
        ) : (
          <View style={styles.mixerChipRow}>
            {mixerItems.map((item) => (
              <View key={item.id} style={styles.mixerChip}>
                <Text style={styles.mixerChipText} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFromMixer(item.id)}
                  accessibilityLabel={`Remove ${item.name} from Mixer Space`}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color={Colors.accent}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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

      {/* ── SCRUM-198: Manual Ingredient Add Modal ──
          Bottom-sheet form mirroring CabinetScreen's add modal so the UX
          is consistent. Submits via cabinetService.addIngredient (same
          backend route /api/cabinet). */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.manualModalOverlay}>
          <View style={styles.manualModalSheet}>
            <View style={styles.manualModalHandle} />
            <Text style={styles.manualModalTitle}>Add Ingredient</Text>

            <Text style={styles.manualLabel}>Name *</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. Rum, Lime Juice"
              placeholderTextColor={Colors.textHint}
              value={manualName}
              onChangeText={setManualName}
              autoFocus
              accessibilityLabel="Ingredient name"
            />

            <Text style={styles.manualLabel}>Category *</Text>
            <View style={styles.manualCategoryRow}>
              {MANUAL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.manualCategoryChip,
                    manualCategory === cat && styles.manualCategoryChipActive,
                  ]}
                  onPress={() => setManualCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: manualCategory === cat }}
                >
                  <Text style={styles.manualCategoryChipIcon}>
                    {MANUAL_CATEGORY_ICON[cat]}
                  </Text>
                  <Text
                    style={[
                      styles.manualCategoryChipText,
                      manualCategory === cat && styles.manualCategoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.manualLabel}>Quantity (optional)</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. 750"
              placeholderTextColor={Colors.textHint}
              value={manualQuantity}
              onChangeText={setManualQuantity}
              keyboardType="numeric"
              accessibilityLabel="Quantity"
            />

            <Text style={styles.manualLabel}>Unit (optional)</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. ml, oz, bottle"
              placeholderTextColor={Colors.textHint}
              value={manualUnit}
              onChangeText={setManualUnit}
              accessibilityLabel="Unit"
            />

            <View style={styles.manualModalActions}>
              <TouchableOpacity
                style={styles.manualCancelButton}
                onPress={() => setManualModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.manualCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manualMixerButton}
                onPress={handleManualAddToMixer}
                disabled={manualSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Add ingredient to Mixer Space"
              >
                <Text style={styles.manualMixerText}>Add to Mixer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.manualConfirmButton}
                onPress={handleManualAdd}
                disabled={manualSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Confirm add ingredient"
              >
                {manualSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.manualConfirmText}>Add to Cabinet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Primary CTA row (Make This Cocktail) — full-width on its own line
  primaryCtaRow: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },

  // Secondary CTA row (Add Manually + Scan Ingredient) — sit a few lines
  // below the primary CTA, sharing width equally via flex:1 on each button.
  secondaryCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },

  // Scan Ingredient (secondary CTA — SCRUM-151)
  scanButton: {
    flex: 1,
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

  // Add Manually (secondary CTA — SCRUM-198)
  // Mirrors scanButton's outline-pill style but with a transparent fill so it
  // visually de-emphasises slightly relative to Scan (the more "premium" path).
  manualButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
  },
  manualIcon: {
    marginRight: 6,
  },
  manualText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 0.3,
  },

  // Manual Ingredient Add Modal (SCRUM-198) — copied from CabinetScreen patterns
  manualModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  manualModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.accent + '44',
  },
  manualModalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  manualModalTitle: {
    ...Typography.headingXS,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  manualLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  manualInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manualCategoryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  manualCategoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  manualCategoryChipActive: {
    backgroundColor: Colors.accentSubtle,
    borderColor: Colors.accent,
  },
  manualCategoryChipIcon: {
    fontSize: 14,
  },
  manualCategoryChipText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  manualCategoryChipTextActive: {
    color: Colors.accent,
  },
  manualModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  manualCancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  manualCancelText: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
  },
  manualConfirmButton: {
    flex: 2,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  manualConfirmText: {
    ...Typography.labelMedium,
    color: Colors.background,
  },

  // SCRUM-198: Add to Mixer button (modal action) — sits between Cancel and
  // Add to Cabinet. Outlined style to distinguish it from the gold-filled
  // primary action while still feeling actionable.
  manualMixerButton: {
    flex: 1.5,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  manualMixerText: {
    ...Typography.labelMedium,
    color: Colors.accent,
  },

  // SCRUM-198: Mixer Space block on Create screen — empty state + chip list
  mixerSpaceBlock: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  mixerSpaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  mixerSpaceLabel: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 1.2,
  },
  mixerSpaceCount: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
  },
  mixerSpaceEmpty: {
    ...Typography.bodySmall,
    color: Colors.textHint,
    fontStyle: 'italic',
  },
  mixerChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  mixerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
    maxWidth: '100%',
  },
  mixerChipText: {
    ...Typography.labelSmall,
    color: Colors.accent,
    maxWidth: 180,
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
