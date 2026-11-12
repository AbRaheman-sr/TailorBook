import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'tailorbook_secure_jwt_secret_pilot_key_2026';
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  generateToken(payload: object): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 30 })
    ).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');
      if (signature !== expectedSig) return null;

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  async login(username: string, plainPassword: string): Promise<any> {
    if (!username || !plainPassword) {
      throw new BadRequestException('Username and password are required.');
    }

    const cleanUser = username.trim().toLowerCase();

    // Check hardcoded/environment administrator
    const adminUser = this.configService.get<string>('ADMIN_USERNAME') || 'admin';
    const adminPass = this.configService.get<string>('ADMIN_PASSWORD') || 'TailorBook@Admin2026';

    if (cleanUser === adminUser && plainPassword === adminPass) {
      const token = this.generateToken({ role: 'admin', username: adminUser });
      return {
        role: 'admin',
        token,
        username: adminUser,
      };
    }

    // Check tenant users
    const userRes = await this.db.query(
      `SELECT u.id, u.tenant_id, u.username, u.password_hash, u.role, u.status as user_status,
              t.name as tenant_name, t.status as tenant_status
       FROM tenant_users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE LOWER(u.username) = $1
       LIMIT 1`,
      [cleanUser]
    );

    if (userRes.rowCount === 0) {
      throw new UnauthorizedException('Invalid shop username or password.');
    }

    const user = userRes.rows[0];

    if (user.tenant_status === 'suspended') {
      throw new UnauthorizedException('This shop account has been suspended by administration.');
    }

    const match = await this.verifyPassword(user.password_hash, plainPassword);
    if (!match) {
      throw new UnauthorizedException('Invalid shop username or password.');
    }

    const token = this.generateToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      username: user.username,
    });

    return {
      role: user.role,
      token,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      username: user.username,
    };
  }
}

