import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  EmailCreditsBalanceDto,
  ConsumeEmailCreditsDto,
  RefillEmailCreditsDto,
} from './dto';

@Injectable()
export class EmailCreditsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get email credits balance for a tenant
   */
  async getBalance(tenantId: string): Promise<EmailCreditsBalanceDto> {
    const emailCredits = await this.prisma.tenantEmailCredits.findUnique({
      where: { tenantId },
    });

    if (!emailCredits) {
      throw new NotFoundException('Email credits not found for this tenant');
    }

    const creditsRemaining =
      emailCredits.monthlyAllocation - emailCredits.creditsUsed;
    const usagePercentage =
      (emailCredits.creditsUsed / emailCredits.monthlyAllocation) * 100;

    return {
      monthlyAllocation: emailCredits.monthlyAllocation,
      creditsUsed: emailCredits.creditsUsed,
      creditsRemaining: creditsRemaining,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      overageCreditsUsed: emailCredits.overageCreditsUsed,
      overageRate: emailCredits.overageRate,
      currentPeriodEnd: emailCredits.currentPeriodEnd,
    };
  }

  /**
   * Check if tenant has enough email credits available
   */
  async checkCreditsAvailable(
    tenantId: string,
    creditsNeeded: number,
  ): Promise<boolean> {
    const emailCredits = await this.prisma.tenantEmailCredits.findUnique({
      where: { tenantId },
    });

    if (!emailCredits) {
      return false;
    }

    const creditsRemaining =
      emailCredits.monthlyAllocation - emailCredits.creditsUsed;
    return creditsRemaining >= creditsNeeded;
  }

  /**
   * Consume email credits for an action (campaign send, bulk email, etc.)
   */
  async consumeCredits(
    tenantId: string,
    dto: ConsumeEmailCreditsDto,
  ): Promise<{ success: true; newBalance: EmailCreditsBalanceDto }> {
    const emailCredits = await this.prisma.tenantEmailCredits.findUnique({
      where: { tenantId },
    });

    if (!emailCredits) {
      throw new NotFoundException('Email credits not found for this tenant');
    }

    const creditsRemaining =
      emailCredits.monthlyAllocation - emailCredits.creditsUsed;

    // Check if action will use monthly credits or overage credits
    let monthlyCreditsToUse = 0;
    let overageCreditsToUse = 0;

    if (creditsRemaining >= dto.credits) {
      // Use monthly credits
      monthlyCreditsToUse = dto.credits;
    } else {
      // Use remaining monthly credits + overage
      monthlyCreditsToUse = creditsRemaining;
      overageCreditsToUse = dto.credits - creditsRemaining;
    }

    // Update email credits
    const updated = await this.prisma.tenantEmailCredits.update({
      where: { tenantId },
      data: {
        creditsUsed: {
          increment: monthlyCreditsToUse,
        },
        overageCreditsUsed: {
          increment: overageCreditsToUse,
        },
      },
    });

    // Log transaction
    await this.prisma.emailCreditTransaction.create({
      data: {
        tenantId: tenantId,
        creditsId: emailCredits.id,
        credits: -dto.credits,
        type: 'debit',
        balanceBefore:
          emailCredits.monthlyAllocation - emailCredits.creditsUsed,
        balanceAfter: emailCredits.monthlyAllocation - updated.creditsUsed,
        actionType: dto.actionType,
        description: `Consumed ${dto.credits} credits for ${dto.actionType}`,
        metadata: dto.metadata || {},
      },
    });

    // Return new balance
    const newBalance = await this.getBalance(tenantId);
    return { success: true, newBalance };
  }

  /**
   * Refill email credits (monthly reset, bonus, or purchase)
   */
  async refillCredits(
    tenantId: string,
    dto: RefillEmailCreditsDto,
  ): Promise<{ success: true; newBalance: EmailCreditsBalanceDto }> {
    const emailCredits = await this.prisma.tenantEmailCredits.findUnique({
      where: { tenantId },
    });

    if (!emailCredits) {
      throw new NotFoundException('Email credits not found for this tenant');
    }

    let updateData: any = {};

    if (dto.type === 'refill') {
      // Monthly reset - reset both monthly and overage
      updateData = {
        creditsUsed: 0,
        overageCreditsUsed: 0,
        monthlyAllocation: dto.credits,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      };
    } else if (dto.type === 'allocation') {
      // Increase monthly allocation (plan upgrade)
      updateData = {
        monthlyAllocation: dto.credits,
      };
    } else if (dto.type === 'bonus') {
      // Add bonus credits by reducing usage
      const newUsed = Math.max(0, emailCredits.creditsUsed - dto.credits);
      updateData = {
        creditsUsed: newUsed,
      };
    }

    const updated = await this.prisma.tenantEmailCredits.update({
      where: { tenantId },
      data: updateData,
    });

    // Log transaction
    await this.prisma.emailCreditTransaction.create({
      data: {
        tenantId: tenantId,
        creditsId: emailCredits.id,
        credits: dto.credits,
        type: 'credit',
        balanceBefore:
          emailCredits.monthlyAllocation - emailCredits.creditsUsed,
        balanceAfter: updated.monthlyAllocation - updated.creditsUsed,
        actionType: dto.type,
        description: dto.description,
        metadata: {},
      },
    });

    const newBalance = await this.getBalance(tenantId);
    return { success: true, newBalance };
  }

  /**
   * Initialize email credits for a new tenant
   */
  async initializeCredits(
    tenantId: string,
    monthlyAllocation: number,
  ): Promise<void> {
    const exists = await this.prisma.tenantEmailCredits.findUnique({
      where: { tenantId },
    });

    if (exists) {
      throw new BadRequestException(
        'Email credits already initialized for this tenant',
      );
    }

    await this.prisma.tenantEmailCredits.create({
      data: {
        tenantId,
        monthlyAllocation,
        creditsUsed: 0,
        overageCreditsUsed: 0,
        overageRate: 0.001, // $0.001 per overage credit
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      },
    });
  }

  /**
   * Get email credit transactions history
   */
  async getTransactions(
    tenantId: string,
    limit: number = 50,
    skip: number = 0,
  ) {
    const emailCredits = await this.prisma.tenantEmailCredits.findUnique({
      where: { tenantId },
    });

    if (!emailCredits) {
      throw new NotFoundException('Email credits not found for this tenant');
    }

    return this.prisma.emailCreditTransaction.findMany({
      where: {
        creditsId: emailCredits.id,
      },
      orderBy: {
        created: 'desc',
      },
      take: limit,
      skip,
    });
  }
}
