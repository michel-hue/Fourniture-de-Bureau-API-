import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';
import { Categorie } from './entities/categorie.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Categorie)
    private readonly categorieRepository: Repository<Categorie>,
  ) {}

  async create(createCategorieDto: CreateCategorieDto) {
    const categorie = this.categorieRepository.create(createCategorieDto);
    const savedCategorie = await this.categorieRepository.save(categorie);

    return {
      success: true,
      message: 'Catégorie créée avec succès',
      data: savedCategorie,
    };
  }

  async findAll() {
    const categories = await this.categorieRepository.find({
      order: { nom: 'ASC' },
    });

    return {
      success: true,
      message: 'Catégories récupérées avec succès',
      data: categories,
    };
  }

  async findOne(id: string) {
    const categorie = await this.categorieRepository.findOne({
      where: { id },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return {
      success: true,
      message: 'Catégorie récupérée avec succès',
      data: categorie,
    };
  }

  async update(id: string, updateCategorieDto: UpdateCategorieDto) {
    const categorie = await this.categorieRepository.findOne({
      where: { id },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    Object.assign(categorie, updateCategorieDto);
    const updatedCategorie = await this.categorieRepository.save(categorie);

    return {
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: updatedCategorie,
    };
  }

  async remove(id: string) {
    const categorie = await this.categorieRepository.findOne({
      where: { id },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    await this.categorieRepository.remove(categorie);

    return {
      success: true,
      message: 'Catégorie supprimée avec succès',
    };
  }
}
