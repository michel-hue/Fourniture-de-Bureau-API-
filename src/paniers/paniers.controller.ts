import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FrenchParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { PaniersService } from './paniers.service';

@ApiTags('panier')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('panier')
export class PaniersController {
  constructor(private readonly paniersService: PaniersService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer le panier de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Panier récupéré avec succès' })
  getPanier(@Req() req: AuthenticatedRequest) {
    return this.paniersService.getPanier(req.user.sub);
  }

  @Post('items')
  @HttpCode(201)
  @ApiOperation({ summary: 'Ajouter un article au panier' })
  @ApiResponse({ status: 201, description: 'Article ajouté au panier' })
  @ApiResponse({ status: 404, description: 'Produit ou stock introuvable' })
  @ApiResponse({
    status: 400,
    description: 'Stock insuffisant ou produit inactif',
  })
  addItem(@Req() req: AuthenticatedRequest, @Body() dto: AddToCartDto) {
    return this.paniersService.addItem(req.user.sub, dto);
  }

  @Patch('items/:detailId')
  @ApiOperation({ summary: "Modifier la quantité d'un article du panier" })
  @ApiResponse({ status: 200, description: 'Quantité mise à jour avec succès' })
  @ApiResponse({
    status: 400,
    description: 'Identifiant invalide ou stock insuffisant',
  })
  @ApiResponse({ status: 404, description: 'Article du panier introuvable' })
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('detailId', FrenchParseUUIDPipe) detailId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.paniersService.updateItem(req.user.sub, detailId, dto);
  }

  @Delete('items/:detailId')
  @ApiOperation({ summary: 'Retirer un article du panier' })
  @ApiResponse({ status: 200, description: 'Article retiré du panier' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Article du panier introuvable' })
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('detailId', FrenchParseUUIDPipe) detailId: string,
  ) {
    return this.paniersService.removeItem(req.user.sub, detailId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vider le panier' })
  @ApiResponse({ status: 200, description: 'Panier vidé avec succès' })
  clearPanier(@Req() req: AuthenticatedRequest) {
    return this.paniersService.clearPanier(req.user.sub);
  }
}
