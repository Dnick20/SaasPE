import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../database/prisma.service';

/**
 * DeepThinkingAgent Service
 *
 * Analyzes proposal generation failures and provides structured insights
 * to improve AI-generated proposals through multi-pass refinement.
 *
 * Activated after 2+ failed validation attempts to:
 * - Analyze what went wrong in proposal generation
 * - Identify missing or malformed fields
 * - Provide specific recommendations for the next attempt
 * - Log learnings for continuous improvement
 */

interface ValidationError {
  field: string;
  issue: string;
  expectedFormat?: string;
  receivedValue?: any;
}

interface AnalysisContext {
  proposalId: string;
  tenantId: string;
  attemptCount: number;
  transcriptionText?: string;
  clientContext?: any;
  companyProfile?: any;
  previousErrors: ValidationError[];
  lastGeneratedProposal?: any;
}

interface DeepThinkingInsights {
  rootCause: string;
  missingFields: string[];
  malformedFields: string[];
  recommendations: string[];
  suggestedPromptAdjustments: string[];
  confidenceScore: number; // 0-100
}

@Injectable()
export class DeepThinkingAgentService {
  private readonly logger = new Logger(DeepThinkingAgentService.name);
  private readonly openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Analyzes why proposal generation failed and provides actionable insights
   */
  async analyzeFailure(context: AnalysisContext): Promise<DeepThinkingInsights> {
    this.logger.log(
      `[DeepThinkingAgent] Analyzing failure for proposal ${context.proposalId} (attempt ${context.attemptCount})`,
    );

    try {
      const systemPrompt = this.buildAnalysisSystemPrompt();
      const userPrompt = this.buildAnalysisUserPrompt(context);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4 for deep analysis
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for analytical precision
        response_format: { type: 'json_object' },
      });

      const analysisText = completion.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('Empty response from DeepThinkingAgent');
      }

      const insights: DeepThinkingInsights = JSON.parse(analysisText);

      // Log the insights to database for continuous learning
      await this.logInsights(context, insights);

      this.logger.log(
        `[DeepThinkingAgent] Analysis complete. Confidence: ${insights.confidenceScore}%`,
      );

      return insights;
    } catch (error) {
      this.logger.error(
        `[DeepThinkingAgent] Analysis failed: ${error.message}`,
        error.stack,
      );

      // Return fallback insights
      return {
        rootCause: 'Analysis failed - returning generic recommendations',
        missingFields: context.previousErrors.map((e) => e.field),
        malformedFields: [],
        recommendations: [
          'Ensure all required fields are populated',
          'Verify structured data follows expected schema',
          'Check for proper JSON formatting',
        ],
        suggestedPromptAdjustments: [],
        confidenceScore: 20,
      };
    }
  }

  /**
   * Logs insights to database for continuous improvement and analytics
   */
  private async logInsights(
    context: AnalysisContext,
    insights: DeepThinkingInsights,
  ): Promise<void> {
    try {
      await this.prisma.proposalLearningLog.create({
        data: {
          proposalId: context.proposalId,
          tenantId: context.tenantId,
          attemptCount: context.attemptCount,
          validationErrors: JSON.stringify(context.previousErrors),
          rootCause: insights.rootCause,
          missingFields: insights.missingFields,
          malformedFields: insights.malformedFields,
          recommendations: insights.recommendations,
          promptAdjustments: insights.suggestedPromptAdjustments,
          confidenceScore: insights.confidenceScore,
        },
      });

      this.logger.log(
        `[DeepThinkingAgent] Insights logged to database for proposal ${context.proposalId}`,
      );
    } catch (error) {
      this.logger.error(
        `[DeepThinkingAgent] Failed to log insights: ${error.message}`,
      );
      // Don't throw - logging failure shouldn't block the process
    }
  }

  /**
   * Retrieves past learnings for similar failure patterns
   */
  async getPastLearnings(tenantId: string, limit = 10): Promise<any[]> {
    try {
      const logs = await this.prisma.proposalLearningLog.findMany({
        where: { tenantId },
        orderBy: { created: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      this.logger.error(
        `[DeepThinkingAgent] Failed to retrieve past learnings: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Builds the system prompt for deep analysis
   */
  private buildAnalysisSystemPrompt(): string {
    return `You are a DeepThinkingAgent specialized in analyzing AI proposal generation failures.

Your role is to:
1. Identify the root cause of why proposal generation failed validation
2. Analyze missing or malformed fields in the generated proposal
3. Provide specific, actionable recommendations to fix the issues
4. Suggest prompt adjustments to prevent similar failures

You MUST respond with valid JSON matching this exact schema:
{
  "rootCause": "string - brief explanation of the primary failure reason",
  "missingFields": ["array", "of", "field", "names"],
  "malformedFields": ["array", "of", "field", "names", "with", "format", "issues"],
  "recommendations": [
    "specific action 1 to fix the issue",
    "specific action 2 to fix the issue"
  ],
  "suggestedPromptAdjustments": [
    "prompt modification 1",
    "prompt modification 2"
  ],
  "confidenceScore": 85
}

Focus on:
- ProposedProjectPhase schema: { phase, commitment, window?, focus, bullets[], estimatedHours: { perMonth, perWeek } }
- ScopeOfWorkItem schema: { title, objective?, keyActivities?, outcome? }
- DeliverableItem schema: { name, description? }

Be precise and actionable in your recommendations.`;
  }

  /**
   * Builds the user prompt with failure context
   */
  private buildAnalysisUserPrompt(context: AnalysisContext): string {
    let prompt = `Analyze this proposal generation failure:

**Attempt Number:** ${context.attemptCount}
**Proposal ID:** ${context.proposalId}

**Validation Errors:**
${JSON.stringify(context.previousErrors, null, 2)}

`;

    if (context.lastGeneratedProposal) {
      prompt += `**Last Generated Proposal (partial):**
${JSON.stringify(
  {
    timeline: context.lastGeneratedProposal.timeline,
    scopeOfWork: context.lastGeneratedProposal.scopeOfWork,
    deliverables: context.lastGeneratedProposal.deliverables,
  },
  null,
  2,
)}

`;
    }

    if (context.transcriptionText) {
      prompt += `**Transcription Context (first 500 chars):**
${context.transcriptionText.substring(0, 500)}...

`;
    }

    prompt += `Provide a deep analysis of what went wrong and how to fix it for the next generation attempt.`;

    return prompt;
  }

  /**
   * Generates enhanced prompt instructions based on insights
   */
  generateEnhancedPromptInstructions(insights: DeepThinkingInsights): string {
    let instructions = '\n\n=== CRITICAL VALIDATION REQUIREMENTS ===\n';

    if (insights.missingFields.length > 0) {
      instructions += `\nYOU MUST include these fields:\n`;
      insights.missingFields.forEach((field) => {
        instructions += `- ${field}\n`;
      });
    }

    if (insights.malformedFields.length > 0) {
      instructions += `\nFix formatting for these fields:\n`;
      insights.malformedFields.forEach((field) => {
        instructions += `- ${field}\n`;
      });
    }

    if (insights.recommendations.length > 0) {
      instructions += `\nFollow these recommendations:\n`;
      insights.recommendations.forEach((rec, i) => {
        instructions += `${i + 1}. ${rec}\n`;
      });
    }

    if (insights.suggestedPromptAdjustments.length > 0) {
      instructions += `\nPrompt adjustments:\n`;
      insights.suggestedPromptAdjustments.forEach((adj) => {
        instructions += `- ${adj}\n`;
      });
    }

    instructions += '\n=== END VALIDATION REQUIREMENTS ===\n';

    return instructions;
  }
}
