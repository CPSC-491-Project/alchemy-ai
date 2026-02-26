// src/navigation/TabNavigator.js
// Alchemy AI — Bottom Tab Navigation
// 5 tabs per FR-21: Home, Create, Search, Profile, Favorites

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';

import HomeScreen    from '../screens/HomeScreen';
import SearchScreen  from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Placeholder screens for tabs not yet built
const PlaceholderScreen = ({ route }) => (
  <View style={styles.placeholder}>
    <Ionicons name="construct-outline" size={32} color={Colors.textMuted} />
  </View>
);

const TAB_CONFIG = [
  { name: 'Home',      icon: 'home',         component: HomeScreen },
  { name: 'Create',    icon: 'add-circle',   component: PlaceholderScreen },
  { name: 'Search',    icon: 'search',       component: SearchScreen },
  { name: 'Favorites', icon: 'heart',        component: PlaceholderScreen },
  { name: 'Profile',   icon: 'person',       component: ProfileScreen },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TAB_CONFIG.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor:   Colors.accent,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? tab.icon : `${tab.icon}-outline`}
              size={22}
              color={color}
            />
          ),
        };
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor:  Colors.border,
    borderTopWidth:  1,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabLabel: {
    ...Typography.label,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'none',
  },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
