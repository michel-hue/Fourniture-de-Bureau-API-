import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Categorie } from './categories/entities/categorie.entity';
import { Produit } from './produits/entities/produit.entity';
import { ImageProduit } from './images-produit/entities/image-produit.entity';
import { Stock } from './stocks/entities/stock.entity';
import { User } from './auth/entities/user.entity';
import { Profile } from './profiles/entities/profile.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Categorie)
    private readonly categorieRepository: Repository<Categorie>,
    @InjectRepository(Produit)
    private readonly produitRepository: Repository<Produit>,
    @InjectRepository(ImageProduit)
    private readonly imageProduitRepository: Repository<ImageProduit>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
    await this.migratePricesToXOF();
    await this.seedCategories();
    await this.seedProduits();
  }

  /**
   * Migration ponctuelle : convertit les prix encore en euros (<= 1000)
   * en FCFA (taux fixe 1 EUR = 655,957 FCFA, arrondi à la centaine).
   * Les prix déjà en FCFA (> 1000) ne sont pas touchés.
   */
  private async migratePricesToXOF() {
    const produits = await this.produitRepository.find();

    let migres = 0;
    for (const produit of produits) {
      let modifie = false;

      if (produit.prix <= 1000) {
        produit.prix = Math.round((Number(produit.prix) * 655.957) / 100) * 100;
        modifie = true;
      }
      if (produit.ancien_prix != null && produit.ancien_prix <= 1000) {
        produit.ancien_prix =
          Math.round((Number(produit.ancien_prix) * 655.957) / 100) * 100;
        modifie = true;
      }

      if (modifie) {
        await this.produitRepository.save(produit);
        migres += 1;
      }
    }

    if (migres > 0) {
      this.logger.log(`${migres} produits migrés vers des prix en FCFA`);
    }
  }

  /**
   * Aucun compte (et donc aucun mot de passe) n'est codé en dur.
   * Le compte administrateur n'est créé que si ADMIN_EMAIL et ADMIN_PASSWORD
   * sont définis dans l'environnement — à faire une seule fois, puis retirer
   * ADMIN_PASSWORD du .env.
   */
  private async seedUsers() {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return;
    }

    if (password.length < 10) {
      this.logger.warn(
        'ADMIN_PASSWORD trop court (10 caractères minimum) : compte admin non créé',
      );
      return;
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const savedUser = await this.userRepository.save(
      this.userRepository.create({
        nom: process.env.ADMIN_NOM?.trim() || 'Administrateur',
        prenom: process.env.ADMIN_PRENOM?.trim() || 'WorkStore',
        email,
        password: hashedPassword,
        role: 'admin',
      }),
    );
    await this.profileRepository.save(
      this.profileRepository.create({ user_id: savedUser.id }),
    );

    this.logger.log(`Compte administrateur ${email} créé`);
  }

  private async seedCategories() {
    const count = await this.categorieRepository.count();

    if (count > 0) {
      this.logger.log('Catégories déjà présentes, seed ignoré');
      return;
    }

    const categories = [
      {
        nom: 'Papeterie',
        description: 'Papiers, cahiers, blocs-notes et fournitures de papier',
      },
      {
        nom: 'Écriture',
        description: "Stylos, crayons, marqueurs et instruments d'écriture",
      },
      {
        nom: 'Classement',
        description: 'Classeurs, pochettes, chemises et solutions de rangement',
      },
      {
        nom: 'Informatique',
        description: 'Accessoires informatiques, câbles et périphériques',
      },
      {
        nom: 'Impression',
        description: "Cartouches d'encre, toners et consommables d'impression",
      },
      {
        nom: 'Mobilier',
        description: 'Bureaux, chaises et mobilier de bureau',
      },
      {
        nom: 'Consommables',
        description: 'Agraphes, trombones, élastiques et petits consommables',
      },
    ];

    await this.categorieRepository.save(categories);

    this.logger.log(`${categories.length} catégories insérées avec succès`);
  }

  private async seedProduits() {
    const count = await this.produitRepository.count();

    if (count > 0) {
      this.logger.log('Produits déjà présents, seed ignoré');
      return;
    }

    const categories = await this.categorieRepository.find();
    const catByName = new Map(categories.map((c) => [c.nom, c]));

    const getCat = (nom: string) => {
      const cat = catByName.get(nom);
      if (!cat) {
        throw new Error(`Catégorie introuvable: ${nom}`);
      }
      return cat;
    };

    // Définition des produits de test
    interface ProduitSeed {
      nom: string;
      description: string;
      prix: number;
      ancien_prix: number | null;
      marque: string;
      reference: string;
      categorie: Categorie;
      quantite: number;
      seuil_alerte: number;
      image: string;
    }

    const produitsData: ProduitSeed[] = [
      // Papeterie
      {
        nom: 'Ramette de papier A4 80g',
        description:
          "Ramette de papier blanc A4 80g/m², idéale pour l'impression et la photocopie. Paquet de 500 feuilles.",
        prix: 3900,
        ancien_prix: 4900,
        marque: 'Navigator',
        reference: 'PAP-A4-80',
        categorie: getCat('Papeterie'),
        quantite: 250,
        seuil_alerte: 30,
        image:
          'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Cahier A5 96 pages',
        description:
          'Cahier A5 à spirales, 96 pages, papier 90g, couverture cartonnée. Parfait pour les notes.',
        prix: 1600,
        ancien_prix: null,
        marque: 'Oxford',
        reference: 'CAH-A5-96',
        categorie: getCat('Papeterie'),
        quantite: 180,
        seuil_alerte: 25,
        image:
          'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Bloc-notes A5 repositionnable',
        description:
          'Bloc-notes A5 avec feuilles repositionnables, 100 feuilles, ligné. Idéal pour les réunions.',
        prix: 2600,
        ancien_prix: 3300,
        marque: 'Post-it',
        reference: 'BLOC-A5-100',
        categorie: getCat('Papeterie'),
        quantite: 120,
        seuil_alerte: 20,
        image:
          'https://images.unsplash.com/photo-1584697964358-3e14ca57658b?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Enveloppes kraft C4',
        description:
          'Lot de 50 enveloppes kraft C4 (229x324mm), auto-adhésives, pour documents A4.',
        prix: 5900,
        ancien_prix: null,
        marque: 'Clairefontaine',
        reference: 'ENV-C4-50',
        categorie: getCat('Papeterie'),
        quantite: 90,
        seuil_alerte: 15,
        image:
          'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=400&q=75&auto=format&fit=crop',
      },

      // Écriture
      {
        nom: 'Stylo à bille bleu (lot de 10)',
        description:
          'Lot de 10 stylos à bille bleus, encre fluide, pointe 1.0mm, corps ergonomique.',
        prix: 3300,
        ancien_prix: 4300,
        marque: 'Bic',
        reference: 'STY-BLEU-10',
        categorie: getCat('Écriture'),
        quantite: 300,
        seuil_alerte: 40,
        image:
          'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Stylo plume noir',
        description:
          'Stylo plume noir avec cartouche, plume en acier, corps en résine. Écriture élégante.',
        prix: 8500,
        ancien_prix: 10500,
        marque: 'Parker',
        reference: 'STY-PLUME-N',
        categorie: getCat('Écriture'),
        quantite: 60,
        seuil_alerte: 10,
        image:
          'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Marqueur permanent noir',
        description:
          "Marqueur permanent noir, pointe fine 1.0mm, encre résistante à l'eau. Lot de 5.",
        prix: 4300,
        ancien_prix: null,
        marque: 'Sharpie',
        reference: 'MARQ-PERM-N',
        categorie: getCat('Écriture'),
        quantite: 150,
        seuil_alerte: 25,
        image:
          'https://images.unsplash.com/photo-1584697964358-3e14ca57658b?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Crayon à papier HB (lot de 12)',
        description:
          'Lot de 12 crayons à papier HB, mine graphite, gomme intégrée, bois certifié.',
        prix: 2300,
        ancien_prix: 2800,
        marque: 'Staedtler',
        reference: 'CRAY-HB-12',
        categorie: getCat('Écriture'),
        quantite: 200,
        seuil_alerte: 30,
        image:
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=75&auto=format&fit=crop',
      },

      // Classement
      {
        nom: 'Classeur à levier A4',
        description:
          'Classeur à levier A4, dos 80mm, couverture cartonnée, mécanisme à levier. Coloris assortis.',
        prix: 2900,
        ancien_prix: 3600,
        marque: 'Elba',
        reference: 'CLAS-LEV-A4',
        categorie: getCat('Classement'),
        quantite: 140,
        seuil_alerte: 20,
        image:
          'https://images.unsplash.com/photo-1584697964358-3e14ca57658b?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Pochettes perforées (lot de 100)',
        description:
          'Lot de 100 pochettes perforées transparentes A4, pour classement dans classeurs.',
        prix: 5200,
        ancien_prix: null,
        marque: 'Leitz',
        reference: 'POCH-PERF-100',
        categorie: getCat('Classement'),
        quantite: 110,
        seuil_alerte: 15,
        image:
          'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Chemises cartonnées (lot de 50)',
        description:
          'Lot de 50 chemises cartonnées A4, coloris assortis, pour classement simple.',
        prix: 6600,
        ancien_prix: 8200,
        marque: 'Clairefontaine',
        reference: 'CHEM-CART-50',
        categorie: getCat('Classement'),
        quantite: 80,
        seuil_alerte: 12,
        image:
          'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=400&q=75&auto=format&fit=crop',
      },

      // Informatique
      {
        nom: 'Souris sans fil',
        description:
          'Souris optique sans fil, récepteur USB, 3 boutons + molette, portée 10m. Silencieuse.',
        prix: 13100,
        ancien_prix: 16400,
        marque: 'Logitech',
        reference: 'SOUR-SF-01',
        categorie: getCat('Informatique'),
        quantite: 75,
        seuil_alerte: 10,
        image:
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Clavier AZERTY filaire',
        description:
          'Clavier AZERTY filaire, touches silencieuses, repose-poignets, connectique USB.',
        prix: 19700,
        ancien_prix: 23000,
        marque: 'Logitech',
        reference: 'CLAV-AZ-01',
        categorie: getCat('Informatique'),
        quantite: 50,
        seuil_alerte: 8,
        image:
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Câble HDMI 2m',
        description:
          'Câble HDMI 2.0, 2 mètres, compatible 4K, connecteurs plaqués or.',
        prix: 5900,
        ancien_prix: null,
        marque: 'Belkin',
        reference: 'CAB-HDMI-2M',
        categorie: getCat('Informatique'),
        quantite: 130,
        seuil_alerte: 20,
        image:
          'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Webcam HD 1080p',
        description:
          'Webcam HD 1080p avec micro intégré, fixation sur écran, pour visioconférence.',
        prix: 26200,
        ancien_prix: 32800,
        marque: 'Logitech',
        reference: 'WEBCAM-1080',
        categorie: getCat('Informatique'),
        quantite: 35,
        seuil_alerte: 5,
        image:
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=75&auto=format&fit=crop',
      },

      // Impression
      {
        nom: 'Cartouche encre noire HP',
        description:
          "Cartouche d'encre noire HP 305, compatible imprimantes HP DeskJet. Rendement 120 pages.",
        prix: 16400,
        ancien_prix: 19700,
        marque: 'HP',
        reference: 'CART-HP-305',
        categorie: getCat('Impression'),
        quantite: 70,
        seuil_alerte: 10,
        image:
          'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Toner Canon 725 noir',
        description:
          'Toner Canon 725 noir, compatible imprimantes Canon i-SENSYS. Rendement 2100 pages.',
        prix: 39400,
        ancien_prix: 45900,
        marque: 'Canon',
        reference: 'TONER-CAN-725',
        categorie: getCat('Impression'),
        quantite: 25,
        seuil_alerte: 5,
        image:
          'https://images.unsplash.com/photo-1584697964358-3e14ca57658b?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Papier photo brillant A4 (lot de 50)',
        description:
          'Lot de 50 feuilles de papier photo brillant A4 200g, pour impressions haute qualité.',
        prix: 7900,
        ancien_prix: null,
        marque: 'Canon',
        reference: 'PAP-PHOTO-50',
        categorie: getCat('Impression'),
        quantite: 60,
        seuil_alerte: 10,
        image:
          'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=400&q=75&auto=format&fit=crop',
      },

      // Mobilier
      {
        nom: 'Fauteuil de bureau ergonomique',
        description:
          'Fauteuil de bureau ergonomique, dossier inclinable, accoudoirs réglables, assise en maille respirante.',
        prix: 124000,
        ancien_prix: 150200,
        marque: 'Ikea',
        reference: 'FAUT-ERGO-01',
        categorie: getCat('Mobilier'),
        quantite: 20,
        seuil_alerte: 3,
        image:
          'https://images.unsplash.com/photo-1505843490578-4c9c5f6f5c5e?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: "Bureau d'angle L",
        description:
          "Bureau d'angle en L, plateau mélaminé, structure métallique, dimensions 140x140cm.",
        prix: 163300,
        ancien_prix: 196100,
        marque: 'Ikea',
        reference: 'BUREAU-L-01',
        categorie: getCat('Mobilier'),
        quantite: 12,
        seuil_alerte: 2,
        image:
          'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Lampe de bureau LED',
        description:
          'Lampe de bureau LED, intensité et température de couleur réglables, bras articulé.',
        prix: 22900,
        ancien_prix: 26200,
        marque: 'Philips',
        reference: 'LAMPE-LED-01',
        categorie: getCat('Mobilier'),
        quantite: 45,
        seuil_alerte: 8,
        image:
          'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=75&auto=format&fit=crop',
      },

      // Consommables
      {
        nom: 'Agrafeuse 24/6 + agrafes',
        description:
          'Agrafeuse métallique 24/6, capacité 30 feuilles, avec boîte de 1000 agrafes.',
        prix: 5200,
        ancien_prix: 6200,
        marque: 'Rapesco',
        reference: 'AGRAF-24-6',
        categorie: getCat('Consommables'),
        quantite: 100,
        seuil_alerte: 15,
        image:
          'https://images.unsplash.com/photo-1584697964358-3e14ca57658b?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Boîte de trombones (1000)',
        description:
          'Boîte de 1000 trombones métalliques, taille standard, pour classement de documents.',
        prix: 2000,
        ancien_prix: null,
        marque: 'Rapesco',
        reference: 'TROMB-1000',
        categorie: getCat('Consommables'),
        quantite: 220,
        seuil_alerte: 40,
        image:
          'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=400&q=75&auto=format&fit=crop',
      },
      {
        nom: 'Perforatrice 2 trous',
        description:
          'Perforatrice 2 trous, capacité 30 feuilles, base métallique, réglage de la distance.',
        prix: 8500,
        ancien_prix: 9800,
        marque: 'Rapesco',
        reference: 'PERFO-2T-01',
        categorie: getCat('Consommables'),
        quantite: 55,
        seuil_alerte: 10,
        image:
          'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&q=75&auto=format&fit=crop',
      },
    ];

    for (const data of produitsData) {
      const { quantite, seuil_alerte, image, categorie, ...produitData } = data;

      const produit = this.produitRepository.create({
        ...produitData,
        ancien_prix: produitData.ancien_prix ?? undefined,
        categorie_id: categorie.id,
      });
      const savedProduit = await this.produitRepository.save(produit);

      // Image principale
      if (image) {
        const imageProduit = this.imageProduitRepository.create({
          produit_id: savedProduit.id,
          url: image,
          is_principale: true,
          ordre: 0,
        });
        await this.imageProduitRepository.save(imageProduit);
      }

      // Stock
      const stock = this.stockRepository.create({
        produit_id: savedProduit.id,
        quantite,
        seuil_alerte,
      });
      await this.stockRepository.save(stock);
    }

    this.logger.log(`${produitsData.length} produits insérés avec succès`);
  }
}
