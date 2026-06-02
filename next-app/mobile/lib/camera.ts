import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface PickedImage {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  mimeType: string;
}

async function resizeImage(uri: string, maxDim = 1024): Promise<PickedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDim } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: false },
  );
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
  };
}

async function resizeAvatar(uri: string): Promise<PickedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: false },
  );
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg',
  };
}

/** Wraps a picker so any native/permission rejection resolves to null
 *  rather than an unhandled rejection — every caller already handles null. */
async function safePick(fn: () => Promise<PickedImage | null>): Promise<PickedImage | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function pickImageFromGallery(): Promise<PickedImage | null> {
  return safePick(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return null;
    return resizeImage(result.assets[0].uri);
  });
}

export function captureImageWithCamera(): Promise<PickedImage | null> {
  return safePick(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return null;
    return resizeImage(result.assets[0].uri);
  });
}

/**
 * Ask the user whether to take a new photo or pick from the gallery, then
 * run the chosen picker. Resolves null if they cancel. Used for payment
 * slips and avatars so both flows offer camera + gallery.
 */
export function pickImageWithChoice(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add Photo',
      'Take a new photo or choose one from your gallery.',
      [
        { text: 'Take Photo', onPress: () => captureImageWithCamera().then(resolve) },
        { text: 'Choose from Gallery', onPress: () => pickImageFromGallery().then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export function pickAndResizeAvatar(): Promise<PickedImage | null> {
  return safePick(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return null;
    return resizeAvatar(result.assets[0].uri);
  });
}
