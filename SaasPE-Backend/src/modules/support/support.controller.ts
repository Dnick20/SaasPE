import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto, SendMessageDto } from './dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * POST /api/v1/support/conversations
   * Create a new support conversation
   */
  @Post('conversations')
  createConversation(@Request() req, @Body() dto: CreateConversationDto) {
    return this.supportService.createConversation(
      req.user.tenantId,
      req.user.id,
      dto,
    );
  }

  /**
   * GET /api/v1/support/conversations
   * Get all conversations for the tenant
   */
  @Get('conversations')
  getConversations(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supportService.getConversations(req.user.tenantId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * GET /api/v1/support/conversations/:id
   * Get a specific conversation with messages
   */
  @Get('conversations/:id')
  getConversation(@Request() req, @Param('id') id: string) {
    return this.supportService.getConversation(id, req.user.tenantId);
  }

  /**
   * POST /api/v1/support/conversations/:id/messages
   * Send a message in a conversation
   */
  @Post('conversations/:id/messages')
  sendMessage(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.supportService.sendMessage(conversationId, req.user.id, dto);
  }

  /**
   * POST /api/v1/support/conversations/:id/resolve
   * Mark a conversation as resolved
   */
  @Post('conversations/:id/resolve')
  resolveConversation(@Request() req, @Param('id') id: string) {
    return this.supportService.resolveConversation(id, req.user.tenantId);
  }

  /**
   * POST /api/v1/support/conversations/:id/reopen
   * Reopen a resolved conversation
   */
  @Post('conversations/:id/reopen')
  reopenConversation(@Request() req, @Param('id') id: string) {
    return this.supportService.reopenConversation(id, req.user.tenantId);
  }
}
