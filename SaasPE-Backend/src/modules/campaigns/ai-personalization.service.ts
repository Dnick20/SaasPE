import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../../shared/services/openai.service';

/**
 * AI Email Personalization Service
 * Uses GPT-4 to personalize email content based on contact data
 */
@Injectable()
export class AIPersonalizationService {
  private readonly logger = new Logger(AIPersonalizationService.name);

  constructor(private readonly openAIService: OpenAIService) {}

  /**
   * Personalize email subject and body using AI
   * @param subject - Template subject line
   * @param body - Template body
   * @param contact - Contact data for personalization
   * @returns Personalized subject and body
   */
  async personalizeEmail(
    subject: string,
    body: string,
    contact: any,
  ): Promise<{ subject: string; body: string }> {
    try {
      this.logger.log(`Personalizing email for ${contact.email} using AI`);

      const systemPrompt = `You are an expert email copywriter specializing in B2B cold outreach and sales emails.
Your task is to personalize email templates based on contact information to make them more relevant and engaging.

Personalization Rules:
1. Keep the core message and value proposition intact
2. Add relevant, specific details based on contact data
3. Make it sound natural and conversational, not robotic
4. Avoid generic phrases like "I hope this email finds you well"
5. Lead with value and relevance to the recipient
6. Keep subject lines under 60 characters
7. Keep email body concise (150-250 words max)
8. Maintain professional tone while being personable
9. Don't make assumptions - only use information provided
10. If contact data is limited, focus on value proposition clarity

Return a JSON object with:
- subject: Personalized subject line
- body: Personalized email body`;

      const userPrompt = `Personalize this email template based on the contact information.

Contact Information:
- First Name: ${contact.firstName || 'Not provided'}
- Last Name: ${contact.lastName || 'Not provided'}
- Company: ${contact.company || 'Not provided'}
- Email: ${contact.email}
- LinkedIn: ${contact.linkedinUrl || 'Not provided'}
${contact.customFields ? `- Additional Info: ${JSON.stringify(contact.customFields)}` : ''}

Email Template:
Subject: ${subject}

Body:
${body}

Personalize this email to make it more relevant and engaging for ${contact.firstName || 'this contact'}.
Use the contact's information naturally in the message. If information is missing, focus on clarity and value.`;

      const response = await this.openAIService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7, // Balance between consistency and creativity
        max_tokens: 800,
      });

      const contentText = response.choices[0].message.content;

      if (!contentText) {
        this.logger.warn(
          `AI personalization returned empty response for ${contact.email}, using template`,
        );
        return { subject, body };
      }

      const personalized = JSON.parse(contentText);

      this.logger.log(
        `Email personalized successfully for ${contact.email}. Tokens used: ${response.usage?.total_tokens}`,
      );

      return {
        subject: personalized.subject || subject,
        body: personalized.body || body,
      };
    } catch (error) {
      this.logger.error(
        `AI personalization failed for ${contact.email}:`,
        error,
      );
      // Fallback to template on error
      return { subject, body };
    }
  }

  /**
   * Batch personalize multiple emails
   * Processes emails in parallel with rate limiting
   * @param emails - Array of {subject, body, contact} objects
   * @param maxConcurrent - Maximum concurrent AI requests
   * @returns Array of personalized emails
   */
  async batchPersonalize(
    emails: Array<{
      subject: string;
      body: string;
      contact: any;
    }>,
    maxConcurrent: number = 5,
  ): Promise<Array<{ subject: string; body: string; contact: any }>> {
    this.logger.log(
      `Batch personalizing ${emails.length} emails with max ${maxConcurrent} concurrent requests`,
    );

    const results: Array<{ subject: string; body: string; contact: any }> = [];

    // Process in batches
    for (let i = 0; i < emails.length; i += maxConcurrent) {
      const batch = emails.slice(i, i + maxConcurrent);

      const batchResults = await Promise.all(
        batch.map(async (email) => {
          const personalized = await this.personalizeEmail(
            email.subject,
            email.body,
            email.contact,
          );
          return {
            ...personalized,
            contact: email.contact,
          };
        }),
      );

      results.push(...batchResults);

      // Log progress
      this.logger.log(
        `Batch personalization progress: ${results.length}/${emails.length}`,
      );

      // Small delay between batches to avoid rate limiting
      if (i + maxConcurrent < emails.length) {
        await this.sleep(1000);
      }
    }

    this.logger.log(
      `Batch personalization completed: ${results.length} emails personalized`,
    );

    return results;
  }

  /**
   * Generate personalized follow-up email based on previous email status
   * @param previousEmail - Previous email data
   * @param contact - Contact data
   * @param followUpNumber - Which follow-up this is (1, 2, 3...)
   * @returns Personalized follow-up email
   */
  async generateFollowUp(
    previousEmail: {
      subject: string;
      body: string;
      status: string;
      openedAt?: Date;
      clickedAt?: Date;
    },
    contact: any,
    followUpNumber: number,
  ): Promise<{ subject: string; body: string }> {
    try {
      this.logger.log(
        `Generating follow-up #${followUpNumber} for ${contact.email} (previous status: ${previousEmail.status})`,
      );

      const systemPrompt = `You are an expert email copywriter specializing in follow-up emails for cold outreach.
Your task is to write effective follow-up emails that:
- Reference the previous email naturally
- Add new value or angle
- Create urgency without being pushy
- Keep it brief (80-150 words)
- Have compelling subject lines (40-60 characters)

Email Status Context:
- If email was opened: They showed interest but didn't respond - make the value clearer
- If email wasn't opened: Try a different angle or hook in the subject line
- For follow-up #2: Add social proof or case study
- For follow-up #3: Create urgency with a deadline or final attempt

Return JSON with:
- subject: Follow-up subject line
- body: Follow-up email body`;

      const userPrompt = `Generate follow-up email #${followUpNumber}.

Contact: ${contact.firstName || 'there'} from ${contact.company || 'their company'}

Previous Email:
Subject: ${previousEmail.subject}
Status: ${previousEmail.status}
${previousEmail.openedAt ? `Opened: ${previousEmail.openedAt}` : 'Not opened'}
${previousEmail.clickedAt ? `Clicked link: ${previousEmail.clickedAt}` : ''}

Body:
${previousEmail.body.substring(0, 500)}...

Generate an effective follow-up that adds value and increases response rate.`;

      const response = await this.openAIService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8, // Higher creativity for follow-ups
        max_tokens: 600,
      });

      const contentText = response.choices[0].message.content;

      if (!contentText) {
        throw new Error('No content received from AI');
      }

      const followUp = JSON.parse(contentText);

      this.logger.log(
        `Follow-up generated successfully. Tokens used: ${response.usage?.total_tokens}`,
      );

      return {
        subject: followUp.subject,
        body: followUp.body,
      };
    } catch (error) {
      this.logger.error(`Follow-up generation failed:`, error);
      throw error;
    }
  }

  /**
   * Analyze email performance and suggest improvements
   * @param email - Email data with metrics
   * @returns Suggestions for improvement
   */
  async analyzeEmailPerformance(email: {
    subject: string;
    body: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  }): Promise<{
    openRateAnalysis: string;
    clickRateAnalysis: string;
    suggestions: string[];
    improvedSubject: string;
    improvedBody: string;
  }> {
    try {
      this.logger.log(
        `Analyzing email performance: ${email.sent} sent, ${email.opened} opened, ${email.clicked} clicked, ${email.replied} replied`,
      );

      const openRate = email.sent > 0 ? (email.opened / email.sent) * 100 : 0;
      const clickRate =
        email.opened > 0 ? (email.clicked / email.opened) * 100 : 0;
      const replyRate = email.sent > 0 ? (email.replied / email.sent) * 100 : 0;

      const systemPrompt = `You are an email marketing analyst and copywriter expert.
Analyze email performance metrics and provide actionable improvement suggestions.

Benchmark Metrics:
- Good open rate: 20-30%
- Good click rate: 2-5%
- Good reply rate: 5-10% for cold outreach

Return JSON with:
- openRateAnalysis: Analysis of open rate performance
- clickRateAnalysis: Analysis of click/reply rate
- suggestions: Array of 3-5 specific improvement tips
- improvedSubject: Revised subject line
- improvedBody: Revised email body`;

      const userPrompt = `Analyze this email's performance and suggest improvements.

Performance Metrics:
- Open Rate: ${openRate.toFixed(1)}%
- Click Rate: ${clickRate.toFixed(1)}%
- Reply Rate: ${replyRate.toFixed(1)}%

Email Content:
Subject: ${email.subject}

Body:
${email.body}

Provide analysis and improved versions that would likely perform better.`;

      const response = await this.openAIService[
        'client'
      ].chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 1200,
      });

      const contentText = response.choices[0].message.content;

      if (!contentText) {
        throw new Error('No analysis received from AI');
      }

      const analysis = JSON.parse(contentText);

      this.logger.log('Email performance analysis completed');

      return analysis;
    } catch (error) {
      this.logger.error('Email performance analysis failed:', error);
      throw error;
    }
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
