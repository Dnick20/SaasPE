import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { S3Service } from '../../../shared/services/s3.service';

interface ProposalData {
  id: string;
  title: string;
  client: {
    companyName: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
  };
  tenant: {
    name: string;
  };
  coverPageData?: {
    term?: string;
    startDate?: string;
    endDate?: string;
    preparedBy?: string;
    preparedFor?: string;
  };
  executiveSummary?: string;
  objectivesAndOutcomes?: string;
  scopeOfWork?: any;
  deliverables?: any;
  approachAndTools?: string;
  timeline?: any;
  paymentTerms?: string;
  cancellationNotice?: string;
  pricingOptions?: Array<{
    name: string;
    description: string;
    items: Array<{
      name: string;
      description: string;
      price: number;
    }>;
    total: number;
    recommended?: boolean;
  }>;
  // Pricing V2 (VAF-aligned narrative pricing)
  pricingOptionsV2?: Array<{
    id: string;
    label: string;
    billingCadence: string;
    summary: string;
    tierType?: string;
    paymentTerms?: string;
    cancellationNotice?: string;
    isRecommended: boolean;
    sortOrder: number;
    lineItems: Array<{
      id: string;
      lineType: string;
      description: string;
      amount: number;
      unitType: string;
      hoursIncluded?: number;
      requiresApproval?: boolean;
      notes?: string;
      sortOrder: number;
    }>;
  }>;
  pricingNotesV2?: Array<{
    id: string;
    noteType: string;
    content: string;
    sortOrder: number;
  }>;
  // Enhanced Proposal Sections (Proposal V2)
  accountHierarchy?: any;
  contentEnrichment?: any;
  kpiForecast?: any;
  teamRoster?: any;
  appendix?: any;
  tableOfContents?: boolean;
  created: Date;
}

/**
 * PDF Renderer Service
 *
 * Generates professional PDF documents from proposal data using
 * Puppeteer (headless Chrome) and Handlebars templates.
 * Supports uploading generated PDFs to S3.
 */
@Injectable()
export class PdfRendererService {
  private readonly logger = new Logger(PdfRendererService.name);
  private template: HandlebarsTemplateDelegate | null = null;

  constructor(private s3Service: S3Service) {
    this.loadTemplate();
  }

  /**
   * Load and compile the Handlebars template
   */
  private loadTemplate(): void {
    try {
      const templatePath = join(__dirname, '..', 'templates', 'proposal.hbs');
      const templateSource = readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateSource);

      // Register Handlebars helpers
      this.registerHelpers();

      this.logger.log('PDF template loaded successfully');
    } catch (error) {
      this.logger.error(`Failed to load template: ${error.message}`);
      // Template will be created if it doesn't exist
      this.template = null;
    }
  }

  /**
   * Register Handlebars helpers for template rendering
   */
  private registerHelpers(): void {
    // Format currency
    Handlebars.registerHelper('currency', function (value: number) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    });

    // Format date
    Handlebars.registerHelper('formatDate', function (date: Date | string) {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Check if array has items
    Handlebars.registerHelper('hasItems', function (array: any[]) {
      return array && array.length > 0;
    });

    // JSON stringify helper
    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context, null, 2);
    });

    // Format amount with unit type (for Pricing V2)
    Handlebars.registerHelper(
      'formatAmount',
      function (amount: number, unitType: string) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(amount);

        switch (unitType) {
          case 'hourly':
            return `${formatted}/hour`;
          case 'monthly':
            return `${formatted}/month`;
          default:
            return formatted;
        }
      },
    );

    // Get billing cadence label
    Handlebars.registerHelper(
      'billingCadenceLabel',
      function (cadence: string) {
        switch (cadence) {
          case 'fixed_fee':
            return 'Fixed Fee';
          case 'monthly_retainer':
            return 'Monthly Retainer';
          case 'hourly':
            return 'Hourly';
          default:
            return cadence;
        }
      },
    );

    // Get note type label
    Handlebars.registerHelper('noteTypeLabel', function (noteType: string) {
      switch (noteType) {
        case 'payment_method':
          return 'Payment Methods';
        case 'terms':
          return 'Terms & Conditions';
        case 'cancellation':
          return 'Cancellation Policy';
        case 'general':
        default:
          return 'Additional Notes';
      }
    });
  }

  /**
   * Generate PDF from proposal data
   */
  async generateProposalPdf(proposal: ProposalData): Promise<Buffer> {
    this.logger.log(`Generating PDF for proposal: ${proposal.id}`);

    try {
      const html = await this.renderHtml(proposal);
      const pdfBuffer = await this.htmlToPdf(html);

      this.logger.log(
        `PDF generated successfully for proposal: ${proposal.id}`,
      );
      return pdfBuffer;
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF: ${error.message}`,
        error.stack,
      );
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Render HTML from template and data
   */
  async renderHtml(proposal: ProposalData): Promise<string> {
    // If template doesn't exist, use fallback inline template
    if (!this.template) {
      return this.getFallbackHtml(proposal);
    }

    // Prepare data for template
    const templateData = {
      ...proposal,
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      hasExecutiveSummary: !!proposal.executiveSummary,
      hasObjectivesAndOutcomes: !!proposal.objectivesAndOutcomes,
      hasScopeOfWork: !!proposal.scopeOfWork,
      hasDeliverables: !!proposal.deliverables,
      hasApproachAndTools: !!proposal.approachAndTools,
      hasPaymentTerms: !!proposal.paymentTerms,
      hasCancellationNotice: !!proposal.cancellationNotice,
      hasTimeline:
        proposal.timeline &&
        Array.isArray(proposal.timeline) &&
        proposal.timeline.length > 0,
      hasPricingOptions:
        proposal.pricingOptions && proposal.pricingOptions.length > 0,
      hasPricingOptionsV2:
        proposal.pricingOptionsV2 && proposal.pricingOptionsV2.length > 0,
      hasPricingNotesV2:
        proposal.pricingNotesV2 && proposal.pricingNotesV2.length > 0,
      primaryContact:
        proposal.coverPageData?.preparedFor ||
        (proposal.client.contactFirstName
          ? `${proposal.client.contactFirstName} ${proposal.client.contactLastName || ''}`.trim()
          : proposal.client.companyName),
    };

    return this.template(templateData);
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPdf(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      // Launch headless browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666; padding: 0 15mm;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
      });

      // Convert Uint8Array to Buffer
      return Buffer.from(pdfUint8Array);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Helper method to format amount with unit type
   */
  private formatAmountWithUnit(amount: number, unitType: string): string {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);

    switch (unitType) {
      case 'hourly':
        return `${formatted}/hour`;
      case 'monthly':
        return `${formatted}/month`;
      default:
        return formatted;
    }
  }

  /**
   * Helper method to get billing cadence label
   */
  private getBillingCadenceLabel(cadence: string): string {
    switch (cadence) {
      case 'fixed_fee':
        return 'Fixed Fee';
      case 'monthly_retainer':
        return 'Monthly Retainer';
      case 'hourly':
        return 'Hourly';
      default:
        return cadence;
    }
  }

  /**
   * Helper method to get note type label
   */
  private getNoteTypeLabel(noteType: string): string {
    switch (noteType) {
      case 'payment_method':
        return 'Payment Methods';
      case 'terms':
        return 'Terms & Conditions';
      case 'cancellation':
        return 'Cancellation Policy';
      case 'general':
      default:
        return 'Additional Notes';
    }
  }

  /**
   * Fallback HTML template (used if .hbs file doesn't exist)
   */
  private getFallbackHtml(proposal: ProposalData): string {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${proposal.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      line-height: 1.6;
    }
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      page-break-after: always;
    }
    .cover-page h1 {
      font-size: 48px;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .cover-page .subtitle {
      font-size: 24px;
      margin-bottom: 40px;
      opacity: 0.9;
    }
    .cover-page .company-name {
      font-size: 32px;
      margin-bottom: 60px;
      font-weight: 600;
    }
    .cover-page .meta {
      font-size: 16px;
      opacity: 0.8;
    }
    .content {
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h2 {
      font-size: 32px;
      margin: 40px 0 20px 0;
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    h3 {
      font-size: 24px;
      margin: 30px 0 15px 0;
      color: #555;
    }
    h4 {
      font-size: 18px;
      margin: 20px 0 10px 0;
      color: #666;
    }
    p {
      margin-bottom: 15px;
      text-align: justify;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .scope-item {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
    }
    .scope-item h4 {
      color: #667eea;
      margin-top: 0;
    }
    .deliverables {
      list-style: none;
      padding-left: 20px;
    }
    .deliverables li:before {
      content: "✓ ";
      color: #667eea;
      font-weight: bold;
      margin-right: 8px;
    }
    .timeline-phase {
      margin-bottom: 25px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .timeline-phase h4 {
      color: #667eea;
      margin-top: 0;
    }
    .milestones {
      list-style: none;
      padding-left: 20px;
    }
    .milestones li {
      padding: 5px 0;
    }
    .milestones li:before {
      content: "→ ";
      color: #764ba2;
      margin-right: 8px;
    }
    .pricing-options {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .pricing-option {
      flex: 1;
      min-width: 250px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 25px;
      background: white;
      page-break-inside: avoid;
    }
    .pricing-option.recommended {
      border-color: #667eea;
      background: linear-gradient(to bottom, #f8f9ff, white);
      position: relative;
    }
    .pricing-option.recommended:before {
      content: "RECOMMENDED";
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #667eea;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }
    .pricing-option h3 {
      color: #667eea;
      margin-top: 0;
    }
    .pricing-option .description {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .pricing-items {
      list-style: none;
      margin: 20px 0;
    }
    .pricing-item {
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .pricing-item:last-child {
      border-bottom: none;
    }
    .pricing-item-name {
      font-weight: 600;
      color: #333;
    }
    .pricing-item-description {
      font-size: 13px;
      color: #666;
    }
    .pricing-item-price {
      float: right;
      color: #667eea;
      font-weight: 600;
    }
    .pricing-total {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      font-size: 24px;
      font-weight: bold;
      color: #333;
      text-align: right;
    }
    .page-break {
      page-break-before: always;
    }
    /* Pricing V2 Styles */
    .pricing-option-v2 {
      margin-bottom: 40px;
      padding: 30px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      background: white;
      page-break-inside: avoid;
    }
    .pricing-option-v2.recommended {
      border-color: #667eea;
      background: linear-gradient(to bottom, #f8f9ff, white);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      position: relative;
    }
    .pricing-option-v2.recommended:before {
      content: "★ RECOMMENDED";
      position: absolute;
      top: -12px;
      right: 30px;
      background: #667eea;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }
    .option-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 15px;
    }
    .option-header h3 {
      margin: 0;
      color: #667eea;
      font-size: 26px;
    }
    .cadence-badge {
      background: #764ba2;
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .option-summary {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      line-height: 1.7;
      font-size: 15px;
      color: #555;
    }
    .line-items-section {
      margin: 25px 0;
    }
    .line-item {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      background: #fafafa;
    }
    .line-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .line-item-type {
      background: #667eea;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .line-item-amount {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
    .line-item-description {
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      margin-bottom: 8px;
    }
    .line-item-note {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin-top: 5px;
    }
    .line-item-approval {
      font-size: 12px;
      color: #d97706;
      font-weight: 600;
      margin-top: 5px;
    }
    .option-terms {
      margin-top: 25px;
      padding: 20px;
      background: #fff9f0;
      border: 1px solid #f0e0c8;
      border-radius: 8px;
    }
    .term-item {
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 10px;
      color: #555;
    }
    .term-item:last-child {
      margin-bottom: 0;
    }
    .term-item strong {
      color: #667eea;
      font-weight: 600;
    }
    .pricing-notes-section {
      margin-top: 40px;
      padding: 25px;
      background: #f0f4f8;
      border-radius: 12px;
      border: 1px solid #d0dae8;
    }
    .pricing-notes-section h3 {
      color: #667eea;
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 20px;
    }
    .pricing-note {
      margin-bottom: 20px;
      padding: 15px;
      background: white;
      border-left: 4px solid #764ba2;
      border-radius: 4px;
    }
    .pricing-note:last-child {
      margin-bottom: 0;
    }
    .note-type {
      font-weight: 700;
      color: #764ba2;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .note-content {
      font-size: 13px;
      line-height: 1.6;
      color: #333;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <h1>${proposal.title}</h1>
    <div class="subtitle">Business Proposal</div>
    <div class="company-name">${proposal.client.companyName}</div>
    <div class="meta">
      <div>Prepared by: ${proposal.tenant.name}</div>
      <div>${formatDate(proposal.created)}</div>
    </div>
  </div>

  <!-- Content Pages -->
  <div class="content">
    ${
      proposal.executiveSummary
        ? `
    <div class="section">
      <h2>Executive Summary</h2>
      <p>${proposal.executiveSummary.replace(/\n/g, '</p><p>')}</p>
    </div>
    `
        : ''
    }

    ${
      proposal.objectivesAndOutcomes
        ? `
    <div class="section">
      <h2>Objectives and Outcomes</h2>
      <p>${proposal.objectivesAndOutcomes.replace(/\n/g, '</p><p>')}</p>
    </div>
    `
        : ''
    }

    ${
      proposal.scopeOfWork
        ? `
    <div class="section">
      <h2>Scope of Work</h2>
      <p>${proposal.scopeOfWork.replace(/\n/g, '</p><p>')}</p>
    </div>
    `
        : ''
    }

    ${
      proposal.deliverables
        ? `
    <div class="section">
      <h2>Deliverables</h2>
      ${typeof proposal.deliverables === 'string'
        ? `<p>${proposal.deliverables.replace(/\n/g, '</p><p>')}</p>`
        : Array.isArray(proposal.deliverables)
          ? `<ul class="deliverables">${proposal.deliverables.map((d: any) => `<li>${typeof d === 'string' ? d : d.description || d.name || ''}</li>`).join('')}</ul>`
          : '<p>See details above</p>'
      }
    </div>
    `
        : ''
    }

    ${
      proposal.approachAndTools
        ? `
    <div class="section">
      <h2>Approach and Tools</h2>
      <p>${proposal.approachAndTools.replace(/\n/g, '</p><p>')}</p>
    </div>
    `
        : ''
    }

    ${
      proposal.timeline &&
      Array.isArray(proposal.timeline) &&
      proposal.timeline.length > 0
        ? `
    <div class="section">
      <h2>Project Timeline</h2>
      ${proposal.timeline
        .map(
          (phase: any) => `
        <div class="timeline-phase">
          <h4>${phase.phase} <span style="color: #666; font-weight: normal; font-size: 16px;">(${phase.duration})</span></h4>
          ${
            phase.milestones && phase.milestones.length > 0
              ? `
          <ul class="milestones">
            ${phase.milestones.map((m: string) => `<li>${m}</li>`).join('')}
          </ul>
          `
              : ''
          }
        </div>
      `,
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      proposal.paymentTerms
        ? `
    <div class="section">
      <h2>Payment Terms</h2>
      <p>${proposal.paymentTerms.replace(/\n/g, '</p><p>')}</p>
    </div>
    `
        : ''
    }

    ${
      proposal.cancellationNotice
        ? `
    <div class="section">
      <h2>Cancellation Notice</h2>
      <p>${proposal.cancellationNotice.replace(/\n/g, '</p><p>')}</p>
    </div>
    `
        : ''
    }

    ${
      proposal.pricingOptions && proposal.pricingOptions.length > 0
        ? `
    <div class="section page-break">
      <h2>Investment Options</h2>
      <div class="pricing-options">
        ${proposal.pricingOptions
          .map(
            (option: any) => `
          <div class="pricing-option ${option.recommended ? 'recommended' : ''}">
            <h3>${option.name}</h3>
            <div class="description">${option.description}</div>
            <ul class="pricing-items">
              ${option.items
                .map(
                  (item: any) => `
                <li class="pricing-item">
                  <div class="pricing-item-name">${item.name} <span class="pricing-item-price">${formatCurrency(item.price)}</span></div>
                  <div class="pricing-item-description">${item.description}</div>
                </li>
              `,
                )
                .join('')}
            </ul>
            <div class="pricing-total">${formatCurrency(option.total)}</div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      proposal.pricingOptionsV2 && proposal.pricingOptionsV2.length > 0
        ? `
    <div class="section page-break">
      <h2>Commercial Options</h2>
      ${proposal.pricingOptionsV2
        .map(
          (option: any) => `
        <div class="pricing-option-v2 ${option.isRecommended ? 'recommended' : ''}">
          <div class="option-header">
            <h3>${option.label}</h3>
            <span class="cadence-badge">${this.getBillingCadenceLabel(option.billingCadence)}</span>
          </div>
          <div class="option-summary">${option.summary}</div>

          <div class="line-items-section">
            ${option.lineItems
              .map(
                (lineItem: any) => `
              <div class="line-item">
                <div class="line-item-header">
                  <span class="line-item-type">${lineItem.lineType.toUpperCase()}</span>
                  <span class="line-item-amount">${this.formatAmountWithUnit(lineItem.amount, lineItem.unitType)}</span>
                </div>
                <div class="line-item-description">${lineItem.description}</div>
                ${lineItem.hoursIncluded ? `<div class="line-item-note">Includes ${lineItem.hoursIncluded} hours</div>` : ''}
                ${lineItem.notes ? `<div class="line-item-note">${lineItem.notes}</div>` : ''}
                ${lineItem.requiresApproval ? `<div class="line-item-approval">Requires client approval</div>` : ''}
              </div>
            `,
              )
              .join('')}
          </div>

          ${
            option.paymentTerms || option.cancellationNotice
              ? `
          <div class="option-terms">
            ${option.paymentTerms ? `<div class="term-item"><strong>Payment Terms:</strong> ${option.paymentTerms}</div>` : ''}
            ${option.cancellationNotice ? `<div class="term-item"><strong>Cancellation:</strong> ${option.cancellationNotice}</div>` : ''}
          </div>
          `
              : ''
          }
        </div>
      `,
        )
        .join('')}

      ${
        proposal.pricingNotesV2 && proposal.pricingNotesV2.length > 0
          ? `
      <div class="pricing-notes-section">
        <h3>Additional Terms & Conditions</h3>
        ${proposal.pricingNotesV2
          .map(
            (note: any) => `
          <div class="pricing-note">
            <div class="note-type">${this.getNoteTypeLabel(note.noteType)}</div>
            <div class="note-content">${note.content}</div>
          </div>
        `,
          )
          .join('')}
      </div>
      `
          : ''
      }
    </div>
    `
        : ''
    }
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate proposal PDF and upload to S3
   * Returns the S3 key where the PDF is stored
   */
  async generateAndUploadProposalPdf(
    proposal: ProposalData,
    tenantId: string,
  ): Promise<string> {
    this.logger.log(
      `Generating and uploading PDF for proposal: ${proposal.id}`,
    );

    try {
      // Generate PDF buffer
      const pdfBuffer = await this.generateProposalPdf(proposal);

      // Generate filename
      const fileName = `proposal-${proposal.id}.pdf`;

      // Upload to S3
      const s3Key = await this.s3Service.uploadFile(
        tenantId,
        pdfBuffer,
        fileName,
        'application/pdf',
        'proposals',
      );

      this.logger.log(
        `PDF uploaded successfully to S3: ${s3Key} for proposal ${proposal.id}`,
      );

      return s3Key;
    } catch (error) {
      this.logger.error(
        `Failed to generate and upload PDF: ${error.message}`,
        error.stack,
      );
      throw new Error(`PDF generation and upload failed: ${error.message}`);
    }
  }
}
