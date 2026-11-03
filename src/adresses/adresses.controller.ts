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
import { AdressesService } from './adresses.service';
import { CreateAdressDto } from './dto/create-adress.dto';
import { UpdateAdressDto } from './dto/update-adress.dto';

@ApiTags('adresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('adresses')
export class AdressesController {
  constructor(private readonly adressesService: AdressesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Créer une adresse pour l'utilisateur connecté" })
  @ApiResponse({ status: 201, description: 'Adresse créée avec succès' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createAdressDto: CreateAdressDto,
  ) {
    return this.adressesService.create(req.user.sub, createAdressDto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les adresses de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Adresses récupérées' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.adressesService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une adresse par ID' })
  @ApiResponse({ status: 200, description: 'Adresse récupérée' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Adresse introuvable' })
  findOne(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.adressesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une adresse' })
  @ApiResponse({ status: 200, description: 'Adresse mise à jour' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Adresse introuvable' })
  update(
    @Param('id', FrenchParseUUIDPipe) id: string,
    @Body() updateAdressDto: UpdateAdressDto,
  ) {
    return this.adressesService.update(id, updateAdressDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une adresse' })
  @ApiResponse({ status: 200, description: 'Adresse supprimée' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Adresse introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Adresse référencée par une commande',
  })
  remove(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.adressesService.remove(id);
  }
}
