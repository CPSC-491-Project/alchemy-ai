// src/navigation/RootNavigator.js
// Alchemy AI — Root Stack Navigator

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen          from '../screens/LoginScreen';
import TabNavigator         from './TabNavigator';
import CocktailDetailScreen from '../screens/CocktailDetailScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator({ user }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        initialRouteName={user ? 'MainTabs' : 'Login'}
      >
        <Stack.Screen name="Login"           component={LoginScreen} />
        <Stack.Screen name="MainTabs"        component={TabNavigator} />
        <Stack.Screen name="CocktailDetail"  component={CocktailDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
