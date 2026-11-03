import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FrenchParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StocksService } from './stocks.service';

@ApiTags('stocks')
@ApiBearerAuth()
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Créer un stock pour un produit (admin)' })
  @ApiResponse({ status: 201, description: 'Stock créé avec succès' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Un stock existe déjà pour ce produit',
  })
  create(@Body() createStockDto: CreateStockDto) {
    return this.stocksService.create(createStockDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les stocks (admin)' })
  @ApiResponse({ status: 200, description: 'Stocks récupérés' })
  findAll() {
    return this.stocksService.findAll();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Lister les stocks en alerte (admin)' })
  @ApiResponse({ status: 200, description: 'Stocks en alerte récupérés' })
  getAlerts() {
    return this.stocksService.getAlerts();
  }

  @Get('produit/:produitId')
  @ApiOperation({ summary: "Récupérer le stock d'un produit (admin)" })
  @ApiResponse({ status: 200, description: 'Stock récupéré' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Stock introuvable' })
  findOneByProduit(@Param('produitId', FrenchParseUUIDPipe) produitId: string) {
    return this.stocksService.findOneByProduit(produitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un stock par ID (admin)' })
  @ApiResponse({ status: 200, description: 'Stock récupéré' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Stock introuvable' })
  findOne(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.stocksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un stock (admin)' })
  @ApiResponse({ status: 200, description: 'Stock mis à jour' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Stock introuvable' })
  update(
    @Param('id', FrenchParseUUIDPipe) id: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.stocksService.update(id, updateStockDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un stock (admin)' })
  @ApiResponse({ status: 200, description: 'Stock supprimé' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Stock introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Stock référencé par d’autres données',
  })
  remove(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.stocksService.remove(id);
  }
}
