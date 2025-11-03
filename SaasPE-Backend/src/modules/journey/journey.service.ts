import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { UpdateJourneyDto, JourneyResponseDto } from './dto';

// Define the journey steps in order
const JOURNEY_STEPS = [
  'discovery',
  'client',
  'proposal',
  'mailboxes',
  'warmup',
  'campaign',
  'complete',
];

@Injectable()
export class JourneyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate journey progress (0-100%)
   */
  calculateProgress(completedSteps: string[]): number {
    if (completedSteps.length === 0) return 0;
    if (completedSteps.includes('complete')) return 100;

    // Calculate percentage based on completed steps vs total steps
    const totalSteps = JOURNEY_STEPS.length - 1; // Exclude 'complete' from count
    const completed = completedSteps.filter(
      (step) => JOURNEY_STEPS.includes(step) && step !== 'complete',
    ).length;

    return Math.round((completed / totalSteps) * 100);
  }

  /**
   * Transform journey to response DTO
   */
  private toResponseDto(journey: any): JourneyResponseDto {
    return {
      ...journey,
      progress: this.calculateProgress(journey.completedSteps),
    };
  }

  /**
   * Get or create journey for user
   */
  async getOrCreateJourney(userId: string): Promise<JourneyResponseDto> {
    let journey = await this.prisma.userJourney.findUnique({
      where: { userId },
    });

    if (!journey) {
      journey = await this.prisma.userJourney.create({
        data: {
          userId,
          currentStep: 'discovery',
          completedSteps: [],
          skippedSteps: [],
          metadata: {},
        },
      });
    }

    return this.toResponseDto(journey);
  }

  /**
   * Get journey status with progress
   */
  async getJourneyStatus(userId: string): Promise<JourneyResponseDto> {
    return this.getOrCreateJourney(userId);
  }

  /**
   * Update journey state
   */
  async updateJourney(
    userId: string,
    dto: UpdateJourneyDto,
  ): Promise<JourneyResponseDto> {
    const journey = await this.getOrCreateJourney(userId);

    const updated = await this.prisma.userJourney.update({
      where: { userId },
      data: {
        currentStep: dto.currentStep,
        completedSteps: dto.completedSteps,
        metadata: (dto.metadata || {}) as any,
        lastActiveAt: new Date(),
        // Mark as completed if currentStep is 'complete'
        completedAt:
          dto.currentStep === 'complete' ? new Date() : journey.completedAt,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Update current step
   */
  async updateCurrentStep(
    userId: string,
    step: string,
  ): Promise<JourneyResponseDto> {
    const journey = await this.getOrCreateJourney(userId);

    const updated = await this.prisma.userJourney.update({
      where: { userId },
      data: {
        currentStep: step,
        lastActiveAt: new Date(),
        completedAt: step === 'complete' ? new Date() : journey.completedAt,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Complete a step and update metadata
   */
  async completeStep(
    userId: string,
    step: string,
    metadata?: Record<string, any>,
  ): Promise<JourneyResponseDto> {
    return this.markStepComplete(userId, step, metadata);
  }

  /**
   * Mark step as complete
   */
  async markStepComplete(
    userId: string,
    step: string,
    metadata?: Record<string, any>,
  ): Promise<JourneyResponseDto> {
    const journey = await this.getOrCreateJourney(userId);

    const completedSteps = Array.from(
      new Set([...journey.completedSteps, step]),
    );
    const currentMetadata = journey.metadata || {};
    const updatedMetadata = metadata
      ? { ...currentMetadata, ...metadata }
      : currentMetadata;

    const updated = await this.prisma.userJourney.update({
      where: { userId },
      data: {
        completedSteps,
        metadata: updatedMetadata as any,
        lastActiveAt: new Date(),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Skip step
   */
  async skipStep(userId: string, step: string): Promise<JourneyResponseDto> {
    const journey = await this.getOrCreateJourney(userId);

    const skippedSteps = Array.from(
      new Set([...(journey.skippedSteps || []), step]),
    );
    const completedSteps = Array.from(
      new Set([...(journey.completedSteps || []), step]),
    );

    const updated = await this.prisma.userJourney.update({
      where: { userId },
      data: {
        skippedSteps,
        completedSteps,
        lastActiveAt: new Date(),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Skip onboarding entirely
   */
  async skipOnboarding(userId: string): Promise<JourneyResponseDto> {
    const allSteps = [...JOURNEY_STEPS];

    const updated = await this.prisma.userJourney.update({
      where: { userId },
      data: {
        currentStep: 'complete',
        completedSteps: allSteps,
        skippedSteps: allSteps.filter((s) => s !== 'complete'),
        completedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Reset journey
   */
  async resetJourney(userId: string): Promise<JourneyResponseDto> {
    const updated = await this.prisma.userJourney.update({
      where: { userId },
      data: {
        currentStep: 'discovery',
        completedSteps: [],
        skippedSteps: [],
        metadata: {},
        completedAt: null,
        lastActiveAt: new Date(),
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get journey metadata
   */
  async getJourneyMetadata(userId: string) {
    const journey = await this.getOrCreateJourney(userId);
    return journey.metadata;
  }

  /**
   * Update journey metadata
   */
  async updateMetadata(userId: string, metadata: Record<string, any>) {
    const journey = await this.getOrCreateJourney(userId);
    const currentMetadata = journey.metadata || {};

    return this.prisma.userJourney.update({
      where: { userId },
      data: {
        metadata: { ...currentMetadata, ...metadata } as any,
        lastActiveAt: new Date(),
      },
    });
  }
}
