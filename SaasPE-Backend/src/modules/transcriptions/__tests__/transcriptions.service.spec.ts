import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { TranscriptionsService } from '../transcriptions.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { S3Service } from '../../../shared/services/s3.service';
import { OpenAIService } from '../../../shared/services/openai.service';
import { TokensService } from '../../tokens/tokens.service';

describe('TranscriptionsService', () => {
  let service: TranscriptionsService;
  let prisma: PrismaService;
  let s3Service: S3Service;

  const mockPrismaService = {
    transcription: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
    },
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    getPresignedDownloadUrl: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockOpenAIService = {
    extractLeadIntake: jest.fn().mockResolvedValue({ provenance: null }),
  } as any;

  const mockTokensService = {
    consumeTokens: jest.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: OpenAIService,
          useValue: mockOpenAIService,
        },
        {
          provide: TokensService,
          useValue: mockTokensService,
        },
        {
          provide: getQueueToken('transcription'),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken('proposal'),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TranscriptionsService>(TranscriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
    s3Service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadTranscription', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-audio.mp3',
      encoding: '7bit',
      mimetype: 'audio/mpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test'),
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    const tenantId = 'tenant-123';
    const s3Key = 'tenant-123/transcriptions/abc-def.mp3';

    it('should upload file and create transcription record', async () => {
      const userId = 'user-123';
      const mockTranscription = {
        id: 'transcription-123',
        tenantId,
        userId,
        fileName: 'test-audio.mp3',
        fileSize: mockFile.size,
        fileType: mockFile.mimetype,
        s3Key,
        s3Bucket: 'saaspe-uploads',
        status: 'uploaded',
        analyzed: false,
        created: new Date(),
      };

      mockS3Service.uploadFile.mockResolvedValue(s3Key);
      mockPrismaService.transcription.create.mockResolvedValue(
        mockTranscription,
      );
      mockPrismaService.transcription.update.mockResolvedValue({
        ...mockTranscription,
        jobId: '1',
      });
      mockQueue.add.mockResolvedValue({ id: 1 });

      const result = await service.uploadTranscription(
        tenantId,
        userId,
        mockFile,
      );

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        tenantId,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        'transcriptions',
      );
      expect(prisma.transcription.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith('transcribe', {
        transcriptionId: mockTranscription.id,
        tenantId,
        s3Key,
        fileName: mockFile.originalname,
      });
      expect(result.id).toBe(mockTranscription.id);
      expect(result.status).toBe('uploaded');
    });

    it('should reject invalid file types', async () => {
      const userId = 'user-123';
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      await expect(
        service.uploadTranscription(tenantId, userId, invalidFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files larger than 2GB', async () => {
      const userId = 'user-123';
      const largeFile = {
        ...mockFile,
        size: 3 * 1024 * 1024 * 1024, // 3GB
      };

      await expect(
        service.uploadTranscription(tenantId, userId, largeFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if client does not exist', async () => {
      const userId = 'user-123';
      mockPrismaService.client.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadTranscription(
          tenantId,
          userId,
          mockFile,
          'invalid-client-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const tenantId = 'tenant-123';

    it('should return paginated transcriptions', async () => {
      const mockTranscriptions = [
        {
          id: 'transcription-1',
          tenantId,
          fileName: 'audio1.mp3',
          fileSize: 1024,
          status: 'completed',
          analyzed: false,
          created: new Date(),
        },
        {
          id: 'transcription-2',
          tenantId,
          fileName: 'audio2.mp3',
          fileSize: 2048,
          status: 'processing',
          analyzed: false,
          created: new Date(),
        },
      ];

      mockPrismaService.transcription.count.mockResolvedValue(2);
      mockPrismaService.transcription.findMany.mockResolvedValue(
        mockTranscriptions,
      );

      const result = await service.findAll(tenantId, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrismaService.transcription.count.mockResolvedValue(1);
      mockPrismaService.transcription.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, 1, 20, 'completed');

      expect(prisma.transcription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    const tenantId = 'tenant-123';
    const transcriptionId = 'transcription-123';

    it('should return a single transcription', async () => {
      const mockTranscription = {
        id: transcriptionId,
        tenantId,
        fileName: 'audio.mp3',
        fileSize: 1024,
        status: 'completed',
        transcript: 'Test transcript',
        analyzed: true,
        created: new Date(),
      };

      mockPrismaService.transcription.findFirst.mockResolvedValue(
        mockTranscription,
      );

      const result = await service.findOne(tenantId, transcriptionId);

      expect(result.id).toBe(transcriptionId);
      expect(result.transcript).toBe('Test transcript');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.transcription.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, transcriptionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('analyzeTranscription', () => {
    const tenantId = 'tenant-123';
    const transcriptionId = 'transcription-123';

    it('should queue analysis job for completed transcription', async () => {
      const mockTranscription = {
        id: transcriptionId,
        tenantId,
        status: 'completed',
        transcript: 'Test transcript to analyze',
      };

      mockPrismaService.transcription.findFirst.mockResolvedValue(
        mockTranscription,
      );
      mockQueue.add.mockResolvedValue({ id: 2 });

      const result = await service.analyzeTranscription(
        tenantId,
        transcriptionId,
      );

      expect(mockQueue.add).toHaveBeenCalledWith('analyze', {
        transcriptionId,
        tenantId,
      });
      expect(result.status).toBe('analyzing');
      expect(result.jobId).toBe('2');
    });

    it('should throw BadRequestException if transcription is not completed', async () => {
      const mockTranscription = {
        id: transcriptionId,
        tenantId,
        status: 'processing',
        transcript: null,
      };

      mockPrismaService.transcription.findFirst.mockResolvedValue(
        mockTranscription,
      );

      await expect(
        service.analyzeTranscription(tenantId, transcriptionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no transcript exists', async () => {
      const mockTranscription = {
        id: transcriptionId,
        tenantId,
        status: 'completed',
        transcript: null,
      };

      mockPrismaService.transcription.findFirst.mockResolvedValue(
        mockTranscription,
      );

      await expect(
        service.analyzeTranscription(tenantId, transcriptionId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
