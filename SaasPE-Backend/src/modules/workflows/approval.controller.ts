import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalService } from './approval.service';

/**
 * Approval Workflow Controller
 *
 * Endpoints for managing proposal approval workflows
 */
@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows/approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create approval workflow for a proposal',
    description: 'Defines approval chain with multiple approvers',
  })
  async createWorkflow(
    @Request() req,
    @Body() body: { proposalId: string; approverIds: string[] },
  ) {
    return this.approvalService.createWorkflow(
      body.proposalId,
      body.approverIds,
      req.user.tenantId,
    );
  }

  @Get('proposal/:proposalId')
  @ApiOperation({
    summary: 'Get approval workflow for a proposal',
    description: 'Returns current workflow status and all steps',
  })
  async getWorkflow(@Param('proposalId') proposalId: string) {
    return this.approvalService.getWorkflow(proposalId);
  }

  @Post('approve/:proposalId')
  @ApiOperation({
    summary: 'Approve current step in workflow',
    description:
      'Approves proposal at current approval step and advances workflow',
  })
  async approve(
    @Request() req,
    @Param('proposalId') proposalId: string,
    @Body() body: { comments?: string },
  ) {
    return this.approvalService.approveStep(
      proposalId,
      req.user.sub,
      body.comments,
    );
  }

  @Post('reject/:proposalId')
  @ApiOperation({
    summary: 'Reject current step in workflow',
    description: 'Rejects proposal and sends back to creator for revision',
  })
  async reject(
    @Request() req,
    @Param('proposalId') proposalId: string,
    @Body() body: { reason: string },
  ) {
    return this.approvalService.rejectStep(
      proposalId,
      req.user.sub,
      body.reason,
    );
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Get pending approvals for current user',
    description: 'Returns all proposals awaiting current user approval',
  })
  async getPendingApprovals(@Request() req) {
    return this.approvalService.getPendingApprovals(
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Get('history/:proposalId')
  @ApiOperation({
    summary: 'Get approval history for a proposal',
    description: 'Returns all approval steps with timestamps and comments',
  })
  async getHistory(@Param('proposalId') proposalId: string) {
    return this.approvalService.getApprovalHistory(proposalId);
  }

  @Delete('cancel/:proposalId')
  @ApiOperation({
    summary: 'Cancel approval workflow',
    description:
      'Cancels pending approval workflow and returns proposal to draft',
  })
  async cancelWorkflow(@Param('proposalId') proposalId: string) {
    return this.approvalService.cancelWorkflow(proposalId);
  }
}
