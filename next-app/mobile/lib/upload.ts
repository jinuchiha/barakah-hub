import { api } from './api';
import type { PickedImage } from './camera';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  url: string;
}

export async function uploadImage(
  image: PickedImage,
  endpoint: string,
  fieldName: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append(fieldName, {
    uri: image.uri,
    type: image.mimeType,
    name: `${fieldName}.jpg`,
  } as unknown as Blob);

  const { data } = await api.post<{ url: string }>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    },
  });

  return { url: data.url };
}

export async function uploadAvatar(
  image: PickedImage,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  return uploadImage(image, '/api/members/avatar', 'avatar', onProgress);
}

export async function uploadReceipt(
  image: PickedImage,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  return uploadImage(image, '/api/payments/upload-receipt', 'receipt', onProgress);
}
