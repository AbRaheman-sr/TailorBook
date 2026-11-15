import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { DatabaseService } from '../database/database.service.js';
import { AuthService } from '../auth/auth.service.js';

export class DeviceActivationInput {
  username!: string;
  password!: string;
  device_id!: string;
  device_name?: string;
  public_key?: string;
}

@Injectable()
export class DevicesService {
  private readonly licenseSigningKey: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.licenseSigningKey =
      this.configService.get<string>('LICENSE_SIGNING_KEY') ||
      'tailorbook_server_offline_license_signing_secret_2026';
  }

  generateLicenseSignature(payload: object): string {
    return crypto
      .createHmac('sha256', this.licenseSigningKey)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async activateDevice(input: DeviceActivationInput): Promise<any> {
    const { username, password, device_id, device_name, public_key } = input;

    if (!username || !password || !device_id) {
      throw new BadRequestException('Username, password, and device_id are required.');
    }

    // 1. Authenticate shop owner
    const loginRes = await this.authService.login(username, password);
    if (!loginRes.tenantId) {
      throw new UnauthorizedException('Invalid shop credentials.');
    }

    const tenantId = loginRes.tenantId;

    // 2. Fetch tenant & device limits
    const tenantRes = await this.db.query(
      'SELECT id, name, status, max_devices FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantRes.rowCount === 0) {
      throw new UnauthorizedException('Tenant not found.');
    }

    const tenant = tenantRes.rows[0];

    if (tenant.status === 'suspended') {
      throw new ForbiddenException('Shop account is suspended.');
    }

    // 3. Check existing device registration
    const existingDevice = await this.db.query(
      'SELECT * FROM devices WHERE tenant_id = $1 AND device_identifier = $2',
      [tenantId, device_id]
    );

    let deviceRecordId: string;

    if (existingDevice.rowCount && existingDevice.rowCount > 0) {
      const dev = existingDevice.rows[0];
      if (dev.status === 'revoked') {
        // Allow re-activation if within tenant max_devices
        const activeDevices = await this.db.query(
          "SELECT COUNT(*) as count FROM devices WHERE tenant_id = $1 AND status = 'active'",
          [tenantId]
        );
        const currentActive = parseInt(activeDevices.rows[0].count, 10);
        if (currentActive >= tenant.max_devices) {
          throw new ForbiddenException(
            `Device limit reached (${currentActive}/${tenant.max_devices} active devices). Deactivate an existing phone or increase limit in admin portal.`
          );
        }
        await this.db.query(
          "UPDATE devices SET status = 'active', revoked_at = null, last_seen_at = now() WHERE id = $1",
          [dev.id]
        );
      } else {
        // Update last seen
        await this.db.query('UPDATE devices SET last_seen_at = now() WHERE id = $1', [dev.id]);
      }
      deviceRecordId = dev.id;
    } else {
      // Check device count limit
      const activeDevices = await this.db.query(
        "SELECT COUNT(*) as count FROM devices WHERE tenant_id = $1 AND status = 'active'",
        [tenantId]
      );
      const currentActive = parseInt(activeDevices.rows[0].count, 10);

      if (currentActive >= tenant.max_devices) {
        throw new ForbiddenException(
          `Device authorization limit reached (${currentActive}/${tenant.max_devices} active devices). Deactivate an existing phone or request limit increase.`
        );
      }

      // Register new device
      const insertRes = await this.db.query(
        `INSERT INTO devices (tenant_id, device_identifier, device_name, public_key, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [tenantId, device_id, device_name || 'Android Device', public_key || null]
      );
      deviceRecordId = insertRes.rows[0].id;
    }

    // 4. Issue signed offline license
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString(); // 1 year
    const offlineValidUntil = new Date(Date.now() + 90 * 86400000).toISOString(); // 90 days offline

    const licensePayload = {
      tenant_id: tenantId,
      device_id: device_id,
      license_version: 1,
      issued_at: issuedAt,
      expires_at: expiresAt,
      offline_valid_until: offlineValidUntil,
    };

    const signature = this.generateLicenseSignature(licensePayload);

    await this.db.query(
      `INSERT INTO device_licenses (tenant_id, device_id, license_version, issued_at, expires_at, offline_valid_until, signature)
       VALUES ($1, $2, 1, $3, $4, $5, $6)`,
      [tenantId, deviceRecordId, issuedAt, expiresAt, offlineValidUntil, signature]
    );

    // Audit log
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, tenant_id, action, metadata)
       VALUES ($1, $2, 'DEVICE_ACTIVATED', $3)`,
      [username, tenantId, JSON.stringify({ device_id, device_name })]
    );

    return {
      success: true,
      tenant_id: tenantId,
      tenant_name: tenant.name,
      device_id: device_id,
      license_version: 1,
      issued_at: issuedAt,
      expires_at: expiresAt,
      offline_valid_until: offlineValidUntil,
      signature,
    };
  }

  async heartbeat(deviceId: string): Promise<any> {
    const res = await this.db.query(
      "UPDATE devices SET last_seen_at = now() WHERE device_identifier = $1 AND status = 'active' RETURNING id, status",
      [deviceId]
    );
    if (res.rowCount === 0) {
      return { status: 'unknown' };
    }
    return { status: res.rows[0].status, timestamp: new Date().toISOString() };
  }

  async deactivateDevice(deviceId: string): Promise<any> {
    await this.db.query(
      "UPDATE devices SET status = 'revoked', revoked_at = now() WHERE device_identifier = $1",
      [deviceId]
    );
    return { success: true, message: 'Device deactivated and slot released.' };
  }
}
