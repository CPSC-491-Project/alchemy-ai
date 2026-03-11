// Alchemy AI — Bottom Tab Navigation
// 5 tabs per FR-21: Home, Create, Search, Favorites, Profile

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Placeholder screens for tabs not yet built
const PlaceholderScreen = ({ route }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{route.name}</Text>
    <Text style={styles.placeholderSub}>Coming soon</Text>
  </View>
);

const TAB_CONFIG = [
  { name: 'Home', icon: 'home', component: HomeScreen },
  { name: 'Create', icon: 'add-circle', component: PlaceholderScreen },
  { name: 'Search', icon: 'search', component: SearchScreen },
  { name: 'Favorites', icon: 'heart', component: PlaceholderScreen },
  { name: 'Profile', icon: 'person', component: ProfileScreen },
];

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TAB_CONFIG.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#C9A84C',
          tabBarInactiveTintColor: '#4A4A4A',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={tab.icon} size={22} color={color} />
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
    backgroundColor: '#141414',
    borderTopColor: '#2A2A2A',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#F5F0E8', fontSize: 20, fontWeight: 'bold' },
  placeholderSub: { color: '#4A4A4A', fontSize: 14, marginTop: 8 },
});
