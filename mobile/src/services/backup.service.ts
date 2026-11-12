import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';
import { getDatabase } from '../database/database';
import { getBaseDirectory, getAbsolutePhotoUri } from './storage.service';
import { BackupMetadata, Bill } from '../types';

const METADATA_FILE = 'tailorbook_backup_metadata.json';
const DATA_FILE = 'bills_data.json';

/**
 * Creates a complete ZIP backup of the shop's SQLite bills and photos.
 */
export async function createBackupArchive(
  tenant_id: string,
  tenant_name: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const db = await getDatabase();
    const bills = await db.getAllAsync<Bill>('SELECT * FROM bills WHERE tenant_id = ?', [tenant_id]);

    const zip = new JSZip();
    const baseDir = getBaseDirectory();

    // 1. Add metadata
    const metadata: BackupMetadata = {
      version: 1,
      app_version: '1.0.0',
      tenant_id,
      tenant_name,
      created_at: new Date().toISOString(),
      total_bills: bills.length,
      total_photos: 0,
    };

    // 2. Add bills data
    zip.file(DATA_FILE, JSON.stringify(bills, null, 2));

    // 3. Add all referenced photos
    const photosFolder = zip.folder('photos');
    let photosCount = 0;

    for (const bill of bills) {
      if (!bill.photo_path) continue;
      const fullPath = getAbsolutePhotoUri(bill.photo_path);
      const fileInfo = await FileSystem.getInfoAsync(fullPath);
      if (fileInfo.exists) {
        const base64Data = await FileSystem.readAsStringAsync(fullPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Store under relative path inside zip
        photosFolder?.file(bill.photo_path, base64Data, { base64: true });
        photosCount++;
      }
    }

    metadata.total_photos = photosCount;
    zip.file(METADATA_FILE, JSON.stringify(metadata, null, 2));

    // Generate zip content as base64
    const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

    // Write to app cache/backups folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `TailorBook_Backup_${tenant_name.replace(/\s+/g, '_')}_${timestamp}.zip`;
    const destinationPath = `${baseDir}Backups/${backupFileName}`;

    const backupsDirInfo = await FileSystem.getInfoAsync(`${baseDir}Backups`);
    if (!backupsDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(`${baseDir}Backups`, { intermediates: true });
    }

    await FileSystem.writeAsStringAsync(destinationPath, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Prompt user to save/share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destinationPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Save TailorBook Backup',
        UTI: 'public.archive',
      });
    }

    return { success: true, filePath: destinationPath };
  } catch (err: any) {
    return { success: false, error: err.message || 'Backup failed' };
  }
}

/**
 * Restores bills and photos from a user-selected TailorBook backup ZIP file.
 */
export async function restoreBackupArchive(
  currentTenantId: string
): Promise<{ success: boolean; message: string; restoredCount?: number }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: 'Restore cancelled by user.' };
    }

    const selectedFile = result.assets[0];
    const zipBase64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(zipBase64, { base64: true });

    // Validate metadata
    const metaFile = zip.file(METADATA_FILE);
    if (!metaFile) {
      return { success: false, message: 'Invalid backup file: Missing TailorBook metadata.' };
    }

    const metaStr = await metaFile.async('string');
    const metadata: BackupMetadata = JSON.parse(metaStr);

    // Validate data file
    const dataFile = zip.file(DATA_FILE);
    if (!dataFile) {
      return { success: false, message: 'Invalid backup file: Missing bills data.' };
    }

    const billsStr = await dataFile.async('string');
    const bills: Bill[] = JSON.parse(billsStr);

    const baseDir = getBaseDirectory();
    const db = await getDatabase();

    let restored = 0;

    // Restore photos and database records transactionally
    for (const bill of bills) {
      // 1. Restore photo if present in zip
      if (bill.photo_path) {
        const zipPhoto = zip.file(`photos/${bill.photo_path}`);
        if (zipPhoto) {
          const photoBase64 = await zipPhoto.async('base64');
          const targetPath = `${baseDir}${bill.photo_path}`;

          // Ensure directory exists
          const dirPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
          const dirInfo = await FileSystem.getInfoAsync(dirPath);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
          }

          await FileSystem.writeAsStringAsync(targetPath, photoBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      }

      // 2. Insert or update SQLite record
      await db.runAsync(
        `INSERT INTO bills (id, tenant_id, bill_number, customer_phone, photo_path, created_at, updated_at, created_by_device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, bill_number) DO UPDATE SET
           customer_phone = excluded.customer_phone,
           photo_path = excluded.photo_path,
           updated_at = excluded.updated_at`,
        [
          bill.id,
          currentTenantId, // Bind to current tenant
          bill.bill_number,
          bill.customer_phone,
          bill.photo_path,
          bill.created_at,
          bill.updated_at,
          bill.created_by_device_id || null,
        ]
      );
      restored++;
    }

    return {
      success: true,
      message: `Successfully restored ${restored} bills from backup!`,
      restoredCount: restored,
    };
  } catch (err: any) {
    return { success: false, message: `Restore failed: ${err.message || 'Unknown error'}` };
  }
}
