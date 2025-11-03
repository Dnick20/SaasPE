import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  Body,
  Logger,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { EmailTrackingService } from './email-tracking.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Email tracking controller
 * Handles open/click tracking pixels and AWS SES webhook notifications
 */
@ApiTags('email-tracking')
@Controller('track')
@Public() // These endpoints must be public for tracking to work
export class EmailTrackingController {
  private readonly logger = new Logger(EmailTrackingController.name);

  constructor(private readonly trackingService: EmailTrackingService) {}

  /**
   * Track email open
   * Returns a 1x1 transparent pixel
   */
  @Get('open/:trackingId')
  @ApiOperation({ summary: 'Track email open with 1x1 pixel' })
  @ApiResponse({ status: 200, description: 'Returns tracking pixel' })
  async trackOpen(
    @Param('trackingId') trackingId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Email open tracked: ${trackingId}`);

    // Record the open asynchronously (don't wait)
    this.trackingService.recordOpen(trackingId).catch((error) => {
      this.logger.error(`Failed to record open for ${trackingId}:`, error);
    });

    // Return 1x1 transparent GIF immediately
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Expires: '0',
    });
    res.end(pixel);
  }

  /**
   * Track email click
   * Redirects to the original URL after recording
   */
  @Get('click/:trackingId')
  @ApiOperation({ summary: 'Track email click and redirect' })
  @ApiResponse({ status: 302, description: 'Redirects to target URL' })
  async trackClick(
    @Param('trackingId') trackingId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Email click tracked: ${trackingId} → ${url}`);

    // Record the click asynchronously
    this.trackingService.recordClick(trackingId, url).catch((error) => {
      this.logger.error(`Failed to record click for ${trackingId}:`, error);
    });

    // Redirect to the original URL
    const decodedUrl = decodeURIComponent(url);
    res.redirect(302, decodedUrl);
  }

  /**
   * Handle AWS SES bounce notifications via SNS
   * https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html
   */
  @Post('ses/bounce')
  @ApiOperation({ summary: 'Handle SES bounce notifications' })
  @ApiResponse({ status: 200, description: 'Bounce processed' })
  async handleBounce(
    @Body() notification: any,
    @Headers('x-amz-sns-message-type') messageType: string,
  ): Promise<{ status: string }> {
    this.logger.log('Received SES bounce notification');

    // Handle SNS subscription confirmation
    if (messageType === 'SubscriptionConfirmation') {
      await this.trackingService.confirmSnsSubscription(
        notification.SubscribeURL,
      );
      return { status: 'subscription_confirmed' };
    }

    // Handle notification
    if (messageType === 'Notification') {
      const message = JSON.parse(notification.Message);

      if (message.notificationType === 'Bounce') {
        await this.trackingService.handleBounce(message);
      }
    }

    return { status: 'ok' };
  }

  /**
   * Handle AWS SES complaint notifications via SNS
   */
  @Post('ses/complaint')
  @ApiOperation({ summary: 'Handle SES complaint notifications' })
  @ApiResponse({ status: 200, description: 'Complaint processed' })
  async handleComplaint(
    @Body() notification: any,
    @Headers('x-amz-sns-message-type') messageType: string,
  ): Promise<{ status: string }> {
    this.logger.log('Received SES complaint notification');

    // Handle SNS subscription confirmation
    if (messageType === 'SubscriptionConfirmation') {
      await this.trackingService.confirmSnsSubscription(
        notification.SubscribeURL,
      );
      return { status: 'subscription_confirmed' };
    }

    // Handle notification
    if (messageType === 'Notification') {
      const message = JSON.parse(notification.Message);

      if (message.notificationType === 'Complaint') {
        await this.trackingService.handleComplaint(message);
      }
    }

    return { status: 'ok' };
  }

  /**
   * Handle AWS SES delivery notifications via SNS
   */
  @Post('ses/delivery')
  @ApiOperation({ summary: 'Handle SES delivery notifications' })
  @ApiResponse({ status: 200, description: 'Delivery processed' })
  async handleDelivery(
    @Body() notification: any,
    @Headers('x-amz-sns-message-type') messageType: string,
  ): Promise<{ status: string }> {
    this.logger.log('Received SES delivery notification');

    // Handle SNS subscription confirmation
    if (messageType === 'SubscriptionConfirmation') {
      await this.trackingService.confirmSnsSubscription(
        notification.SubscribeURL,
      );
      return { status: 'subscription_confirmed' };
    }

    // Handle notification
    if (messageType === 'Notification') {
      const message = JSON.parse(notification.Message);

      if (message.notificationType === 'Delivery') {
        await this.trackingService.handleDelivery(message);
      }
    }

    return { status: 'ok' };
  }

  /**
   * Inbound replies webhook (SES Inbound or forwarding) -> classify and attach to campaign email
   * Expect JSON { headers: Record<string,string>, subject: string, from: string, to: string, text: string, html?: string }
   */
  @Post('inbound')
  @Public()
  async handleInbound(@Body() payload: any): Promise<{ status: string }> {
    await this.trackingService.handleInbound(payload);
    return { status: 'ok' };
  }

  /**
   * Get tracking statistics for a campaign email
   * (Protected endpoint for internal use)
   */
  @Get('stats/:campaignEmailId')
  @ApiOperation({ summary: 'Get tracking stats for a campaign email' })
  @ApiResponse({ status: 200, description: 'Returns tracking statistics' })
  async getTrackingStats(@Param('campaignEmailId') campaignEmailId: string) {
    return this.trackingService.getTrackingStats(campaignEmailId);
  }

  /**
   * One-Click Unsubscribe (RFC 8058)
   * Provide both GET and POST handlers for compatibility
   */
  @Get('unsubscribe/one-click/:campaignEmailId')
  async unsubscribeOneClickGet(@Param('campaignEmailId') campaignEmailId: string) {
    await this.trackingService.unsubscribeOneClick(campaignEmailId);
    return { status: 'unsubscribed' };
  }

  @Post('unsubscribe/one-click/:campaignEmailId')
  async unsubscribeOneClickPost(@Param('campaignEmailId') campaignEmailId: string) {
    await this.trackingService.unsubscribeOneClick(campaignEmailId);
    return { status: 'unsubscribed' };
  }
}
