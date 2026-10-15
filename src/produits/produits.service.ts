import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categorie } from '../categories/entities/categorie.entity';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { Produit } from './entities/produit.entity';

export interface ProduitsQuery {
  page?: number;
  limit?: number;
  categorie_id?: string;
  search?: string;
  prix_min?: number;
  prix_max?: number;
  sort?: string;
}

@Injectable()
export class ProduitsService {
  constructor(
    @InjectRepository(Produit)
    private readonly produitRepository: Repository<Produit>,
    @InjectRepository(Categorie)
    private readonly categorieRepository: Repository<Categorie>,
  ) {}

  async create(createProduitDto: CreateProduitDto) {
    const categorie = await this.categorieRepository.findOne({
      where: { id: createProduitDto.categorie_id },
    });

    if (!categorie) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const produit = this.produitRepository.create(createProduitDto);
    const savedProduit = await this.produitRepository.save(produit);

    return {
      success: true,
      message: 'Produit créé avec succès',
      data: savedProduit,
    };
  }

  async findAll(query: ProduitsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const qb = this.produitRepository
      .createQueryBuilder('produit')
      .leftJoinAndSelect('produit.categorie', 'categorie')
      .leftJoinAndSelect('produit.images', 'images')
      .where('produit.actif = :actif', { actif: true });

    if (query.categorie_id) {
      qb.andWhere('produit.categorie_id = :categorie_id', {
        categorie_id: query.categorie_id,
      });
    }

    if (query.search) {
      qb.andWhere('produit.nom ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.prix_min !== undefined) {
      qb.andWhere('produit.prix >= :prix_min', {
        prix_min: query.prix_min,
      });
    }

    if (query.prix_max !== undefined) {
      qb.andWhere('produit.prix <= :prix_max', {
        prix_max: query.prix_max,
      });
    }

    switch (query.sort) {
      case 'prix_asc':
        qb.orderBy('produit.prix', 'ASC');
        break;
      case 'prix_desc':
        qb.orderBy('produit.prix', 'DESC');
        break;
      case 'note':
        qb.orderBy('produit.note_moyenne', 'DESC');
        break;
      case 'nouveautes':
      default:
        qb.orderBy('produit.created_at', 'DESC');
        break;
    }

    const [produits, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      success: true,
      message: 'Produits récupérés avec succès',
      data: produits,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const produit = await this.produitRepository.findOne({
      where: { id },
      relations: { categorie: true, images: true },
    });

    if (!produit) {
      throw new NotFoundException('Produit introuvable');
    }

    return {
      success: true,
      message: 'Produit récupéré avec succès',
      data: produit,
    };
  }

  async update(id: string, updateProduitDto: UpdateProduitDto) {
    const produit = await this.produitRepository.findOne({
      where: { id },
    });

    if (!produit) {
      throw new NotFoundException('Produit introuvable');
    }

    if (
      updateProduitDto.categorie_id &&
      updateProduitDto.categorie_id !== produit.categorie_id
    ) {
      const categorie = await this.categorieRepository.findOne({
        where: { id: updateProduitDto.categorie_id },
      });

      if (!categorie) {
        throw new NotFoundException('Catégorie introuvable');
      }
    }

    Object.assign(produit, updateProduitDto);
    const updatedProduit = await this.produitRepository.save(produit);

    return {
      success: true,
      message: 'Produit mis à jour avec succès',
      data: updatedProduit,
    };
  }

  async remove(id: string) {
    const produit = await this.produitRepository.findOne({
      where: { id },
    });

    if (!produit) {
      throw new NotFoundException('Produit introuvable');
    }

    await this.produitRepository.remove(produit);

    return {
      success: true,
      message: 'Produit supprimé avec succès',
    };
  }

  async findFeatured(limit: number) {
    const produits = await this.produitRepository.find({
      where: { actif: true },
      relations: { categorie: true, images: true },
      order: { note_moyenne: 'DESC', created_at: 'DESC' },
      take: limit,
    });

    return {
      success: true,
      message: 'Produits en vedette récupérés avec succès',
      data: produits,
    };
  }
}
