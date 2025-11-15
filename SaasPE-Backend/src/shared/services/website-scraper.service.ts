import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { OpenAIService } from './openai.service';

export interface CompanyInfo {
  description: string;
  services: string[];
  industry: string;
  targetAudience: string;
}

@Injectable()
export class WebsiteScraperService {
  private readonly logger = new Logger(WebsiteScraperService.name);

  constructor(
    private config: ConfigService,
    private openaiService: OpenAIService,
  ) {
    this.logger.log('Website Scraper Service initialized');
  }

  /**
   * Fetch and extract text content from a website
   * Removes scripts, styles, and other non-content elements
   */
  private async fetchWebsiteContent(url: string): Promise<string> {
    try {
      this.logger.log(`Fetching website content from: ${url}`);

      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const html = response.data;

      // Parse HTML with cheerio
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script').remove();
      $('style').remove();
      $('noscript').remove();
      $('iframe').remove();
      $('svg').remove();

      // Extract text from main content areas
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '#content',
        'body',
      ];

      let extractedText = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          extractedText = element.text();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!extractedText) {
        extractedText = $('body').text();
      }

      // Clean up whitespace
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      // Limit to first 10,000 characters
      const limitedText = extractedText.substring(0, 10000);

      this.logger.log(
        `Extracted ${extractedText.length} chars from website, using ${limitedText.length} chars`,
      );

      return limitedText;
    } catch (error) {
      this.logger.error(`Failed to fetch website content from ${url}:`, error);
      throw new Error(`Failed to fetch website: ${error.message}`);
    }
  }

  /**
   * Analyze website content using GPT-4 to extract company information
   */
  async analyzeWebsite(url: string, userId: string): Promise<CompanyInfo> {
    try {
      this.logger.log(`Starting website analysis for: ${url}`);

      // Fetch website content
      const websiteText = await this.fetchWebsiteContent(url);

      if (!websiteText || websiteText.length < 100) {
        throw new Error('Insufficient content extracted from website');
      }

      // Use OpenAI to analyze the content
      const systemPrompt = `You are an expert at analyzing company websites to extract key business information.
Analyze the website content and extract:
- Company description (1-2 sentences summarizing what they do)
- Primary services/products (list of main offerings)
- Industry vertical (e.g., "SaaS", "E-commerce", "Healthcare", "Finance")
- Target audience/ICP (who are their ideal customers)

Be specific and concise. Return ONLY valid JSON.`;

      const userPrompt = `Analyze this company website content and extract key information:

${websiteText}

Respond with JSON in this exact format:
{
  "description": "Brief company description (1-2 sentences)",
  "services": ["Service 1", "Service 2", "Service 3"],
  "industry": "Industry vertical",
  "targetAudience": "Description of target audience/ICP"
}`;

      // Call OpenAI (we'll use the client directly since we need custom behavior)
      const openaiClient = (this.openaiService as any).client;

      const response = await openaiClient.chat.completions.create({
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
        temperature: 0.3,
        max_tokens: 1000,
      });

      const analysisText = response.choices[0].message.content;

      if (!analysisText) {
        throw new Error('No analysis content received from OpenAI');
      }

      const companyInfo = JSON.parse(analysisText) as CompanyInfo;

      this.logger.log(
        `Website analysis completed. Tokens used: ${response.usage?.total_tokens}`,
      );

      // Log to audit log using the logAIOperation method
      await (this.openaiService as any).logAIOperation({
        userId: userId,
        operation: 'website_analysis',
        prompt: systemPrompt + '\n\n' + userPrompt.substring(0, 500),
        response: JSON.stringify(companyInfo),
        tokensUsed: response.usage?.total_tokens,
      });

      return companyInfo;
    } catch (error) {
      this.logger.error(`Website analysis failed for ${url}:`, error);

      // Log error to audit log
      await (this.openaiService as any).logAIOperation({
        userId: userId,
        operation: 'website_analysis',
        prompt: `Analyzing website: ${url}`,
        error: error.message || 'Unknown error',
      });

      // Return partial data if analysis fails
      return {
        description: 'Unable to analyze website content',
        services: [],
        industry: 'Unknown',
        targetAudience: 'Unknown',
      };
    }
  }

  /**
   * Extract company name from URL
   */
  extractCompanyNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      const hostname = urlObj.hostname.replace('www.', '');
      const parts = hostname.split('.');
      const domain = parts.length > 1 ? parts[0] : hostname;

      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch (error) {
      return 'Unknown Company';
    }
  }
}
