// Alchemy AI — Bottom Tab Navigation
// 5 tabs per FR-21: Home, Create, Search, Favorites, Profile
// Merge of PR #37 (FavoritesScreen) + local (CreateScreen)
// All tabs now wired — no more PlaceholderScreen

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen      from '../screens/HomeScreen';
import CreateScreen    from '../screens/CreateScreen';
import SearchScreen    from '../screens/SearchScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProfileScreen   from '../screens/ProfileScreen';


const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'Home',      icon: 'home',        component: HomeScreen      },
  { name: 'Create',    icon: 'add-circle',  component: CreateScreen    },
  { name: 'Search',    icon: 'search',      component: SearchScreen    },
  { name: 'Favorites', icon: 'heart',       component: FavoritesScreen },
  { name: 'Profile',   icon: 'person',      component: ProfileScreen   },
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
          tabBarIcon: ({ color }) => (
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

const styles = {
  tabBar: {
    backgroundColor: '#141414',
    borderTopColor: '#2A2A2A',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
};
