// src/navigation/RootNavigator.js
// Alchemy AI — Root Stack Navigator
// Controls flow between Login and Main App (tabs)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen  from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* Login is the entry point — replace with auth state check in Sprint 2 */}
        <Stack.Screen name="Login"     component={LoginScreen} />
        <Stack.Screen name="MainTabs"  component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
