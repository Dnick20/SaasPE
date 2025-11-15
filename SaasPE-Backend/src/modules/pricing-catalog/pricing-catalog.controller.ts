import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PricingCatalogService } from './pricing-catalog.service';
import { PricingCatalogItemDto } from './dto/pricing-catalog.dto';

@ApiTags('Pricing Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing-catalog')
export class PricingCatalogController {
  constructor(private readonly service: PricingCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List pricing catalog items' })
  @ApiResponse({ status: 200, description: 'Catalog items returned' })
  async list(@Request() req) {
    return this.service.list(req.user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a pricing catalog item' })
  @ApiResponse({ status: 201, description: 'Item created' })
  async create(@Request() req, @Body() dto: PricingCatalogItemDto) {
    return this.service.addItem(req.user.id, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a pricing catalog item' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: Partial<PricingCatalogItemDto>,
  ) {
    return this.service.updateItem(req.user.id, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete a pricing catalog item' })
  @ApiResponse({ status: 200, description: 'Item deleted' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.service.deleteItem(req.user.id, id);
  }
}


