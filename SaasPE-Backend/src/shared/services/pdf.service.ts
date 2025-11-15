import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

interface PricingOption {
  name: string; // "Option A", "Option B", etc.
  description?: string;
  items: Array<{
    name: string;
    description?: string;
    price: number;
  }>;
  total: number;
}

interface ProposalData {
  title: string;
  clientName: string;
  agencyName: string;
  executiveSummary?: string;
  problemStatement?: string;
  proposedSolution?: string;
  scope?: string | string[] | any;
  timeline?: string | Record<string, any> | any;
  deliverables?: string;
  assumptions?: string;

  // NEW: Cover page data
  coverPageData?: {
    term?: string;
    startDate?: string;
    endDate?: string;
    preparedBy?: string;
    preparedFor?: string;
    proposalDate?: string;
  };

  // NEW: Table of contents
  tableOfContents?: boolean;

  // NEW: Multiple pricing options (Option A vs B)
  pricingOptions?: PricingOption[];
  selectedPricingOption?: string;

  // NEW: Two-stage signature blocks
  agencySignature?: {
    signedAt?: string;
    signedBy?: string;
    signatureImageUrl?: string;
  };
  clientSignature?: {
    signedAt?: string;
    signatureImageUrl?: string;
  };

  // NEW: Branding
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    footerText?: string;
  };

  // Legacy fields (for backward compatibility)
  billableHours?: {
    items: Array<{
      role: string;
      hours: number;
      rate: number;
      total: number;
    }>;
    subtotal: number;
  };
  software?: {
    items: Array<{
      name: string;
      cost: number;
      payer: string;
      purchaseSource?: string;
    }>;
    subtotal: number;
  };
  pricing?: {
    items: Array<{
      name: string;
      description?: string;
      price: number;
    }>;
    total: number;
    grandTotal?: number;
  };
  created: string;
}

/**
 * PDF Service
 *
 * Generates PDF documents from HTML templates using Puppeteer:
 * - Proposal PDFs
 * - Invoice PDFs
 * - Report PDFs
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;

  constructor() {
    this.logger.log('PDF Service initialized');
  }

  /**
   * Get or create a Puppeteer browser instance
   * Reuses the same browser for multiple PDF generations (performance optimization)
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.log('Launching Puppeteer browser');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Generate a proposal PDF from data
   * Automatically detects whether to use legacy or enhanced template
   */
  async generateProposalPdf(data: ProposalData): Promise<Buffer> {
    try {
      this.logger.log(`Generating PDF for proposal: ${data.title}`);

      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Determine which template to use based on data structure
      const useEnhancedTemplate = !!(
        data.pricingOptions ||
        data.coverPageData ||
        data.branding ||
        data.agencySignature ||
        data.clientSignature
      );

      // Generate HTML content using appropriate template
      const html = useEnhancedTemplate
        ? this.generateEnhancedProposalHtml(data)
        : this.generateProposalHtml(data);

      this.logger.log(
        `Using ${useEnhancedTemplate ? 'enhanced' : 'legacy'} template for PDF generation`,
      );

      // Set HTML content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF with appropriate settings
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: useEnhancedTemplate
          ? {
              top: '0mm',
              right: '0mm',
              bottom: '0mm',
              left: '0mm',
            }
          : {
              top: '20mm',
              right: '15mm',
              bottom: '20mm',
              left: '15mm',
            },
        preferCSSPageSize: true,
      });

      await page.close();

      this.logger.log(`PDF generated successfully for: ${data.title}`);

      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('Failed to generate PDF:', error);
      throw error;
    }
  }

  /**
   * Generate HTML for proposal PDF
   * This creates a professional-looking proposal document
   */
  private generateProposalHtml(data: ProposalData): string {
    const formattedDate = new Date(data.created).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }

    .header {
      background: #1E40AF;
      color: white;
      padding: 48px 40px;
      margin-bottom: 48px;
    }

    .header h1 {
      font-size: 36pt;
      margin-bottom: 16px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .header .meta {
      font-size: 12pt;
      opacity: 0.95;
      line-height: 1.8;
    }

    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 20pt;
      font-weight: 600;
      color: #1E40AF;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #1E40AF;
    }

    .section-content {
      font-size: 11pt;
      line-height: 1.8;
      text-align: justify;
    }

    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    .pricing-table th {
      background-color: #1E40AF;
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 11pt;
    }

    .pricing-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    .pricing-table tbody tr:hover {
      background-color: #f9fafb;
    }

    .pricing-table tr:last-child td {
      border-bottom: none;
    }

    .pricing-table .item-name {
      font-weight: 600;
      color: #111827;
    }

    .pricing-table .item-description {
      color: #6b7280;
      font-size: 10pt;
      margin-top: 4px;
    }

    .pricing-table .item-price,
    .pricing-table .item-total {
      text-align: right;
      font-weight: 600;
      color: #111827;
    }

    .pricing-table .text-right {
      text-align: right;
    }

    .pricing-subtotal {
      margin-top: 24px;
      padding: 16px 20px;
      background-color: #f3f4f6;
      border-left: 4px solid #1E40AF;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pricing-subtotal .label {
      font-size: 13pt;
      font-weight: 600;
      color: #374151;
    }

    .pricing-subtotal .amount {
      font-size: 16pt;
      font-weight: 700;
      color: #1E40AF;
    }

    .pricing-total {
      margin-top: 20px;
      padding: 20px;
      background-color: #1E40AF;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pricing-total .label {
      font-size: 16pt;
      font-weight: 600;
    }

    .pricing-total .amount {
      font-size: 24pt;
      font-weight: 700;
    }

    .legal-section {
      margin-top: 60px;
      padding: 32px;
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
    }

    .legal-section h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }

    .legal-section p {
      font-size: 10pt;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 12px;
    }

    .signature-block {
      margin-top: 40px;
      padding: 24px;
      background-color: white;
      border: 2px dashed #d1d5db;
      border-radius: 4px;
    }

    .signature-line {
      margin-top: 48px;
      border-top: 2px solid #111827;
      padding-top: 8px;
      font-size: 10pt;
      color: #6b7280;
    }

    .footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 10pt;
    }

    .footer p {
      margin: 8px 0;
    }

    .footer .validity {
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }

    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <div class="meta">
      <p>Prepared for: <strong>${data.clientName}</strong></p>
      <p>Prepared by: <strong>${data.agencyName}</strong></p>
      <p>Date: <strong>${formattedDate}</strong></p>
    </div>
  </div>

  ${
    data.executiveSummary
      ? `
  <div class="section">
    <h2 class="section-title">Executive Summary</h2>
    <div class="section-content">
      ${this.formatText(data.executiveSummary)}
    </div>
  </div>
  `
      : ''
  }

  ${
    data.problemStatement
      ? `
  <div class="section">
    <h2 class="section-title">Problem Statement</h2>
    <div class="section-content">
      ${this.formatText(data.problemStatement)}
    </div>
  </div>
  `
      : ''
  }

  ${
    data.proposedSolution
      ? `
  <div class="section">
    <h2 class="section-title">Proposed Solution</h2>
    <div class="section-content">
      ${this.formatText(data.proposedSolution)}
    </div>
  </div>
  `
      : ''
  }

  ${
    data.scope
      ? `
  <div class="section">
    <h2 class="section-title">Project Scope</h2>
    <div class="section-content">
      ${this.formatJsonField(data.scope)}
    </div>
  </div>
  `
      : ''
  }

  ${
    data.timeline
      ? `
  <div class="section">
    <h2 class="section-title">Timeline</h2>
    <div class="section-content">
      ${this.formatJsonField(data.timeline)}
    </div>
  </div>
  `
      : ''
  }

  ${
    data.deliverables
      ? `
  <div class="section">
    <h2 class="section-title">Deliverables</h2>
    <div class="section-content">
      ${this.formatText(data.deliverables)}
    </div>
  </div>
  `
      : ''
  }

  ${
    data.billableHours
      ? `
  <div class="section">
    <h2 class="section-title">Billable Hours Estimate</h2>
    <table class="pricing-table">
      <thead>
        <tr>
          <th style="width: 35%">Role</th>
          <th style="width: 20%; text-align: center">Hours</th>
          <th style="width: 20%; text-align: right">Rate</th>
          <th style="width: 25%; text-align: right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${data.billableHours.items
          .map(
            (item) => `
        <tr>
          <td class="item-name">${item.role}</td>
          <td class="text-right" style="text-align: center">${item.hours} hrs</td>
          <td class="item-price">$${item.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hr</td>
          <td class="item-total">$${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
    <div class="pricing-subtotal">
      <span class="label">Billable Hours Subtotal:</span>
      <span class="amount">$${data.billableHours.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  </div>
  `
      : ''
  }

  ${
    data.software
      ? `
  <div class="section">
    <h2 class="section-title">Software & Tools</h2>
    <table class="pricing-table">
      <thead>
        <tr>
          <th style="width: 40%">Software</th>
          <th style="width: 25%; text-align: center">Payer</th>
          <th style="width: 35%; text-align: right">Cost</th>
        </tr>
      </thead>
      <tbody>
        ${data.software.items
          .map(
            (item) => `
        <tr>
          <td>
            <div class="item-name">${item.name}</div>
            ${item.purchaseSource ? `<div class="item-description">Source: ${item.purchaseSource}</div>` : ''}
          </td>
          <td style="text-align: center; text-transform: capitalize">${item.payer}</td>
          <td class="item-price">$${item.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
    <div class="pricing-subtotal">
      <span class="label">Software Subtotal:</span>
      <span class="amount">$${data.software.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  </div>
  `
      : ''
  }

  ${
    data.pricing
      ? `
  <div class="section">
    <h2 class="section-title">Additional Services & Investment</h2>
    <table class="pricing-table">
      <thead>
        <tr>
          <th style="width: 60%">Item</th>
          <th style="width: 40%; text-align: right">Price</th>
        </tr>
      </thead>
      <tbody>
        ${data.pricing.items
          .map(
            (item) => `
        <tr>
          <td>
            <div class="item-name">${item.name}</div>
            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
          </td>
          <td class="item-price">$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
    ${
      data.pricing.grandTotal
        ? `
    <div class="pricing-total">
      <span class="label">Total Investment (All-In):</span>
      <span class="amount">$${data.pricing.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
    `
        : `
    <div class="pricing-total">
      <span class="label">Total Investment:</span>
      <span class="amount">$${data.pricing.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
    `
    }
  </div>
  `
      : ''
  }

  ${
    data.assumptions
      ? `
  <div class="section">
    <h2 class="section-title">Assumptions & Considerations</h2>
    <div class="section-content">
      ${this.formatText(data.assumptions)}
    </div>
  </div>
  `
      : ''
  }

  <div class="legal-section">
    <h3>Terms & Agreement</h3>
    <p>
      By signing this proposal, both parties agree to the scope of work, timeline, deliverables,
      and investment outlined above. This proposal is valid for 30 days from the date of issue.
    </p>
    <p>
      Work will commence upon receipt of signed agreement and initial payment as outlined in the payment terms.
      Any changes to the scope of work will be documented and may result in adjusted timelines and pricing.
    </p>
    <p>
      This proposal is governed by the laws of the applicable jurisdiction. All intellectual property
      rights for deliverables will transfer to ${data.clientName} upon full payment, unless otherwise specified.
    </p>

    <div class="signature-block">
      <div style="margin-bottom: 60px;">
        <strong>Client Acceptance:</strong>
        <div class="signature-line">
          Signature
        </div>
        <div style="margin-top: 24px; display: flex; justify-content: space-between;">
          <div style="width: 48%;">
            <div class="signature-line">
              Printed Name
            </div>
          </div>
          <div style="width: 48%;">
            <div class="signature-line">
              Date
            </div>
          </div>
        </div>
      </div>

      <div>
        <strong>${data.agencyName}:</strong>
        <div class="signature-line">
          Signature
        </div>
        <div style="margin-top: 24px; display: flex; justify-content: space-between;">
          <div style="width: 48%;">
            <div class="signature-line">
              Printed Name
            </div>
          </div>
          <div style="width: 48%;">
            <div class="signature-line">
              Date
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p class="validity">This proposal is valid for 30 days from the date of issue.</p>
    <p>&copy; ${new Date().getFullYear()} ${data.agencyName}. All rights reserved.</p>
    <p>For questions or clarifications, please contact us at your earliest convenience.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate enhanced professional proposal HTML with cover page, TOC, and multiple pricing options
   */
  private generateEnhancedProposalHtml(data: ProposalData): string {
    const primaryColor = data.branding?.primaryColor || '#1E40AF';
    const secondaryColor = data.branding?.secondaryColor || '#F97316';
    const fontFamily = data.branding?.fontFamily || 'Inter, sans-serif';

    const formattedDate =
      data.coverPageData?.proposalDate ||
      new Date(data.created).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    // Build table of contents
    const tocItems: Array<{ id: string; title: string }> = [];
    if (data.executiveSummary)
      tocItems.push({ id: 'executive-summary', title: 'Executive Summary' });
    if (data.problemStatement)
      tocItems.push({ id: 'problem-statement', title: 'Problem Statement' });
    if (data.proposedSolution)
      tocItems.push({ id: 'proposed-solution', title: 'Proposed Solution' });
    if (data.scope) tocItems.push({ id: 'scope', title: 'Project Scope' });
    if (data.timeline) tocItems.push({ id: 'timeline', title: 'Timeline' });
    if (data.pricingOptions && data.pricingOptions.length > 0) {
      tocItems.push({ id: 'pricing', title: 'Investment & Pricing Options' });
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${fontFamily};
      font-size: 11pt;
      line-height: 1.7;
      color: #1f2937;
    }

    /* Cover Page */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: white;
      padding: 60px;
      page-break-after: always;
    }

    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .cover-logo img {
      max-width: 180px;
      max-height: 80px;
      filter: brightness(0) invert(1);
    }

    .cover-content {
      text-align: center;
      padding: 40px 0;
    }

    .cover-title {
      font-size: 48pt;
      font-weight: 700;
      margin-bottom: 30px;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .cover-subtitle {
      font-size: 20pt;
      font-weight: 300;
      margin-bottom: 60px;
      opacity: 0.9;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      max-width: 600px;
      margin: 0 auto;
      text-align: left;
    }

    .cover-meta-item {
      padding: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .cover-meta-label {
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
      margin-bottom: 8px;
    }

    .cover-meta-value {
      font-size: 14pt;
      font-weight: 600;
    }

    .cover-footer {
      text-align: center;
      font-size: 10pt;
      opacity: 0.8;
    }

    /* Table of Contents */
    .toc-page {
      padding: 60px;
      page-break-after: always;
    }

    .toc-title {
      font-size: 32pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 4px solid ${primaryColor};
    }

    .toc-list {
      list-style: none;
      padding: 0;
    }

    .toc-item {
      padding: 20px 0;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toc-item a {
      text-decoration: none;
      color: #111827;
      font-size: 14pt;
      font-weight: 500;
      transition: color 0.2s;
    }

    .toc-item a:hover {
      color: ${primaryColor};
    }

    .toc-dots {
      flex: 1;
      border-bottom: 2px dotted #d1d5db;
      margin: 0 16px;
    }

    .toc-page-number {
      font-weight: 600;
      color: ${primaryColor};
    }

    /* Content Sections */
    .content-page {
      padding: 60px;
    }

    .section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 24pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 3px solid ${primaryColor};
    }

    .section-content {
      font-size: 11pt;
      line-height: 1.8;
    }

    .section-content p {
      margin-bottom: 16px;
      text-align: justify;
    }

    .section-content ul {
      margin: 16px 0;
      padding-left: 28px;
    }

    .section-content li {
      margin-bottom: 12px;
    }

    /* Pricing Options */
    .pricing-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 30px 0;
    }

    .pricing-option {
      border: 3px solid ${primaryColor};
      border-radius: 12px;
      overflow: hidden;
      background: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .pricing-option.selected {
      border-color: ${secondaryColor};
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .pricing-option-header {
      background: ${primaryColor};
      color: white;
      padding: 24px;
      text-align: center;
    }

    .pricing-option.selected .pricing-option-header {
      background: ${secondaryColor};
    }

    .pricing-option-name {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .pricing-option-description {
      font-size: 10pt;
      opacity: 0.9;
    }

    .pricing-option-body {
      padding: 24px;
    }

    .pricing-item {
      display: flex;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .pricing-item:last-child {
      border-bottom: none;
    }

    .pricing-item-details {
      flex: 1;
    }

    .pricing-item-name {
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }

    .pricing-item-description {
      font-size: 9pt;
      color: #6b7280;
    }

    .pricing-item-price {
      font-weight: 700;
      color: ${primaryColor};
      font-size: 13pt;
    }

    .pricing-option-total {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 3px solid ${primaryColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pricing-option.selected .pricing-option-total {
      border-top-color: ${secondaryColor};
    }

    .pricing-option-total-label {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
    }

    .pricing-option-total-amount {
      font-size: 28pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .pricing-option.selected .pricing-option-total-amount {
      color: ${secondaryColor};
    }

    /* Signature Blocks */
    .signature-section {
      margin-top: 60px;
      page-break-before: always;
      padding: 60px;
    }

    .signature-title {
      font-size: 28pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 40px;
      text-align: center;
    }

    .signature-blocks {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }

    .signature-block {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 32px;
      background: #f9fafb;
    }

    .signature-block-title {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 24px;
      text-align: center;
    }

    .signature-image {
      height: 80px;
      margin-bottom: 16px;
      border-bottom: 2px solid #111827;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .signature-image img {
      max-width: 100%;
      max-height: 70px;
    }

    .signature-line {
      border-top: 2px solid #111827;
      margin-top: 60px;
      padding-top: 12px;
      text-align: center;
      font-size: 10pt;
      color: #6b7280;
    }

    .signature-details {
      margin-top: 20px;
      font-size: 10pt;
      color: #6b7280;
    }

    .signature-details div {
      margin-bottom: 8px;
    }

    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 20px;
      left: 60px;
      right: 60px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      .page-footer {
        position: fixed;
        bottom: 20px;
      }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-header">
      ${
        data.branding?.logoUrl
          ? `
        <div class="cover-logo">
          <img src="${data.branding.logoUrl}" alt="${data.branding.companyName || data.agencyName}">
        </div>
      `
          : ''
      }
      <div style="text-align: right; font-size: 10pt;">
        ${formattedDate}
      </div>
    </div>

    <div class="cover-content">
      <h1 class="cover-title">${data.title}</h1>
      <p class="cover-subtitle">${data.coverPageData?.proposalDate ? 'Business Proposal' : 'Professional Proposal'}</p>

      <div class="cover-meta">
        <div class="cover-meta-item">
          <div class="cover-meta-label">Prepared For</div>
          <div class="cover-meta-value">${data.coverPageData?.preparedFor || data.clientName}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Prepared By</div>
          <div class="cover-meta-value">${data.coverPageData?.preparedBy || data.agencyName}</div>
        </div>
        ${
          data.coverPageData?.term
            ? `
        <div class="cover-meta-item">
          <div class="cover-meta-label">Term</div>
          <div class="cover-meta-value">${data.coverPageData.term}</div>
        </div>
        `
            : ''
        }
        ${
          data.coverPageData?.startDate && data.coverPageData?.endDate
            ? `
        <div class="cover-meta-item">
          <div class="cover-meta-label">Project Period</div>
          <div class="cover-meta-value">${data.coverPageData.startDate} - ${data.coverPageData.endDate}</div>
        </div>
        `
            : ''
        }
      </div>
    </div>

    <div class="cover-footer">
      ${
        data.branding?.companyName
          ? `
        <p>${data.branding.companyName}</p>
        ${data.branding.companyAddress ? `<p>${data.branding.companyAddress}</p>` : ''}
        ${
          data.branding.companyPhone || data.branding.companyEmail
            ? `
          <p>
            ${data.branding.companyPhone || ''}
            ${data.branding.companyPhone && data.branding.companyEmail ? ' | ' : ''}
            ${data.branding.companyEmail || ''}
          </p>
        `
            : ''
        }
      `
          : ''
      }
      ${data.branding?.footerText ? `<p style="margin-top: 12px; opacity: 0.7;">${data.branding.footerText}</p>` : ''}
    </div>
  </div>

  <!-- Table of Contents -->
  ${
    data.tableOfContents !== false && tocItems.length > 0
      ? `
  <div class="toc-page">
    <h2 class="toc-title">Table of Contents</h2>
    <ul class="toc-list">
      ${tocItems
        .map(
          (item, index) => `
        <li class="toc-item">
          <a href="#${item.id}">${item.title}</a>
          <div class="toc-dots"></div>
          <span class="toc-page-number">${index + 3}</span>
        </li>
      `,
        )
        .join('')}
    </ul>
  </div>
  `
      : ''
  }

  <!-- Content Sections -->
  <div class="content-page">
    ${
      data.executiveSummary
        ? `
      <div class="section" id="executive-summary">
        <h2 class="section-title">Executive Summary</h2>
        <div class="section-content">
          ${this.formatText(data.executiveSummary)}
        </div>
      </div>
    `
        : ''
    }

    ${
      data.problemStatement
        ? `
      <div class="section" id="problem-statement">
        <h2 class="section-title">Problem Statement</h2>
        <div class="section-content">
          ${this.formatText(data.problemStatement)}
        </div>
      </div>
    `
        : ''
    }

    ${
      data.proposedSolution
        ? `
      <div class="section" id="proposed-solution">
        <h2 class="section-title">Proposed Solution</h2>
        <div class="section-content">
          ${this.formatText(data.proposedSolution)}
        </div>
      </div>
    `
        : ''
    }

    ${
      data.scope
        ? `
      <div class="section" id="scope">
        <h2 class="section-title">Project Scope</h2>
        <div class="section-content">
          ${this.formatJsonField(data.scope)}
        </div>
      </div>
    `
        : ''
    }

    ${
      data.timeline
        ? `
      <div class="section" id="timeline">
        <h2 class="section-title">Timeline</h2>
        <div class="section-content">
          ${this.formatJsonField(data.timeline)}
        </div>
      </div>
    `
        : ''
    }

    <!-- Pricing Options -->
    ${
      data.pricingOptions && data.pricingOptions.length > 0
        ? `
      <div class="section" id="pricing">
        <h2 class="section-title">Investment & Pricing Options</h2>
        <div class="pricing-options">
          ${data.pricingOptions
            .map(
              (option) => `
            <div class="pricing-option ${data.selectedPricingOption === option.name ? 'selected' : ''}">
              <div class="pricing-option-header">
                <div class="pricing-option-name">${option.name}</div>
                ${option.description ? `<div class="pricing-option-description">${option.description}</div>` : ''}
              </div>
              <div class="pricing-option-body">
                ${option.items
                  .map(
                    (item) => `
                  <div class="pricing-item">
                    <div class="pricing-item-details">
                      <div class="pricing-item-name">${item.name}</div>
                      ${item.description ? `<div class="pricing-item-description">${item.description}</div>` : ''}
                    </div>
                    <div class="pricing-item-price">$${item.price.toLocaleString('en-US')}</div>
                  </div>
                `,
                  )
                  .join('')}
                <div class="pricing-option-total">
                  <span class="pricing-option-total-label">Total Investment</span>
                  <span class="pricing-option-total-amount">$${option.total.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `
        : ''
    }
  </div>

  <!-- Signature Section -->
  <div class="signature-section">
    <h2 class="signature-title">Agreement & Signatures</h2>
    <p style="text-align: center; color: #6b7280; margin-bottom: 40px;">
      By signing below, both parties agree to the terms and conditions outlined in this proposal.
    </p>

    <div class="signature-blocks">
      <!-- Agency Signature -->
      <div class="signature-block">
        <div class="signature-block-title">${data.agencyName}</div>
        ${
          data.agencySignature?.signatureImageUrl
            ? `
          <div class="signature-image">
            <img src="${data.agencySignature.signatureImageUrl}" alt="Agency Signature">
          </div>
        `
            : '<div class="signature-line">Signature</div>'
        }
        <div class="signature-details">
          ${data.agencySignature?.signedBy ? `<div><strong>Signed by:</strong> ${data.agencySignature.signedBy}</div>` : ''}
          ${data.agencySignature?.signedAt ? `<div><strong>Date:</strong> ${new Date(data.agencySignature.signedAt).toLocaleDateString('en-US')}</div>` : '<div class="signature-line">Date</div>'}
        </div>
      </div>

      <!-- Client Signature -->
      <div class="signature-block">
        <div class="signature-block-title">${data.clientName}</div>
        ${
          data.clientSignature?.signatureImageUrl
            ? `
          <div class="signature-image">
            <img src="${data.clientSignature.signatureImageUrl}" alt="Client Signature">
          </div>
        `
            : '<div class="signature-line">Signature</div>'
        }
        <div class="signature-details">
          ${data.clientSignature?.signedAt ? `<div><strong>Date:</strong> ${new Date(data.clientSignature.signedAt).toLocaleDateString('en-US')}</div>` : '<div class="signature-line">Date</div>'}
        </div>
      </div>
    </div>
  </div>

  <!-- Footer (appears on all pages except cover) -->
  <div class="page-footer">
    <div>${data.branding?.companyName || data.agencyName} | ${data.title}</div>
    <div>Page <span class="page-number"></span></div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Format text content (convert newlines to <p> tags, preserve basic formatting)
   */
  private formatText(text: string): string {
    return text
      .split('\n\n')
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  /**
   * Convert Json data (arrays, objects) to formatted string for PDF display
   */
  private formatJsonField(data: any): string {
    if (typeof data === 'string') {
      return this.formatText(data);
    }

    if (Array.isArray(data)) {
      // Convert array to bulleted list
      return (
        '<ul style="margin: 0; padding-left: 24px;">' +
        data
          .map((item) => `<li style="margin-bottom: 8px;">${item}</li>`)
          .join('') +
        '</ul>'
      );
    }

    if (typeof data === 'object' && data !== null) {
      // Convert object to formatted list
      return (
        '<ul style="margin: 0; padding-left: 24px;">' +
        Object.entries(data)
          .map(
            ([key, value]) =>
              `<li style="margin-bottom: 8px;"><strong>${key}:</strong> ${value}</li>`,
          )
          .join('') +
        '</ul>'
      );
    }

    return '';
  }

  /**
   * Close the browser when the service is destroyed
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed');
    }
  }
}
