import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Profile } from '../profiles/entities/profile.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      nom: registerDto.nom,
      prenom: registerDto.prenom,
      email: registerDto.email,
      password: hashedPassword,
      telephone: registerDto.telephone,
      role: 'client',
    });

    const savedUser = await this.userRepository.save(user);

    // Créer un profil vide associé à l'utilisateur
    const profile = this.profileRepository.create({
      user_id: savedUser.id,
    });
    await this.profileRepository.save(profile);

    const { password: _password, ...result } = savedUser;

    return {
      success: true,
      message: 'Inscription réussie',
      data: result,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    const { password: _password, ...result } = user;

    return {
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: result,
      },
    };
  }

  async me(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const { password: _password, ...result } = user;

    return {
      success: true,
      message: 'Utilisateur connecté',
      data: result,
    };
  }
}
