import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const BILLS_SUBDIR = 'Bills';

/**
 * Returns the absolute base directory where TailorBook stores persistent files.
 */
export function getBaseDirectory(): string {
  return FileSystem.documentDirectory || '';
}

/**
 * Converts a relative path stored in the database (e.g., Bills/2026/11/abc.jpg)
 * to an absolute filesystem URI usable by React Native Image components.
 */
export function getAbsolutePhotoUri(relativePath: string): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('file://')) return relativePath;
  const base = getBaseDirectory();
  return `${base}${relativePath}`;
}

/**
 * Persists an image from a temporary camera/picker URI into app-specific private storage.
 * Returns the relative path to be stored in SQLite.
 */
export async function saveBillPhoto(tempUri: string): Promise<string> {
  const base = getBaseDirectory();
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  const targetDir = `${BILLS_SUBDIR}/${year}/${month}`;
  const fullTargetDir = `${base}${targetDir}`;

  const dirInfo = await FileSystem.getInfoAsync(fullTargetDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(fullTargetDir, { intermediates: true });
  }

  const fileId = Crypto.randomUUID();
  const extension = tempUri.endsWith('.png') ? 'png' : 'jpg';
  const fileName = `bill_${Date.now()}_${fileId.substring(0, 8)}.${extension}`;
  const relativePath = `${targetDir}/${fileName}`;
  const absoluteDest = `${base}${relativePath}`;

  await FileSystem.copyAsync({
    from: tempUri,
    to: absoluteDest,
  });

  return relativePath;
}

/**
 * Deletes a photo file by its relative path when a bill is deleted or transaction rolls back.
 */
export async function deleteBillPhoto(relativePath: string): Promise<void> {
  if (!relativePath) return;
  try {
    const fullPath = getAbsolutePhotoUri(relativePath);
    const info = await FileSystem.getInfoAsync(fullPath);
    if (info.exists) {
      await FileSystem.deleteAsync(fullPath, { idempotent: true });
    }
  } catch (err) {
    console.warn('Failed to delete photo file:', err);
  }
}

/**
 * Verifies if a photograph file exists locally on disk.
 */
export async function verifyPhotoExists(relativePath: string): Promise<boolean> {
  if (!relativePath) return false;
  try {
    const fullPath = getAbsolutePhotoUri(relativePath);
    const info = await FileSystem.getInfoAsync(fullPath);
    return info.exists;
  } catch {
    return false;
  }
}
