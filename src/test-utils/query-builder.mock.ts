/**
 * Mock d'un QueryBuilder TypeORM.
 *
 * Chaque méthode retourne `this` afin de permettre le chaînage, et les
 * appels sont enregistrés pour pouvoir être assertés dans les specs.
 */
export interface MockQueryBuilder {
  leftJoinAndSelect: jest.Mock<MockQueryBuilder, unknown[]>;
  where: jest.Mock<MockQueryBuilder, unknown[]>;
  andWhere: jest.Mock<MockQueryBuilder, unknown[]>;
  orderBy: jest.Mock<MockQueryBuilder, unknown[]>;
  skip: jest.Mock<MockQueryBuilder, unknown[]>;
  take: jest.Mock<MockQueryBuilder, unknown[]>;
  getMany: jest.Mock<Promise<unknown[]>, unknown[]>;
  getManyAndCount: jest.Mock<Promise<[unknown[], number]>, unknown[]>;
}

/**
 * Crée un QueryBuilder mocké.
 *
 * @param resultat valeur renvoyée par getMany()
 * @param count    nombre renvoyé par getManyAndCount()
 */
export function createQueryBuilderMock<T>(
  resultat: T[] = [],
  count?: number,
): MockQueryBuilder {
  const qb: Partial<MockQueryBuilder> = {};

  qb.leftJoinAndSelect = jest.fn(() => qb as MockQueryBuilder);
  qb.where = jest.fn(() => qb as MockQueryBuilder);
  qb.andWhere = jest.fn(() => qb as MockQueryBuilder);
  qb.orderBy = jest.fn(() => qb as MockQueryBuilder);
  qb.skip = jest.fn(() => qb as MockQueryBuilder);
  qb.take = jest.fn(() => qb as MockQueryBuilder);
  qb.getMany = jest.fn().mockResolvedValue(resultat);
  qb.getManyAndCount = jest
    .fn()
    .mockResolvedValue([resultat, count ?? resultat.length]);

  return qb as MockQueryBuilder;
}
