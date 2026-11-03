import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { CommandeNumeroService } from './commande-numero.service';

describe('CommandeNumeroService', () => {
  let service: CommandeNumeroService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandeNumeroService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CommandeNumeroService>(CommandeNumeroService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('crée la séquence si elle n’existe pas', async () => {
      await service.onModuleInit();

      expect(dataSource.query).toHaveBeenCalledWith(
        'CREATE SEQUENCE IF NOT EXISTS commande_numero_seq START 1',
      );
    });

    it('aligne la séquence sur les commandes déjà créées pour l’année', async () => {
      await service.onModuleInit();

      const annee = new Date().getFullYear();
      const calls = dataSource.query.mock.calls as [string, string[]][];
      const [sql, parametres] = calls[1];

      expect(sql).toContain('setval');
      expect(parametres).toEqual([`CMD-${annee}-%`, 'commande_numero_seq']);
    });

    it('n’empêche pas le démarrage si l’alignement échoue', async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('pg indisponible'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('nextNumero', () => {
    it('formate CMD-<année>-0001 au premier appel', async () => {
      dataSource.query.mockResolvedValue([{ valeur: '1' }]);

      const numero = await service.nextNumero();

      expect(numero).toBe(`CMD-${new Date().getFullYear()}-0001`);
    });

    it('sépare le numéro sur 4 chiffres', async () => {
      dataSource.query.mockResolvedValue([{ valeur: '42' }]);

      await expect(service.nextNumero()).resolves.toBe(
        `CMD-${new Date().getFullYear()}-0042`,
      );
    });

    it('ne tronque pas un numéro supérieur à 4 chiffres', async () => {
      dataSource.query.mockResolvedValue([{ valeur: '123456' }]);

      await expect(service.nextNumero()).resolves.toBe(
        `CMD-${new Date().getFullYear()}-123456`,
      );
    });

    it('utilise nextval() pour garantir l’atomicité', async () => {
      dataSource.query.mockResolvedValue([{ valeur: '7' }]);

      await service.nextNumero();

      expect(dataSource.query).toHaveBeenCalledWith(
        "SELECT nextval('commande_numero_seq') AS valeur",
      );
    });

    it('accepte une valeur déjà numérique (pg renvoie bigint en string)', async () => {
      dataSource.query.mockResolvedValue([{ valeur: 3 }]);

      await expect(service.nextNumero()).resolves.toBe(
        `CMD-${new Date().getFullYear()}-0003`,
      );
    });

    it('lève une erreur explicite si nextval ne renvoie rien d’exploitable', async () => {
      dataSource.query.mockResolvedValue([]);

      await expect(service.nextNumero()).rejects.toThrow(
        'Impossible de générer un numéro de commande',
      );
    });
  });
});
