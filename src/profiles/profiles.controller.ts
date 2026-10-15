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
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Créer un profil pour l'utilisateur connecté" })
  @ApiResponse({ status: 201, description: 'Profil créé avec succès' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createProfileDto: CreateProfileDto,
  ) {
    return this.profilesService.create(req.user.sub, createProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les profils' })
  @ApiResponse({ status: 200, description: 'Profils récupérés' })
  findAll() {
    return this.profilesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un profil par ID' })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Profil introuvable' })
  findOne(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Profil introuvable' })
  update(
    @Param('id', FrenchParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un profil' })
  @ApiResponse({ status: 200, description: 'Profil supprimé' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Profil introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Profil référencé par d’autres données',
  })
  remove(@Param('id', FrenchParseUUIDPipe) id: string) {
    return this.profilesService.remove(id);
  }
}
