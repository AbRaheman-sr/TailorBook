import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('tenants')
  async createTenant(
    @Body()
    body: {
      name: string;
      username: string;
      password: string;
      max_devices?: number;
    }
  ) {
    return this.adminService.createTenant(body);
  }

  @Get('tenants')
  async listTenants() {
    return this.adminService.listTenants();
  }

  @Patch('tenants/:id')
  async updateTenant(
    @Param('id') id: string,
    @Body() body: { status?: string; max_devices?: number; name?: string }
  ) {
    return this.adminService.updateTenant(id, body);
  }

  @Get('tenants/:id/devices')
  async listTenantDevices(@Param('id') id: string) {
    return this.adminService.listTenantDevices(id);
  }

  @Patch('devices/:id/approve')
  async approveDevice(@Param('id') id: string) {
    return this.adminService.setDeviceStatus(id, 'active');
  }

  @Patch('devices/:id/revoke')
  async revokeDevice(@Param('id') id: string) {
    return this.adminService.setDeviceStatus(id, 'revoked');
  }

  @Get('audit-logs')
  async getAuditLogs(@Query('limit') limit?: string) {
    return this.adminService.getAuditLogs(limit ? parseInt(limit, 10) : 50);
  }
}

