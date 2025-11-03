import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import {
  ChangeSubscriptionDto,
  SubscriptionChangeResponseDto,
} from './dto/subscription.dto';
import {
  PurchaseTokensDto,
  PurchaseTokensResponseDto,
} from './dto/purchase-tokens.dto';

@ApiTags('Tokens')
@Controller('tokens')
@ApiBearerAuth()
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  /**
   * GET /api/v1/tokens/balance
   * Get current token balance and usage info
   */
  @Get('balance')
  @ApiOperation({ summary: 'Get current token balance' })
  @ApiResponse({ status: 200, description: 'Token balance information' })
  async getBalance(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.tokensService.getBalance(tenantId);
  }

  /**
   * GET /api/v1/tokens/transactions
   * Get token transaction history
   */
  @Get('transactions')
  @ApiOperation({ summary: 'Get token transaction history' })
  @ApiResponse({ status: 200, description: 'Token transaction history' })
  async getTransactions(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('type') type?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.tokensService.getTransactionHistory(tenantId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      type,
    });
  }

  /**
   * GET /api/v1/tokens/analytics
   * Get token usage analytics
   */
  @Get('analytics')
  @ApiOperation({ summary: 'Get token usage analytics' })
  @ApiResponse({ status: 200, description: 'Token usage analytics' })
  async getAnalytics(
    @Request() req,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    const tenantId = req.user.tenantId;
    return this.tokensService.getUsageAnalytics(tenantId, period);
  }

  /**
   * GET /api/v1/tokens/pricing
   * Get token pricing catalog
   */
  @Get('pricing')
  @ApiOperation({ summary: 'Get token pricing catalog' })
  @ApiResponse({ status: 200, description: 'Token pricing catalog' })
  async getPricing(@Query('category') category?: string) {
    return this.tokensService.getPricingCatalog(category);
  }

  /**
   * POST /api/v1/tokens/check
   * Check if sufficient tokens for action
   */
  @Post('check')
  @ApiOperation({ summary: 'Check if sufficient tokens available for action' })
  @ApiResponse({
    status: 200,
    description: 'Boolean indicating if action is allowed',
  })
  async checkAction(@Request() req, @Body() body: { actionType: string }) {
    const tenantId = req.user.tenantId;
    const canPerform = await this.tokensService.canPerformAction(
      tenantId,
      body.actionType,
    );
    const cost = await this.tokensService.getActionCost(body.actionType);
    const balance = await this.tokensService.getBalance(tenantId);

    return {
      canPerform,
      actionType: body.actionType,
      cost,
      currentBalance: balance.tokenBalance,
    };
  }

  /**
   * GET /api/v1/tokens/action-cost/:actionType
   * Get token cost for specific action
   */
  @Get('action-cost/:actionType')
  @ApiOperation({ summary: 'Get token cost for action type' })
  @ApiResponse({ status: 200, description: 'Token cost for action' })
  async getActionCost(@Param('actionType') actionType: string) {
    return {
      actionType,
      cost: await this.tokensService.getActionCost(actionType),
    };
  }

  /**
   * POST /api/v1/tokens/change-plan
   * Change subscription plan (upgrade/downgrade)
   */
  @Post('change-plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Subscription plan changed successfully',
    type: SubscriptionChangeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid plan or already subscribed to requested plan',
  })
  async changeSubscriptionPlan(
    @Request() req,
    @Body() dto: ChangeSubscriptionDto,
  ): Promise<SubscriptionChangeResponseDto> {
    const tenantId = req.user.tenantId;
    return this.tokensService.changeSubscriptionPlan(tenantId, dto.newPlan);
  }

  /**
   * POST /api/v1/tokens/purchase
   * Purchase additional tokens
   */
  @Post('purchase')
  @ApiOperation({ summary: 'Purchase additional tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens purchased successfully',
    type: PurchaseTokensResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid token amount' })
  async purchaseTokens(
    @Request() req,
    @Body() dto: PurchaseTokensDto,
  ): Promise<PurchaseTokensResponseDto> {
    const tenantId = req.user.tenantId;
    return this.tokensService.purchaseTokens(
      tenantId,
      dto.tokenAmount,
      dto.paymentInfo,
    );
  }
}
