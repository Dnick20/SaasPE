import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/support',
})
export class SupportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  constructor(
    private supportService: SupportService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract and verify JWT token
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Client connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      // Store user info in socket data
      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId;
      client.data.email = payload.email;

      this.logger.log(`Client connected: ${client.id} (${payload.email})`);
    } catch (error) {
      this.logger.warn(`Client connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      // Verify user has access to this conversation
      const conversation = await this.supportService.getConversation(
        data.conversationId,
        client.data.tenantId,
      );

      if (!conversation) {
        client.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Join the conversation room
      client.join(`conversation:${data.conversationId}`);

      this.logger.log(
        `Client ${client.id} joined conversation ${data.conversationId}`,
      );

      client.emit('joinedConversation', {
        conversationId: data.conversationId,
        conversation,
      });
    } catch (error) {
      this.logger.error('Error joining conversation:', error);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    this.logger.log(
      `Client ${client.id} left conversation ${data.conversationId}`,
    );
  }

  /**
   * Send a message
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    try {
      const result = await this.supportService.sendMessage(
        data.conversationId,
        client.data.userId,
        { content: data.content },
      );

      // Emit both user and AI messages to all clients in the room
      this.server.to(`conversation:${data.conversationId}`).emit('newMessage', {
        conversationId: data.conversationId,
        message: result.userMessage,
      });

      this.server.to(`conversation:${data.conversationId}`).emit('newMessage', {
        conversationId: data.conversationId,
        message: result.aiMessage,
      });

      // Send confirmation to sender
      client.emit('messageSent', {
        conversationId: data.conversationId,
        userMessage: result.userMessage,
        aiMessage: result.aiMessage,
      });
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast typing status to other users in the conversation
    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      conversationId: data.conversationId,
      userId: client.data.userId,
      email: client.data.email,
      isTyping: data.isTyping,
    });
  }
}
