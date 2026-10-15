import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateAdressDto } from './dto/create-adress.dto';
import { UpdateAdressDto } from './dto/update-adress.dto';
import { Adress } from './entities/adress.entity';

@Injectable()
export class AdressesService {
  constructor(
    @InjectRepository(Adress)
    private readonly adressRepository: Repository<Adress>,
  ) {}

  async create(userId: string, createAdressDto: CreateAdressDto) {
    const adress = this.adressRepository.create({
      user_id: userId,
      ...createAdressDto,
    });

    const savedAdress = await this.adressRepository.save(adress);

    return {
      success: true,
      message: 'Adresse créée avec succès',
      data: savedAdress,
    };
  }

  async findAll(userId: string) {
    const adresses = await this.adressRepository.find({
      where: { user_id: userId },
    });

    return {
      success: true,
      message: 'Adresses récupérées avec succès',
      data: adresses,
    };
  }

  async findOne(id: string) {
    const adress = await this.adressRepository.findOne({
      where: { id },
    });

    if (!adress) {
      throw new NotFoundException('Adresse introuvable');
    }

    return {
      success: true,
      message: 'Adresse récupérée avec succès',
      data: adress,
    };
  }

  async update(id: string, updateAdressDto: UpdateAdressDto) {
    const adress = await this.adressRepository.findOne({
      where: { id },
    });

    if (!adress) {
      throw new NotFoundException('Adresse introuvable');
    }

    Object.assign(adress, updateAdressDto);
    const updatedAdress = await this.adressRepository.save(adress);

    return {
      success: true,
      message: 'Adresse mise à jour avec succès',
      data: updatedAdress,
    };
  }

  async remove(id: string) {
    const adress = await this.adressRepository.findOne({
      where: { id },
    });

    if (!adress) {
      throw new NotFoundException('Adresse introuvable');
    }

    await this.adressRepository.remove(adress);

    return {
      success: true,
      message: 'Adresse supprimée avec succès',
    };
  }
}
