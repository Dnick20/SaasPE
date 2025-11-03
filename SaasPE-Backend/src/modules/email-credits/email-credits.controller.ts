import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { EmailCreditsService } from './email-credits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsumeEmailCreditsDto, RefillEmailCreditsDto } from './dto';

@Controller('email-credits')
@UseGuards(JwtAuthGuard)
export class EmailCreditsController {
  constructor(private readonly emailCreditsService: EmailCreditsService) {}

  /**
   * GET /api/v1/email-credits/balance
   * Get current email credits balance
   */
  @Get('balance')
  async getBalance(@Request() req) {
    return this.emailCreditsService.getBalance(req.user.tenantId);
  }

  /**
   * POST /api/v1/email-credits/check
   * Check if enough credits are available for an action
   */
  @Post('check')
  async checkCreditsAvailable(
    @Request() req,
    @Body('credits') credits: number,
  ) {
    const available = await this.emailCreditsService.checkCreditsAvailable(
      req.user.tenantId,
      credits,
    );

    return {
      available,
      creditsNeeded: credits,
    };
  }

  /**
   * POST /api/v1/email-credits/consume
   * Consume email credits for an action
   */
  @Post('consume')
  async consumeCredits(@Request() req, @Body() dto: ConsumeEmailCreditsDto) {
    return this.emailCreditsService.consumeCredits(req.user.tenantId, dto);
  }

  /**
   * POST /api/v1/email-credits/refill
   * Refill email credits (admin/system use)
   */
  @Post('refill')
  async refillCredits(@Request() req, @Body() dto: RefillEmailCreditsDto) {
    return this.emailCreditsService.refillCredits(req.user.tenantId, dto);
  }

  /**
   * GET /api/v1/email-credits/transactions
   * Get email credit transaction history
   */
  @Get('transactions')
  async getTransactions(@Request() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.emailCreditsService.getTransactions(
      req.user.tenantId,
      limitNum,
    );
  }

  /**
   * GET /api/v1/email-credits/history
   * Get email credit transaction history (alias for transactions with pagination)
   */
  @Get('history')
  async getHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skip = (pageNum - 1) * limitNum;

    const transactions = await this.emailCreditsService.getTransactions(
      req.user.tenantId,
      limitNum,
      skip,
    );

    // Count total for pagination
    const allTransactions = await this.emailCreditsService.getTransactions(
      req.user.tenantId,
      9999,
    );

    return {
      data: transactions,
      meta: {
        total: allTransactions.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(allTransactions.length / limitNum),
      },
    };
  }
}
