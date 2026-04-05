// =============================================================
// Alchemy AI — Profile & Settings Screen
// SCRUM-129 | feature/SCRUM-122-hifi-screens | Allisa Warren
// Overwrites Sprint 1 placeholder
// =============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, Switch,
} from 'react-native';
import { Colors, DisplayText, BodyText, Spacing, Radius } from '../theme';
import { BottomNavBar } from './HomeScreen';

const SettingsRow = ({ label, subtitle, onPress, rightElement, showDivider = true }) => (
  <>
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.settingsRowLeft}>
        <Text style={styles.settingsRowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.settingsRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </TouchableOpacity>
    {showDivider && <View style={styles.rowDivider} />}
  </>
);

export default function ProfileScreen({ navigation }) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  // TODO: replace with GET /api/profile
  const user = { name: 'Justin Ludwig', initials: 'JL', isPremium: true, flavor: 'Citrus, Bitter, Smoky', units: 'ml / oz' };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.backgroundPrimary} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{user.initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          {user.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumLabel}>PREMIUM</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>PREFERENCES</Text></View>
        <View style={styles.settingsGroup}>
          <SettingsRow label="Flavor Preferences" subtitle={user.flavor} onPress={() => navigation.navigate('FlavorPreferences')} />
          <SettingsRow label="Units & Measurements" subtitle={user.units} onPress={() => navigation.navigate('Units')} />
          <SettingsRow label="Notifications" rightElement={
            <Switch value={notificationsOn} onValueChange={setNotificationsOn}
              trackColor={{ false: Colors.surfaceSecondary, true: Colors.goldPrimary }}
              thumbColor={Colors.textPrimary} ios_backgroundColor={Colors.surfaceSecondary} />
          } />
          <SettingsRow label="Privacy" onPress={() => navigation.navigate('Privacy')} />
          <SettingsRow label="Subscription & Billing" onPress={() => navigation.navigate('Subscription')} showDivider={false} />
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>ABOUT</Text></View>
        <View style={styles.settingsGroup}>
          <SettingsRow label="App Version 1.0.0" onPress={() => {}} showDivider={false} />
        </View>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <BottomNavBar activeTab="Profile" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: Colors.backgroundPrimary },
  topBar:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backArrow:            { color: Colors.goldPrimary, fontSize: 20 },
  screenTitle:          { ...DisplayText.navTitle, color: Colors.textPrimary },
  divider:              { height: 0.5, backgroundColor: Colors.goldPrimary, opacity: 0.4 },
  profileHeader:        { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.sm },
  avatarCircle:         { width: 100, height: 100, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.goldPrimary, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  avatarInitials:       { ...DisplayText.initials, color: Colors.goldPrimary },
  userName:             { ...DisplayText.headingXS, color: Colors.textPrimary, letterSpacing: 2 },
  premiumBadge:         { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.goldDark, borderWidth: 0.5, borderColor: Colors.goldPrimary },
  premiumLabel:         { ...BodyText.labelBadge, color: Colors.textPrimary, letterSpacing: 2 },
  sectionHeader:        { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  sectionHeaderText:    { ...BodyText.tiny, color: Colors.textFaint, letterSpacing: 3, textTransform: 'uppercase' },
  settingsGroup:        { backgroundColor: Colors.surfacePrimary, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: Colors.borderDefault },
  settingsRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  settingsRowLeft:      { flex: 1, gap: 2 },
  settingsRowLabel:     { ...BodyText.regular, color: Colors.textPrimary, letterSpacing: 0.5 },
  settingsRowSubtitle:  { ...BodyText.secondary, color: Colors.textSecondary },
  chevron:              { color: Colors.goldPrimary, fontSize: 18, marginLeft: Spacing.sm },
  rowDivider:           { height: 0.5, backgroundColor: Colors.borderDefault, marginLeft: Spacing.lg },
});
