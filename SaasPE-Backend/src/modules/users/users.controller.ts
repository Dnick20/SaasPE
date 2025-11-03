import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  async getCurrentUser(@CurrentUser() user: User): Promise<Partial<User>> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      status: user.status,
      lastLogin: user.lastLogin,
      created: user.created,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (name/role only)' })
  @ApiBearerAuth()
  async updateMe(
    @CurrentUser() user: User,
    @Body()
    dto: Partial<Pick<User, 'firstName' | 'lastName' | 'role'>>,
  ): Promise<Partial<User>> {
    const updated = await this.usersService.update(user.id, {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
      ...(dto.role && { role: dto.role }),
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      tenantId: updated.tenantId,
      status: updated.status,
      lastLogin: updated.lastLogin,
      created: updated.created,
    };
  }
}
