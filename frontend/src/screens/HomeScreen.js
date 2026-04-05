// =============================================================
// Alchemy AI — Home Screen
// SCRUM-123 | feature/SCRUM-122-hifi-screens | Allisa Warren
// Overwrites Sprint 1 placeholder
// =============================================================
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList, Dimensions,
  SafeAreaView, StatusBar,
} from 'react-native';
import { Colors, DisplayText, BodyText, Spacing, Radius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

const CocktailCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.cardImage} />
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardIngredients}>{item.ingredients.join(' · ')}</Text>
    </View>
  </TouchableOpacity>
);

export const BottomNavBar = ({ activeTab, navigation }) => (
  <View style={styles.bottomNav}>
    {['Home', 'Create', 'Favorites', 'Search', 'Profile'].map(tab => (
      <TouchableOpacity
        key={tab}
        style={styles.bottomNavItem}
        onPress={() => navigation.navigate(tab)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.bottomNavLabel, activeTab === tab && styles.bottomNavLabelActive]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function HomeScreen({ navigation, onOpenLeftPanel, onOpenRightPanel }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  // TODO: replace with GET /api/recommendations in Sprint 3
  const recommendations = [
    { id: '1', name: 'Cocktail Name', ingredients: ['Rum', 'Lime', 'Mint'] },
    { id: '2', name: 'Cocktail Name', ingredients: ['Rum', 'Lime', 'Mint'] },
    { id: '3', name: 'Cocktail Name', ingredients: ['Rum', 'Lime', 'Mint'] },
  ];

  const scrollTo = (dir) => {
    const i = dir === 'next'
      ? Math.min(activeIndex + 1, recommendations.length - 1)
      : Math.max(activeIndex - 1, 0);
    flatListRef.current?.scrollToIndex({ index: i, animated: true });
    setActiveIndex(i);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundPrimary} />

      {/* Top nav bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onOpenLeftPanel}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburger}>
            {[0, 1, 2].map(i => <View key={i} style={styles.hamburgerLine} />)}
          </View>
        </TouchableOpacity>

        <Text style={styles.navBarTitle}>ALCHEMY AI</Text>

        <TouchableOpacity
          onPress={onOpenRightPanel}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.avatarCircle} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <Text style={styles.heroText}>{'What will you\ncraft tonight?'}</Text>
        <Text style={styles.heroSubtext}>Based on your ingredient cabinet</Text>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Search', { query: searchQuery })}
        >
          <View style={styles.searchDot} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ingredients . . ."
            placeholderTextColor={Colors.textHint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </TouchableOpacity>

        {/* Recommended section */}
        <Text style={styles.sectionTitle}>Recommended For You</Text>

        <View style={styles.carouselWrapper}>
          {activeIndex > 0 && (
            <TouchableOpacity style={styles.arrowLeft} onPress={() => scrollTo('prev')}>
              <Text style={styles.arrowText}>{'<'}</Text>
            </TouchableOpacity>
          )}
          <FlatList
            ref={flatListRef}
            data={recommendations}
            keyExtractor={i => i.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH}
            decelerationRate="fast"
            onScroll={e => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH))}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={{ width: CARD_WIDTH }}>
                <CocktailCard item={item} onPress={() => navigation.navigate('RecipeDetail', { cocktail: item })} />
              </View>
            )}
          />
          {activeIndex < recommendations.length - 1 && (
            <TouchableOpacity style={styles.arrowRight} onPress={() => scrollTo('next')}>
              <Text style={styles.arrowText}>{'>'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Second card */}
        {recommendations[1] && (
          <CocktailCard
            item={recommendations[1]}
            onPress={() => navigation.navigate('RecipeDetail', { cocktail: recommendations[1] })}
          />
        )}
      </ScrollView>

      <BottomNavBar activeTab="Home" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: Colors.backgroundPrimary },
  topBar:                 { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  navButton:              { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navBarTitle:            { ...BodyText.navTitle, color: Colors.textPrimary },
  hamburger:              { gap: 5 },
  hamburgerLine:          { width: 22, height: 1.5, backgroundColor: Colors.textPrimary, borderRadius: 999 },
  avatarCircle:           { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.borderGold },
  divider:                { height: 0.5, backgroundColor: Colors.goldPrimary, opacity: 0.4 },
  scrollContent:          { paddingBottom: Spacing.xxl },
  heroText:               { ...DisplayText.headingM, color: Colors.textPrimary, textAlign: 'center', paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  heroSubtext:            { ...BodyText.secondary, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  searchBar:              { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.goldPrimary, marginBottom: Spacing.xl, gap: Spacing.sm },
  searchDot:              { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.goldPrimary },
  searchInput:            { flex: 1, ...BodyText.secondary, color: Colors.textPrimary, padding: 0 },
  sectionTitle:           { ...DisplayText.navTitle, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.md },
  carouselWrapper:        { position: 'relative', marginBottom: Spacing.sm },
  arrowLeft:              { position: 'absolute', left: Spacing.sm, top: '50%', zIndex: 10, padding: Spacing.sm },
  arrowRight:             { position: 'absolute', right: Spacing.sm, top: '50%', zIndex: 10, padding: Spacing.sm },
  arrowText:              { ...BodyText.regular, color: Colors.goldPrimary, fontSize: 18 },
  card:                   { marginHorizontal: Spacing.lg, backgroundColor: Colors.surfacePrimary, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  cardImage:              { width: '100%', height: 200, backgroundColor: Colors.surfaceSecondary },
  cardInfo:               { padding: Spacing.md, alignItems: 'center' },
  cardTitle:              { ...DisplayText.cardTitle, color: Colors.textPrimary, marginBottom: Spacing.xs },
  cardIngredients:        { ...BodyText.xSmall, color: Colors.goldPrimary },
  bottomNav:              { flexDirection: 'row', backgroundColor: Colors.surfacePrimary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderTopWidth: 0.5, borderTopColor: Colors.borderDefault },
  bottomNavItem:          { flex: 1, alignItems: 'center' },
  bottomNavLabel:         { ...BodyText.small, color: Colors.textSecondary },
  bottomNavLabelActive:   { color: Colors.goldPrimary },
});
