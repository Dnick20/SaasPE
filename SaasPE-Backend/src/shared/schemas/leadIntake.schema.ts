// Lead Intake Schema for Structured Extraction
// Defines the exact JSON structure we want from OpenAI's Responses API

export const LeadIntakeSchema = {
  name: 'LeadIntake',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      company: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          industry: { type: 'string' },
          website: { type: 'string' },
          budget_note: { type: 'string' },
          timeline_note: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'Prospect',
              'Active',
              'Pilot',
              'Closed Won',
              'Closed Lost',
              'Unknown',
            ],
          },
          hubspot_deal_id: { type: 'string' },
        },
        required: [
          'name',
          'industry',
          'website',
          'budget_note',
          'timeline_note',
          'status',
          'hubspot_deal_id',
        ],
      },
      primary_contact: {
        type: 'object',
        additionalProperties: false,
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          linkedin_url: { type: 'string' },
        },
        required: ['first_name', 'last_name', 'email', 'phone', 'linkedin_url'],
      },
      alt_contacts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            role_or_note: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['role_or_note', 'first_name', 'last_name', 'email'],
        },
      },
      business_details: {
        type: 'object',
        additionalProperties: false,
        properties: {
          problem_statement: { type: 'string' },
          current_tools_systems_csv: { type: 'string' },
          deliverables_logistics: { type: 'string' },
          key_meetings_schedule: { type: 'string' },
        },
        required: [
          'problem_statement',
          'current_tools_systems_csv',
          'deliverables_logistics',
          'key_meetings_schedule',
        ],
      },
      provenance: {
        type: 'object',
        additionalProperties: false,
        properties: {
          transcript_date: { type: 'string' },
          confidence_notes: { type: 'string' },
          missing_fields: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['transcript_date', 'confidence_notes', 'missing_fields'],
      },
    },
    required: [
      'company',
      'primary_contact',
      'alt_contacts',
      'business_details',
      'provenance',
    ],
  },
} as const;

// TypeScript interfaces for type safety
export interface LeadIntake {
  company: {
    name: string;
    industry?: string;
    website?: string;
    budget_note?: string;
    timeline_note?: string;
    status?:
      | 'Prospect'
      | 'Active'
      | 'Pilot'
      | 'Closed Won'
      | 'Closed Lost'
      | 'Unknown';
    hubspot_deal_id?: string;
  };
  primary_contact?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
  };
  alt_contacts?: Array<{
    role_or_note?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }>;
  business_details?: {
    problem_statement?: string;
    current_tools_systems_csv?: string;
    deliverables_logistics?: string;
    key_meetings_schedule?: string;
  };
  provenance?: {
    transcript_date?: string;
    confidence_notes?: string;
    missing_fields?: string[];
  };
}
