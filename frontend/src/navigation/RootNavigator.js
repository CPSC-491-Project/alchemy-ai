// src/navigation/RootNavigator.js
// Alchemy AI — Root Stack Navigator
// Controls flow between Login and Main App (tabs)
// SCRUM-130: Added CocktailDetail screen
// SCRUM-126: Added RecipeDetail screen (coordinate with feature/SCRUM-126-recipe-detail-screen)
// ingredient-cabinet-ui: Added IngredientCabinet screen (coordinate with feature/ingredient-cabinet-ui)
// SCRUM-185: Added Scan screen (image-based ingredient scanning — SCRUM-151)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen          from '../screens/LoginScreen';
import TabNavigator         from './TabNavigator';
import CocktailDetailScreen from '../screens/CocktailDetailScreen';
import { MixerProvider }    from '../contexts/MixerContext';

import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import CabinetScreen from '../screens/CabinetScreen';
import ScanScreen from '../screens/ScanScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PartyModeScreen from '../screens/PartyModeScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator({ user }) {
  return (
    <MixerProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: 'fade' }}
          initialRouteName={user ? 'MainTabs' : 'Login'}
        >
          <Stack.Screen name="Login"          component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MainTabs"       component={TabNavigator} />
          <Stack.Screen
            name="CocktailDetail"
            component={CocktailDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="RecipeDetail"
            component={RecipeDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          {CabinetScreen && (
            <Stack.Screen
              name="IngredientCabinet"
              component={CabinetScreen}
              options={{ animation: 'slide_from_right' }}
            />
          )}
          {ScanScreen && (
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ animation: 'slide_from_right' }}
            />
          )}
          <Stack.Screen
            name="PartyMode"
            component={PartyModeScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </MixerProvider>
  );
}
