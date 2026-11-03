import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async create(userId: string, createProfileDto: CreateProfileDto) {
    const profile = this.profileRepository.create({
      user_id: userId,
      ...createProfileDto,
    });

    const savedProfile = await this.profileRepository.save(profile);

    return {
      success: true,
      message: 'Profil créé avec succès',
      data: savedProfile,
    };
  }

  async findAll() {
    const profiles = await this.profileRepository.find({
      relations: { user: true },
    });

    return {
      success: true,
      message: 'Profils récupérés avec succès',
      data: profiles,
    };
  }

  async findOne(id: string) {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Profil introuvable');
    }

    return {
      success: true,
      message: 'Profil récupéré avec succès',
      data: profile,
    };
  }

  async update(id: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.profileRepository.findOne({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Profil introuvable');
    }

    Object.assign(profile, updateProfileDto);
    const updatedProfile = await this.profileRepository.save(profile);

    return {
      success: true,
      message: 'Profil mis à jour avec succès',
      data: updatedProfile,
    };
  }

  async remove(id: string) {
    const profile = await this.profileRepository.findOne({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Profil introuvable');
    }

    await this.profileRepository.remove(profile);

    return {
      success: true,
      message: 'Profil supprimé avec succès',
    };
  }
}
