import { ClientsService } from './clients.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { ContactsService } from '../contacts/contacts.service';

describe('ClientsService (rich fields)', () => {
  let service: ClientsService;
  const prismaMock = {
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'client-1', ...data, created: new Date(), updated: new Date() })
      ),
    },
  } as unknown as PrismaService;

  const contactsMock = {
    create: jest.fn().mockResolvedValue(undefined),
  } as unknown as ContactsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientsService(prismaMock, contactsMock);
  });

  it('persists rich lead-intake fields on create', async () => {
    const dto = {
      companyName: 'Acme',
      budgetNote: 'Clay $800/mo + 20 hours',
      timelineNote: 'Weekly sync, MVP by Q2',
      additionalContacts: [
        { role_or_note: 'Decision Maker', first_name: 'Jane', last_name: 'Smith', email: 'jane@acme.com' },
      ],
      deliverablesLogistics: '• CSV weekly\n• JSON via API',
      keyMeetingsSchedule: '• Mondays 10am EST',
    } as any;

    const result = await service.create('tenant-1', 'user-1', dto);

    expect(prismaMock.client.create).toHaveBeenCalled();
    const call = (prismaMock.client.create as any).mock.calls[0][0];
    expect(call.data.budgetNote).toBe(dto.budgetNote);
    expect(call.data.timelineNote).toBe(dto.timelineNote);
    expect(call.data.additionalContacts).toEqual(dto.additionalContacts);
    expect(call.data.deliverablesLogistics).toBe(dto.deliverablesLogistics);
    expect(call.data.keyMeetingsSchedule).toBe(dto.keyMeetingsSchedule);

    // Contact auto-creation attempted
    expect(contactsMock.create).toHaveBeenCalledTimes(1);

    // Result mapping includes new fields
    expect(result).toHaveProperty('budgetNote', dto.budgetNote);
    expect(result).toHaveProperty('timelineNote', dto.timelineNote);
  });
});


