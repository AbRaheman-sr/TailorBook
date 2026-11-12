export interface Bill {
  id: string;
  tenant_id: string;
  bill_number: string;
  customer_phone: string;
  photo_path: string; // Relative path inside app storage, e.g. Bills/2026/11/abc.jpg
  created_at: string;
  updated_at: string;
  created_by_device_id?: string;
}

export interface BillSearchResult {
  bills: Bill[];
  total: number;
}

export interface ShopLicense {
  tenant_id: string;
  tenant_name: string;
  device_id: string;
  device_name: string;
  license_version: number;
  issued_at: string;
  expires_at: string;
  offline_valid_until: string;
  signature: string;
  public_key?: string;
}

export interface BackupMetadata {
  version: number;
  app_version: string;
  tenant_id: string;
  tenant_name: string;
  created_at: string;
  total_bills: number;
  total_photos: number;
}

