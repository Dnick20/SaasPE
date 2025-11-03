import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleOAuthService } from './google-oauth.service';

interface ProposalData {
  id: string;
  title: string;
  client: {
    companyName: string;
  };
  tenant: {
    name: string;
  };
  coverPageData?: any;
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
  // Enhanced Proposal Sections (Proposal V2)
  accountHierarchy?: any;
  contentEnrichment?: any;
  kpiForecast?: any;
  teamRoster?: any;
  appendix?: any;
  created: Date;
}

/**
 * Google Docs Exporter Service
 *
 * Exports proposals to Google Docs using Google Docs API:
 * - Creates new Google Doc from proposal data
 * - Applies professional formatting
 * - Returns shareable link to document
 * - Updates document if it already exists
 */
@Injectable()
export class GDocsExporterService {
  private readonly logger = new Logger(GDocsExporterService.name);

  constructor(private googleOAuthService: GoogleOAuthService) {
    this.logger.log('Google Docs Exporter Service initialized');
  }

  /**
   * Export proposal to Google Docs
   * Creates a new document or updates existing one
   */
  async exportProposal(
    proposal: ProposalData,
    userId: string,
    existingDocId?: string,
  ): Promise<{
    docId: string;
    docUrl: string;
  }> {
    try {
      this.logger.log(
        `Exporting proposal ${proposal.id} to Google Docs for user ${userId}`,
      );

      // Get authenticated OAuth2 client
      const auth = await this.googleOAuthService.getAuthenticatedClient(userId);

      const docs = google.docs({ version: 'v1', auth });
      const drive = google.drive({ version: 'v3', auth });

      let docId: string;

      // Create or use existing document
      if (existingDocId) {
        docId = existingDocId;
        this.logger.log(`Updating existing document: ${docId}`);

        // Clear existing content
        await this.clearDocument(docs, docId);
      } else {
        // Create new document
        const createResponse = await docs.documents.create({
          requestBody: {
            title: proposal.title,
          },
        });

        docId = createResponse.data.documentId!;
        this.logger.log(`Created new document: ${docId}`);
      }

      // Build document content
      const requests = this.buildDocumentRequests(proposal);

      // Apply content to document
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests,
        },
      });

      // Get shareable link
      const fileResponse = await drive.files.get({
        fileId: docId,
        fields: 'webViewLink',
      });

      const docUrl = fileResponse.data.webViewLink!;

      this.logger.log(
        `Proposal exported successfully to Google Docs: ${docUrl}`,
      );

      return {
        docId,
        docUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to export proposal to Google Docs: ${error.message}`,
        error.stack,
      );
      throw new Error(`Google Docs export failed: ${error.message}`);
    }
  }

  /**
   * Clear all content from an existing document
   */
  private async clearDocument(docs: any, docId: string): Promise<void> {
    // Get current document to find end index
    const doc = await docs.documents.get({
      documentId: docId,
    });

    const endIndex =
      doc.data.body.content[doc.data.body.content.length - 1].endIndex;

    // Delete all content except the first character (required by API)
    if (endIndex && endIndex > 1) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [
            {
              deleteContentRange: {
                range: {
                  startIndex: 1,
                  endIndex: endIndex - 1,
                },
              },
            },
          ],
        },
      });
    }
  }

  /**
   * Build Google Docs API requests to format the proposal
   */
  private buildDocumentRequests(proposal: ProposalData): any[] {
    const requests: any[] = [];
    let currentIndex = 1; // Document content starts at index 1

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

    // Insert title
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `${proposal.title}\n\n`,
      },
    });

    // Format title as heading
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + proposal.title.length,
        },
        paragraphStyle: {
          namedStyleType: 'TITLE',
          alignment: 'CENTER',
        },
        fields: 'namedStyleType,alignment',
      },
    });

    currentIndex += proposal.title.length + 2;

    // Add client and date info
    const metaText = `Prepared for: ${proposal.client.companyName}\nPrepared by: ${proposal.tenant.name}\nDate: ${formatDate(proposal.created)}\n\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: metaText,
      },
    });

    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + metaText.length,
        },
        paragraphStyle: {
          alignment: 'CENTER',
        },
        fields: 'alignment',
      },
    });

    currentIndex += metaText.length;

    // Add page break
    requests.push({
      insertPageBreak: {
        location: { index: currentIndex },
      },
    });
    currentIndex += 1;

    // Add Executive Summary
    if (proposal.executiveSummary) {
      const heading = 'Executive Summary\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = `${proposal.executiveSummary}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Add Objectives and Outcomes
    if (proposal.objectivesAndOutcomes) {
      const heading = 'Objectives and Outcomes\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = `${proposal.objectivesAndOutcomes}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Add Scope of Work
    if (proposal.scopeOfWork) {
      const heading = 'Scope of Work\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = `${proposal.scopeOfWork}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Add Deliverables
    if (proposal.deliverables) {
      const heading = 'Deliverables\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = typeof proposal.deliverables === 'string'
        ? `${proposal.deliverables}\n\n`
        : Array.isArray(proposal.deliverables)
          ? proposal.deliverables.map((d: any) => `• ${typeof d === 'string' ? d : d.description || d.name || ''}`).join('\n') + '\n\n'
          : '\n\n';

      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Add Approach and Tools
    if (proposal.approachAndTools) {
      const heading = 'Approach and Tools\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = `${proposal.approachAndTools}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Skip old scope handling (replaced with scopeOfWork)
    if (false) {
      for (const item of [] as any[]) {
        const categoryText = `${item.category}\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: categoryText,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + categoryText.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += categoryText.length;

        if (item.description) {
          const desc = `${item.description}\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: desc,
            },
          });
          currentIndex += desc.length;
        }

        if (item.deliverables && item.deliverables.length > 0) {
          for (const deliverable of item.deliverables) {
            const bulletText = `• ${deliverable}\n`;
            requests.push({
              insertText: {
                location: { index: currentIndex },
                text: bulletText,
              },
            });
            currentIndex += bulletText.length;
          }
        }

        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex += 1;
      }
    }

    // Add Project Timeline
    if (
      proposal.timeline &&
      Array.isArray(proposal.timeline) &&
      proposal.timeline.length > 0
    ) {
      const heading = 'Project Timeline\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      for (const phase of proposal.timeline) {
        const phaseText = `${phase.phase} (${phase.duration})\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: phaseText,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + phaseText.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += phaseText.length;

        if (phase.milestones && phase.milestones.length > 0) {
          for (const milestone of phase.milestones) {
            const milestoneText = `• ${milestone}\n`;
            requests.push({
              insertText: {
                location: { index: currentIndex },
                text: milestoneText,
              },
            });
            currentIndex += milestoneText.length;
          }
        }

        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex += 1;
      }
    }

    // Add Payment Terms
    if (proposal.paymentTerms) {
      const heading = 'Payment Terms\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = `${proposal.paymentTerms}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Add Cancellation Notice
    if (proposal.cancellationNotice) {
      const heading = 'Cancellation Notice\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const content = `${proposal.cancellationNotice}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: content,
        },
      });

      currentIndex += content.length;
    }

    // Add Investment Options
    if (proposal.pricingOptions && proposal.pricingOptions.length > 0) {
      const heading = 'Investment Options\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      for (const option of proposal.pricingOptions) {
        const optionTitle = `${option.name}${option.recommended ? ' (Recommended)' : ''}\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: optionTitle,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + optionTitle.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += optionTitle.length;

        const description = `${option.description}\n\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: description,
          },
        });
        currentIndex += description.length;

        for (const item of option.items) {
          const itemText = `${item.name} - ${formatCurrency(item.price)}\n${item.description}\n\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: itemText,
            },
          });
          currentIndex += itemText.length;
        }

        const total = `Total: ${formatCurrency(option.total)}\n\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: total,
          },
        });

        // Bold the total
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + total.length - 2,
            },
            textStyle: {
              bold: true,
              fontSize: {
                magnitude: 14,
                unit: 'PT',
              },
            },
            fields: 'bold,fontSize',
          },
        });

        currentIndex += total.length;
      }
    }

    // Add Account Hierarchy (Proposal V2)
    if (proposal.accountHierarchy) {
      const heading = 'Account Hierarchy & Stakeholders\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const hierarchy = proposal.accountHierarchy;

      if (hierarchy.primaryContact) {
        const contactText = `Primary Contact: ${hierarchy.primaryContact}\n\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: contactText,
          },
        });
        currentIndex += contactText.length;
      }

      if (hierarchy.stakeholders && Array.isArray(hierarchy.stakeholders)) {
        const stakeholdersHeading = 'Key Stakeholders\n';
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: stakeholdersHeading,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + stakeholdersHeading.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += stakeholdersHeading.length;

        for (const stakeholder of hierarchy.stakeholders) {
          const stakeholderText = `• ${stakeholder.name} - ${stakeholder.role}${stakeholder.department ? ` (${stakeholder.department})` : ''}\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: stakeholderText,
            },
          });
          currentIndex += stakeholderText.length;
        }

        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex += 1;
      }
    }

    // Add KPI Forecast (Proposal V2)
    if (proposal.kpiForecast) {
      const heading = 'KPI Forecast & Expected Outcomes\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const forecast = proposal.kpiForecast;

      if (forecast.metrics && Array.isArray(forecast.metrics)) {
        for (const metric of forecast.metrics) {
          const metricText = `${metric.name}\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: metricText,
            },
          });

          requests.push({
            updateParagraphStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + metricText.length,
              },
              paragraphStyle: {
                namedStyleType: 'HEADING_2',
              },
              fields: 'namedStyleType',
            },
          });

          currentIndex += metricText.length;

          const details = `Baseline: ${metric.baseline}\nProjected: ${metric.projected}\nTimeframe: ${metric.timeframe}\n${metric.methodology ? `Methodology: ${metric.methodology}\n` : ''}\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: details,
            },
          });
          currentIndex += details.length;
        }
      }

      if (forecast.roi) {
        const roiHeading = 'Return on Investment\n';
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: roiHeading,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + roiHeading.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += roiHeading.length;

        const roiText = `Investment: ${formatCurrency(forecast.roi.investment)}\nProjected Return: ${formatCurrency(forecast.roi.projectedReturn)}\nTimeframe: ${forecast.roi.timeframe}\n\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: roiText,
          },
        });
        currentIndex += roiText.length;
      }
    }

    // Add Team Roster (Proposal V2)
    if (proposal.teamRoster) {
      const heading = 'Your Dedicated Team\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const roster = proposal.teamRoster;

      if (roster.members && Array.isArray(roster.members)) {
        for (const member of roster.members) {
          const memberName = `${member.name} - ${member.role}\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: memberName,
            },
          });

          requests.push({
            updateParagraphStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + memberName.length,
              },
              paragraphStyle: {
                namedStyleType: 'HEADING_2',
              },
              fields: 'namedStyleType',
            },
          });

          currentIndex += memberName.length;

          const memberDetails = `${member.bio}\n${member.allocation ? `Allocation: ${member.allocation}\n` : ''}${member.skills && member.skills.length > 0 ? `Skills: ${member.skills.join(', ')}\n` : ''}\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: memberDetails,
            },
          });
          currentIndex += memberDetails.length;
        }
      }
    }

    // Add Appendix (Proposal V2)
    if (proposal.appendix) {
      const heading = 'Appendix\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: heading,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + heading.length,
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_1',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += heading.length;

      const appendix = proposal.appendix;

      // Add case studies
      if (
        appendix.caseStudies &&
        Array.isArray(appendix.caseStudies) &&
        appendix.caseStudies.length > 0
      ) {
        const caseStudiesHeading = 'Relevant Case Studies\n';
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: caseStudiesHeading,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + caseStudiesHeading.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += caseStudiesHeading.length;

        for (const caseStudy of appendix.caseStudies) {
          const caseStudyText = `${caseStudy.title} (${caseStudy.industry})\n${caseStudy.results}\n\n`;
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: caseStudyText,
            },
          });
          currentIndex += caseStudyText.length;
        }
      }

      // Add certifications and awards
      if (
        (appendix.certifications && appendix.certifications.length > 0) ||
        (appendix.awards && appendix.awards.length > 0)
      ) {
        const credentialsHeading = 'Certifications & Awards\n';
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: credentialsHeading,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + credentialsHeading.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += credentialsHeading.length;

        if (appendix.certifications) {
          for (const cert of appendix.certifications) {
            const certText = `• ${cert}\n`;
            requests.push({
              insertText: {
                location: { index: currentIndex },
                text: certText,
              },
            });
            currentIndex += certText.length;
          }
        }

        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex += 1;
      }
    }

    return requests;
  }

  /**
   * Read the Google Doc as plain text (best-effort flattening)
   */
  async readDocumentPlainText(userId: string, docId: string): Promise<string> {
    try {
      const auth = await this.googleOAuthService.getAuthenticatedClient(userId);
      const docs = google.docs({ version: 'v1', auth });

      const doc = await docs.documents.get({ documentId: docId });
      const body = doc.data.body;
      if (!body || !body.content) return '';

      const lines: string[] = [];
      for (const el of body.content) {
        const para = (el as any).paragraph;
        if (!para || !para.elements) continue;
        let line = '';
        for (const child of para.elements) {
          const textRun = child.textRun;
          if (textRun && textRun.content) {
            line += textRun.content;
          }
        }
        // Normalize Google Docs newlines
        if (line.trim().length > 0) {
          lines.push(line.replace(/\u000b/g, '\n'));
        }
      }

      return lines.join('\n');
    } catch (error) {
      this.logger.error(`Failed to read Google Doc ${docId}: ${error.message}`, error.stack);
      throw new Error(`Failed to read Google Doc: ${error.message}`);
    }
  }
}
