import { Controller, Post, HttpCode, HttpStatus, Headers, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('seed-database')
  @Public()
  @HttpCode(HttpStatus.OK)
  async seedDatabase(
    @Headers('x-admin-secret') adminSecret: string,
  ) {
    // Simple protection - require admin secret
    const expectedSecret = process.env.ADMIN_SECRET || 'temp-seed-secret-2024';

    if (adminSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid admin secret');
    }

    return this.adminService.seedDatabase();
  }
}
