import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import {
  AuthService,
  RegisterResponse,
  LoginResponse,
  AuthTokens,
} from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Helper method to set httpOnly cookies for tokens
   */
  private setTokenCookies(res: Response, tokens: AuthTokens, userId: string) {
    // For local/Docker deployments without HTTPS, allow non-secure cookies
    // Only use secure cookies if ENABLE_SECURE_COOKIES env var is explicitly set
    const useSecureCookies = process.env.ENABLE_SECURE_COOKIES === 'true';

    // Use .saasope.com domain for production to work across subdomains (app.saasope.com and api.saasope.com)
    // Don't set domain for localhost/local development
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    // For cross-origin requests (app.saasope.com → api.saasope.com), we need sameSite: 'none'
    // For same-origin, 'lax' is fine
    const sameSiteValue = useSecureCookies ? 'none' : 'lax';

    // Set access token cookie (httpOnly, secure in production)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: sameSiteValue,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
      domain: cookieDomain,
    });

    // Set refresh token cookie (httpOnly, secure in production)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: sameSiteValue,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: cookieDomain,
    });

    // Set userId in a readable cookie for client-side access (needed for refresh)
    res.cookie('userId', userId, {
      httpOnly: false, // Readable by JavaScript
      secure: useSecureCookies,
      sameSite: sameSiteValue,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: cookieDomain,
    });
  }

  /**
   * Helper method to clear auth cookies
   */
  private clearTokenCookies(res: Response) {
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    res.clearCookie('accessToken', { path: '/', domain: cookieDomain });
    res.clearCookie('refreshToken', { path: '/', domain: cookieDomain });
    res.clearCookie('userId', { path: '/', domain: cookieDomain });
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new agency with admin user' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    schema: {
      example: {
        tenant: {
          id: 'uuid',
          name: 'Acme Marketing Agency',
          plan: 'starter',
          status: 'trial',
        },
        user: {
          id: 'uuid',
          email: 'admin@acme.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'admin',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'uuid-refresh-token',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RegisterResponse> {
    const result = await this.authService.register(registerDto);

    // Set httpOnly cookies for web clients
    this.setTokenCookies(res, result.tokens, result.user.id as string);

    return result;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: 'uuid',
          email: 'admin@acme.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'admin',
          tenantId: 'uuid',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'uuid-refresh-token',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(loginDto);

    // Set httpOnly cookies for web clients
    this.setTokenCookies(res, result.tokens, result.user.id as string);

    return result;
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth() {
    // This route triggers Google OAuth redirect
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google login successful' })
  async googleAuthCallback(@Req() req: any): Promise<LoginResponse> {
    return this.authService.googleLogin({
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      googleId: req.user.googleId,
    });
  }

  @Get('microsoft')
  @Public()
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Initiate Microsoft OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Microsoft OAuth' })
  async microsoftAuth() {
    // This route triggers Microsoft OAuth redirect
  }

  @Get('microsoft/callback')
  @Public()
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  @ApiResponse({ status: 200, description: 'Microsoft login successful' })
  async microsoftAuthCallback(@Req() req: any): Promise<LoginResponse> {
    return this.authService.microsoftLogin({
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      microsoftId: req.user.microsoftId,
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          example: 'uuid-refresh-token',
          description: 'Optional - will use cookie if not provided',
        },
        userId: {
          type: 'string',
          example: 'uuid',
          description: 'Optional - will use cookie if not provided',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'new-uuid-refresh-token',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() body: { refreshToken?: string; userId?: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    // Use cookies if body parameters not provided
    const refreshToken = body.refreshToken || req.cookies?.refreshToken;
    const userId = body.userId || req.cookies?.userId;

    if (!refreshToken || !userId) {
      throw new UnauthorizedException('Refresh token and userId required');
    }

    const tokens = await this.authService.refreshTokensForUser(
      userId,
      refreshToken,
    );

    // Update cookies with new tokens
    this.setTokenCookies(res, tokens, userId);

    return tokens;
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);

    // Clear auth cookies
    this.clearTokenCookies(res);

    return { message: 'Logout successful' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Current user details',
    schema: {
      example: {
        id: 'uuid',
        email: 'admin@acme.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin',
        tenantId: 'uuid',
        status: 'active',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: User) {
    if (!user) {
      throw new UnauthorizedException('User not found in token');
    }

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
}
