import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProposalDto } from './update-proposal.dto';

describe('UpdateProposalDto validation', () => {
  it('accepts structured pricingOptions array', async () => {
    const dto = plainToInstance(UpdateProposalDto, {
      pricingOptions: [
        {
          name: 'Starter',
          description: 'Essential',
          items: [{ name: 'Email Campaign', price: 3500 }],
          total: 3500,
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('accepts timeline as array of phases', async () => {
    const dto = plainToInstance(UpdateProposalDto, {
      timeline: [
        { title: 'Discovery', start: '2025-01-01', end: '2025-01-07', status: 'planned' },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});



