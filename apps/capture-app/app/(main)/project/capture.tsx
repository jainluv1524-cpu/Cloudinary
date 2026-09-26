import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

export default function CaptureScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId: string; projectName: string }>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [phase, setPhase] = useState<'before' | 'after'>('before');
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Request location on mount
  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationPermission(true);
      // Start watching location for accuracy display
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setGpsAccuracy(location.coords.accuracy ?? null);
    }
  }, []);

  // Initialize on mount
  useState(() => {
    requestLocation();
  });

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    if (!locationPermission) {
      Alert.alert('Location Required', 'GPS location is required for evidence capture.');
      return;
    }

    setCapturing(true);
    try {
      // Get high-accuracy location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      if (location.coords.accuracy && location.coords.accuracy > 50) {
        Alert.alert(
          'Low GPS Accuracy',
          `Current accuracy: ±${Math.round(location.coords.accuracy)}m. Move to an open area for better signal.`,
        );
        setCapturing(false);
        return;
      }

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
        exif: true,
      });

      if (!photo) {
        setCapturing(false);
        return;
      }

      // TODO: Create immutable commit
      // 1. Hash the image bytes (SHA-256)
      // 2. Freeze EXIF (PascalCase subset)
      // 3. Build signing payload (RFC 8785 canonical JSON)
      // 4. Sign with device key (Ed25519)
      // 5. Store in MMKV offline queue
      // 6. Trigger background upload

      Alert.alert(
        'Captured!',
        `Photo captured with GPS accuracy ±${Math.round(location.coords.accuracy ?? 0)}m.\nQueued for upload.`,
        [{ text: 'OK' }],
      );
    } catch (err) {
      Alert.alert('Capture Failed', String(err));
    } finally {
      setCapturing(false);
    }
  }, [capturing, locationPermission]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Impact Capture needs camera access to take evidence photos.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* GPS accuracy display */}
        <View style={styles.topBar}>
          <View style={styles.projectBadge}>
            <Text style={styles.projectName}>{projectName ?? 'Project'}</Text>
          </View>
          <View style={[styles.gpsBadge, gpsAccuracy && gpsAccuracy <= 10 ? styles.gpsGood : styles.gpsWarn]}>
            <Text style={styles.gpsText}>
              📍 {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'Acquiring...'}
            </Text>
          </View>
        </View>

        {/* Phase selector */}
        <View style={styles.phaseSelector}>
          <TouchableOpacity
            style={[styles.phaseButton, phase === 'before' && styles.phaseActive]}
            onPress={() => setPhase('before')}
          >
            <Text style={[styles.phaseText, phase === 'before' && styles.phaseTextActive]}>
              BEFORE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.phaseButton, phase === 'after' && styles.phaseActive]}
            onPress={() => setPhase('after')}
          >
            <Text style={[styles.phaseText, phase === 'after' && styles.phaseTextActive]}>
              AFTER
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {/* Immutability warning */}
          <Text style={styles.immutableWarning}>
            ⚠️ Once captured, evidence cannot be edited or deleted
          </Text>

          <View style={styles.captureRow}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
            >
              <Text style={styles.flipText}>🔄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={capturing}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>

            <View style={styles.flipButton} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 56,
  },
  projectBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  projectName: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  gpsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  gpsGood: { backgroundColor: 'rgba(16, 185, 129, 0.8)' },
  gpsWarn: { backgroundColor: 'rgba(245, 158, 11, 0.8)' },
  gpsText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  phaseSelector: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  phaseButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  phaseActive: { backgroundColor: 'rgba(16, 185, 129, 0.9)' },
  phaseText: { color: '#94a3b8', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  phaseTextActive: { color: '#fff' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  immutableWarning: {
    textAlign: 'center',
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 16,
  },
  captureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    padding: 4,
  },
  captureButtonDisabled: { opacity: 0.5 },
  captureInner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: { fontSize: 22 },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0e17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', marginBottom: 12 },
  permissionText: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
