import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

const SEQUENCE_NOM = 'commande_numero_seq';

/**
 * Génère les numéros de commande (`CMD-<année>-<n° sur 4 chiffres>`) à partir
 * d'une séquence PostgreSQL.
 *
 * Un `COUNT(*)` suivi d'un `+1` n'est pas atomique : deux commandes créées en
 * parallèle peuvent obtenir le même numéro. `nextval()` l'est par construction
 * au niveau PostgreSQL. Un trou dans la séquence est possible si la création
 * d'une commande échoue après l'attribution du numéro, ce qui est sans impact
 * (le numéro n'est jamais réutilisé).
 */
@Injectable()
export class CommandeNumeroService implements OnModuleInit {
  private readonly logger = new Logger(CommandeNumeroService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Crée la séquence au démarrage si elle n'existe pas encore. */
  async onModuleInit(): Promise<void> {
    await this.dataSource.query(
      `CREATE SEQUENCE IF NOT EXISTS ${SEQUENCE_NOM} START 1`,
    );
    await this.alignerSurCommandesExistantes();
  }

  /** Renvoie le prochain numéro de commande, unique et strictement croissant. */
  async nextNumero(): Promise<string> {
    const annee = new Date().getFullYear();

    const lignes = await this.dataSource.query<{ valeur: string }[]>(
      `SELECT nextval('${SEQUENCE_NOM}') AS valeur`,
    );

    const brut = lignes?.[0]?.valeur;
    const numero = Number(brut);

    if (!Number.isInteger(numero) || numero < 1) {
      throw new Error(
        `Impossible de générer un numéro de commande (valeur reçue : ${String(brut)})`,
      );
    }

    return `CMD-${annee}-${String(numero).padStart(4, '0')}`;
  }

  /**
   * Alignement ponctuel : si la séquence vient d'être créée alors que des
   * commandes existent déjà pour l'année en cours, on la positionne après le
   * plus grand numéro attribué afin de ne pas produire de doublon.
   * Sans effet si la séquence a déjà été utilisée.
   */
  private async alignerSurCommandesExistantes(): Promise<void> {
    const annee = new Date().getFullYear();

    try {
      await this.dataSource.query(
        `SELECT setval(
           '${SEQUENCE_NOM}',
           GREATEST(
             COALESCE(
               (SELECT MAX(SUBSTRING(numero FROM 10)::int)
                FROM commandes
                WHERE numero LIKE $1),
               1
             ),
             1
           )
         )
         WHERE (SELECT last_value
                FROM pg_sequences
                WHERE sequencename = $2) IS NULL`,
        [`CMD-${annee}-%`, SEQUENCE_NOM],
      );
    } catch (erreur) {
      // Best effort : une échec d'alignement ne doit pas empêcher le démarrage.
      this.logger.error(
        `Impossible d'aligner la séquence ${SEQUENCE_NOM} sur les commandes existantes : ${String(erreur)}`,
      );
    }
  }
}
