// src/navigation/RootNavigator.js
// Alchemy AI — Root Stack Navigator
// Controls flow between Login and Main App (tabs)
// SCRUM-130: Added CocktailDetail screen
// SCRUM-126: Added RecipeDetail screen (coordinate with feature/SCRUM-126-recipe-detail-screen)
// ingredient-cabinet-ui: Added IngredientCabinet screen (coordinate with feature/ingredient-cabinet-ui)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen          from '../screens/LoginScreen';
import TabNavigator         from './TabNavigator';
import CocktailDetailScreen from '../screens/CocktailDetailScreen';

// RecipeDetailScreen and CabinetScreen imported lazily to avoid breaking
// builds when those branches have not yet been merged into develop.
// Remove the try/catch wrappers once SCRUM-126 and ingredient-cabinet-ui are merged.
let RecipeDetailScreen = null;
let CabinetScreen = null;
try { RecipeDetailScreen = require('../screens/RecipeDetailScreen').default; } catch (_e) { RecipeDetailScreen = null; }
try { CabinetScreen = require('../screens/CabinetScreen').default; } catch (_e) { CabinetScreen = null; }

const Stack = createNativeStackNavigator();

export default function RootNavigator({ user }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
        initialRouteName={user ? 'MainTabs' : 'Login'}
      >
        <Stack.Screen name="Login"     component={LoginScreen} />
        <Stack.Screen name="MainTabs"  component={TabNavigator} />
        <Stack.Screen
          name="CocktailDetail"
          component={CocktailDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {RecipeDetailScreen && (
          <Stack.Screen
            name="RecipeDetail"
            component={RecipeDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
        )}
        {CabinetScreen && (
          <Stack.Screen
            name="IngredientCabinet"
            component={CabinetScreen}
            options={{ animation: 'slide_from_right' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
