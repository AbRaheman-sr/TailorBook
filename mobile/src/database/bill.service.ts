import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Bill } from '../types';
import { deleteBillPhoto } from '../services/storage.service';

export interface CreateBillInput {
  tenant_id: string;
  bill_number: string;
  customer_phone: string;
  photo_path: string;
  created_by_device_id?: string;
}

export class DuplicateBillError extends Error {
  constructor(billNumber: string) {
    super(`Bill number "${billNumber}" already exists for this shop.`);
    this.name = 'DuplicateBillError';
  }
}

/**
 * Creates a new bill with transaction safety and duplicate prevention.
 */
export async function createBill(input: CreateBillInput): Promise<Bill> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  // Clean and preserve exact text representation
  const cleanBillNo = input.bill_number.trim();
  const cleanPhone = input.customer_phone.trim();

  if (!cleanBillNo) {
    throw new Error('Bill number cannot be empty.');
  }
  if (!cleanPhone) {
    throw new Error('Customer phone number cannot be empty.');
  }
  if (!input.photo_path) {
    throw new Error('Bill photograph is required.');
  }

  // Check for duplicate bill number for this tenant
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM bills WHERE tenant_id = ? AND bill_number = ? LIMIT 1',
    [input.tenant_id, cleanBillNo]
  );

  if (existing) {
    // Clean up newly created photo file since bill creation will not proceed
    await deleteBillPhoto(input.photo_path);
    throw new DuplicateBillError(cleanBillNo);
  }

  try {
    await db.runAsync(
      `INSERT INTO bills (
        id, tenant_id, bill_number, customer_phone, photo_path, created_at, updated_at, created_by_device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.tenant_id,
        cleanBillNo,
        cleanPhone,
        input.photo_path,
        now,
        now,
        input.created_by_device_id || null,
      ]
    );

    return {
      id,
      tenant_id: input.tenant_id,
      bill_number: cleanBillNo,
      customer_phone: cleanPhone,
      photo_path: input.photo_path,
      created_at: now,
      updated_at: now,
      created_by_device_id: input.created_by_device_id,
    };
  } catch (err) {
    // Ensure photo is deleted if SQL insert fails
    await deleteBillPhoto(input.photo_path);
    throw err;
  }
}

/**
 * Fast indexed search supporting exact and partial matches on bill number and phone number.
 */
export async function searchBills(
  tenant_id: string,
  searchQuery: string = '',
  limit: number = 50,
  offset: number = 0
): Promise<Bill[]> {
  const db = await getDatabase();
  const trimmed = searchQuery.trim();

  if (!trimmed) {
    // Return recent bills
    return db.getAllAsync<Bill>(
      `SELECT * FROM bills 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [tenant_id, limit, offset]
    );
  }

  const likePattern = `%${trimmed}%`;
  return db.getAllAsync<Bill>(
    `SELECT * FROM bills 
     WHERE tenant_id = ? 
       AND (bill_number LIKE ? OR customer_phone LIKE ?)
     ORDER BY 
       CASE WHEN bill_number = ? THEN 1
            WHEN customer_phone = ? THEN 2
            ELSE 3
       END,
       created_at DESC 
     LIMIT ? OFFSET ?`,
    [tenant_id, likePattern, likePattern, trimmed, trimmed, limit, offset]
  );
}

/**
 * Retrieves a specific bill by ID.
 */
export async function getBillById(id: string, tenant_id: string): Promise<Bill | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Bill>(
    'SELECT * FROM bills WHERE id = ? AND tenant_id = ? LIMIT 1',
    [id, tenant_id]
  );
}

/**
 * Deletes a bill and removes its associated photo from disk.
 */
export async function deleteBill(id: string, tenant_id: string): Promise<boolean> {
  const db = await getDatabase();
  const bill = await getBillById(id, tenant_id);
  if (!bill) return false;

  await db.runAsync('DELETE FROM bills WHERE id = ? AND tenant_id = ?', [id, tenant_id]);
  await deleteBillPhoto(bill.photo_path);
  return true;
}

/**
 * Returns total bills count for a given tenant.
 */
export async function getTotalBillsCount(tenant_id: string): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM bills WHERE tenant_id = ?',
    [tenant_id]
  );
  return result?.count ?? 0;
}

