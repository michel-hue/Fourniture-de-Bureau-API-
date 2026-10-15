import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Adress } from '../adresses/entities/adress.entity';
import { PanierDetail } from '../paniers/entities/panier-detail.entity';
import { PaniersService } from '../paniers/paniers.service';
import { Stock } from '../stocks/entities/stock.entity';
import { StocksService } from '../stocks/stocks.service';
import { CommandeNumeroService } from './commande-numero.service';
import { Commande } from './entities/commande.entity';
import { CommandesService } from './commandes.service';

type DeepPartial<T> = T extends object ? { [K in keyof T]?: T[K] } : T;

/** Récupère l'objet passé au 1er appel de `commandeRepository.create`. */
function premiereCommandeCreee(repository: {
  create: jest.Mock;
}): DeepPartial<Commande> {
  const calls = repository.create.mock.calls as unknown as [
    DeepPartial<Commande>,
  ][][];
  return calls[0][0];
}

const USER_ID = 'user-1';
const COMMANDE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ADRESSE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const PRODUIT_ID = '11111111-1111-1111-1111-111111111111';
const PRODUIT_ID_2 = '22222222-2222-2222-2222-222222222222';

function creerDetailPanier(
  overrides: Partial<PanierDetail> = {},
): PanierDetail {
  return {
    id: 'detail-1',
    panier_id: 'panier-1',
    produit_id: PRODUIT_ID,
    quantite: 2,
    prix_unitaire: 5.5,
    produit: {
      id: PRODUIT_ID,
      nom: 'Ramette papier',
    } as PanierDetail['produit'],
    ...overrides,
  } as PanierDetail;
}

describe('CommandesService', () => {
  let service: CommandesService;

  let commandeRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
  };
  let stockRepository: { findOne: jest.Mock };
  let adressRepository: { findOne: jest.Mock };
  let paniersService: { getPanier: jest.Mock; clearPanier: jest.Mock };
  let stocksService: { updateQuantite: jest.Mock };
  let commandeNumeroService: { nextNumero: jest.Mock };

  beforeEach(async () => {
    commandeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };
    stockRepository = { findOne: jest.fn() };
    adressRepository = { findOne: jest.fn() };
    paniersService = {
      getPanier: jest.fn(),
      clearPanier: jest.fn(),
    };
    stocksService = { updateQuantite: jest.fn() };
    commandeNumeroService = { nextNumero: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandesService,
        {
          provide: getRepositoryToken(Commande),
          useValue: commandeRepository,
        },
        { provide: getRepositoryToken(Stock), useValue: stockRepository },
        { provide: getRepositoryToken(Adress), useValue: adressRepository },
        { provide: PaniersService, useValue: paniersService },
        { provide: StocksService, useValue: stocksService },
        {
          provide: CommandeNumeroService,
          useValue: commandeNumeroService,
        },
      ],
    }).compile();

    service = module.get<CommandesService>(CommandesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ------------------------------------------------------------------
  // create — cas nominaux
  // ------------------------------------------------------------------
  describe('create', () => {
    beforeEach(() => {
      paniersService.getPanier.mockResolvedValue({
        data: { details: [creerDetailPanier()] },
      });
      adressRepository.findOne.mockResolvedValue({ id: ADRESSE_ID });
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 50,
      });
      commandeRepository.count.mockResolvedValue(0);
      commandeNumeroService.nextNumero.mockResolvedValue(
        `CMD-${new Date().getFullYear()}-0001`,
      );
      commandeRepository.create.mockImplementation(
        (dto: DeepPartial<Commande>) => dto,
      );
      commandeRepository.save.mockImplementation((c: Commande) =>
        Promise.resolve({ ...c, id: COMMANDE_ID }),
      );
      commandeRepository.findOne.mockResolvedValue({ id: COMMANDE_ID });
      stocksService.updateQuantite.mockResolvedValue({});
      paniersService.clearPanier.mockResolvedValue({});
    });

    it('crée la commande avec le statut EN_ATTENTE', async () => {
      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          adresse_livraison_id: ADRESSE_ID,
          statut: 'EN_ATTENTE',
        }),
      );
    });

    it('génère un numéro séquentiel CMD-année-0001', async () => {
      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      const annee = new Date().getFullYear();
      expect(commandeNumeroService.nextNumero).toHaveBeenCalled();
      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ numero: `CMD-${annee}-0001` }),
      );
    });

    it('délègue la génération du numéro au service de séquence', async () => {
      commandeNumeroService.nextNumero.mockResolvedValue(
        `CMD-${new Date().getFullYear()}-0042`,
      );

      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      const annee = new Date().getFullYear();
      expect(commandeNumeroService.nextNumero).toHaveBeenCalledTimes(1);
      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ numero: `CMD-${annee}-0042` }),
      );
    });

    it('calcule le montant_total = sous-total + frais de livraison', async () => {
      // 2 x 5.5 = 11 + 5 frais = 16
      await service.create(USER_ID, {
        adresse_livraison_id: ADRESSE_ID,
        frais_livraison: 5,
      });

      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ montant_total: 16, frais_livraison: 5 }),
      );
    });

    it('applique des frais de livraison à 0 par défaut', async () => {
      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ montant_total: 11, frais_livraison: 0 }),
      );
    });

    it('arrondit le montant_total à 2 décimales', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: {
          details: [
            creerDetailPanier({ quantite: 3, prix_unitaire: 0.335 }),
            creerDetailPanier({ quantite: 1, prix_unitaire: 0.001 }),
          ],
        },
      });
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 50,
      });

      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      // (1.005 + 0.001) arrondi à 2 décimales = 1.01
      const dto = premiereCommandeCreee(commandeRepository);
      expect(dto.montant_total).toBe(1.01);
    });

    it('agrège plusieurs lignes de panier dans le total', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: {
          details: [
            creerDetailPanier({ quantite: 2, prix_unitaire: 5.5 }),
            creerDetailPanier({
              produit_id: PRODUIT_ID_2,
              produit: { nom: 'Stylo' } as PanierDetail['produit'],
              quantite: 3,
              prix_unitaire: 2,
            }),
          ],
        },
      });

      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      // 11 + 6 = 17
      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ montant_total: 17 }),
      );
    });

    it('recopie le nom du produit dans les détails de la commande', async () => {
      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      expect(commandeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [
            expect.objectContaining({
              produit_id: PRODUIT_ID,
              nom_produit: 'Ramette papier',
              prix_unitaire: 5.5,
              quantite: 2,
              sous_total: 11,
            }),
          ],
        }),
      );
    });

    it('utilise "Produit" comme nom de repli si le produit n’est plus chargé', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: {
          details: [creerDetailPanier({ produit: undefined })],
        },
      });

      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      const dto = premiereCommandeCreee(commandeRepository);
      expect(dto.details?.[0].nom_produit).toBe('Produit');
    });

    it('décrémente le stock de chaque produit du panier', async () => {
      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      // 50 - 2 = 48
      expect(stocksService.updateQuantite).toHaveBeenCalledWith(PRODUIT_ID, 48);
    });

    it('décrémente le stock pour chaque ligne du panier', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: {
          details: [
            creerDetailPanier({ quantite: 2, prix_unitaire: 5.5 }),
            creerDetailPanier({
              produit_id: PRODUIT_ID_2,
              quantite: 3,
              prix_unitaire: 2,
            }),
          ],
        },
      });
      stockRepository.findOne.mockImplementation(
        ({ where }: { where: { produit_id: string } }) =>
          Promise.resolve(
            where.produit_id === PRODUIT_ID
              ? { produit_id: PRODUIT_ID, quantite: 20 }
              : { produit_id: PRODUIT_ID_2, quantite: 10 },
          ),
      );

      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      expect(stocksService.updateQuantite).toHaveBeenCalledWith(PRODUIT_ID, 18);
      expect(stocksService.updateQuantite).toHaveBeenCalledWith(
        PRODUIT_ID_2,
        7,
      );
    });

    it('vide le panier après la création', async () => {
      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      expect(paniersService.clearPanier).toHaveBeenCalledWith(USER_ID);
    });

    it('retourne la commande complète avec ses relations', async () => {
      const commandeComplete = { id: COMMANDE_ID, numero: 'CMD-2026-0001' };
      commandeRepository.findOne.mockResolvedValue(commandeComplete);

      const resultat = await service.create(USER_ID, {
        adresse_livraison_id: ADRESSE_ID,
      });

      expect(commandeRepository.findOne).toHaveBeenCalledWith({
        where: { id: COMMANDE_ID },
        relations: { details: { produit: true }, adresse_livraison: true },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Commande créée avec succès',
        data: commandeComplete,
      });
    });
  });

  // ------------------------------------------------------------------
  // create — cas d'erreur
  // ------------------------------------------------------------------
  describe('create — erreurs', () => {
    it('refuse de créer une commande avec un panier vide', async () => {
      paniersService.getPanier.mockResolvedValue({ data: { details: [] } });

      await expect(
        service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(commandeRepository.save).not.toHaveBeenCalled();
    });

    it('refuse si details est undefined sur le panier', async () => {
      paniersService.getPanier.mockResolvedValue({ data: {} });

      await expect(
        service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève une NotFoundException si l’adresse n’existe pas', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: { details: [creerDetailPanier()] },
      });
      adressRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(commandeRepository.save).not.toHaveBeenCalled();
    });

    it('laisse une adresse appartenant à un autre utilisateur introuvable', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: { details: [creerDetailPanier()] },
      });
      // le repo filtre sur { id, user_id } -> aucun résultat
      adressRepository.findOne.mockResolvedValue(null);

      await service
        .create(USER_ID, { adresse_livraison_id: ADRESSE_ID })
        .catch(() => undefined);

      expect(adressRepository.findOne).toHaveBeenCalledWith({
        where: { id: ADRESSE_ID, user_id: USER_ID },
      });
    });

    it('refuse la commande si le stock est insuffisant', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: { details: [creerDetailPanier({ quantite: 5 })] },
      });
      adressRepository.findOne.mockResolvedValue({ id: ADRESSE_ID });
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 2,
      });

      await expect(
        service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(commandeRepository.save).not.toHaveBeenCalled();
      expect(stocksService.updateQuantite).not.toHaveBeenCalled();
    });

    it('lève une NotFoundException si un produit n’a pas de stock', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: { details: [creerDetailPanier()] },
      });
      adressRepository.findOne.mockResolvedValue({ id: ADRESSE_ID });
      stockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepte une commande dont la quantité égale exactement le stock', async () => {
      paniersService.getPanier.mockResolvedValue({
        data: { details: [creerDetailPanier({ quantite: 5 })] },
      });
      adressRepository.findOne.mockResolvedValue({ id: ADRESSE_ID });
      stockRepository.findOne.mockResolvedValue({
        produit_id: PRODUIT_ID,
        quantite: 5,
      });
      commandeRepository.create.mockImplementation(
        (dto: DeepPartial<Commande>) => dto,
      );
      commandeRepository.save.mockResolvedValue({ id: COMMANDE_ID });
      commandeRepository.findOne.mockResolvedValue({ id: COMMANDE_ID });
      commandeRepository.count.mockResolvedValue(0);
      commandeNumeroService.nextNumero.mockResolvedValue(
        `CMD-${new Date().getFullYear()}-0001`,
      );

      await service.create(USER_ID, { adresse_livraison_id: ADRESSE_ID });

      expect(commandeRepository.save).toHaveBeenCalled();
      expect(stocksService.updateQuantite).toHaveBeenCalledWith(PRODUIT_ID, 0);
    });
  });

  // ------------------------------------------------------------------
  // findAll / findOne
  // ------------------------------------------------------------------
  describe('findAll', () => {
    it('retourne les commandes de l’utilisateur triées du plus récent au plus ancien', async () => {
      const commandes = [{ id: COMMANDE_ID }];
      commandeRepository.find.mockResolvedValue(commandes);

      const resultat = await service.findAll(USER_ID);

      expect(commandeRepository.find).toHaveBeenCalledWith({
        where: { user_id: USER_ID },
        relations: { details: { produit: true }, adresse_livraison: true },
        order: { created_at: 'DESC' },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Commandes récupérées avec succès',
        data: commandes,
      });
    });
  });

  describe('findOne', () => {
    it('retourne une commande appartenant à l’utilisateur', async () => {
      const commande = { id: COMMANDE_ID, user_id: USER_ID };
      commandeRepository.findOne.mockResolvedValue(commande);

      const resultat = await service.findOne(USER_ID, COMMANDE_ID);

      expect(commandeRepository.findOne).toHaveBeenCalledWith({
        where: { id: COMMANDE_ID, user_id: USER_ID },
        relations: { details: { produit: true }, adresse_livraison: true },
      });
      expect(resultat.data).toBe(commande);
    });

    it('lève une NotFoundException si la commande appartient à un autre utilisateur', async () => {
      commandeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(USER_ID, COMMANDE_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ------------------------------------------------------------------
  // updateStatut
  // ------------------------------------------------------------------
  describe('updateStatut', () => {
    it('met à jour le statut de la commande', async () => {
      const commande = { id: COMMANDE_ID, statut: 'EN_ATTENTE' };
      commandeRepository.findOne.mockResolvedValue(commande);
      commandeRepository.save.mockImplementation((c: Commande) =>
        Promise.resolve(c),
      );

      const resultat = await service.updateStatut(COMMANDE_ID, {
        statut: 'EXPEDIEE',
      });

      expect(commandeRepository.findOne).toHaveBeenCalledWith({
        where: { id: COMMANDE_ID },
      });
      expect(commandeRepository.save).toHaveBeenCalledWith(commande);
      expect(resultat).toEqual({
        success: true,
        message: 'Statut de la commande mis à jour avec succès',
        data: { id: COMMANDE_ID, statut: 'EXPEDIEE' },
      });
    });

    it('accepte tous les statuts du workflow', async () => {
      const statuts = [
        'EN_ATTENTE',
        'PAYEE',
        'EN_PREPARATION',
        'EXPEDIEE',
        'LIVREE',
        'ANNULEE',
      ];

      for (const statut of statuts) {
        commandeRepository.findOne.mockResolvedValue({
          id: COMMANDE_ID,
          statut: 'EN_ATTENTE',
        });
        commandeRepository.save.mockImplementation((c: Commande) =>
          Promise.resolve(c),
        );

        const resultat = await service.updateStatut(COMMANDE_ID, { statut });

        expect(resultat.data.statut).toBe(statut);
      }
    });

    it('lève une NotFoundException si la commande est introuvable', async () => {
      commandeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatut(COMMANDE_ID, { statut: 'LIVREE' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(commandeRepository.save).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // findAllAdmin
  // ------------------------------------------------------------------
  describe('findAllAdmin', () => {
    it('retourne toutes les commandes avec la relation user', async () => {
      const commandes = [{ id: COMMANDE_ID }];
      commandeRepository.find.mockResolvedValue(commandes);

      const resultat = await service.findAllAdmin();

      expect(commandeRepository.find).toHaveBeenCalledWith({
        relations: {
          details: { produit: true },
          adresse_livraison: true,
          user: true,
        },
        order: { created_at: 'DESC' },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Commandes récupérées avec succès',
        data: commandes,
      });
    });
  });
});
