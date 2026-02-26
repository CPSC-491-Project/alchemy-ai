// src/navigation/RootNavigator.js
// Alchemy AI — Root Stack Navigator
// Controls flow between Login and Main App (tabs)
// Uses Firebase auth state to determine initial route

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen  from '../screens/LoginScreen';
import TabNavigator from './TabNavigator';

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
