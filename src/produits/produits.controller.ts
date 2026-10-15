import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FrenchParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { ProduitsService } from './produits.service';

@ApiTags('produits')
@Controller('produits')
export class ProduitsController {
  constructor(private readonly produitsService: ProduitsService) {}

  @Post()
  @HttpCode(201)
  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Créer un produit (admin)' })
  @ApiResponse({ status: 201, description: 'Produit créé avec succès' })
  @ApiResponse({ status: 404, description: 'Catégorie introuvable' })
  create(@Body() createProduitDto: CreateProduitDto) {
    return this.produitsService.create(createProduitDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les produits (catalogue)' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre par page' })
  @ApiQuery({ name: 'categorie_id', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Recherche par nom',
  })
  @ApiQuery({ name: 'prix_min', required: false })
  @ApiQuery({ name: 'prix_max', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['prix_asc', 'prix_desc', 'nouveautes', 'note'],
  })
  @ApiResponse({ status: 200, description: 'Produits récupérés' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categorie_id') categorie_id?: string,
    @Query('search') search?: string,
    @Query('prix_min') prix_min?: string,
    @Query('prix_max') prix_max?: string,
    @Query('sort') sort?: string,
  ) {
    return this.produitsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      categorie_id,
      search,
      prix_min: prix_min !== undefined ? Number(prix_min) : undefined,
      prix_max: prix_max !== undefined ? Number(prix_max) : undefined,
      sort,
    });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Récupérer les produits en vedette' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre de produits',
  })
  @ApiResponse({ status: 200, description: 'Produits en vedette récupérés' })
  findFeatured(@Query('limit') limit?: string) {
    return this.produitsService.findFeatured(limit ? Number(limit) : 8);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un produit par ID' })
  @ApiResponse({ status: 200, description: 'Produit récupéré' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  findOne(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.produitsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Mettre à jour un produit (admin)' })
  @ApiResponse({ status: 200, description: 'Produit mis à jour' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  update(
    @Param('id', FrenchParseUUIDPipe) id: string,
    @Body() updateProduitDto: UpdateProduitDto,
  ) {
    return this.produitsService.update(id, updateProduitDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Supprimer un produit (admin)' })
  @ApiResponse({ status: 200, description: 'Produit supprimé' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Produit référencé par d’autres données',
  })
  remove(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.produitsService.remove(id);
  }
}
