// SCRUM-180: RNTL component tests — frontend screen regression suite
//
// Covers: HomeScreen, SearchScreen, CabinetScreen, FavoritesScreen
//
// Strategy: "renders without crashing" baseline + key UI element assertions.
// These tests run fully offline — no backend, no Firebase, no Firestore.
// All external dependencies are mocked below.
//
// Run: cd frontend && npm test
// CI:  cd frontend && npm run test:ci
//
// Author: Matt Myers (myerm061) — SCRUM-180

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ─── Global mocks ─────────────────────────────────────────────────────────────

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => children,
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn((cb) => {
    const { useEffect } = require('react');
    useEffect(() => { cb(); }, []);
  }),
  useNavigation: jest.fn(() => mockNavigation),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../services/cocktailService', () => ({
  searchCocktails: jest.fn().mockResolvedValue([]),
  filterByIngredient: jest.fn().mockResolvedValue([]),
}));

jest.mock('../services/cabinetService', () => ({
  getCabinet: jest.fn().mockResolvedValue([]),
  addIngredient: jest.fn().mockResolvedValue({}),
  removeIngredient: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  makeRedirectUri: jest.fn(() => 'https://redirect'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('../components/CocktailCard', () => {
  const { Text } = require('react-native');
  return ({ drinkName }) => <Text testID="cocktail-card">{drinkName}</Text>;
});

// ─── Screen imports ───────────────────────────────────────────────────────────
import HomeScreen      from '../screens/HomeScreen';
import SearchScreen    from '../screens/SearchScreen';
import CabinetScreen   from '../screens/CabinetScreen';
import FavoritesScreen from '../screens/FavoritesScreen';

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────
describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HomeScreen navigation={mockNavigation} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the greeting heading text', () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByText(/craft tonight/i)).toBeTruthy();
  });

  it('renders the Recommended For You section header', () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByText('Recommended For You')).toBeTruthy();
  });

  it('renders the Popular Right Now section header', () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByText('Popular Right Now')).toBeTruthy();
  });

  it('renders the Party Mode CTA', () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByText('Party Mode')).toBeTruthy();
  });

  it('renders mock cocktail cards', () => {
    const { getAllByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    const cards = getAllByTestId('cocktail-card');
    expect(cards.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SearchScreen
// ─────────────────────────────────────────────────────────────────────────────
describe('SearchScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SearchScreen navigation={mockNavigation} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the search input field', () => {
    const { getByPlaceholderText } = render(
      <SearchScreen navigation={mockNavigation} />
    );
    expect(getByPlaceholderText(/Find a cocktail or ingredient/i)).toBeTruthy();
  });

  it('renders ingredient filter chips', () => {
    const { getByText } = render(<SearchScreen navigation={mockNavigation} />);
    expect(getByText('Whiskey')).toBeTruthy();
    expect(getByText('Gin')).toBeTruthy();
    expect(getByText('Rum')).toBeTruthy();
  });

  it('renders the idle placeholder grid when no search has been made', () => {
    const { queryByText } = render(<SearchScreen navigation={mockNavigation} />);
    expect(queryByText(/Result/)).toBeNull();
  });

  it('renders a back button', () => {
    const { getByLabelText } = render(
      <SearchScreen navigation={mockNavigation} />
    );
    expect(getByLabelText('Go back')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CabinetScreen
// ─────────────────────────────────────────────────────────────────────────────
describe('CabinetScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CabinetScreen navigation={mockNavigation} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the Cabinet screen title', async () => {
    const { getAllByText } = render(<CabinetScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getAllByText(/Cabinet/i).length).toBeGreaterThan(0));
  });

  it('renders category filter chips', async () => {
    const { getByText } = render(<CabinetScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('All')).toBeTruthy());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FavoritesScreen
// ─────────────────────────────────────────────────────────────────────────────
describe('FavoritesScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FavoritesScreen navigation={mockNavigation} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the empty state when there are no favorites', () => {
    const { getByText } = render(
      <FavoritesScreen navigation={mockNavigation} />
    );
    expect(getByText(/No favorites yet/i)).toBeTruthy();
  });

  it('renders the Explore Cocktails CTA in empty state', () => {
    const { getByText } = render(
      <FavoritesScreen navigation={mockNavigation} />
    );
    expect(getByText(/Explore Cocktails/i)).toBeTruthy();
  });
});