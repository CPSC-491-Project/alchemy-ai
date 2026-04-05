// =============================================================
// Alchemy AI — Search Screen
// SCRUM-125 | feature/SCRUM-122-hifi-screens | Allisa Warren
// Overwrites Sprint 1 placeholder
// =============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { Colors, DisplayText, BodyText, Spacing, Radius } from '../theme';
import { BottomNavBar } from './HomeScreen';

const CHIPS = ['Whiskey', 'Gin', 'Citrus', 'Vermouth', 'Mezcal', 'Rum', 'Vodka', 'Tequila'];

const StarRating = ({ rating }) => (
  <Text style={styles.stars}>{Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}</Text>
);

const SearchCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.gridCardImage} />
    <View style={styles.gridCardInfo}>
      <Text style={styles.gridCardTitle}>{item.name}</Text>
      <StarRating rating={item.rating} />
      <Text style={styles.gridCardTags}>{item.tags.join(' · ')}</Text>
    </View>
  </TouchableOpacity>
);

export default function SearchScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState(route?.params?.query ?? '');
  const [activeChip, setActiveChip] = useState('Whiskey');

  // TODO: wire to GET /api/recipes/search?q=... in Sprint 3
  const results = [
    { id: '1', name: 'Old Fashioned', tags: ['Classic', 'Stirred'], rating: 4 },
    { id: '2', name: 'Negroni',       tags: ['Bitter', 'Stirred'],  rating: 4 },
    { id: '3', name: 'Manhattan',     tags: ['Rich', 'Stirred'],    rating: 4 },
    { id: '4', name: 'Margarita',     tags: ['Citrus', 'Shaken'],   rating: 4 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundPrimary} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Search</Text>
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.iconGold}>♪</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <View style={styles.searchBarWrapper}>
        <View style={styles.searchDot} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find a cocktail or ingredient..."
          placeholderTextColor={Colors.textHint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoFocus={!!route?.params?.query}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {CHIPS.map(chip => (
          <TouchableOpacity key={chip} style={[styles.chip, activeChip === chip && styles.chipActive]} onPress={() => setActiveChip(chip)}>
            <Text style={[styles.chipLabel, activeChip === chip && styles.chipLabelActive]}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {results.length === 0
        ? <View style={styles.emptyState}><Text style={styles.emptyText}>No matching recipes found</Text><Text style={styles.emptySubtext}>Try different ingredients</Text></View>
        : <FlatList
            data={results}
            keyExtractor={i => i.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <SearchCard item={item} onPress={() => navigation.navigate('RecipeDetail', { cocktail: item })} />}
          />
      }

      <BottomNavBar activeTab="Search" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.backgroundPrimary },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backArrow:        { color: Colors.goldPrimary, fontSize: 20 },
  screenTitle:      { ...DisplayText.navTitle, color: Colors.textPrimary },
  iconGold:         { color: Colors.goldPrimary, fontSize: 18 },
  divider:          { height: 0.5, backgroundColor: Colors.goldPrimary, opacity: 0.4 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 14, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.goldPrimary, gap: Spacing.sm },
  searchDot:        { width: 8, height: 8, borderRadius: Radius.full, backgroundColor: Colors.goldPrimary },
  searchInput:      { flex: 1, ...BodyText.secondary, color: Colors.textPrimary, padding: 0 },
  chipsRow:         { paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  chip:             { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderDefault },
  chipActive:       { backgroundColor: Colors.goldDark, borderColor: Colors.goldPrimary },
  chipLabel:        { ...BodyText.xSmall, color: Colors.textSecondary },
  chipLabelActive:  { color: Colors.textPrimary },
  gridContent:      { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  gridRow:          { gap: Spacing.md, marginBottom: Spacing.md },
  gridCard:         { flex: 1, backgroundColor: Colors.surfacePrimary, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.borderDefault, overflow: 'hidden' },
  gridCardImage:    { width: '100%', height: 150, backgroundColor: Colors.surfaceSecondary },
  gridCardInfo:     { padding: Spacing.sm, gap: 4 },
  gridCardTitle:    { ...DisplayText.cardTitleS, color: Colors.textPrimary },
  stars:            { color: Colors.goldPrimary, fontSize: 11, letterSpacing: 1 },
  gridCardTags:     { ...BodyText.xSmall, color: Colors.goldPrimary },
  emptyState:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyText:        { ...DisplayText.cardTitle, color: Colors.textPrimary },
  emptySubtext:     { ...BodyText.secondary, color: Colors.textSecondary },
});
