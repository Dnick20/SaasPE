import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  IsEnum,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Enums for type safety
export enum BillingCadence {
  FIXED_FEE = 'fixed_fee',
  MONTHLY_RETAINER = 'monthly_retainer',
  HOURLY = 'hourly',
}

export enum LineItemType {
  CORE = 'core',
  TIER = 'tier',
  ADDON = 'addon',
  THIRD_PARTY = 'thirdParty',
}

export enum UnitType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
  MONTHLY = 'monthly',
}

export enum NoteType {
  PAYMENT_METHOD = 'payment_method',
  TERMS = 'terms',
  CANCELLATION = 'cancellation',
  GENERAL = 'general',
}

// ============================================================================
// Line Item DTOs
// ============================================================================

export class CreateLineItemDto {
  @ApiProperty({
    description: 'Type of line item',
    enum: LineItemType,
    example: LineItemType.CORE,
  })
  @IsEnum(LineItemType)
  lineType: LineItemType;

  @ApiProperty({
    description: 'Narrative description of the line item',
    example:
      'Twenty Hour Diagnostic Sprint • Fixed fee for one month, up to twenty hours',
    minLength: 20,
  })
  @IsString()
  @MinLength(20, {
    message:
      'Line item description must be at least 20 characters for narrative clarity',
  })
  description: string;

  @ApiProperty({
    description: 'Amount in USD',
    example: 2000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Unit type for pricing',
    enum: UnitType,
    example: UnitType.FIXED,
  })
  @IsEnum(UnitType)
  unitType: UnitType;

  @ApiPropertyOptional({
    description: 'Number of hours included (if applicable)',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  hoursIncluded?: number;

  @ApiPropertyOptional({
    description: 'Whether this line item requires client approval',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes for this line item',
    example: 'Unused hours do not roll over',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateLineItemDto extends CreateLineItemDto {
  @ApiProperty({
    description: 'Line item ID',
    example: 'line-item-uuid-123',
  })
  @IsString()
  id: string;
}

export class LineItemResponseDto {
  @ApiProperty({
    description: 'Line item ID',
    example: 'line-item-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Type of line item',
    enum: LineItemType,
    example: LineItemType.CORE,
  })
  lineType: LineItemType;

  @ApiProperty({
    description: 'Narrative description',
    example: 'Twenty Hour Diagnostic Sprint • Fixed fee for one month',
  })
  description: string;

  @ApiProperty({
    description: 'Amount in USD',
    example: 2000,
  })
  amount: number;

  @ApiProperty({
    description: 'Unit type',
    enum: UnitType,
    example: UnitType.FIXED,
  })
  unitType: UnitType;

  @ApiPropertyOptional({
    description: 'Hours included',
    example: 20,
  })
  hoursIncluded?: number;

  @ApiPropertyOptional({
    description: 'Requires approval',
    example: false,
  })
  requiresApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  notes?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  created: string;
}

// ============================================================================
// Pricing Option DTOs
// ============================================================================

export class CreatePricingOptionDto {
  @ApiProperty({
    description: 'Option label',
    example: 'Option A: Diagnostic Sprint',
    minLength: 5,
  })
  @IsString()
  @MinLength(5)
  label: string;

  @ApiProperty({
    description: 'Billing cadence',
    enum: BillingCadence,
    example: BillingCadence.FIXED_FEE,
  })
  @IsEnum(BillingCadence)
  billingCadence: BillingCadence;

  @ApiProperty({
    description: 'Summary paragraph explaining this option',
    example: 'This fixed-fee engagement provides a comprehensive diagnostic...',
    minLength: 50,
  })
  @IsString()
  @MinLength(50, {
    message: 'Summary must be at least 50 characters for narrative clarity',
  })
  summary: string;

  @ApiPropertyOptional({
    description: 'Tier type (if tiered pricing)',
    example: 'tiered',
  })
  @IsOptional()
  @IsString()
  tierType?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: 'Net 30, ACH or wire transfer preferred',
  })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Cancellation notice requirements',
    example: '30-day notice required for cancellation',
  })
  @IsOptional()
  @IsString()
  cancellationNotice?: string;

  @ApiPropertyOptional({
    description: 'Mark as recommended option',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({
    description: 'Line items for this pricing option',
    type: [CreateLineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems: CreateLineItemDto[];
}

export class UpdatePricingOptionDto {
  @ApiPropertyOptional({
    description: 'Option label',
    example: 'Option A: Diagnostic Sprint',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  label?: string;

  @ApiPropertyOptional({
    description: 'Billing cadence',
    enum: BillingCadence,
  })
  @IsOptional()
  @IsEnum(BillingCadence)
  billingCadence?: BillingCadence;

  @ApiPropertyOptional({
    description: 'Summary paragraph',
    minLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  summary?: string;

  @ApiPropertyOptional({
    description: 'Tier type',
  })
  @IsOptional()
  @IsString()
  tierType?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
  })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Cancellation notice',
  })
  @IsOptional()
  @IsString()
  cancellationNotice?: string;

  @ApiPropertyOptional({
    description: 'Mark as recommended',
  })
  @IsOptional()
  @IsBoolean()
  isRecommended?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order',
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class PricingOptionResponseDto {
  @ApiProperty({
    description: 'Pricing option ID',
    example: 'pricing-option-uuid-456',
  })
  id: string;

  @ApiProperty({
    description: 'Proposal ID',
    example: 'proposal-uuid-789',
  })
  proposalId: string;

  @ApiProperty({
    description: 'Option label',
    example: 'Option A: Diagnostic Sprint',
  })
  label: string;

  @ApiProperty({
    description: 'Billing cadence',
    enum: BillingCadence,
    example: BillingCadence.FIXED_FEE,
  })
  billingCadence: BillingCadence;

  @ApiProperty({
    description: 'Summary paragraph',
    example: 'This fixed-fee engagement provides...',
  })
  summary: string;

  @ApiPropertyOptional({
    description: 'Tier type',
    example: 'single',
  })
  tierType?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: 'Net 30, ACH preferred',
  })
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Cancellation notice',
    example: '30-day notice required',
  })
  cancellationNotice?: string;

  @ApiProperty({
    description: 'Is this the recommended option',
    example: false,
  })
  isRecommended: boolean;

  @ApiProperty({
    description: 'Sort order',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Line items',
    type: [LineItemResponseDto],
  })
  lineItems: LineItemResponseDto[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  created: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  updated: string;
}

// ============================================================================
// Pricing Note DTOs
// ============================================================================

export class CreatePricingNoteDto {
  @ApiProperty({
    description: 'Note type',
    enum: NoteType,
    example: NoteType.PAYMENT_METHOD,
  })
  @IsEnum(NoteType)
  noteType: NoteType;

  @ApiProperty({
    description: 'Note content',
    example: 'Payment accepted via ACH, wire transfer, or credit card',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePricingNoteDto {
  @ApiPropertyOptional({
    description: 'Note type',
    enum: NoteType,
  })
  @IsOptional()
  @IsEnum(NoteType)
  noteType?: NoteType;

  @ApiPropertyOptional({
    description: 'Note content',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class PricingNoteResponseDto {
  @ApiProperty({
    description: 'Pricing note ID',
    example: 'pricing-note-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Proposal ID',
    example: 'proposal-uuid-789',
  })
  proposalId: string;

  @ApiProperty({
    description: 'Note type',
    enum: NoteType,
    example: NoteType.PAYMENT_METHOD,
  })
  noteType: NoteType;

  @ApiProperty({
    description: 'Note content',
    example: 'Payment accepted via ACH, wire transfer, or credit card',
  })
  content: string;

  @ApiProperty({
    description: 'Sort order',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  created: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  updated: string;
}
