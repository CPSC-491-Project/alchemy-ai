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
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { scanImage, addConfirmedIngredients } from '../services/scanService';
import EventBus from '../utils/EventBus';
import { useMixer } from '../contexts/MixerContext';

const S = {
  CAPTURE:  'capture',
  SCANNING: 'scanning',
  REVIEW: 'review',
  WRITING: 'writing',  // SCRUM-189: writing confirmed candidates to Cabinet
  DONE: 'done',        // SCRUM-189: summary state after cabinet write
  ERROR: 'error',
};

// SCRUM-189: candidates with confidence at or above this threshold are
// pre-checked in the Review state. Below this they appear unchecked so the
// user has to opt in. 0.7 chosen as a comfortable middle ground given the
// matcher's typical confidence distribution.
const PRE_CHECK_THRESHOLD = 0.7;

export default function ScanScreen({ navigation }) {
  const [screenState, setScreenState]   = useState(S.CAPTURE);
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();
  const [result, setResult]             = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [doneSummary, setDoneSummary] = useState(null); // SCRUM-189: { added, failed }
  const cameraRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  // SCRUM-198: expo-file-system's readAsStringAsync is native-only and throws
  // on web ("method or property ... is not available on web"). On web we go
  // through the standard fetch + FileReader path; the returned base64 string
  // matches the native shape (no "data:image/...;base64," prefix) so the
  // backend /api/scan endpoint sees the same payload regardless of platform.
  const toBase64 = async (uri) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // result is "data:<mime>;base64,<payload>" — strip the prefix
          const result = reader.result || '';
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
    }

    // Native (iOS/Android): expo-camera and expo-image-picker both support
    // base64: true inline, but FileSystem.readAsStringAsync is more
    // memory-predictable on iOS for larger captures.
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

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
    setDoneSummary(null);
    setScreenState(S.CAPTURE);
  };

  // SCRUM-189: write the user-confirmed candidates to the Cabinet, then
  // transition to the DONE summary state. Per-candidate failures are
  // collected into doneSummary.failed and shown to the user; a complete
  // failure (e.g. the network drops mid-batch) routes to the ERROR state.
  const handleAddToCabinet = async (selectedCandidates) => {
    if (!selectedCandidates || selectedCandidates.length === 0) {
      // Edge case: user unchecked everything. Treat like "Discard".
      handleRetry();
      return;
    }
    setScreenState(S.WRITING);
    try {
      const summary = await addConfirmedIngredients(selectedCandidates);
      setDoneSummary(summary);
      setScreenState(S.DONE);
      EventBus.emit('INGREDIENTS_UPDATED', { source: 'scan' });
    } catch (err) {
      // addConfirmedIngredients shouldn't throw at the outer level (per-item
      // failures are caught internally), but if something else blows up
      // (e.g. auth token expired between scan and write), land in ERROR.
      setErrorMessage(err.message || 'Could not save to your Cabinet.');
      setScreenState(S.ERROR);
    }
  };

  const handleGoToCabinet = () => {
    // Reset state in case the user comes back to ScanScreen later.
    setResult(null);
    setDoneSummary(null);
    setScreenState(S.CAPTURE);
    navigation?.navigate('IngredientCabinet');
  };

  // ── Render by state ──────────────────────────────────────────────────────
  if (screenState === S.SCANNING) return <ScanningView />;

  if (screenState === S.WRITING) return <WritingView />;

  if (screenState === S.REVIEW) {
    return (
      <ReviewView
        result={result}
        navigation={navigation}
        onScanAnother={handleRetry}
        onAddToCabinet={handleAddToCabinet}
        onDiscard={handleRetry}
        onBack={() => navigation?.goBack()}
      />
    );
  }

  if (screenState === S.DONE) {
    return (
      <DoneView
        summary={doneSummary}
        onScanAnother={handleRetry}
        onGoToCabinet={handleGoToCabinet}
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

function ReviewView({ result, onAddToCabinet, onDiscard, onBack }) {
  // SCRUM-189: real review UI with per-candidate checkboxes.
  // High-confidence candidates are pre-selected; the user can toggle any.
  // The set of *selected* candidates is what gets written to the Cabinet.
  const candidates = result?.candidates || [];

  // SCRUM-198: pull mixer actions from shared context so "Add to Mixer"
  // here on Review puts items into the same Mixer Space rendered on Create.
  // SCRUM-202: also read isFull so we can disable the button at cap.
  const { addToMixer, isFull: isMixerFull, max: mixerMax } = useMixer();

  // Initialize selection: candidates at or above PRE_CHECK_THRESHOLD start
  // checked. Keyed by index because canonical name is unique within results
  // (the matcher dedupes) but we use index for safety.
  const [selected, setSelected] = useState(() =>
    candidates.map((c) => c.confidence >= PRE_CHECK_THRESHOLD)
  );

  const toggle = (i) => {
    setSelected((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const selectedCount = selected.filter(Boolean).length;
  const selectedCandidates = candidates.filter((_, i) => selected[i]);

  // SCRUM-198: send all currently-selected candidates into the Mixer Space.
  // Local-only — does not hit /api/cabinet (use "Add to Cabinet" for that).
  const handleAddSelectedToMixer = () => {
    selectedCandidates.forEach((c) => {
      addToMixer({ name: c.name, category: c.category || null });
    });
    onDiscard(); // Reset back to capture state, like the Cabinet flow does post-write
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
        <Text style={styles.reviewSubLabel}>
          Tap to confirm which to add to your Cabinet.
        </Text>

        {candidates.length === 0 ? (
          <Text style={styles.reviewEmpty}>
            No ingredients matched. Try a clearer photo with the label in focus.
          </Text>
        ) : (
          candidates.map((c, i) => (
            <TouchableOpacity
              key={`${c.name}-${i}`}
              style={[
                styles.candidateRow,
                selected[i] && styles.candidateRowSelected,
              ]}
              onPress={() => toggle(i)}
              activeOpacity={0.85}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected[i] }}
              accessibilityLabel={`${c.name}, ${Math.round(c.confidence * 100)} percent confidence`}
            >
              <View
                style={[
                  styles.checkbox,
                  selected[i] && styles.checkboxChecked,
                ]}
              >
                {selected[i] && (
                  <Ionicons name="checkmark" size={16} color={Colors.background} />
                )}
              </View>
              <View style={styles.candidateBody}>
                <Text style={styles.candidateName}>{c.name}</Text>
                {c.category && (
                  <Text style={styles.candidateCategory}>{c.category}</Text>
                )}
              </View>
              <Text style={styles.candidateConfidence}>
                {Math.round(c.confidence * 100)}%
              </Text>
            </TouchableOpacity>
          ))
        )}

        {candidates.length > 0 && (
          <>
            {/* SCRUM-198: action row — Add to Mixer (left) + Add to Cabinet (right)
                SCRUM-202: button also disabled when Mixer Space is full (8/8). */}
            <View style={styles.reviewActionRow}>
              <TouchableOpacity
                style={[
                  styles.mixerActionBtn,
                  (selectedCount === 0 || isMixerFull) &&
                    styles.mixerActionBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={selectedCount === 0 || isMixerFull}
                onPress={handleAddSelectedToMixer}
                accessibilityLabel={
                  isMixerFull
                    ? `Mixer Space is full (${mixerMax} maximum). Remove items first.`
                    : `Add ${selectedCount} ingredients to Mixer Space`
                }
                accessibilityState={{ disabled: selectedCount === 0 || isMixerFull }}
              >
                <Text style={styles.mixerActionBtnText}>
                  {isMixerFull
                    ? 'Mixer Full'
                    : `Add ${selectedCount > 0 ? `${selectedCount} ` : ''}to Mixer`}
                </Text>
              </TouchableOpacity>

              {/* Add to Cabinet — primary gold-gradient CTA */}
              <TouchableOpacity
                style={[
                  styles.gradientBtn,
                  styles.gradientBtnRowFlex,
                  selectedCount === 0 && styles.gradientBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={selectedCount === 0}
                onPress={() => onAddToCabinet(selectedCandidates)}
                accessibilityLabel={`Add ${selectedCount} ingredients to Cabinet`}
              >
                <LinearGradient
                  colors={[Colors.goldGradientStart, Colors.goldGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientBtnInner}
                >
                  <Text style={styles.gradientBtnText}>
                    Add {selectedCount > 0 ? `${selectedCount} ` : ''}to Cabinet
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.secondaryBtn} onPress={onDiscard}>
              <Text style={styles.secondaryBtnText}>Discard & scan again</Text>
            </TouchableOpacity>
          </>
        )}

        {candidates.length === 0 && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onDiscard}>
            <Text style={styles.primaryBtnText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// SCRUM-189: shown while addConfirmedIngredients is awaiting per-item POSTs.
function WritingView() {
  return (
    <SafeAreaView style={styles.centeredSafe}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator color={Colors.accent} size="large" />
      <Text style={styles.centeredTitle}>Saving to your Cabinet…</Text>
      <Text style={styles.centeredBody}>
        We&apos;re adding the ingredients you confirmed.
      </Text>
    </SafeAreaView>
  );
}

// SCRUM-189: summary of the cabinet write — added count, failed count,
// per-failure reason, and two outbound CTAs.
function DoneView({ summary, onScanAnother, onGoToCabinet }) {
  const added = summary?.added || [];
  const failed = summary?.failed || [];
  const allSucceeded = failed.length === 0 && added.length > 0;
  const allFailed = added.length === 0 && failed.length > 0;

  return (
    <SafeAreaView style={styles.doneSafe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.doneContent}>
        <View
          style={[
            styles.iconRing,
            allFailed && styles.iconRingError,
          ]}
        >
          <Ionicons
            name={allFailed ? 'alert-circle-outline' : 'checkmark'}
            size={56}
            color={allFailed ? Colors.error : Colors.accent}
          />
        </View>

        <Text style={styles.centeredTitle}>
          {allSucceeded
            ? 'Added to your Cabinet'
            : allFailed
            ? 'Nothing was added'
            : `${added.length} added, ${failed.length} failed`}
        </Text>

        {added.length > 0 && (
          <Text style={styles.centeredBody}>
            {added.map((a) => a.name).join(', ')}
          </Text>
        )}

        {failed.length > 0 && (
          <View style={styles.failuresBlock}>
            <Text style={styles.failuresHeader}>Could not add:</Text>
            {failed.map((f, i) => (
              <Text key={`${f.name}-${i}`} style={styles.failuresItem}>
                • {f.name} — {f.error}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.gradientBtn}
          activeOpacity={0.85}
          onPress={onGoToCabinet}
          accessibilityLabel="Go to your Cabinet"
        >
          <LinearGradient
            colors={[Colors.goldGradientStart, Colors.goldGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBtnInner}
          >
            <Text style={styles.gradientBtnText}>Go to Cabinet</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onScanAnother}>
          <Text style={styles.secondaryBtnText}>Scan another</Text>
        </TouchableOpacity>
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
  // Camera state
  cameraContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceDark,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    ...Typography.navTitle,
    color: Colors.accentLight,
  },
  viewfinder: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    bottom: '30%',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surfaceDark,
  },
  libraryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  libraryBtnText: {
    ...Typography.caption,
    color: Colors.accentLight,
    marginTop: 2,
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent,
  },
  hint: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    ...Typography.caption,
    color: Colors.accentLight,
    textAlign: 'center',
  },

  // Centered states (scanning, permission, error)
  centeredSafe: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centeredTitle: {
    ...Typography.headingS,
    color: Colors.accentLight,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  centeredBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    maxWidth: 320,
  },
  absoluteBackBtn: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
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
  iconRingError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorSurface,
  },

  primaryBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    alignItems: 'center',
    marginTop: Spacing.md,
    minWidth: 220,
  },
  primaryBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  secondaryBtnText: {
    ...Typography.bodySmall,
    color: Colors.accent,
  },

  // Review state
  reviewSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewHeaderTitle: {
    ...Typography.navTitle,
    color: Colors.accentLight,
  },
  backBtnSpacer: {
    width: 24,
  },
  reviewContent: {
    padding: Spacing.lg,
  },
  mockBanner: {
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mockBannerText: {
    ...Typography.caption,
    color: Colors.accent,
    textAlign: 'center',
  },
  reviewLabel: {
    ...Typography.sectionHeader,
    color: Colors.accentLight,
    marginBottom: Spacing.sm,
  },
  reviewSubLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  reviewEmpty: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surface, // same as bg = invisible until selected
  },
  candidateRowSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSubtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
  },
  candidateBody: {
    flex: 1,
  },
  candidateName: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  candidateCategory: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  candidateConfidence: {
    ...Typography.bodyMedium,
    color: Colors.accent,
  },

  // SCRUM-189: gold-gradient primary CTA (Add to Cabinet, Go to Cabinet)
  gradientBtn: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  gradientBtnInner: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnDisabled: {
    opacity: 0.4,
  },
  gradientBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.background,
    letterSpacing: 0.5,
  },

  // SCRUM-198: Review action row — Add to Mixer (left) + Add to Cabinet (right)
  reviewActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  // Override gradientBtn marginTop when used inside reviewActionRow
  gradientBtnRowFlex: {
    flex: 1.5,
    marginTop: 0,
  },
  mixerActionBtn: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixerActionBtnDisabled: {
    opacity: 0.4,
  },
  mixerActionBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 0.3,
  },

  // SCRUM-189: Done state
  doneSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  doneContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  failuresBlock: {
    width: '100%',
    backgroundColor: Colors.errorSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  failuresHeader: {
    ...Typography.bodyMedium,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  failuresItem: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
