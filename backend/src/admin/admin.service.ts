import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  async createTenant(data: {
    name: string;
    username: string;
    password: string;
    max_devices?: number;
  }) {
    const { name, username, password, max_devices = 1 } = data;
    if (!name || !username || !password) {
      throw new BadRequestException('Shop name, username, and password are required.');
    }

    const cleanUser = username.trim().toLowerCase();

    // Check duplicate username
    const existing = await this.db.query(
      'SELECT id FROM tenant_users WHERE LOWER(username) = $1',
      [cleanUser]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new BadRequestException(`Username "${username}" is already taken.`);
    }

    const passwordHash = await this.authService.hashPassword(password.trim());

    // Transaction to create tenant and initial shop user
    const tenantRes = await this.db.query(
      `INSERT INTO tenants (name, status, max_devices)
       VALUES ($1, 'active', $2)
       RETURNING id, name, status, max_devices, created_at`,
      [name.trim(), max_devices]
    );

    const tenant = tenantRes.rows[0];

    await this.db.query(
      `INSERT INTO tenant_users (tenant_id, username, password_hash, role, status)
       VALUES ($1, $2, $3, 'shop_owner', 'active')`,
      [tenant.id, cleanUser, passwordHash]
    );

    await this.db.query(
      `INSERT INTO audit_logs (actor_id, tenant_id, action, metadata)
       VALUES ('admin', $1, 'TENANT_CREATED', $2)`,
      [tenant.id, JSON.stringify({ name, username: cleanUser, max_devices })]
    );

    return {
      success: true,
      tenant,
      username: cleanUser,
    };
  }

  async listTenants() {
    const res = await this.db.query(`
      SELECT t.id, t.name, t.status, t.max_devices, t.created_at,
             COUNT(d.id) FILTER (WHERE d.status = 'active') as active_devices,
             COUNT(d.id) as total_devices,
             u.username
      FROM tenants t
      LEFT JOIN devices d ON t.id = d.tenant_id
      LEFT JOIN tenant_users u ON t.id = u.tenant_id
      GROUP BY t.id, t.name, t.status, t.max_devices, t.created_at, u.username
      ORDER BY t.created_at DESC
    `);
    return res.rows;
  }

  async updateTenant(
    id: string,
    updates: { status?: string; max_devices?: number; name?: string }
  ) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.max_devices !== undefined) {
      fields.push(`max_devices = $${idx++}`);
      values.push(updates.max_devices);
    }
    if (updates.name) {
      fields.push(`name = $${idx++}`);
      values.push(updates.name);
    }

    if (fields.length === 0) return { success: true };

    values.push(id);
    const res = await this.db.query(
      `UPDATE tenants SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`,
      values
    );

    if (res.rowCount === 0) {
      throw new NotFoundException('Shop tenant not found.');
    }

    return res.rows[0];
  }

  async listTenantDevices(tenantId: string) {
    const res = await this.db.query(
      `SELECT id, device_identifier, device_name, status, activated_at, last_seen_at, revoked_at
       FROM devices
       WHERE tenant_id = $1
       ORDER BY activated_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async setDeviceStatus(deviceId: string, status: 'active' | 'revoked') {
    if (status === 'active') {
      const devRes = await this.db.query('SELECT tenant_id FROM devices WHERE id = $1', [deviceId]);
      if (devRes.rowCount && devRes.rowCount > 0) {
        const tenantId = devRes.rows[0].tenant_id;
        const tenantRes = await this.db.query('SELECT max_devices FROM tenants WHERE id = $1', [tenantId]);
        const maxDevices = tenantRes.rows[0]?.max_devices || 1;
        const countRes = await this.db.query(
          "SELECT COUNT(*) as count FROM devices WHERE tenant_id = $1 AND status = 'active'",
          [tenantId]
        );
        const currentActive = parseInt(countRes.rows[0].count, 10);
        if (currentActive >= maxDevices) {
          throw new BadRequestException(
            `Cannot approve device: shop device limit reached (${currentActive}/${maxDevices} active devices). Please increase device limit first.`
          );
        }
      }
    }

    const revokedAt = status === 'revoked' ? 'now()' : 'NULL';
    const res = await this.db.query(
      `UPDATE devices 
       SET status = $1, revoked_at = ${revokedAt} 
       WHERE id = $2 
       RETURNING *`,
      [status, deviceId]
    );

    if (res.rowCount === 0) {
      throw new NotFoundException('Device not found.');
    }

    const device = res.rows[0];
    await this.db.query(
      `INSERT INTO audit_logs (actor_id, tenant_id, action, metadata)
       VALUES ('admin', $1, $2, $3)`,
      [device.tenant_id, `DEVICE_${status.toUpperCase()}`, JSON.stringify({ deviceId })]
    );

    return device;
  }

  async getAuditLogs(limit: number = 50) {
    const res = await this.db.query(
      `SELECT a.*, t.name as tenant_name
       FROM audit_logs a
       LEFT JOIN tenants t ON a.tenant_id = t.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
}

