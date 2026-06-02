import * as Haptics from 'expo-haptics';

/** Semantic haptic patterns — distinct feedback for each action type */
export const haptic = {
  // Success: light tap + brief pause + light tap (confirmation)
  success: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 80);
  },

  // Error: heavy + medium (shake feel)
  error: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Warning: medium single
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  // Button tap: light
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Selection change (tab switch, filter): selection
  select: () => Haptics.selectionAsync(),

  // Confirm (payment submit, approve): medium + light
  confirm: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
  },

  // Delete/destructive: heavy
  destructive: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Navigation: minimal
  navigate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};
