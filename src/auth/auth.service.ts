import {
  BadRequestException,
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
import { ChangePasswordDto, UpdateMeDto } from './dto/update-me.dto';
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

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (dto.nom !== undefined) user.nom = dto.nom.trim();
    if (dto.prenom !== undefined) user.prenom = dto.prenom.trim();
    if (dto.telephone !== undefined) user.telephone = dto.telephone.trim();

    const saved = await this.userRepository.save(user);
    const { password: _password, ...result } = saved;

    return {
      success: true,
      message: 'Profil mis à jour',
      data: result,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const valid = await bcrypt.compare(dto.ancien_password, user.password);
    if (!valid) {
      // 400 et non 401 : côté front, un 401 authentifié signifie « session expirée »
      // et déconnecterait l'utilisateur pour une simple faute de frappe.
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    user.password = await bcrypt.hash(dto.nouveau_password, 10);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Mot de passe modifié',
    };
  }
  /**
   * Liste des utilisateurs (admin) avec un résumé d'activité :
   * nombre de commandes et montant total dépensé (hors commandes annulées).
   */
  async findAllUsers() {
    const rows: Array<{
      id: string;
      nom: string;
      prenom: string;
      email: string;
      telephone: string | null;
      role: string;
      created_at: Date;
      nb_commandes: string;
      total_depense: string | null;
    }> = await this.userRepository.query(`
      SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.role, u.created_at,
             COUNT(c.id) AS nb_commandes,
             COALESCE(SUM(c.montant_total) FILTER (WHERE c.statut <> 'ANNULEE'), 0) AS total_depense
      FROM users u
      LEFT JOIN commandes c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    return {
      success: true,
      message: 'Utilisateurs récupérés',
      data: rows.map((row) => ({
        ...row,
        nb_commandes: Number(row.nb_commandes),
        total_depense: Number(row.total_depense ?? 0),
      })),
    };
  }
}
