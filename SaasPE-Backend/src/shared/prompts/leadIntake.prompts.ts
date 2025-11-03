// Lead Intake Extraction Prompts
// Optimized for OpenAI structured outputs with prompt caching

export const extractorSystemPrompt = `You are a precise data extraction specialist. Your task is to extract ONLY facts explicitly present in meeting transcripts.

CRITICAL RULES:
1. Extract ONLY information that is explicitly stated in the transcript
2. If a field is missing or unclear, use an empty string ("") and list its name in provenance.missing_fields
3. NEVER invent websites, phone numbers, LinkedIn URLs, or any other data
4. NEVER make assumptions or inferences beyond what is clearly stated
5. Normalize notes like budget/timeline/status into concise phrases suitable for form display
6. If multiple people are mentioned, identify the best primary contact when possible
7. For array fields (alt_contacts, missing_fields), use empty array [] if no data found

OUTPUT REQUIREMENTS:
- All extracted data must be directly traceable to the transcript
- Use provenance.confidence_notes to flag any uncertainties or caveats
- Mark all unclear or missing information in provenance.missing_fields as an array of field names
- Keep notes concise and actionable for business use
- Use empty strings ("") for any string field that cannot be filled from the transcript`;

export const extractorUserTemplate = (
  transcript: string,
) => `SOURCE: Meeting transcript below (may contain small transcription errors).

TRANSCRIPT BEGIN
${transcript}
TRANSCRIPT END

EXTRACTION TASK: Fill the LeadIntake schema from this transcript.

FIELD GUIDELINES:
- company.name: The company or organization name mentioned
- company.industry: Brief phrase(s) summarizing the business vertical/sector mentioned
- company.website: ONLY if explicitly mentioned (do NOT generate or guess)
- company.budget_note: Any budget details, pricing plans, or cost mentions (e.g., "Clay $800/mo + 20 hours")
- company.timeline_note: Any timing commitments, deadlines, or checkpoints mentioned
- company.status: Pick from enum based on context ("Prospect", "Active", "Pilot", "Closed Won", "Closed Lost", "Unknown")
- company.hubspot_deal_id: ONLY if a HubSpot deal ID is mentioned

- primary_contact: The main day-to-day person identified (best point of contact)
- primary_contact.first_name: First name ONLY if mentioned
- primary_contact.last_name: Last name ONLY if mentioned
- primary_contact.email: Email address ONLY if mentioned
- primary_contact.phone: Phone number ONLY if mentioned
- primary_contact.linkedin_url: LinkedIn URL ONLY if explicitly shared

- alt_contacts: Array of any other people mentioned with their details
- alt_contacts[].role_or_note: Their role or context (e.g., "Technical Lead", "Decision Maker")
- alt_contacts[].first_name: First name if mentioned
- alt_contacts[].last_name: Last name if mentioned
- alt_contacts[].email: Email if mentioned

- business_details.problem_statement: 2-4 sentences summarizing the main business challenge or goal
- business_details.current_tools_systems_csv: Comma-separated list of tools/systems mentioned
- business_details.deliverables_logistics: 3-6 bullet points (plain text) describing who sends what, file formats, workflows
- business_details.key_meetings_schedule: Bullet points for recurring meetings with day/time (e.g., "• Weekly sync: Mondays 10am EST")

- provenance.transcript_date: Date of the meeting if mentioned
- provenance.confidence_notes: Short caveats or notes about data quality (e.g., "API integration details unclear; follow-up needed")
- provenance.missing_fields: Array of field names that couldn't be filled from the transcript

Return ONLY valid JSON matching the LeadIntake schema. No additional commentary.`;
