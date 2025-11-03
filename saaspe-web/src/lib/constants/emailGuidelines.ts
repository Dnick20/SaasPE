export interface GuidelineRule {
  text: string;
  required: boolean;
}

export interface GuidelineSection {
  id: string;
  title: string;
  icon: string;
  rules: GuidelineRule[];
  acknowledgmentRequired: boolean;
}

export const EMAIL_GUIDELINES: { sections: GuidelineSection[] } = {
  sections: [
    {
      id: 'subject-lines',
      title: 'Subject Lines',
      icon: '📧',
      rules: [
        { text: 'Keep to 5-7 words', required: true },
        { text: 'Use curiosity or relevance to spark interest', required: true },
        { text: 'Examples: "Quick question", "Introducing {{Name}}", "Your 2025 plan"', required: false },
      ],
      acknowledgmentRequired: true,
    },
    {
      id: 'body-content',
      title: 'Email Body',
      icon: '✍️',
      rules: [
        { text: 'Lead with value, not a pitch', required: true },
        { text: 'Keep under 500 characters', required: true },
        { text: 'Write as if emailing a colleague - conversational tone', required: true },
        { text: 'Use {{name}} and {{company}} for personalization', required: true },
        { text: 'Simple, low-pressure questions work best', required: false },
      ],
      acknowledgmentRequired: true,
    },
    {
      id: 'deliverability',
      title: 'Deliverability Rules',
      icon: '⚠️',
      rules: [
        { text: '❌ NO attachments in first email', required: true },
        { text: '❌ NO tracking pixels or open tracking in first email', required: true },
        { text: '❌ NO unsubscribe links in cold outreach', required: true },
        { text: '✅ Warm mailboxes before sending', required: true },
        { text: '✅ Use Spintax or small variations to avoid repetitive phrasing', required: false },
        { text: '✅ Rotate senders to spread volume and add authenticity', required: false },
      ],
      acknowledgmentRequired: true,
    },
    {
      id: 'social-proof',
      title: 'Social Proof',
      icon: '🏆',
      rules: [
        { text: 'Reference relevant companies you\'ve worked with', required: false },
        { text: 'Include quantified outcomes (e.g., "Helped X company grow revenue 56% in 60 days")', required: false },
        { text: 'Share personal experience when relevant (e.g., "After 5 years at Clay...")', required: false },
      ],
      acknowledgmentRequired: false,
    },
    {
      id: 'follow-ups',
      title: 'Follow-Up Best Practices',
      icon: '🔄',
      rules: [
        { text: 'Send 2-3 follow-ups, spaced 2-3 days apart', required: true },
        { text: 'Each should add something new (case study, fresh insight, resource)', required: true },
        { text: 'Light CTAs: "Want me to send details?" vs pushing for meeting', required: true },
      ],
      acknowledgmentRequired: false,
    },
    {
      id: 'signature',
      title: 'Email Signature',
      icon: '✒️',
      rules: [
        { text: 'Simple, human signature - avoid logos and heavy formatting', required: true },
        { text: 'Best formats: "Full Name", "Full Name | Company", "Full Name | Title | Company"', required: false },
        { text: 'Avoid long disclaimers', required: true },
      ],
      acknowledgmentRequired: false,
    },
  ],
};
