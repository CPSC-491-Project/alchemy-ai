// SCRUM-185: ScanScreen stub
// Placeholder screen for the image-based ingredient scanning feature (SCRUM-151).
// Future subtasks will replace this with a live camera flow:
//   - SCRUM-188: camera capture + image picker + POST /api/scan
//   - SCRUM-189: candidate confirmation + write to Cabinet
// Registered in RootNavigator under route name "Scan".

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function ScanScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Back button ── */}
      <TouchableOpacity
        onPress={() => navigation?.goBack()}
        style={styles.backBtn}
        accessibilityLabel="Go back"
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.accent} />
      </TouchableOpacity>

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Gold-ringed camera icon */}
        <View style={styles.iconRing}>
          <Ionicons
            name="camera-outline"
            size={56}
            color={Colors.accent}
          />
        </View>

        <Text style={styles.title}>Scan Ingredient</Text>

        <Text style={styles.subtitle}>
          Point your camera at a label to add ingredients to your Cabinet.
        </Text>

        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>COMING SOON</Text>
        </View>

        <Text style={styles.hint}>
          Camera scanning arrives in Phase 2. For now, you can add
          ingredients manually from your Cabinet.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.headingS,
    color: Colors.accentLight,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  comingSoonPill: {
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  comingSoonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 2,
  },
  hint: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
