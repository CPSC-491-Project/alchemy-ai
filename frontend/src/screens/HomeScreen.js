// Alchemy AI — Home Screen
// SCRUM-74: Wire carousel to GET /api/recommendations
// Replaces Sprint 1 placeholder with live service call + mock fallback

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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A84C" />
      }
    >
      <Text style={styles.greeting}>Good evening</Text>
      <Text style={styles.subtitle}>What are you in the mood for?</Text>

      <Text style={styles.sectionTitle}>Recommended for You</Text>

      {usingMock && (
        <Text style={styles.mockBanner}>
          ⚠ Mock data — live results load once SCRUM-115 merges
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 24 }} />
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
    backgroundColor: '#0D0D0D',
    paddingTop: 24,
  },
  greeting: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  mockBanner: {
    fontSize: 11,
    color: '#C9A84C',
    paddingHorizontal: 20,
    marginBottom: 8,
    opacity: 0.7,
  },
  carousel: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    width: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardImage: {
    width: '100%',
    height: 130,
  },
  cardBody: {
    padding: 12,
  },
  cardName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  cardMatch: {
    fontSize: 12,
    color: '#C9A84C',
  },
  cardMissing: {
    fontSize: 11,
    color: '#888888',
    marginTop: 2,
  },
});
