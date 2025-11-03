import { Injectable, Logger } from '@nestjs/common';

/**
 * Service for handling template variable replacement in email content
 * Supports variables like {{firstName}}, {{lastName}}, {{company}}, etc.
 */
@Injectable()
export class TemplateVariablesService {
  private readonly logger = new Logger(TemplateVariablesService.name);

  /**
   * Default fallback values for missing variables
   */
  private readonly FALLBACKS: Record<string, string> = {
    firstName: 'there',
    lastName: '',
    fullName: 'there',
    company: 'your company',
    email: '',
    linkedinUrl: '',
  };

  /**
   * Replace template variables in text
   * @param template - Template text with {{variable}} placeholders
   * @param contact - Contact data object
   * @returns Text with variables replaced
   */
  replaceVariables(template: string, contact: any): string {
    if (!template) {
      return template;
    }

    let result = template;

    // Extract all variables from template
    const variablePattern = /\{\{(\w+)\}\}/g;
    const matches = template.matchAll(variablePattern);

    for (const match of matches) {
      const variableName = match[1];
      const placeholder = match[0]; // e.g., {{firstName}}

      // Get value from contact or custom fields
      let value = this.getVariableValue(variableName, contact);

      // Apply fallback if value is empty
      if (!value || value.trim() === '') {
        value = this.FALLBACKS[variableName] || '';
      }

      // Replace all occurrences of this variable
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
  }

  /**
   * Process subject and body for a contact
   * @param subject - Email subject template
   * @param body - Email body template
   * @param contact - Contact data
   * @returns Object with processed subject and body
   */
  processTemplate(
    subject: string,
    body: string,
    contact: any,
  ): { subject: string; body: string } {
    return {
      subject: this.replaceVariables(subject, contact),
      body: this.replaceVariables(body, contact),
    };
  }

  /**
   * Get variable value from contact data
   * Supports standard fields and custom fields
   */
  private getVariableValue(variableName: string, contact: any): string {
    // Handle standard fields
    if (variableName === 'fullName') {
      const firstName = contact.firstName || '';
      const lastName = contact.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }

    // Check standard contact fields
    if (contact[variableName] !== undefined && contact[variableName] !== null) {
      return String(contact[variableName]);
    }

    // Check custom fields
    if (contact.customFields && contact.customFields[variableName]) {
      return String(contact.customFields[variableName]);
    }

    return '';
  }

  /**
   * Validate template and return list of variables found
   * @param template - Template text to validate
   * @returns Array of variable names found
   */
  getTemplateVariables(template: string): string[] {
    if (!template) {
      return [];
    }

    const variablePattern = /\{\{(\w+)\}\}/g;
    const matches = template.matchAll(variablePattern);
    const variables: string[] = [];

    for (const match of matches) {
      const variableName = match[1];
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }

    return variables;
  }

  /**
   * Get list of supported standard variables
   */
  getSupportedVariables(): string[] {
    return [
      'firstName',
      'lastName',
      'fullName',
      'company',
      'email',
      'linkedinUrl',
    ];
  }

  /**
   * Preview template with sample data
   * Useful for testing templates before sending
   */
  previewTemplate(
    subject: string,
    body: string,
    sampleContact?: any,
  ): { subject: string; body: string } {
    const contact = sampleContact || {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      customFields: {
        role: 'CEO',
        industry: 'Technology',
      },
    };

    return this.processTemplate(subject, body, contact);
  }

  /**
   * Validate that all variables in template are supported
   * @param template - Template to validate
   * @param customFieldNames - Array of custom field names that are valid
   * @returns Object with validation result and unsupported variables
   */
  validateTemplate(
    template: string,
    customFieldNames: string[] = [],
  ): { valid: boolean; unsupportedVariables: string[] } {
    const variables = this.getTemplateVariables(template);
    const supported = [...this.getSupportedVariables(), ...customFieldNames];

    const unsupportedVariables = variables.filter(
      (v) => !supported.includes(v),
    );

    return {
      valid: unsupportedVariables.length === 0,
      unsupportedVariables,
    };
  }
}
