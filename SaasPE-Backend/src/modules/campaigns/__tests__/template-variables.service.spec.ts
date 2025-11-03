import { Test, TestingModule } from '@nestjs/testing';
import { TemplateVariablesService } from '../template-variables.service';

describe('TemplateVariablesService', () => {
  let service: TemplateVariablesService;

  const mockContact = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Acme Inc',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    customFields: {
      industry: 'Technology',
      companySize: '50-200',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateVariablesService],
    }).compile();

    service = module.get<TemplateVariablesService>(TemplateVariablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('replaceVariables', () => {
    it('should replace firstName variable', () => {
      const template = 'Hi {{firstName}}, how are you?';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Hi John, how are you?');
    });

    it('should replace lastName variable', () => {
      const template = 'Dear Mr. {{lastName}}';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Dear Mr. Doe');
    });

    it('should replace fullName variable', () => {
      const template = 'Hello {{fullName}}!';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Hello John Doe!');
    });

    it('should replace company variable', () => {
      const template = 'I noticed {{company}} is growing rapidly';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('I noticed Acme Inc is growing rapidly');
    });

    it('should replace email variable', () => {
      const template = 'Your email: {{email}}';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Your email: john.doe@example.com');
    });

    it('should replace linkedinUrl variable', () => {
      const template = 'Profile: {{linkedinUrl}}';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Profile: https://linkedin.com/in/johndoe');
    });

    it('should replace multiple variables in one template', () => {
      const template =
        'Hi {{firstName}} {{lastName}}, I saw {{company}} on LinkedIn';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Hi John Doe, I saw Acme Inc on LinkedIn');
    });

    it('should replace custom field variables', () => {
      const template = 'I see you work in {{industry}}';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('I see you work in Technology');
    });

    it('should use fallback for missing firstName', () => {
      const template = 'Hi {{firstName}}!';
      const contact = { ...mockContact, firstName: '' };
      const result = service.replaceVariables(template, contact);
      expect(result).toBe('Hi there!');
    });

    it('should use fallback for missing company', () => {
      const template = 'I noticed {{company}} is growing';
      const contact = { ...mockContact, company: '' };
      const result = service.replaceVariables(template, contact);
      expect(result).toBe('I noticed your company is growing');
    });

    it('should use empty string for missing custom fields', () => {
      const template = 'Industry: {{location}}';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Industry: ');
    });

    it('should handle undefined contact gracefully', () => {
      const template = 'Hi {{firstName}}!';
      const result = service.replaceVariables(template, {});
      expect(result).toBe('Hi there!');
    });

    it('should handle empty template', () => {
      const result = service.replaceVariables('', mockContact);
      expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = 'Hello world!';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Hello world!');
    });

    it('should handle case-sensitive variables', () => {
      const template = 'Hi {{FIRSTNAME}}'; // Wrong case
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('Hi '); // Variable not found
    });

    it('should replace same variable multiple times', () => {
      const template = '{{firstName}} {{firstName}} {{firstName}}';
      const result = service.replaceVariables(template, mockContact);
      expect(result).toBe('John John John');
    });
  });

  describe('processTemplate', () => {
    it('should process both subject and body', () => {
      const subject = 'Partnership with {{company}}';
      const body = 'Hi {{firstName}}, I noticed {{company}} is doing great!';

      const result = service.processTemplate(subject, body, mockContact);

      expect(result.subject).toBe('Partnership with Acme Inc');
      expect(result.body).toBe('Hi John, I noticed Acme Inc is doing great!');
    });

    it('should handle empty subject and body', () => {
      const result = service.processTemplate('', '', mockContact);

      expect(result.subject).toBe('');
      expect(result.body).toBe('');
    });

    it('should process subject without variables', () => {
      const subject = 'Quick question';
      const body = 'Hi {{firstName}}';

      const result = service.processTemplate(subject, body, mockContact);

      expect(result.subject).toBe('Quick question');
      expect(result.body).toBe('Hi John');
    });

    it('should process body without variables', () => {
      const subject = 'Hi {{firstName}}';
      const body = 'This is a test email.';

      const result = service.processTemplate(subject, body, mockContact);

      expect(result.subject).toBe('Hi John');
      expect(result.body).toBe('This is a test email.');
    });
  });

  describe('getTemplateVariables', () => {
    it('should extract single variable', () => {
      const template = 'Hi {{firstName}}!';
      const result = service.getTemplateVariables(template);
      expect(result).toEqual(['firstName']);
    });

    it('should extract multiple variables', () => {
      const template = 'Hi {{firstName}} {{lastName}}, welcome to {{company}}!';
      const result = service.getTemplateVariables(template);
      expect(result).toEqual(['firstName', 'lastName', 'company']);
    });

    it('should extract duplicate variables only once', () => {
      const template = '{{firstName}} and {{firstName}} again';
      const result = service.getTemplateVariables(template);
      expect(result).toEqual(['firstName']);
    });

    it('should return empty array for template without variables', () => {
      const template = 'No variables here!';
      const result = service.getTemplateVariables(template);
      expect(result).toEqual([]);
    });

    it('should handle empty template', () => {
      const result = service.getTemplateVariables('');
      expect(result).toEqual([]);
    });

    it('should extract custom field variables', () => {
      const template = 'You work in {{industry}} at {{company}}';
      const result = service.getTemplateVariables(template);
      expect(result).toEqual(['industry', 'company']);
    });

    it('should ignore malformed variables', () => {
      const template = 'Hi {firstName} and {{lastName}}';
      const result = service.getTemplateVariables(template);
      expect(result).toEqual(['lastName']); // Only properly formatted variable
    });
  });

  describe('validateTemplate', () => {
    it('should validate template with supported variables', () => {
      const template = 'Hi {{firstName}} {{lastName}}, welcome to {{company}}!';
      const result = service.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.unsupportedVariables).toEqual([]);
    });

    it('should detect unsupported variables', () => {
      const template = 'Hi {{firstName}}, your age is {{age}}';
      const result = service.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.unsupportedVariables).toContain('age');
    });

    it('should detect multiple unsupported variables', () => {
      const template = 'Hi {{firstName}}, age {{age}}, phone {{phone}}';
      const result = service.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.unsupportedVariables).toHaveLength(2);
      expect(result.unsupportedVariables).toContain('age');
      expect(result.unsupportedVariables).toContain('phone');
    });

    it('should validate template without variables', () => {
      const template = 'This is a plain text email.';
      const result = service.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.unsupportedVariables).toEqual([]);
    });

    it('should validate empty template', () => {
      const result = service.validateTemplate('');

      expect(result.valid).toBe(true);
      expect(result.unsupportedVariables).toEqual([]);
    });

    it('should validate all supported variables', () => {
      const template =
        '{{firstName}} {{lastName}} {{fullName}} {{company}} {{email}} {{linkedinUrl}}';
      const result = service.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.unsupportedVariables).toEqual([]);
    });

    it('should allow custom field variables when provided', () => {
      const template = 'Hi {{firstName}}, you work in {{industry}}';
      const result = service.validateTemplate(template, ['industry']);

      expect(result.valid).toBe(true);
      expect(result.unsupportedVariables).toEqual([]);
    });

    it('should detect unsupported custom fields', () => {
      const template = 'Hi {{firstName}}, you work in {{industry}}';
      const result = service.validateTemplate(template); // No custom fields provided

      expect(result.valid).toBe(false);
      expect(result.unsupportedVariables).toContain('industry');
    });
  });

  describe('previewTemplate', () => {
    it('should generate preview with sample data', () => {
      const subject = 'Hi {{firstName}}!';
      const body = 'Welcome to {{company}}, {{fullName}}';

      const result = service.previewTemplate(subject, body);

      expect(result.subject).toBe('Hi John!');
      expect(result.body).toContain('Welcome to');
      expect(result.body).toContain('John Doe'); // Default sample has "Doe" not "Smith"
    });

    it('should use provided contact data', () => {
      const subject = 'Hi {{firstName}}!';
      const body = 'Welcome to {{company}}';

      const result = service.previewTemplate(subject, body, mockContact);

      expect(result.subject).toBe('Hi John!');
      expect(result.body).toBe('Welcome to Acme Inc');
    });

    it('should handle empty subject and body', () => {
      const result = service.previewTemplate('', '');

      expect(result.subject).toBe('');
      expect(result.body).toBe('');
    });

    it('should generate consistent sample data', () => {
      const subject = '{{firstName}}';
      const body = '{{firstName}}';

      const result = service.previewTemplate(subject, body);

      // Same variable should have same value
      expect(result.subject).toBe(result.body);
      expect(result.subject).toBe('John'); // Default sample firstName
    });

    it('should use default sample contact when not provided', () => {
      const subject = '{{company}}';
      const body = '{{email}}';

      const result = service.previewTemplate(subject, body);

      expect(result.subject).toBe('Acme Corp'); // Default company
      expect(result.body).toBe('john@acme.com'); // Default email
    });
  });

  describe('getSupportedVariables', () => {
    it('should return list of supported variables', () => {
      const result = service.getSupportedVariables();

      expect(result).toContain('firstName');
      expect(result).toContain('lastName');
      expect(result).toContain('fullName');
      expect(result).toContain('company');
      expect(result).toContain('email');
      expect(result).toContain('linkedinUrl');
    });

    it('should return at least 6 variables', () => {
      const result = service.getSupportedVariables();
      expect(result.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('edge cases', () => {
    it('should handle contact with only firstName', () => {
      const contact = { firstName: 'Jane' };
      const template = 'Hi {{firstName}} {{lastName}}';
      const result = service.replaceVariables(template, contact);
      expect(result).toContain('Jane');
    });

    it('should handle contact with special characters', () => {
      const contact = {
        firstName: "O'Brien",
        company: 'Smith & Sons',
      };
      const template = '{{firstName}} at {{company}}';
      const result = service.replaceVariables(template, contact);
      expect(result).toBe("O'Brien at Smith & Sons");
    });

    it('should handle very long variable values', () => {
      const contact = {
        company: 'A'.repeat(1000),
      };
      const template = '{{company}}';
      const result = service.replaceVariables(template, contact);
      expect(result.length).toBe(1000);
    });

    it('should handle template with many variables', () => {
      const template = Array(100).fill('{{firstName}}').join(' ');
      const result = service.replaceVariables(template, mockContact);
      expect(result.split('John').length - 1).toBe(100);
    });
  });
});
