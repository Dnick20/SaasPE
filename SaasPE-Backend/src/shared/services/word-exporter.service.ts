import { Injectable, Logger } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

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
  scopeOfWork?: string;
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
  created: Date;
}

/**
 * Word Document Exporter Service
 * Exports proposals to .docx format with rich formatting
 */
@Injectable()
export class WordExporterService {
  private readonly logger = new Logger(WordExporterService.name);

  /**
   * Export proposal to Word document buffer
   */
  async exportProposal(proposal: ProposalData): Promise<Buffer> {
    this.logger.log(`Generating Word document for proposal ${proposal.id}`);

    const sections: Paragraph[] = [];

    // Cover Page
    sections.push(
      new Paragraph({
        text: proposal.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    );

    sections.push(
      new Paragraph({
        text: `Prepared for ${proposal.client.companyName}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
    );

    sections.push(
      new Paragraph({
        text: `By ${proposal.tenant.name}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
    );

    sections.push(
      new Paragraph({
        text: new Date(proposal.created).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    );

    // Cover Page Data
    if (proposal.coverPageData) {
      if (proposal.coverPageData.term) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Term: ', bold: true }),
              new TextRun(proposal.coverPageData.term),
            ],
            spacing: { after: 100 },
          }),
        );
      }
      if (proposal.coverPageData.startDate || proposal.coverPageData.endDate) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Period: ', bold: true }),
              new TextRun(
                `${proposal.coverPageData.startDate || ''} - ${proposal.coverPageData.endDate || ''}`,
              ),
            ],
            spacing: { after: 100 },
          }),
        );
      }
      if (proposal.coverPageData.preparedBy) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Prepared By: ', bold: true }),
              new TextRun(proposal.coverPageData.preparedBy),
            ],
            spacing: { after: 100 },
          }),
        );
      }
      if (proposal.coverPageData.preparedFor) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Prepared For: ', bold: true }),
              new TextRun(proposal.coverPageData.preparedFor),
            ],
            spacing: { after: 100 },
          }),
        );
      }
    }

    // Page break
    sections.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      }),
    );

    // Executive Summary
    if (proposal.executiveSummary) {
      sections.push(
        new Paragraph({
          text: 'Executive Summary',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      sections.push(...this.textToParagraphs(proposal.executiveSummary));
    }

    // Objectives and Outcomes
    if (proposal.objectivesAndOutcomes) {
      sections.push(
        new Paragraph({
          text: 'Objectives and Outcomes',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      sections.push(...this.textToParagraphs(proposal.objectivesAndOutcomes));
    }

    // Scope of Work
    if (proposal.scopeOfWork) {
      sections.push(
        new Paragraph({
          text: 'Scope of Work',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      sections.push(...this.textToParagraphs(proposal.scopeOfWork));
    }

    // Deliverables
    if (proposal.deliverables) {
      sections.push(
        new Paragraph({
          text: 'Deliverables',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      if (typeof proposal.deliverables === 'string') {
        sections.push(...this.textToParagraphs(proposal.deliverables));
      } else if (Array.isArray(proposal.deliverables)) {
        proposal.deliverables.forEach((deliverable: any) => {
          const text =
            typeof deliverable === 'string'
              ? deliverable
              : deliverable.description ||
                deliverable.name ||
                JSON.stringify(deliverable);
          sections.push(
            new Paragraph({
              text: `• ${text}`,
              spacing: { after: 100 },
            }),
          );
        });
      }
    }

    // Approach and Tools
    if (proposal.approachAndTools) {
      sections.push(
        new Paragraph({
          text: 'Approach and Tools',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      sections.push(...this.textToParagraphs(proposal.approachAndTools));
    }

    // Timeline
    if (
      proposal.timeline &&
      Array.isArray(proposal.timeline) &&
      proposal.timeline.length > 0
    ) {
      sections.push(
        new Paragraph({
          text: 'Project Timeline',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      proposal.timeline.forEach((phase: any) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: phase.phase || phase.name || 'Phase', bold: true }),
              ...(phase.duration ? [new TextRun(` (${phase.duration})`)] : []),
            ],
            spacing: { before: 100, after: 50 },
          }),
        );

        if (phase.description) {
          sections.push(
            new Paragraph({
              text: phase.description,
              spacing: { after: 100 },
            }),
          );
        }

        if (phase.milestones && Array.isArray(phase.milestones)) {
          phase.milestones.forEach((milestone: any) => {
            sections.push(
              new Paragraph({
                text: `  • ${typeof milestone === 'string' ? milestone : milestone.name || milestone.description || ''}`,
                spacing: { after: 50 },
              }),
            );
          });
        }
      });
    }

    // Pricing Options
    if (proposal.pricingOptions && proposal.pricingOptions.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Commercial Options',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      proposal.pricingOptions.forEach((option: any, index: number) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Option ${String.fromCharCode(65 + index)}. ${option.name}`,
                bold: true,
                size: 28,
              }),
              ...(option.recommended
                ? [
                    new TextRun({
                      text: ' (Recommended)',
                      color: '0066CC',
                      bold: true,
                    }),
                  ]
                : []),
            ],
            spacing: { before: 150, after: 100 },
          }),
        );

        if (option.description) {
          sections.push(
            new Paragraph({
              text: option.description,
              spacing: { after: 100 },
            }),
          );
        }

        if (option.items && option.items.length > 0) {
          option.items.forEach((item: any) => {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `  • ${item.name}: `, bold: true }),
                  new TextRun(item.description || ''),
                  new TextRun({
                    text: ` - $${item.price.toLocaleString()}`,
                    bold: true,
                  }),
                ],
                spacing: { after: 50 },
              }),
            );
          });
        }

        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Total: ', bold: true }),
              new TextRun({
                text: `$${option.total.toLocaleString()}`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { before: 100, after: 200 },
          }),
        );
      });
    }

    // Payment Terms
    if (proposal.paymentTerms) {
      sections.push(
        new Paragraph({
          text: 'Payment Terms',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      sections.push(...this.textToParagraphs(proposal.paymentTerms));
    }

    // Cancellation Notice
    if (proposal.cancellationNotice) {
      sections.push(
        new Paragraph({
          text: 'Cancellation Policy',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }),
      );

      sections.push(...this.textToParagraphs(proposal.cancellationNotice));
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    this.logger.log(
      `Word document generated successfully for proposal ${proposal.id}`,
    );

    return buffer;
  }

  /**
   * Convert text with line breaks into paragraphs
   */
  private textToParagraphs(text: string): Paragraph[] {
    return text.split('\n').map(
      (line) =>
        new Paragraph({
          text: line,
          spacing: { after: line.trim() === '' ? 200 : 100 },
        }),
    );
  }
}
