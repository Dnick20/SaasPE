import { ApiProperty } from '@nestjs/swagger';

export class ESignatureConnectionResponseDto {
  @ApiProperty({ example: 'uuid-123' })
  id: string;

  @ApiProperty({
    example: 'docusign',
    enum: ['docusign', 'adobe_sign', 'signnow', 'google_workspace'],
  })
  provider: string;

  @ApiProperty({ example: 'account-id-456' })
  accountId: string | null;

  @ApiProperty({ example: 'user@example.com' })
  email: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2025-01-20T14:45:00Z' })
  expiresAt: Date | null;

  @ApiProperty({ example: ['signature'] })
  scopes: string[];

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  created: Date;

  @ApiProperty({ example: '2025-01-20T14:45:00Z' })
  updated: Date;
}

export class ConnectionStatusDto {
  @ApiProperty({
    example: 'docusign',
    enum: ['docusign', 'adobe_sign', 'signnow', 'google_workspace'],
  })
  provider: string;

  @ApiProperty({ example: 'DocuSign' })
  displayName: string;

  @ApiProperty({ example: true })
  isConnected: boolean;

  @ApiProperty({ example: 'user@docusign.com' })
  connectedEmail: string | null;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  connectedAt: string | null;

  @ApiProperty({ example: '2025-02-15T10:30:00Z' })
  expiresAt: string | null;

  @ApiProperty({ example: 'account-id-456' })
  accountId: string | null;

  @ApiProperty({ example: ['signature', 'impersonation'] })
  scopes: string[];
}
