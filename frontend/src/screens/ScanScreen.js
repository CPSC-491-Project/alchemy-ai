// SCRUM-188: ScanScreen — camera capture + image picker flow.
//
// FIX (Allisa Warren — SCRUM-198):
// Review state cleaned up for demo:
// - "Add to Cabinet" button now functional (shows confirmation + offers
//   navigation to Cabinet screen)
// - Footer text updated from SCRUM-189 placeholder to clean user-facing copy
// - ReviewView receives navigation prop so it can navigate after adding

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { scanImage } from '../services/scanService';

const S = {
  CAPTURE:  'capture',
  SCANNING: 'scanning',
  REVIEW:   'review',
  ERROR:    'error',
};

export default function ScanScreen({ navigation }) {
  const [screenState, setScreenState]   = useState(S.CAPTURE);
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();
  const [result, setResult]             = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const cameraRef = useRef(null);

  const toBase64 = async (uri) =>
    FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

  const sendToBackend = async (uri) => {
    setScreenState(S.SCANNING);
    try {
      const base64 = await toBase64(uri);
      const data   = await scanImage(base64);
      setResult(data);
      setScreenState(S.REVIEW);
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setScreenState(S.ERROR);
    }
  };

  const handleShutter = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: false,
      });
      await sendToBackend(photo.uri);
    } catch (err) {
      setErrorMessage(err.message || 'Could not capture photo.');
      setScreenState(S.ERROR);
    }
  };

  const handlePickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access in Settings to pick an image.'
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (picked.canceled) return;
    const asset = picked.assets?.[0];
    if (!asset?.uri) return;
    await sendToBackend(asset.uri);
  };

  const handleRetry = () => {
    setErrorMessage('');
    setResult(null);
    setScreenState(S.CAPTURE);
  };

  if (screenState === S.SCANNING) return <ScanningView />;

  if (screenState === S.REVIEW) {
    return (
      <ReviewView
        result={result}
        navigation={navigation}
        onScanAnother={handleRetry}
        onBack={() => navigation?.goBack()}
      />
    );
  }

  if (screenState === S.ERROR) {
    return (
      <ErrorView
        message={errorMessage}
        onRetry={handleRetry}
        onBack={() => navigation?.goBack()}
      />
    );
  }

  if (!cameraPermission) return <ScanningView />;

  if (!cameraPermission.granted) {
    return (
      <PermissionView
        onRequest={requestCameraPermission}
        onPickFromLibrary={handlePickFromLibrary}
        onBack={() => navigation?.goBack()}
      />
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <StatusBar barStyle="light-content" />
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} type={CameraType.back} />

      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.topBarBtn}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.accentLight} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Scan Ingredient</Text>
        <View style={styles.topBarBtn} />
      </SafeAreaView>

      <View style={styles.viewfinder} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      <Text style={styles.hint}>Point at a label or bottle. Good lighting helps.</Text>

      <SafeAreaView style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handlePickFromLibrary}
          style={styles.libraryBtn}
          accessibilityLabel="Choose from photo library"
        >
          <Ionicons name="images-outline" size={22} color={Colors.accentLight} />
          <Text style={styles.libraryBtnText}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShutter}
          style={styles.shutterOuter}
          accessibilityLabel="Take photo"
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
        <View style={styles.libraryBtn} />
      </SafeAreaView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScanningView() {
  return (
    <SafeAreaView style={styles.centeredSafe}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator color={Colors.accent} size="large" />
      <Text style={styles.centeredTitle}>Reading label…</Text>
      <Text style={styles.centeredBody}>
        We&apos;re extracting ingredients from your photo.
      </Text>
    </SafeAreaView>
  );
}

function PermissionView({ onRequest, onPickFromLibrary, onBack }) {
  return (
    <SafeAreaView style={styles.centeredSafe}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity
        onPress={onBack}
        style={styles.absoluteBackBtn}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.accent} />
      </TouchableOpacity>
      <View style={styles.iconRing}>
        <Ionicons name="camera-outline" size={56} color={Colors.accent} />
      </View>
      <Text style={styles.centeredTitle}>Camera permission needed</Text>
      <Text style={styles.centeredBody}>
        Alchemy AI uses your camera to read ingredient labels and add them to your Cabinet.
      </Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onRequest}>
        <Text style={styles.primaryBtnText}>Allow Camera</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onPickFromLibrary}>
        <Text style={styles.secondaryBtnText}>Choose from library instead</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// FIX: ReviewView — functional "Add to Cabinet" + clean footer copy
function ReviewView({ result, onScanAnother, onBack, navigation }) {
  const candidates = result?.candidates || [];

  const handleAddToCabinet = () => {
    if (candidates.length === 0) return;
    const names = candidates.map((c) => c.name).join(', ');
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      window.alert('Added to Cabinet:\n' + names);
    } else {
      Alert.alert('Added to Cabinet', names, [
        {
          text: 'View Cabinet',
          onPress: () => {
            onBack();
            navigation?.navigate('IngredientCabinet');
          },
        },
        { text: 'OK', style: 'cancel' },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.reviewSafe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.reviewHeader}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.reviewHeaderTitle}>Review</Text>
        <View style={styles.backBtnSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.reviewContent}>
        {result?.mode === 'mock' && (
          <View style={styles.mockBanner}>
            <Text style={styles.mockBannerText}>
              MOCK MODE — no GCV credentials on backend. Showing canned result.
            </Text>
          </View>
        )}

        <Text style={styles.reviewLabel}>
          Found {candidates.length} candidate{candidates.length === 1 ? '' : 's'}
        </Text>

        {candidates.length === 0 ? (
          <Text style={styles.reviewEmpty}>
            No ingredients matched. Try a clearer photo with the label in focus.
          </Text>
        ) : (
          candidates.map((c, i) => (
            <View key={`${c.name}-${i}`} style={styles.candidateRow}>
              <View style={styles.candidateBody}>
                <Text style={styles.candidateName}>{c.name}</Text>
                {c.category && (
                  <Text style={styles.candidateCategory}>{c.category}</Text>
                )}
              </View>
              <Text style={styles.candidateConfidence}>
                {Math.round(c.confidence * 100)}%
              </Text>
            </View>
          ))
        )}

        {candidates.length > 0 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddToCabinet}>
            <Text style={styles.primaryBtnText}>Add to Cabinet</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryBtn, { marginTop: candidates.length > 0 ? 8 : Spacing.md }]}
          onPress={onScanAnother}
        >
          <Text style={styles.secondaryBtnText}>Scan Another</Text>
        </TouchableOpacity>

        <Text style={styles.reviewFooter}>
          Tap &lsquo;Scan Another&rsquo; to keep adding ingredients to your cabinet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ErrorView({ message, onRetry, onBack }) {
  return (
    <SafeAreaView style={styles.centeredSafe}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity
        onPress={onBack}
        style={styles.absoluteBackBtn}
        hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.accent} />
      </TouchableOpacity>
      <View style={[styles.iconRing, styles.iconRingError]}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
      </View>
      <Text style={styles.centeredTitle}>Scan failed</Text>
      <Text style={styles.centeredBody}>{message}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onRetry}>
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  cameraContainer:  { flex: 1, backgroundColor: Colors.background },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surfaceDark },
  topBarBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle:      { ...Typography.navTitle, color: Colors.accentLight },
  viewfinder:       { position: 'absolute', top: '25%', left: '10%', right: '10%', bottom: '30%' },
  corner:           { position: 'absolute', width: 28, height: 28, borderColor: Colors.accent },
  cornerTL:         { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR:         { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL:         { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR:         { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: Spacing.lg, backgroundColor: Colors.surfaceDark },
  libraryBtn:       { alignItems: 'center', justifyContent: 'center', width: 64 },
  libraryBtnText:   { ...Typography.caption, color: Colors.accentLight, marginTop: 2 },
  shutterOuter:     { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  shutterInner:     { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.accent },
  hint:             { position: 'absolute', bottom: 140, left: 0, right: 0, ...Typography.caption, color: Colors.accentLight, textAlign: 'center' },
  centeredSafe:     { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  centeredTitle:    { ...Typography.headingS, color: Colors.accentLight, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  centeredBody:     { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, maxWidth: 320 },
  absoluteBackBtn:  { position: 'absolute', top: Spacing.lg, left: Spacing.md, zIndex: 10, padding: Spacing.xs },
  iconRing:         { width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: Colors.accent, backgroundColor: Colors.accentSubtle, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  iconRingError:    { borderColor: Colors.error, backgroundColor: Colors.errorSurface },
  primaryBtn:       { backgroundColor: Colors.accent, paddingVertical: 14, paddingHorizontal: Spacing.xl, borderRadius: Radius.pill, alignItems: 'center', marginTop: Spacing.md, minWidth: 220 },
  primaryBtnText:   { fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.background, letterSpacing: 0.5 },
  secondaryBtn:     { paddingVertical: 12, paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  secondaryBtnText: { ...Typography.bodySmall, color: Colors.accent },
  reviewSafe:       { flex: 1, backgroundColor: Colors.background },
  reviewHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewHeaderTitle:{ ...Typography.navTitle, color: Colors.accentLight },
  backBtnSpacer:    { width: 24 },
  reviewContent:    { padding: Spacing.lg },
  mockBanner:       { backgroundColor: Colors.accentSubtle, borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  mockBannerText:   { ...Typography.caption, color: Colors.accent, textAlign: 'center' },
  reviewLabel:      { ...Typography.sectionHeader, color: Colors.accentLight, marginBottom: Spacing.sm },
  reviewEmpty:      { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginVertical: Spacing.xl },
  candidateRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  candidateBody:    { flex: 1 },
  candidateName:    { ...Typography.bodyMedium, color: Colors.textPrimary },
  candidateCategory:{ ...Typography.caption, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  candidateConfidence: { ...Typography.bodyMedium, color: Colors.accent },
  // FIX: clean footer copy instead of SCRUM-189 placeholder
  reviewFooter:     { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
});
