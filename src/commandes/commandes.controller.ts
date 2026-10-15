import {
  Body,
  Controller,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { FrenchParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { CommandesService } from './commandes.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeStatutDto } from './dto/update-commande-statut.dto';

@ApiTags('commandes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commandes')
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Créer une commande à partir du panier' })
  @ApiResponse({ status: 201, description: 'Commande créée avec succès' })
  @ApiResponse({ status: 400, description: 'Panier vide ou stock insuffisant' })
  @ApiResponse({ status: 404, description: 'Adresse de livraison introuvable' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCommandeDto) {
    return this.commandesService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les commandes de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Commandes récupérées' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.commandesService.findAll(req.user.sub);
  }

  @Get('admin/all')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Lister toutes les commandes (admin)' })
  @ApiResponse({ status: 200, description: 'Commandes récupérées' })
  findAllAdmin() {
    return this.commandesService.findAllAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une commande par ID' })
  @ApiResponse({ status: 200, description: 'Commande récupérée' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Commande introuvable' })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', FrenchParseUUIDPipe) id: string,
  ) {
    return this.commandesService.findOne(req.user.sub, id);
  }

  @Patch(':id/statut')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: "Mettre à jour le statut d'une commande (admin)" })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Commande introuvable' })
  updateStatut(
    @Param('id', FrenchParseUUIDPipe) id: string,
    @Body() dto: UpdateCommandeStatutDto,
  ) {
    return this.commandesService.updateStatut(id, dto);
  }
}
