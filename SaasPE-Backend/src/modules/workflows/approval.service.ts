import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface ApprovalStep {
  step: number;
  approverId: string;
  approverName: string;
  approverEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp?: Date;
}

export interface ApprovalWorkflow {
  proposalId: string;
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'approved' | 'rejected';
  steps: ApprovalStep[];
  created: Date;
  completed?: Date;
}

/**
 * Approval Workflow Service
 *
 * Handles multi-level approval workflows for proposals:
 * - Configure approval chains (e.g., Manager → Director → VP)
 * - Track approval status through workflow
 * - Send notifications at each step
 * - Handle approvals and rejections with comments
 * - Auto-advance to next step after approval
 */
@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an approval workflow for a proposal
   */
  async createWorkflow(
    proposalId: string,
    approverIds: string[],
    tenantId: string,
  ): Promise<ApprovalWorkflow> {
    if (approverIds.length === 0) {
      throw new BadRequestException('At least one approver is required');
    }

    // Get approver details
    const approvers = await this.prisma.user.findMany({
      where: {
        id: { in: approverIds },
        tenantId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (approvers.length !== approverIds.length) {
      throw new BadRequestException('Some approvers not found');
    }

    // Create approval steps
    const steps: ApprovalStep[] = approvers.map((approver, index) => ({
      step: index + 1,
      approverId: approver.id,
      approverName: `${approver.firstName} ${approver.lastName}`,
      approverEmail: approver.email,
      status: 'pending' as const,
    }));

    // Store workflow in proposal metadata
    const workflow: ApprovalWorkflow = {
      proposalId,
      currentStep: 1,
      totalSteps: steps.length,
      status: 'pending',
      steps,
      created: new Date(),
    };

    // Update proposal with workflow data
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'draft', // Reset to draft while in approval
        // Store workflow in a JSON field (we'd need to add this to schema)
        // For now, we'll use the variables field
        variables: workflow as any,
      },
    });

    this.logger.log(
      `Created approval workflow for proposal ${proposalId} with ${steps.length} steps`,
    );

    return workflow;
  }

  /**
   * Get approval workflow for a proposal
   */
  async getWorkflow(proposalId: string): Promise<ApprovalWorkflow | null> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { variables: true },
    });

    if (!proposal || !proposal.variables) {
      return null;
    }

    // Check if variables contains workflow data
    const data = proposal.variables as any;
    if (data.proposalId && data.steps) {
      return data as ApprovalWorkflow;
    }

    return null;
  }

  /**
   * Approve a step in the workflow
   */
  async approveStep(
    proposalId: string,
    approverId: string,
    comments?: string,
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(proposalId);

    if (!workflow) {
      throw new BadRequestException(
        'No approval workflow found for this proposal',
      );
    }

    if (workflow.status !== 'pending') {
      throw new BadRequestException(`Workflow is already ${workflow.status}`);
    }

    const currentStepIndex = workflow.currentStep - 1;
    const currentStep = workflow.steps[currentStepIndex];

    if (!currentStep) {
      throw new BadRequestException('Invalid workflow state');
    }

    if (currentStep.approverId !== approverId) {
      throw new BadRequestException('You are not the current approver');
    }

    if (currentStep.status !== 'pending') {
      throw new BadRequestException(`Step already ${currentStep.status}`);
    }

    // Mark current step as approved
    currentStep.status = 'approved';
    currentStep.comments = comments;
    currentStep.timestamp = new Date();

    this.logger.log(
      `Step ${workflow.currentStep}/${workflow.totalSteps} approved for proposal ${proposalId}`,
    );

    // Check if there are more steps
    if (workflow.currentStep < workflow.totalSteps) {
      // Move to next step
      workflow.currentStep++;
      this.logger.log(
        `Moving to step ${workflow.currentStep}/${workflow.totalSteps}`,
      );
    } else {
      // Workflow complete - all approved
      workflow.status = 'approved';
      workflow.completed = new Date();

      // Update proposal status to ready
      await this.prisma.proposal.update({
        where: { id: proposalId },
        data: { status: 'ready' },
      });

      this.logger.log(`Approval workflow completed for proposal ${proposalId}`);
    }

    // Save updated workflow
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { variables: workflow as any },
    });

    return workflow;
  }

  /**
   * Reject a step in the workflow
   */
  async rejectStep(
    proposalId: string,
    approverId: string,
    reason: string,
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.getWorkflow(proposalId);

    if (!workflow) {
      throw new BadRequestException(
        'No approval workflow found for this proposal',
      );
    }

    if (workflow.status !== 'pending') {
      throw new BadRequestException(`Workflow is already ${workflow.status}`);
    }

    const currentStepIndex = workflow.currentStep - 1;
    const currentStep = workflow.steps[currentStepIndex];

    if (!currentStep) {
      throw new BadRequestException('Invalid workflow state');
    }

    if (currentStep.approverId !== approverId) {
      throw new BadRequestException('You are not the current approver');
    }

    if (currentStep.status !== 'pending') {
      throw new BadRequestException(`Step already ${currentStep.status}`);
    }

    // Mark current step as rejected
    currentStep.status = 'rejected';
    currentStep.comments = reason;
    currentStep.timestamp = new Date();

    // Mark entire workflow as rejected
    workflow.status = 'rejected';
    workflow.completed = new Date();

    // Update proposal status back to draft for revision
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'draft',
        variables: workflow as any,
      },
    });

    this.logger.log(
      `Proposal ${proposalId} rejected at step ${workflow.currentStep}`,
    );

    return workflow;
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId: string, tenantId: string) {
    // Get all proposals in the user's tenant
    const proposals = await this.prisma.proposal.findMany({
      where: {
        tenantId,
        status: 'draft', // Proposals in approval are in draft status
        variables: {
          not: Prisma.JsonNull,
        },
      },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Filter to only those where user is current approver
    const pendingApprovals: Array<{
      proposalId: string;
      proposalTitle: string;
      clientName: string;
      submittedBy: string;
      currentStep: number;
      totalSteps: number;
      created: Date;
    }> = [];

    for (const proposal of proposals) {
      if (!proposal.variables) continue;

      const data = proposal.variables as any;
      if (!data.proposalId || !data.steps) continue;

      const workflow = data as ApprovalWorkflow;

      if (workflow.status !== 'pending') continue;

      const currentStepIndex = workflow.currentStep - 1;
      const currentStep = workflow.steps[currentStepIndex];

      if (
        currentStep &&
        currentStep.approverId === userId &&
        currentStep.status === 'pending'
      ) {
        pendingApprovals.push({
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          clientName: proposal.client.companyName,
          submittedBy: `${proposal.user.firstName} ${proposal.user.lastName}`,
          currentStep: workflow.currentStep,
          totalSteps: workflow.totalSteps,
          created: workflow.created,
        });
      }
    }

    return pendingApprovals;
  }

  /**
   * Get approval history for a proposal
   */
  async getApprovalHistory(proposalId: string) {
    const workflow = await this.getWorkflow(proposalId);

    if (!workflow) {
      return [];
    }

    // Return all steps with their status
    return workflow.steps.map((step) => ({
      step: step.step,
      approver: step.approverName,
      status: step.status,
      comments: step.comments,
      timestamp: step.timestamp,
    }));
  }

  /**
   * Cancel an approval workflow
   */
  async cancelWorkflow(proposalId: string) {
    const workflow = await this.getWorkflow(proposalId);

    if (!workflow) {
      throw new BadRequestException('No approval workflow found');
    }

    if (workflow.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending workflows');
    }

    // Clear workflow by setting variables to null
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: 'draft',
        variables: Prisma.JsonNull,
      },
    });

    this.logger.log(`Approval workflow cancelled for proposal ${proposalId}`);

    return { success: true };
  }
}
