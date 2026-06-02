import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
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

type PermissionState = 'unknown' | 'prompting' | 'granted' | 'denied';

function calcQiblaBearing(lat: number, lon: number): number {
  const latR = (lat * Math.PI) / 180;
  const lonDiff = ((KAABA_LON - lon) * Math.PI) / 180;
  const kaabaR = (KAABA_LAT * Math.PI) / 180;
  const y = Math.sin(lonDiff) * Math.cos(kaabaR);
  const x = Math.cos(latR) * Math.sin(kaabaR) - Math.sin(latR) * Math.cos(kaabaR) * Math.cos(lonDiff);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

interface Loc { latitude: number; longitude: number }

async function getLocation(): Promise<Loc | null> {
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
  try {
    const pos = (await Location.getLastKnownPositionAsync({ maxAge: 60_000 }))
      ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    if (!pos) return null;
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Live Qibla compass.
 *
 *  1. Computes the static bearing from current location to the Kaaba.
 *  2. Subscribes to the device heading (magnetometer + sensor fusion via
 *     expo-location's watchHeadingAsync) so the needle rotates as the
 *     phone is rotated. Final needle angle = qiblaBearing - heading.
 *
 * Permission UX:
 *  - Loads with state="unknown" and immediately probes the granted
 *    status without prompting.
 *  - If not yet granted, shows a "Use my location" button that triggers
 *    the system prompt on tap (user-initiated → far better acceptance
 *    rate than auto-prompting on dashboard).
 *  - If denied, shows a "Try again" button that re-prompts (Android
 *    re-shows the dialog; iOS instructs the user to enable in Settings).
 */
export function QiblaCompass() {
  const { colors } = useTheme();
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [location, setLocation] = useState<Loc | null>(null);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);

  const rotation = useSharedValue(0);
  const mounted = useRef(true);
  const headingSub = useRef<Location.LocationSubscription | null>(null);

  /** Probe permission status without prompting. Sets state accordingly. */
  const probePermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermission('granted'); // web prompts on geolocation call itself
      return 'granted' as const;
    }
    const perm = await Location.getForegroundPermissionsAsync();
    const next: PermissionState = perm.status === 'granted'
      ? 'granted'
      : perm.canAskAgain ? 'unknown' : 'denied';
    setPermission(next);
    return next;
  }, []);

  /** Ask for permission (user-initiated). Sets state to granted/denied. */
  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermission('granted');
      return 'granted' as const;
    }
    setPermission('prompting');
    const perm = await Location.requestForegroundPermissionsAsync();
    const next: PermissionState = perm.status === 'granted' ? 'granted' : 'denied';
    setPermission(next);
    return next;
  }, []);

  /** Once granted, fetch position + start heading watch. */
  const startTracking = useCallback(async () => {
    const loc = await getLocation();
    if (!mounted.current || !loc) return;
    setLocation(loc);
    const bearing = calcQiblaBearing(loc.latitude, loc.longitude);
    setQiblaBearing(bearing);

    if (Platform.OS !== 'web') {
      try {
        headingSub.current = await Location.watchHeadingAsync((h) => {
          if (!mounted.current) return;
          // trueHeading is the compass-corrected angle (magneticHeading
          // doesn't account for declination). Fall back to magneticHeading
          // when trueHeading is -1 (unavailable indoors / no GPS lock).
          const live = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setHeading(live);
          setHeadingAccuracy(h.accuracy ?? null);
        });
      } catch {
        // Heading unavailable — needle stays at static qibla bearing.
      }
    }
  }, []);

  /** Tap handler — wires everything up. */
  const enable = useCallback(async () => {
    const state = await requestPermission();
    if (state === 'granted') startTracking();
  }, [requestPermission, startTracking]);

  // Bootstrap: probe permission, auto-start if granted, else wait for tap.
  useEffect(() => {
    let active = true;
    probePermission().then((p) => {
      if (active && p === 'granted') startTracking();
    });
    return () => {
      active = false;
      mounted.current = false;
      headingSub.current?.remove();
    };
  }, [probePermission, startTracking]);

  // Compute needle rotation = qiblaBearing - heading. When heading is
  // null (no magnetometer / not yet sampled), needle points at the
  // static bearing from north — still useful with a paper-compass.
  useEffect(() => {
    if (qiblaBearing === null) return;
    const live = heading ?? 0;
    const target = (qiblaBearing - live + 360) % 360;
    // Take the short way around the circle to avoid 359°->1° spin.
    let delta = target - rotation.value;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    rotation.value = withTiming(rotation.value + delta, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [qiblaBearing, heading, rotation]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const angle = qiblaBearing !== null ? Math.round(qiblaBearing) : null;
  const isPointingNow = location && heading !== null && qiblaBearing !== null
    && Math.abs(((qiblaBearing - heading + 540) % 360) - 180) < 6;

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
        <View style={[styles.compassRing, { borderColor: isPointingNow ? colors.primary : colors.border2 }]}>
          {permission === 'granted' && qiblaBearing !== null ? (
            <Animated.View style={[styles.needle, needleStyle]}>
              <MaterialCommunityIcons name="navigation" size={36} color={isPointingNow ? colors.primary : colors.gold} />
            </Animated.View>
          ) : permission === 'prompting' ? (
            <MaterialCommunityIcons name="loading" size={24} color={colors.text4} />
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

      {permission !== 'granted' ? (
        <Pressable
          onPress={enable}
          style={[styles.cta, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.primary} />
          <Text style={[styles.ctaText, { color: colors.primary }]}>
            {permission === 'denied' ? 'Try again — Allow location' : 'Use my location'}
          </Text>
        </Pressable>
      ) : heading === null && Platform.OS !== 'web' ? (
        <Text style={[styles.note, { color: colors.text4 }]}>
          Move the phone in a figure-8 to calibrate the compass
        </Text>
      ) : headingAccuracy !== null && headingAccuracy >= 3 ? (
        <Text style={[styles.note, { color: colors.text4 }]}>
          Low compass accuracy — move away from metal & magnets
        </Text>
      ) : isPointingNow ? (
        <Text style={[styles.note, { color: colors.primary }]}>Facing Qibla — صحیح سمت</Text>
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
  note: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: spacing.sm, textAlign: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  ctaText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
