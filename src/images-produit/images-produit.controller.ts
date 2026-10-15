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
import { CreateImageProduitDto } from './dto/create-image-produit.dto';
import { UpdateImageProduitDto } from './dto/update-image-produit.dto';
import { ImagesProduitService } from './images-produit.service';

@ApiTags('images-produit')
@Controller('produits/:produitId/images')
export class ImagesProduitController {
  constructor(private readonly imagesProduitService: ImagesProduitService) {}

  @Post()
  @HttpCode(201)
  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Ajouter une image à un produit (admin)' })
  @ApiResponse({ status: 201, description: 'Image ajoutée avec succès' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  create(
    @Param('produitId', FrenchParseUUIDPipe) produitId: string,
    @Body() createImageProduitDto: CreateImageProduitDto,
  ) {
    return this.imagesProduitService.create(produitId, createImageProduitDto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les images d'un produit" })
  @ApiResponse({ status: 200, description: 'Images récupérées' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Produit introuvable' })
  findAll(@Param('produitId', FrenchParseUUIDPipe) produitId: string) {
    return this.imagesProduitService.findAll(produitId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Mettre à jour une image (admin)' })
  @ApiResponse({ status: 200, description: 'Image mise à jour' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Image introuvable' })
  update(
    @Param('id', FrenchParseUUIDPipe) id: string,
    @Body() updateImageProduitDto: UpdateImageProduitDto,
  ) {
    return this.imagesProduitService.update(id, updateImageProduitDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Supprimer une image (admin)' })
  @ApiResponse({ status: 200, description: 'Image supprimée' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Image introuvable' })
  remove(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.imagesProduitService.remove(id);
  }
}
