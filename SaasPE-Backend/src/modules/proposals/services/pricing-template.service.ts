import { Injectable, Logger } from '@nestjs/common';
import { BillingCadence, LineItemType, UnitType } from '../dto/pricing-v2.dto';

export interface PricingTemplate {
  label: string;
  billingCadence: BillingCadence;
  summary: string;
  tierType?: 'single' | 'tiered';
  paymentTerms: string;
  cancellationNotice: string;
  coreServices: Array<{
    lineType: LineItemType;
    description: string;
    amount: number;
    unitType: UnitType;
    hoursIncluded?: number;
    notes?: string;
  }>;
  addons?: Array<{
    lineType: LineItemType;
    description: string;
    amount: number;
    unitType: UnitType;
  }>;
  tierDefinitions?: Array<{
    name: string;
    description: string;
    amount: number;
    features: string[];
  }>;
}

/**
 * Pricing Template Service
 *
 * Provides reusable pricing templates with narrative copy blocks matching
 * VAF-style presentation. Templates serve as:
 * 1. Defaults for AI generation fallback
 * 2. Quick-start options for manual authoring
 * 3. Training examples for AI fine-tuning
 */
@Injectable()
export class PricingTemplateService {
  private readonly logger = new Logger(PricingTemplateService.name);

  /**
   * Get "Diagnostic Sprint" template
   * Fixed-fee engagement for discovery phase
   */
  getSprintTemplate(amount: number = 2000): PricingTemplate {
    return {
      label: 'Option A: Diagnostic Sprint',
      billingCadence: BillingCadence.FIXED_FEE,
      summary:
        'This fixed-fee engagement provides a comprehensive diagnostic assessment of your current systems, processes, and opportunities. Our team will conduct stakeholder interviews, analyze your existing data infrastructure, and deliver actionable recommendations within a structured timeframe.',
      tierType: 'single',
      paymentTerms:
        'Net 30, payment due upon project completion. ACH or wire transfer preferred.',
      cancellationNotice: 'N/A (fixed engagement with defined deliverables)',
      coreServices: [
        {
          lineType: LineItemType.CORE,
          description: `Twenty Hour Diagnostic Sprint • Fixed fee for one month, up to twenty hours of strategic consulting and analysis`,
          amount,
          unitType: UnitType.FIXED,
          hoursIncluded: 20,
          notes: 'Unused hours do not roll over',
        },
      ],
    };
  }

  /**
   * Get "Monthly Retainer" template
   * Ongoing monthly engagement with tiered options
   */
  getRetainerTemplate(baseAmount: number = 2000): PricingTemplate {
    return {
      label: 'Option B: Monthly Retainer',
      billingCadence: BillingCadence.MONTHLY_RETAINER,
      summary:
        'A month-to-month retainer engagement providing ongoing strategic support and execution. This flexible arrangement allows us to adapt to your evolving needs while maintaining consistent momentum on key initiatives. Choose the tier that best aligns with your current requirements.',
      tierType: 'tiered',
      paymentTerms:
        'Monthly billing in advance on the 1st of each month. Automatic renewal unless notice provided.',
      cancellationNotice:
        '30-day written notice required for cancellation or tier changes',
      coreServices: [
        {
          lineType: LineItemType.CORE,
          description:
            'See tier options below for detailed service inclusions and pricing',
          amount: baseAmount,
          unitType: UnitType.MONTHLY,
        },
      ],
      tierDefinitions: [
        {
          name: 'Data Only',
          description:
            'Data enrichment and list building services (up to 5,000 contacts/month)',
          amount: baseAmount,
          features: [
            'Contact data enrichment',
            'Company firmographic data',
            'Email validation',
            'CRM integration support',
            'Monthly reporting dashboard',
          ],
        },
        {
          name: 'Data + Leads',
          description:
            'Full-service lead generation including outreach and nurture campaigns',
          amount: baseAmount * 2,
          features: [
            'Everything in Data Only tier',
            'Outbound email campaigns',
            'LinkedIn outreach',
            'Lead qualification',
            'CRM pipeline management',
            'Weekly performance reviews',
          ],
        },
      ],
    };
  }

  /**
   * Get "Hourly" template
   * Time-and-materials engagement
   */
  getHourlyTemplate(hourlyRate: number = 150): PricingTemplate {
    return {
      label: 'Option C: Hourly Consulting',
      billingCadence: BillingCadence.HOURLY,
      summary:
        'Flexible hourly consulting for ad-hoc projects, strategic advising, or supplemental support. Ideal for clients who prefer to control costs by purchasing time in smaller increments or have variable workload requirements.',
      tierType: 'single',
      paymentTerms:
        'Invoiced monthly in arrears based on actual hours worked. Net 15 payment terms.',
      cancellationNotice:
        'Services may be paused or resumed at any time with 48 hours notice',
      coreServices: [
        {
          lineType: LineItemType.CORE,
          description: `Consulting Services • $${hourlyRate.toLocaleString()}/hour for strategic consulting, implementation support, and technical guidance`,
          amount: hourlyRate,
          unitType: UnitType.HOURLY,
          notes: 'Billed in 15-minute increments',
        },
      ],
      addons: [
        {
          lineType: LineItemType.ADDON,
          description:
            'Expedited turnaround (24-hour response) • +25% hourly rate premium',
          amount: hourlyRate * 1.25,
          unitType: UnitType.HOURLY,
        },
      ],
    };
  }

  /**
   * Get "Custom Package" template
   * Customizable package with common services
   */
  getCustomPackageTemplate(baseAmount: number = 5000): PricingTemplate {
    return {
      label: 'Custom Package',
      billingCadence: BillingCadence.FIXED_FEE,
      summary:
        'A tailored engagement designed specifically for your unique requirements. This package combines multiple service areas into a comprehensive solution with fixed pricing and clear deliverables.',
      tierType: 'single',
      paymentTerms:
        '50% deposit to commence work, remaining 50% upon completion. Net 30 payment terms.',
      cancellationNotice:
        'Cancellation permitted with 14 days notice; fees prorated based on work completed',
      coreServices: [
        {
          lineType: LineItemType.CORE,
          description:
            'Core Project Deliverables • As defined in Statement of Work',
          amount: baseAmount,
          unitType: UnitType.FIXED,
        },
      ],
      addons: [
        {
          lineType: LineItemType.ADDON,
          description:
            'Additional feature development • Per feature pricing based on complexity',
          amount: 1000,
          unitType: UnitType.FIXED,
        },
        {
          lineType: LineItemType.ADDON,
          description:
            'Training and onboarding session • 2-hour session for up to 10 participants',
          amount: 500,
          unitType: UnitType.FIXED,
        },
      ],
    };
  }

  /**
   * Get all available templates
   *
   * @returns Array of all pricing templates
   */
  getAllTemplates(): PricingTemplate[] {
    return [
      this.getSprintTemplate(),
      this.getRetainerTemplate(),
      this.getHourlyTemplate(),
      this.getCustomPackageTemplate(),
    ];
  }

  /**
   * Get template by name
   *
   * @param templateName - Template identifier
   * @param customAmount - Optional custom amount override
   * @returns Matching pricing template
   */
  getTemplateByName(
    templateName: 'sprint' | 'retainer' | 'hourly' | 'custom',
    customAmount?: number,
  ): PricingTemplate {
    switch (templateName) {
      case 'sprint':
        return this.getSprintTemplate(customAmount);
      case 'retainer':
        return this.getRetainerTemplate(customAmount);
      case 'hourly':
        return this.getHourlyTemplate(customAmount);
      case 'custom':
        return this.getCustomPackageTemplate(customAmount);
      default:
        this.logger.warn(
          `Unknown template name: ${String(templateName)}, defaulting to sprint`,
        );
        return this.getSprintTemplate(customAmount);
    }
  }

  /**
   * Generate example third-party cost line item
   */
  generateThirdPartyCostExample(
    serviceName: string,
    monthlyAmount: number,
  ): {
    description: string;
    estimatedAmount: number;
    requiresApproval: boolean;
    billingMethod: string;
  } {
    return {
      description: `${serviceName} subscription • $${monthlyAmount.toLocaleString()}/month, billed directly to client account`,
      estimatedAmount: monthlyAmount,
      requiresApproval: true,
      billingMethod: 'Billed directly to client',
    };
  }

  /**
   * Generate standard payment terms by billing cadence
   */
  getStandardPaymentTerms(billingCadence: BillingCadence): string {
    switch (billingCadence) {
      case BillingCadence.FIXED_FEE:
        return 'Net 30, payment due upon project completion. ACH, wire transfer, or credit card accepted.';
      case BillingCadence.MONTHLY_RETAINER:
        return 'Monthly billing in advance on the 1st of each month via ACH or credit card. Automatic renewal unless notice provided.';
      case BillingCadence.HOURLY:
        return 'Invoiced monthly in arrears based on actual hours worked. Net 15 payment terms.';
      default:
        return 'Net 30, ACH or wire transfer preferred.';
    }
  }

  /**
   * Generate standard cancellation notice by billing cadence
   */
  getStandardCancellationNotice(billingCadence: BillingCadence): string {
    switch (billingCadence) {
      case BillingCadence.FIXED_FEE:
        return 'Cancellation permitted with 14 days notice; fees prorated based on work completed to date.';
      case BillingCadence.MONTHLY_RETAINER:
        return '30-day written notice required for cancellation or tier changes. Services continue through the notice period.';
      case BillingCadence.HOURLY:
        return 'Services may be paused or resumed at any time with 48 hours notice.';
      default:
        return '30-day notice required.';
    }
  }
}
