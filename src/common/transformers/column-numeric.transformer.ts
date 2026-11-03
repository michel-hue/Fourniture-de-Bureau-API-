import type { ValueTransformer } from 'typeorm';

/**
 * Convertit les colonnes PostgreSQL de type `numeric`/`decimal` en `number`.
 *
 * Le pilote `pg` renvoie les `numeric` sous forme de chaînes JavaScript
 * (ex: `"8500.00"`). Ce transformer normalise donc la valeur côté TypeORM afin
 * que l'API expose toujours des nombres et que le frontend n'ait pas à gérer
 * un type `string | number`.
 */
export const columnNumericTransformer: ValueTransformer = {
  /** Valeur applicative -> valeur SQL (on délègue le formatage à PostgreSQL). */
  to: (value: number | null | undefined): number | null | undefined => value,

  /** Valeur SQL -> valeur applicative. */
  from: (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined) {
      return null;
    }

    return Number(value);
  },
};
