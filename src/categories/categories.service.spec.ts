import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CategoriesService } from './categories.service';
import { Categorie } from './entities/categorie.entity';

const CATEGORIE_ID = '22222222-2222-2222-2222-222222222222';

function creerCategorie(overrides: Partial<Categorie> = {}): Categorie {
  return {
    id: CATEGORIE_ID,
    nom: 'Papeterie',
    description: 'Tout pour le papier',
    image: null,
    actif: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  } as Categorie;
}

describe('CategoriesService', () => {
  let service: CategoriesService;

  let categorieRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    categorieRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Categorie),
          useValue: categorieRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée et sauvegarde la catégorie', async () => {
      const dto = { nom: 'Papeterie', description: 'Description' };
      const entity = creerCategorie();
      const saved = { ...entity, id: 'nouvelle-id' };

      categorieRepository.create.mockReturnValue(entity);
      categorieRepository.save.mockResolvedValue(saved);

      const resultat = await service.create(dto);

      expect(categorieRepository.create).toHaveBeenCalledWith(dto);
      expect(categorieRepository.save).toHaveBeenCalledWith(entity);
      expect(resultat).toEqual({
        success: true,
        message: 'Catégorie créée avec succès',
        data: saved,
      });
    });
  });

  describe('findAll', () => {
    it('retourne toutes les catégories triées par nom croissant', async () => {
      const categories = [
        creerCategorie({ id: '1', nom: 'Bureautique' }),
        creerCategorie({ id: '2', nom: 'Papeterie' }),
      ];
      categorieRepository.find.mockResolvedValue(categories);

      const resultat = await service.findAll();

      expect(categorieRepository.find).toHaveBeenCalledWith({
        order: { nom: 'ASC' },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Catégories récupérées avec succès',
        data: categories,
      });
    });

    it('retourne une liste vide sans erreur', async () => {
      categorieRepository.find.mockResolvedValue([]);

      const resultat = await service.findAll();

      expect(resultat.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('retourne la catégorie demandée', async () => {
      const categorie = creerCategorie();
      categorieRepository.findOne.mockResolvedValue(categorie);

      const resultat = await service.findOne(CATEGORIE_ID);

      expect(categorieRepository.findOne).toHaveBeenCalledWith({
        where: { id: CATEGORIE_ID },
      });
      expect(resultat).toEqual({
        success: true,
        message: 'Catégorie récupérée avec succès',
        data: categorie,
      });
    });

    it('lève une NotFoundException si la catégorie est introuvable', async () => {
      categorieRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('met à jour les champs fournis', async () => {
      const categorie = creerCategorie();
      categorieRepository.findOne.mockResolvedValue(categorie);
      categorieRepository.save.mockImplementation((c: Categorie) =>
        Promise.resolve(c),
      );

      const resultat = await service.update(CATEGORIE_ID, {
        nom: 'Nouveau nom',
        actif: false,
      });

      expect(resultat.data.nom).toBe('Nouveau nom');
      expect(resultat.data.actif).toBe(false);
      expect(categorieRepository.save).toHaveBeenCalledWith(categorie);
    });

    it('ne modifie pas les champs absents du DTO', async () => {
      const categorie = creerCategorie();
      categorieRepository.findOne.mockResolvedValue(categorie);
      categorieRepository.save.mockImplementation((c: Categorie) =>
        Promise.resolve(c),
      );

      const resultat = await service.update(CATEGORIE_ID, { nom: 'Changé' });

      expect(resultat.data.description).toBe('Tout pour le papier');
    });

    it('lève une NotFoundException si la catégorie est introuvable', async () => {
      categorieRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('inconnu', { nom: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(categorieRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('supprime la catégorie trouvée', async () => {
      const categorie = creerCategorie();
      categorieRepository.findOne.mockResolvedValue(categorie);
      categorieRepository.remove.mockResolvedValue(categorie);

      const resultat = await service.remove(CATEGORIE_ID);

      expect(categorieRepository.remove).toHaveBeenCalledWith(categorie);
      expect(resultat).toEqual({
        success: true,
        message: 'Catégorie supprimée avec succès',
      });
    });

    it('lève une NotFoundException si la catégorie est introuvable', async () => {
      categorieRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('inconnu')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(categorieRepository.remove).not.toHaveBeenCalled();
    });
  });
});
