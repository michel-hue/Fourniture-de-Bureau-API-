import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Produit } from '../produits/entities/produit.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { PanierDetail } from './entities/panier-detail.entity';
import { Panier } from './entities/panier.entity';

@Injectable()
export class PaniersService {
  constructor(
    @InjectRepository(Panier)
    private readonly panierRepository: Repository<Panier>,
    @InjectRepository(PanierDetail)
    private readonly panierDetailRepository: Repository<PanierDetail>,
    @InjectRepository(Produit)
    private readonly produitRepository: Repository<Produit>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  async getOrCreatePanier(userId: string): Promise<Panier> {
    let panier = await this.panierRepository.findOne({
      where: { user_id: userId },
    });

    if (!panier) {
      panier = this.panierRepository.create({ user_id: userId });
      panier = await this.panierRepository.save(panier);
    }

    return panier;
  }

  async getPanier(userId: string) {
    const panier = await this.getOrCreatePanier(userId);

    const panierWithDetails = await this.panierRepository.findOne({
      where: { id: panier.id },
      relations: { details: { produit: true } },
    });

    if (!panierWithDetails) {
      throw new NotFoundException('Panier introuvable');
    }

    const total = this.getTotal(panierWithDetails);

    return {
      success: true,
      message: 'Panier récupéré avec succès',
      data: { ...panierWithDetails, total },
    };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const produit = await this.produitRepository.findOne({
      where: { id: dto.produit_id },
    });

    if (!produit) {
      throw new NotFoundException('Produit introuvable');
    }

    if (!produit.actif) {
      throw new BadRequestException("Ce produit n'est plus disponible");
    }

    const stock = await this.stockRepository.findOne({
      where: { produit_id: dto.produit_id },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable pour ce produit');
    }

    if (stock.quantite < dto.quantite) {
      throw new BadRequestException('Stock insuffisant pour ce produit');
    }

    const panier = await this.getOrCreatePanier(userId);

    let detail = await this.panierDetailRepository.findOne({
      where: { panier_id: panier.id, produit_id: dto.produit_id },
    });

    if (detail) {
      const nouvelleQuantite = detail.quantite + dto.quantite;

      if (stock.quantite < nouvelleQuantite) {
        throw new BadRequestException('Stock insuffisant pour ce produit');
      }

      detail.quantite = nouvelleQuantite;
      await this.panierDetailRepository.save(detail);
    } else {
      detail = this.panierDetailRepository.create({
        panier_id: panier.id,
        produit_id: dto.produit_id,
        quantite: dto.quantite,
        prix_unitaire: Number(produit.prix),
      });
      await this.panierDetailRepository.save(detail);
    }

    // Retourner le panier complet (avec details + total) pour le frontend
    return this.getPanier(userId);
  }

  async updateItem(userId: string, detailId: string, dto: UpdateCartItemDto) {
    const panier = await this.getOrCreatePanier(userId);

    const detail = await this.panierDetailRepository.findOne({
      where: { id: detailId, panier_id: panier.id },
    });

    if (!detail) {
      throw new NotFoundException('Article du panier introuvable');
    }

    const stock = await this.stockRepository.findOne({
      where: { produit_id: detail.produit_id },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable pour ce produit');
    }

    if (stock.quantite < dto.quantite) {
      throw new BadRequestException('Stock insuffisant pour ce produit');
    }

    detail.quantite = dto.quantite;
    await this.panierDetailRepository.save(detail);

    // Retourner le panier complet (avec details + total) pour le frontend
    return this.getPanier(userId);
  }

  async removeItem(userId: string, detailId: string) {
    const panier = await this.getOrCreatePanier(userId);

    const detail = await this.panierDetailRepository.findOne({
      where: { id: detailId, panier_id: panier.id },
    });

    if (!detail) {
      throw new NotFoundException('Article du panier introuvable');
    }

    await this.panierDetailRepository.remove(detail);

    // Retourner le panier complet (avec details + total) pour le frontend
    return this.getPanier(userId);
  }

  async clearPanier(userId: string) {
    const panier = await this.getOrCreatePanier(userId);

    await this.panierDetailRepository.delete({ panier_id: panier.id });

    // Retourner le panier complet (avec details + total) pour le frontend
    return this.getPanier(userId);
  }

  getTotal(panier: Panier): number {
    if (!panier.details || panier.details.length === 0) {
      return 0;
    }

    const total = panier.details.reduce(
      (somme, detail) => somme + Number(detail.prix_unitaire) * detail.quantite,
      0,
    );

    return Math.round(total * 100) / 100;
  }
}
