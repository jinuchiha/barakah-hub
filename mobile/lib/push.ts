import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

export type NotificationChannel = 'payments' | 'cases' | 'messages' | 'admin';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const channels: Array<{ id: NotificationChannel; name: string; color: string }> = [
    { id: 'payments', name: 'Payments', color: '#00e676' },
    { id: 'cases', name: 'Emergency Cases', color: '#ffd740' },
    { id: 'messages', name: 'Messages', color: '#448aff' },
    { id: 'admin', name: 'Admin Alerts', color: '#ff5252' },
  ];

  for (const ch of channels) {
    await Notifications.setNotificationChannelAsync(ch.id, {
      name: ch.name,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: ch.color,
      sound: 'default',
    });
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const granted = await requestPushPermission();
    if (!granted) return null;

    await setupAndroidChannels();

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function registerPushToken(token: string): Promise<void> {
  await api.post('/api/push-tokens', {
    token,
    platform: Platform.OS,
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await api.delete('/api/push-tokens', { data: { token } });
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
