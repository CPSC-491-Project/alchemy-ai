import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  CormorantGaramond_300Light,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

// ─── Design tokens (mirrors theme/index.js) ───────────────────────────────────
const COLORS = {
  background:    '#0D0D0D',
  surface:       '#1A1A1A',
  card:          'rgba(255,255,255,0.04)',
  gold:          '#C9A84C',
  goldBorder:    'rgba(201,168,76,0.25)',
  tagBg:         'rgba(201,168,76,0.12)',
  heartBg:       'rgba(0,0,0,0.45)',
  textPrimary:   '#F5F5F5',
  textMuted:     '#7A7870',
  textFaint:     '#5A5855',
};

const { width } = Dimensions.get('window');
const CARD_GAP   = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;   // 2-column grid, 16px side padding

// ─── Mock favorites (same shape as CreateScreen cocktails) ────────────────────
// Real TheCocktailDB IDs so CocktailDetailScreen can fetch them via GET /api/recipes/:id
const MOCK_FAVORITES = [
  {
    id:          '11001',
    name:        'Old Fashioned',
    ingredients: ['Bourbon Whiskey', 'Simple Syrup', 'Angostura Bitters', 'Orange Peel'],
    tags:        ['Classic', 'Stirred'],
    image:       null,
  },
  {
    id:          '11003',
    name:        'Negroni',
    ingredients: ['Gin', 'Sweet Vermouth', 'Campari'],
    tags:        ['Bitter', 'Stirred'],
    image:       null,
  },
  {
    id:          '11007',
    name:        'Margarita',
    ingredients: ['Tequila', 'Triple Sec', 'Lime Juice', 'Salt'],
    tags:        ['Citrus', 'Shaken'],
    image:       null,
  },
  {
    id:          '11000',
    name:        'Mojito',
    ingredients: ['White Rum', 'Mint', 'Lime Juice', 'Simple Syrup', 'Soda Water'],
    tags:        ['Fresh', 'Shaken'],
    image:       null,
  },
  {
    id:          '11012',
    name:        'Whiskey Sour',
    ingredients: ['Bourbon', 'Lemon Juice', 'Simple Syrup', 'Egg White'],
    tags:        ['Classic', 'Shaken'],
    image:       null,
  },
  {
    id:          '17222',
    name:        'Dark & Stormy',
    ingredients: ['Dark Rum', 'Ginger Beer', 'Lime Juice'],
    tags:        ['Strong', 'Build'],
    image:       null,
  },
];

// ─── Single cocktail card ─────────────────────────────────────────────────────
function FavoriteCard({ item, onPress, onUnfavorite, fontLoaded }) {
  const initials = item.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Thumbnail / placeholder */}
      <View style={styles.cardImage}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={[styles.cardInitials, fontLoaded && styles.fontCormorant]}>
            {initials}
          </Text>
        )}
      </View>

      {/* Name */}
      <Text
        style={[styles.cardName, fontLoaded && styles.fontDMSansMed]}
        numberOfLines={1}
      >
        {item.name}
      </Text>

      {/* Tag row */}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={[styles.tagText, fontLoaded && styles.fontDMSansReg]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Unfavorite heart button */}
      <TouchableOpacity
        style={styles.heartBtn}
        onPress={onUnfavorite}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="heart" size={18} color={COLORS.gold} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FavoritesScreen({ navigation }) {
  // Load fonts — missing useFonts causes silent blank screen on web
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  const [favorites, setFavorites] = useState(MOCK_FAVORITES);

  // Optimistic local remove — replace with API call when backend is ready
  const handleUnfavorite = useCallback((id) => {
    setFavorites((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Tab screens need getParent() to reach root stack screens like CocktailDetail
  const handleCardPress = useCallback((item) => {
    (navigation.getParent() ?? navigation).navigate('CocktailDetail', { id: item.id, cocktail: item });
  }, [navigation]);

  // "Explore Cocktails" — Search is a tab, direct navigate works fine
  const handleExplore = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  // ── Empty state ──
  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <Text style={[styles.headerTitle, fontsLoaded && styles.fontCormorant]}>
            Favorites
          </Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color={COLORS.goldBorder} />
          <Text style={[styles.emptyTitle, fontsLoaded && styles.fontCormorant]}>
            No favorites yet
          </Text>
          <Text style={[styles.emptySubtitle, fontsLoaded && styles.fontDMSansReg]}>
            Save cocktails you love and they&apos;ll appear here.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={handleExplore} activeOpacity={0.8}>
            <Text style={[styles.exploreBtnText, fontsLoaded && styles.fontDMSansMed]}>
              Explore Cocktails
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Grid of favorites ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, fontsLoaded && styles.fontCormorant]}>
          Favorites
        </Text>
        <Text style={[styles.headerCount, fontsLoaded && styles.fontDMSansReg]}>
          {favorites.length} saved
        </Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FavoriteCard
            item={item}
            fontLoaded={fontsLoaded}
            onPress={() => handleCardPress(item)}
            onUnfavorite={() => handleUnfavorite(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop:        20,
    paddingBottom:     12,
    flexDirection:     'row',
    alignItems:        'flex-end',
    justifyContent:    'space-between',
  },
  headerTitle: {
    fontSize:  32,
    color:     COLORS.textPrimary,
    fontWeight: '300',
  },
  headerCount: {
    fontSize:   13,
    color:      COLORS.textMuted,
    paddingBottom: 4,
  },

  // Grid
  listContent: {
    paddingHorizontal: 16,
    paddingBottom:     32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom:   CARD_GAP,
  },

  // Card
  card: {
    width:           CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     COLORS.goldBorder,
    overflow:        'hidden',
    paddingBottom:   12,
  },
  cardImage: {
    width:           '100%',
    height:          CARD_WIDTH * 0.85,
    backgroundColor: COLORS.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardInitials: {
    fontSize:  36,
    color:     COLORS.gold,
    opacity:   0.7,
  },
  cardName: {
    fontSize:         14,
    color:            COLORS.textPrimary,
    marginHorizontal: 10,
    marginTop:        10,
    marginBottom:     6,
  },
  tagRow: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    marginHorizontal: 10,
    gap:              4,
  },
  tag: {
    backgroundColor: COLORS.tagBg,
    borderRadius:    20,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  tagText: {
    fontSize: 10,
    color:    COLORS.gold,
  },
  heartBtn: {
    position: 'absolute',
    top:       8,
    right:     8,
    backgroundColor: COLORS.heartBg,
    borderRadius:    20,
    padding:         6,
  },

  // Empty state
  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap:            16,
  },
  emptyTitle: {
    fontSize:  28,
    color:     COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize:   14,
    color:      COLORS.textMuted,
    textAlign:  'center',
    lineHeight: 22,
  },
  exploreBtn: {
    marginTop:       8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:    30,
  },
  exploreBtnText: {
    fontSize: 14,
    color:    COLORS.background,
  },
  // Font styles — applied conditionally via fontsLoaded to avoid blank screen
  fontCormorant:  { fontFamily: 'CormorantGaramond_300Light' },
  fontDMSansReg:  { fontFamily: 'DMSans_400Regular' },
  fontDMSansMed:  { fontFamily: 'DMSans_500Medium' },
});
