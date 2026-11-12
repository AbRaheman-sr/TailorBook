import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { DevicesService, DeviceActivationInput } from './devices.service.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('activate')
  async activate(@Body() body: DeviceActivationInput) {
    return this.devicesService.activateDevice(body);
  }

  @Post('register')
  async register(@Body() body: DeviceActivationInput) {
    return this.devicesService.activateDevice(body);
  }

  @Post('heartbeat')
  async heartbeat(@Body() body: { device_id: string }) {
    return this.devicesService.heartbeat(body.device_id);
  }

  @Get('status')
  async status(@Query('device_id') deviceId: string) {
    return this.devicesService.heartbeat(deviceId);
  }
}

