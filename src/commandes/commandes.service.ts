import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Adress } from '../adresses/entities/adress.entity';
import { PaniersService } from '../paniers/paniers.service';
import { Stock } from '../stocks/entities/stock.entity';
import { StocksService } from '../stocks/stocks.service';
import { CommandeNumeroService } from './commande-numero.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeStatutDto } from './dto/update-commande-statut.dto';
import { Commande } from './entities/commande.entity';

@Injectable()
export class CommandesService {
  constructor(
    @InjectRepository(Commande)
    private readonly commandeRepository: Repository<Commande>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Adress)
    private readonly adressRepository: Repository<Adress>,
    private readonly paniersService: PaniersService,
    private readonly stocksService: StocksService,
    private readonly commandeNumeroService: CommandeNumeroService,
  ) {}

  async create(userId: string, dto: CreateCommandeDto) {
    const panierResponse = await this.paniersService.getPanier(userId);
    const panier = panierResponse.data;

    if (!panier.details || panier.details.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    const adresse = await this.adressRepository.findOne({
      where: { id: dto.adresse_livraison_id, user_id: userId },
    });

    if (!adresse) {
      throw new NotFoundException('Adresse de livraison introuvable');
    }

    // Vérification préalable du stock pour tous les produits du panier
    for (const detail of panier.details) {
      const stock = await this.stockRepository.findOne({
        where: { produit_id: detail.produit_id },
      });

      if (!stock) {
        throw new NotFoundException('Stock introuvable pour ce produit');
      }

      if (stock.quantite < detail.quantite) {
        throw new BadRequestException('Stock insuffisant pour ce produit');
      }
    }

    const fraisLivraison = dto.frais_livraison ?? 0;

    const sousTotal = panier.details.reduce(
      (somme, detail) => somme + Number(detail.prix_unitaire) * detail.quantite,
      0,
    );

    const montantTotal = Math.round((sousTotal + fraisLivraison) * 100) / 100;

    const numero = await this.commandeNumeroService.nextNumero();

    const commande = this.commandeRepository.create({
      numero,
      user_id: userId,
      montant_total: montantTotal,
      frais_livraison: fraisLivraison,
      adresse_livraison_id: dto.adresse_livraison_id,
      statut: 'EN_ATTENTE',
      details: panier.details.map((detail) => ({
        produit_id: detail.produit_id,
        nom_produit: detail.produit?.nom ?? 'Produit',
        prix_unitaire: Number(detail.prix_unitaire),
        quantite: detail.quantite,
        sous_total:
          Math.round(Number(detail.prix_unitaire) * detail.quantite * 100) /
          100,
      })),
    });

    const savedCommande = await this.commandeRepository.save(commande);

    // Décrémenter le stock de chaque produit
    for (const detail of panier.details) {
      await this.decrementStock(detail.produit_id, detail.quantite);
    }

    // Vider le panier
    await this.paniersService.clearPanier(userId);

    const commandeComplete = await this.commandeRepository.findOne({
      where: { id: savedCommande.id },
      relations: { details: { produit: true }, adresse_livraison: true },
    });

    return {
      success: true,
      message: 'Commande créée avec succès',
      data: commandeComplete,
    };
  }

  async findAll(userId: string) {
    const commandes = await this.commandeRepository.find({
      where: { user_id: userId },
      relations: { details: { produit: true }, adresse_livraison: true },
      order: { created_at: 'DESC' },
    });

    return {
      success: true,
      message: 'Commandes récupérées avec succès',
      data: commandes,
    };
  }

  async findOne(userId: string, id: string) {
    const commande = await this.commandeRepository.findOne({
      where: { id, user_id: userId },
      relations: { details: { produit: true }, adresse_livraison: true },
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable');
    }

    return {
      success: true,
      message: 'Commande récupérée avec succès',
      data: commande,
    };
  }

  async updateStatut(id: string, dto: UpdateCommandeStatutDto) {
    const commande = await this.commandeRepository.findOne({
      where: { id },
    });

    if (!commande) {
      throw new NotFoundException('Commande introuvable');
    }

    commande.statut = dto.statut;
    const updatedCommande = await this.commandeRepository.save(commande);

    return {
      success: true,
      message: 'Statut de la commande mis à jour avec succès',
      data: updatedCommande,
    };
  }

  async findAllAdmin() {
    const commandes = await this.commandeRepository.find({
      relations: {
        details: { produit: true },
        adresse_livraison: true,
        user: true,
      },
      order: { created_at: 'DESC' },
    });

    return {
      success: true,
      message: 'Commandes récupérées avec succès',
      data: commandes,
    };
  }

  private async decrementStock(produitId: string, quantite: number) {
    const stock = await this.stockRepository.findOne({
      where: { produit_id: produitId },
    });

    if (!stock) {
      throw new NotFoundException('Stock introuvable pour ce produit');
    }

    if (stock.quantite < quantite) {
      throw new BadRequestException('Stock insuffisant pour ce produit');
    }

    await this.stocksService.updateQuantite(
      produitId,
      stock.quantite - quantite,
    );
  }
}
