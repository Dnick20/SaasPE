import { ProposalComposerService } from './proposal-composer.service';

describe('ProposalComposerService - defaults', () => {
  const openaiStub: any = { client: { chat: { completions: { create: jest.fn() } } } };
  const service = new ProposalComposerService(openaiStub);

  it('generate default pricing includes requested standard services', async () => {
    // @ts-expect-error private method - test via validateAndEnhance pathway by providing empty pricing
    const client = { companyName: 'Acme Corp', budgetNote: '$10,000' } as any;
    const base: any = {
      title: 'Proposal',
      executiveSummary: '',
      problemStatement: '',
      proposedSolution: '',
      scope: [],
      timeline: [],
      pricingOptions: [],
    };

    // @ts-ignore accessing private for test purposes
    const enhanced = (service as any).validateAndEnhance(base, client);
    const names = enhanced.pricingOptions.flatMap((o: any) => o.items.map((i: any) => i.name));

    expect(names).toEqual(
      expect.arrayContaining([
        'Email Campaign',
        'Messaging & Engagement',
        'Response Management System',
        'Playbook Creation',
        'Geographic Targeting',
        'Data Management Enhancement',
      ]),
    );
  });
});



