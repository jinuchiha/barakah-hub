import React, { memo, useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/lib/useTheme';
import { pickImageWithChoice } from '@/lib/camera';
import { uploadAvatar } from '@/lib/upload';
import { radius } from '@/lib/theme';

interface AvatarUploadProps {
  name: string;
  color?: string;
  currentUrl?: string | null;
  onUploadComplete?: (url: string) => void;
}

export const AvatarUpload = memo(function AvatarUpload({
  name,
  color,
  currentUrl,
  onUploadComplete,
}: AvatarUploadProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const scale = useSharedValue(1);
  const isMounted = useRef(true);

  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    let image: Awaited<ReturnType<typeof pickImageWithChoice>>;
    try {
      image = await pickImageWithChoice();
    } catch {
      Alert.alert('Permission denied', 'Please enable camera/gallery access in Settings.');
      return;
    }
    if (!image) return;

    setLocalUri(image.uri);
    setUploading(true);
    scale.value = withSpring(0.95);

    try {
      const result = await uploadAvatar(image);
      if (isMounted.current) onUploadComplete?.(result.url);
    } catch {
      if (isMounted.current) {
        setLocalUri(null);
        Alert.alert('Upload Failed', 'Could not upload avatar. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setUploading(false);
        scale.value = withSpring(1);
      }
    }
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity onPress={handlePress} disabled={uploading} activeOpacity={0.8}>
        <Avatar
          name={name}
          color={color}
          imageUrl={localUri ?? currentUrl ?? undefined}
          size="xxl"
        />
        <View style={[styles.editBadge, { backgroundColor: colors.bg2, borderColor: colors.border2 }]}>
          <MaterialCommunityIcons
            name={uploading ? 'loading' : 'camera'}
            size={14}
            color={colors.primary}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
