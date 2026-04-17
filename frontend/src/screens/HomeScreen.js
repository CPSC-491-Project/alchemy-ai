// Alchemy AI — Home Screen
// SCRUM-74: Wire carousel to GET /api/recommendations
// Updated: replaced hardcoded hex values with theme tokens

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { fetchRecommendations } from '../services/recommendationsService';

// ── Mock fallback — active until SCRUM-115 (Ethan's backend PR) merges ────────
const MOCK_RECOMMENDATIONS = [
  {
    id: '11007',
    name: 'Margarita',
    thumbnail: 'https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg',
    matchPercentage: 95,
    missingIngredients: [],
    category: 'Ordinary Drink',
  },
  {
    id: '11000',
    name: 'Mojito',
    thumbnail: 'https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg',
    matchPercentage: 80,
    missingIngredients: ['Mint'],
    category: 'Cocktail',
  },
  {
    id: '178319',
    name: 'Whiskey Sour',
    thumbnail: 'https://www.thecocktaildb.com/images/media/drink/hbkfsh1589574990.jpg',
    matchPercentage: 70,
    missingIngredients: ['Egg White'],
    category: 'Ordinary Drink',
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const loadRecommendations = useCallback(async () => {
    try {
      const data = await fetchRecommendations();
      if (data.length > 0) {
        setRecommendations(data);
        setUsingMock(false);
      } else {
        setRecommendations(MOCK_RECOMMENDATIONS);
        setUsingMock(true);
      }
    } catch {
      setRecommendations(MOCK_RECOMMENDATIONS);
      setUsingMock(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecommendations();
  }, [loadRecommendations]);

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation?.navigate('RecipeDetail', { cocktail: item })}
      accessibilityLabel={`View recipe for ${item.name}`}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMatch}>{item.matchPercentage}% match</Text>
        {item.missingIngredients?.length > 0 && (
          <Text style={styles.cardMissing} numberOfLines={1}>
            Missing: {item.missingIngredients.join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.accent}
        />
      }
    >
      <Text style={styles.greeting}>What will you craft tonight?</Text>
      <Text style={styles.subtitle}>Based on your ingredient cabinet</Text>

      <Text style={styles.sectionTitle}>Recommended for You</Text>

      {usingMock && (
        <Text style={styles.mockBanner}>
          ⚠ Mock data — live results load once SCRUM-115 merges
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.lg }} />
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Spacing.lg,
  },
  greeting: {
    ...Typography.headingM,
    paddingHorizontal: Spacing.lg,
    lineHeight: 40,
  },
  subtitle: {
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.navTitle,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  mockBanner: {
    ...Typography.caption,
    color: Colors.accent,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    opacity: 0.7,
  },
  carousel: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  card: {
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImage: {
    width: '100%',
    height: 130,
  },
  cardBody: {
    padding: Spacing.sm,
  },
  cardName: {
    ...Typography.cardTitle,
    marginBottom: 2,
  },
  cardMatch: {
    ...Typography.caption,
    color: Colors.accent,
  },
  cardMissing: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
