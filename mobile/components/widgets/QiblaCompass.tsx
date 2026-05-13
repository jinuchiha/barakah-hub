import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '@/lib/useTheme';
import { spacing, radius } from '@/lib/theme';

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

function calcQiblaAngle(lat: number, lon: number): number {
  const latR = (lat * Math.PI) / 180;
  const lonDiff = ((KAABA_LON - lon) * Math.PI) / 180;
  const kaabaR = (KAABA_LAT * Math.PI) / 180;
  const y = Math.sin(lonDiff) * Math.cos(kaabaR);
  const x = Math.cos(latR) * Math.sin(kaabaR) - Math.sin(latR) * Math.cos(kaabaR) * Math.cos(lonDiff);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

interface Loc { latitude: number; longitude: number }

async function requestLocation(): Promise<Loc | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 8000 },
        );
      });
    }
    return null;
  }

  // Native (Android/iOS) — expo-location with explicit permission prompt.
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getLastKnownPositionAsync({ maxAge: 60_000 })
      ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (!pos) return null;
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

export function QiblaCompass() {
  const { colors } = useTheme();
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const rotation = useSharedValue(0);
  const mounted = useRef(true);

  useEffect(() => {
    requestLocation().then((loc) => {
      if (!mounted.current) return;
      if (loc) {
        const angle = calcQiblaAngle(loc.latitude, loc.longitude);
        setQiblaAngle(angle);
        rotation.value = withTiming(angle, { duration: 1200, easing: Easing.out(Easing.cubic) });
      }
      setLoading(false);
    });
    return () => { mounted.current = false; };
  }, [rotation]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const angle = qiblaAngle !== null ? Math.round(qiblaAngle) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.glass2, borderColor: colors.border1 }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="compass-rose" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text1 }]}>Qibla Direction</Text>
        {angle !== null ? (
          <Text style={[styles.degrees, { color: colors.text3 }]}>{angle}°</Text>
        ) : null}
      </View>

      <View style={styles.compassWrap}>
        <View style={[styles.compassRing, { borderColor: colors.border2 }]}>
          {loading ? (
            <MaterialCommunityIcons name="loading" size={24} color={colors.text4} />
          ) : angle !== null ? (
            <Animated.View style={[styles.needle, needleStyle]}>
              <MaterialCommunityIcons name="navigation" size={36} color={colors.primary} />
            </Animated.View>
          ) : (
            <MaterialCommunityIcons name="map-marker-question" size={28} color={colors.text3} />
          )}
        </View>
        {['N', 'E', 'S', 'W'].map((dir, i) => (
          <Text
            key={dir}
            style={[
              styles.compassLabel,
              { color: dir === 'N' ? colors.danger : colors.text4 },
              i === 0 && styles.north,
              i === 1 && styles.east,
              i === 2 && styles.south,
              i === 3 && styles.west,
            ]}
          >
            {dir}
          </Text>
        ))}
      </View>

      {!loading && angle === null ? (
        <Text style={[styles.note, { color: colors.text4 }]}>Location unavailable</Text>
      ) : null}
    </View>
  );
}

const RING = 100;

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.xxl,
    borderWidth: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
    marginBottom: spacing.md,
  },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  degrees: { fontSize: 12, fontFamily: 'SpaceMono_400Regular' },
  compassWrap: {
    width: RING + 40,
    height: RING + 40,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: { alignItems: 'center', justifyContent: 'center' },
  compassLabel: {
    position: 'absolute',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  north: { top: 0, alignSelf: 'center' },
  south: { bottom: 0, alignSelf: 'center' },
  east: { right: 0, top: '45%' },
  west: { left: 0, top: '45%' },
  note: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: spacing.sm },
});
