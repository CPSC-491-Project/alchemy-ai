// Alchemy AI — Create Screen (Party Mode)
// Matches hi-fi wireframe: full-screen featured card, swipe carousel,
// Quick Style pills, and "Make This Cocktail" CTA.
// Design tokens from src/theme/index.js

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ScrollView,
  ImageBackground,
  Image,
  Animated,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { addIngredient } from '../services/cabinetService';
import { recommendFromIngredients } from '../services/recommendationsService';
import { useMixer } from '../contexts/MixerContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - Spacing.lg * 2;
// SCRUM-208: explicit card height shared between the FlatList container and
// the card itself. Without this, the horizontal carousel can collapse on
// certain devices/layouts and the card gets clipped to a thin sliver.
const CARD_H = SCREEN_H * 0.36;

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

// SCRUM-208: Fisher–Yates shuffle, returns the first `count` items.
// Used to pick 3 random "Cocktail of the Day" picks from PARTY_COCKTAILS
// on each mount (app reload / hot reload re-rolls the selection).
const pickRandom = (arr, count) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

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

// SCRUM-208: small "Cocktail of the Day" card. Shown 3-up in a row,
// each card directly navigates to RecipeDetail on tap. Replaces the
// single swipeable hero card.
const CocktailMiniCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.miniCard}
    activeOpacity={0.85}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`View details for ${item.name}`}
  >
    <Image
      source={{ uri: item.image }}
      style={styles.miniCardImage}
      resizeMode="cover"
    />
    <View style={styles.miniCardInfo}>
      <Text style={styles.miniCardName} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.miniCardTagRow}>
        {item.tags.slice(0, 2).map((t) => (
          <View key={t} style={styles.miniTagPill}>
            <Text style={styles.miniTagPillText} numberOfLines={1}>
              {t.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.miniStarRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Ionicons
            key={i}
            name="star-outline"
            size={11}
            color={Colors.textHint}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    </View>
  </TouchableOpacity>
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
  // SCRUM-208: pick 3 random cocktails from PARTY_COCKTAILS once per mount.
  // Lazy initializer ensures the shuffle runs exactly once when the screen
  // mounts (app reload / hot reload re-rolls); useMemo doesn't guarantee a
  // single computation per mount.
  const [featuredCocktails] = useState(() => pickRandom(PARTY_COCKTAILS, 3));
  // SCRUM-208: on Expo Web, flex:1 doesn't always propagate a height through
  // React Navigation's container chain, so the outer ScrollView never gets a
  // constrained height and won't engage. Bind the screen height explicitly on
  // web. useWindowDimensions updates on viewport resize.
  const { height: viewportHeight } = useWindowDimensions();
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
  const { items: mixerItems, addToMixer, removeFromMixer, isFull: isMixerFull, max: mixerMax } = useMixer();

  // SCRUM-201: Recommend Me Drinks — modal-driven flow that takes the
  // user's Mixer Space contents and asks the backend (SCRUM-199) for
  // ranked drink suggestions via the recommendFromIngredients() service
  // (SCRUM-200). Three states drive the modal: loading, error/empty, results.
  //
  // SCRUM-202 layered on three pieces of polish:
  //   - cache (item 1): repeat clicks with the same Mixer contents skip the
  //     network round-trip. Cache invalidates whenever the mixer changes.
  //   - error states (item 3): network and 5xx errors keep the modal open
  //     with a "Try Again" button rather than auto-closing. 4xx errors do
  //     not offer retry (same input would fail again).
  //   - loading rotation (item 4): three messages cycle at 0s / 2s / 4s so
  //     the user has reassurance during longer CocktailDB requests.
  const [recommendModalVisible, setRecommendModalVisible] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendError, setRecommendError] = useState(null);     // { message, retryable }
  const [recommendLoadingStage, setRecommendLoadingStage] = useState(0); // 0 / 1 / 2

  // SCRUM-202 (item 4): rotate loading copy at 2s and 4s thresholds. Refs
  // hold the timer ids so we can cancel them in the finally block; if we
  // didn't, a fast response would leave the timers firing and overwriting
  // post-load state.
  const loadingTimerRefs = useRef([]);
  const LOADING_MESSAGES = [
    'Finding drinks you can make…',
    'Checking the cocktail database…',
    'Almost there…',
  ];

  // SCRUM-202 (item 1): in-memory cache. Map<sorted-ingredients, recommendations[]>.
  // Lives in a ref so updating the cache doesn't trigger a re-render.
  const recommendCacheRef = useRef(new Map());

  // SCRUM-202 (item 1): build a stable key from the current mixer contents.
  // Sorted so order doesn't matter (the engine is order-insensitive too),
  // lowercased so casing doesn't fragment the cache, joined with a delimiter
  // unlikely to appear in an ingredient name.
  const buildCacheKey = useCallback((items) => {
    return items
      .map((i) => i.name.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join('|');
  }, []);

  // SCRUM-202 (item 1): clear the cache whenever the Mixer Space contents
  // change. Per the spec, "cache invalidates when an item is added or
  // removed." We re-derive the cache key on every recommend call from the
  // current items, but the spec is explicit — flush stale entries on change.
  useEffect(() => {
    recommendCacheRef.current.clear();
  }, [mixerItems]);

  function clearLoadingTimers() {
    for (const t of loadingTimerRefs.current) clearTimeout(t);
    loadingTimerRefs.current = [];
  }

  function startLoadingRotation() {
    setRecommendLoadingStage(0);
    clearLoadingTimers();
    const t1 = setTimeout(() => setRecommendLoadingStage(1), 2000);
    const t2 = setTimeout(() => setRecommendLoadingStage(2), 4000);
    loadingTimerRefs.current = [t1, t2];
  }

  async function handleRecommend() {
    // Defensive: button is disabled when empty, but guard anyway in case
    // the disabled state is ever bypassed (e.g. accessibility tools).
    if (mixerItems.length === 0) return;

    setRecommendModalVisible(true);
    setRecommendError(null);
    setRecommendations([]);

    // SCRUM-202 (item 1): cache hit — render results immediately, skip the
    // network call. We still set the loading state briefly to false so the
    // results render path takes over without flashing the empty state.
    const cacheKey = buildCacheKey(mixerItems);
    const cached = recommendCacheRef.current.get(cacheKey);
    if (cached) {
      setRecommendations(cached);
      setRecommendLoading(false);
      return;
    }

    setRecommendLoading(true);
    startLoadingRotation();
    try {
      const recs = await recommendFromIngredients(
        mixerItems.map((i) => i.name)
      );
      setRecommendations(recs);
      // SCRUM-202 (item 1): only cache successful responses — caching errors
      // would prevent a retry from ever reaching the backend.
      recommendCacheRef.current.set(cacheKey, recs);
    } catch (err) {
      // SCRUM-202 (item 3): keep the modal open on retryable errors and let
      // the user retry without re-entering ingredients. 4xx errors are not
      // retryable because the same input would fail the same way.
      const retryable = err.kind === 'network' || err.kind === 'serverError';
      const userMessage =
        err.kind === 'serverError'
          ? 'Something went wrong on our end. Please try again.'
          : err.message || 'Could not load recommendations.';
      setRecommendError({ message: userMessage, retryable });
    } finally {
      clearLoadingTimers();
      setRecommendLoading(false);
    }
  }

  function handleRecommendCardPress(drink) {
    setRecommendModalVisible(false);
    // recommendation results expose `thumbnail`, but RecipeDetailScreen
    // expects `image` (or `thumb`) for its hero. Map it explicitly so
    // the loading state isn't blank during getCocktailById's fetch.
    const cocktailForDetail = {
      ...drink,
      image: drink.thumbnail,
    };
    (navigation.getParent() ?? navigation).navigate('RecipeDetail', {
      cocktail: cocktailForDetail,
    });
  }

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

  // SCRUM-196 (from develop): debounced scroll handler for the carousel.
  // Replaces the earlier onViewableItemsChanged approach — the actual
  // <Animated.FlatList> below wires this up via onScroll.
  const scrollTimer = useRef(null);
  const onScroll = useCallback((e) => {
    const offset = e.nativeEvent.contentOffset.x;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const index = Math.round(offset / (CARD_W + Spacing.sm));
      setActiveIndex(Math.max(0, Math.min(index, featuredCocktails.length - 1)));
    }, 50);
  }, [featuredCocktails.length]);

  const handleStylePress = useCallback(
    (style) => {
      setActiveStyle(style);
      // Filter to the first cocktail matching this style (within the random
      // featured set; falls back to the first card if no match this reload).
      const idx = featuredCocktails.findIndex(
        (c) => c.style.toLowerCase() === style.toLowerCase()
      );
      if (idx !== -1 && flatRef.current) {
        flatRef.current.scrollToIndex({ index: idx, animated: true });
      }
    },
    [featuredCocktails]
  );

  const currentCocktail = featuredCocktails[activeIndex];

  // Font guard — must render null until fonts load or web shows blank screen
  if (!fontsLoaded) return null;

  return (
    <View
      style={[
        styles.container,
        // SCRUM-208: web-only height bind — see comment on viewportHeight.
        Platform.OS === 'web' && { height: viewportHeight },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {/* SCRUM-208: ScrollView wraps the page body so users can scroll
          past the carousel to reach Mixer Space and Quick Style on
          smaller viewports. Modals stay siblings (overlays) and
          shouldn't scroll with the body. */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

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

      {/* ── SCRUM-208: section label above the carousel ── */}
      <View style={styles.cotdLabelRow}>
        <Text style={styles.cotdLabel}>COCKTAIL OF THE DAY</Text>
      </View>

      {/* ── SCRUM-208: 3-up Cocktail of the Day mini cards ──
          Static row of 3 random featured cocktails. Each card is
          tappable and navigates straight to RecipeDetail. Replaces
          the previous swipe-carousel + dot indicators. */}
      <View style={styles.miniCardRow}>
        {featuredCocktails.map((item) => (
          <CocktailMiniCard
            key={item.id}
            item={item}
            onPress={() =>
              (navigation.getParent() ?? navigation).navigate('RecipeDetail', {
                cocktail: item,
              })
            }
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
            // SCRUM-202: show capacity (e.g. "3 / 8") so users see the cap
            // before they hit it, not just at the moment of rejection.
            <Text style={styles.mixerSpaceCount}>
              {mixerItems.length} / {mixerMax}
            </Text>
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
        {/* SCRUM-201: Recommend Me Drinks — disabled when mixer is empty
            so first-time users see the helper text in the empty state above
            and the button below as the obvious next step once they add items. */}
        <TouchableOpacity
          style={[
            styles.recommendButton,
            mixerItems.length === 0 && styles.recommendButtonDisabled,
          ]}
          onPress={handleRecommend}
          disabled={mixerItems.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Recommend drinks I can make"
          accessibilityState={{ disabled: mixerItems.length === 0 }}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={mixerItems.length === 0 ? Colors.textHint : Colors.background}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.recommendButtonText,
              mixerItems.length === 0 && styles.recommendButtonTextDisabled,
            ]}
          >
            Recommend Me Drinks
          </Text>
        </TouchableOpacity>
        {mixerItems.length === 0 && (
          <Text style={styles.recommendHelperText}>
            Add ingredients to get recommendations
          </Text>
        )}
        {/* SCRUM-202: At-cap helper. Renders below chips when full so the
            user understands why their next add will be rejected. */}
        {isMixerFull && (
          <Text style={styles.mixerSpaceFullHint}>
            Mixer Space is full ({mixerMax} max). Remove an item to add more.
          </Text>
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

      </ScrollView>

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
                style={[
                  styles.manualMixerButton,
                  isMixerFull && styles.manualMixerButtonDisabled,
                ]}
                onPress={handleManualAddToMixer}
                disabled={manualSubmitting || isMixerFull}
                accessibilityRole="button"
                accessibilityLabel={
                  isMixerFull
                    ? `Mixer is full (${mixerMax} maximum)`
                    : 'Add ingredient to Mixer Space'
                }
                accessibilityState={{ disabled: isMixerFull }}
              >
                <Text
                  style={[
                    styles.manualMixerText,
                    isMixerFull && styles.manualMixerTextDisabled,
                  ]}
                >
                  {isMixerFull ? 'Mixer Full' : 'Add to Mixer'}
                </Text>
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

      {/* ── SCRUM-201: Recommendations Modal ──
          Bottom-sheet showing one of three states:
            1. Loading  — spinner + helper text
            2. Empty    — no matches above the 0.4 threshold from the backend
            3. Results  — vertical scrollable list of drink cards
          Style language matches manualModalSheet so the two flows feel like
          siblings. The list uses FlatList for keyboard/perf reasons (a cap
          of 6 results means it stays small, but it's better hygiene). */}
      <Modal
        visible={recommendModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRecommendModalVisible(false)}
      >
        <View style={styles.manualModalOverlay}>
          <View style={styles.recommendModalSheet}>
            <View style={styles.manualModalHandle} />

            <View style={styles.recommendModalTitleRow}>
              <Text style={styles.manualModalTitle}>Drinks You Can Make</Text>
              <TouchableOpacity
                onPress={() => setRecommendModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close recommendations"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {recommendLoading ? (
              <View style={styles.recommendStateBox}>
                <ActivityIndicator color={Colors.accent} size="large" />
                {/* SCRUM-202 (item 4): rotating loading copy. The message
                    index advances on a setTimeout chain in handleRecommend. */}
                <Text style={styles.recommendStateText}>
                  {LOADING_MESSAGES[recommendLoadingStage]}
                </Text>
              </View>
            ) : recommendError ? (
              // SCRUM-202 (item 3): error state. Modal stays open so the user
              // can retry on network/5xx, or read the backend's 4xx message
              // and decide what to fix in their Mixer Space.
              <View style={styles.recommendStateBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color={Colors.accent}
                />
                <Text style={styles.recommendStateText}>
                  {recommendError.message}
                </Text>
                <View style={styles.recommendErrorActions}>
                  <TouchableOpacity
                    style={styles.recommendCloseButton}
                    onPress={() => setRecommendModalVisible(false)}
                  >
                    <Text style={styles.recommendCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                  {recommendError.retryable && (
                    <TouchableOpacity
                      style={styles.recommendRetryButton}
                      onPress={handleRecommend}
                      accessibilityLabel="Try again"
                    >
                      <Ionicons
                        name="refresh"
                        size={14}
                        color={Colors.background}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.recommendRetryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : recommendations.length === 0 ? (
              <View style={styles.recommendStateBox}>
                <Ionicons
                  name="search-outline"
                  size={32}
                  color={Colors.textHint}
                />
                <Text style={styles.recommendStateText}>
                  No close matches found.
                </Text>
                <Text style={styles.recommendStateSubtext}>
                  Try adding more ingredients to your Mixer Space.
                </Text>
                <TouchableOpacity
                  style={styles.recommendCloseButton}
                  onPress={() => setRecommendModalVisible(false)}
                >
                  <Text style={styles.recommendCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={recommendations}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.recommendList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.recommendCard}
                    onPress={() => handleRecommendCardPress(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`View recipe for ${item.name}`}
                  >
                    {item.thumbnail ? (
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.recommendCardThumb}
                      />
                    ) : (
                      <View
                        style={[
                          styles.recommendCardThumb,
                          styles.recommendCardThumbPlaceholder,
                        ]}
                      >
                        <Ionicons
                          name="wine-outline"
                          size={22}
                          color={Colors.accent}
                        />
                      </View>
                    )}
                    <View style={styles.recommendCardBody}>
                      <View style={styles.recommendCardHeaderRow}>
                        <Text
                          style={styles.recommendCardName}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View style={styles.recommendMatchBadge}>
                          <Text style={styles.recommendMatchBadgeText}>
                            {Math.round((item.matchPercentage ?? 0) * 100)}%
                            match
                          </Text>
                        </View>
                      </View>
                      {item.missingIngredients &&
                      item.missingIngredients.length > 0 ? (
                        <Text
                          style={styles.recommendCardMissing}
                          numberOfLines={2}
                        >
                          Need: {item.missingIngredients.join(', ')}
                        </Text>
                      ) : (
                        <Text style={styles.recommendCardComplete}>
                          You have everything!
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Colors.textHint}
                    />
                  </TouchableOpacity>
                )}
              />
            )}
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

  // SCRUM-208: ScrollView wrapper so the page body scrolls past the tab bar.
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    // Extra room at the bottom so Quick Style isn't hidden behind the tab bar.
    paddingBottom: 120,
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
  // SCRUM-208: explicit height so the horizontal FlatList never collapses.
  carousel: {
    height: CARD_H,
    flexGrow: 0,
  },
  carouselContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  // SCRUM-208: section label above the carousel ("Cocktail of the Day").
  cotdLabelRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cotdLabel: {
    ...Typography.label,
    color: Colors.accent,
    letterSpacing: 1.2,
  },

  // SCRUM-208: 3-up mini card row replacing the swipe carousel.
  miniCardRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  miniCard: {
    flex: 1,
    height: 200,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
  },
  miniCardImage: {
    width: '100%',
    height: 96,
  },
  miniCardInfo: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  miniCardName: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  miniCardTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 2,
  },
  miniTagPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniTagPillText: {
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    fontFamily: 'DMSans_500Medium',
  },
  miniStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredCard: {
    width: CARD_W,
    height: CARD_H,
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

  // SCRUM-202: Disabled state for "Add to Mixer" when at cap. Pulls
  // chrome down to muted gray so the affordance still reads as a button
  // but clearly inactive.
  manualMixerButtonDisabled: {
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  manualMixerTextDisabled: {
    color: Colors.textMuted,
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
  // SCRUM-202: At-cap helper text inside the Mixer Space block.
  // Slightly muted but readable — not an error, just a heads-up.
  mixerSpaceFullHint: {
    ...Typography.caption,
    color: Colors.textHint,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
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

  // SCRUM-201: Recommend Me Drinks button — primary action inside the
  // Mixer Space block, sits beneath the chip row. Outlined accent style
  // (filled when active) keeps it distinct from the gold-gradient
  // "Make This Cocktail" CTA which is the screen's hero action.
  recommendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  recommendButtonDisabled: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recommendButtonText: {
    ...Typography.labelMedium,
    color: Colors.background,
    letterSpacing: 0.4,
  },
  recommendButtonTextDisabled: {
    color: Colors.textHint,
  },
  recommendHelperText: {
    ...Typography.caption,
    color: Colors.textHint,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // SCRUM-201: Recommendations Modal — riffs on manualModalSheet but
  // taller (loading/empty states need vertical breathing room and the
  // results list itself wants room to scroll).
  recommendModalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.accent + '44',
    maxHeight: '80%',
  },
  recommendModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  recommendStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  recommendStateText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  recommendStateSubtext: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recommendCloseButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recommendCloseButtonText: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
  },

  // SCRUM-202 (item 3): error actions row — Close + (optional) Try Again.
  // Try Again only renders for retryable errors (network / 5xx); 4xx errors
  // are skipped because the same input would fail the same way.
  recommendErrorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  recommendRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
  },
  recommendRetryButtonText: {
    ...Typography.labelMedium,
    color: Colors.background,
  },
  recommendList: {
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  recommendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  recommendCardThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  recommendCardThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendCardBody: {
    flex: 1,
    gap: 4,
  },
  recommendCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  recommendCardName: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
  recommendMatchBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  recommendMatchBadgeText: {
    ...Typography.labelSmall,
    color: Colors.accent,
    fontSize: 11,
  },
  recommendCardMissing: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  recommendCardComplete: {
    ...Typography.caption,
    color: Colors.accent,
    fontStyle: 'italic',
  },
});
