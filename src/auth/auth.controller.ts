import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Anti brute force : 5 tentatives / 60s par IP
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Utilisateur connecté' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.sub);
  }
}
