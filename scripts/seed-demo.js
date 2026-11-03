/**
 * WorkStore — données de démonstration (catalogue, clients fictifs, commandes).
 *
 * Usage : npm run seed:demo
 *
 * Idempotent : peut être relancé sans créer de doublons.
 *  - catégories : mises à jour par nom (description + image)
 *  - produits   : upsert par `reference` (prix, description, images, note, stock)
 *  - clients    : comptes fictifs @demo.workstore.ci, mot de passe aléatoire
 *                 jamais affiché (personne ne peut s'y connecter)
 *  - commandes  : créées uniquement si les clients de démo n'en ont pas encore
 *
 * Aucun compte administrateur n'est créé ici (voir ADMIN_EMAIL / ADMIN_PASSWORD
 * dans .env.example).
 *
 * Images : photos Unsplash (licence Unsplash, usage libre), choisies pour
 * illustrer chaque article — ce sont des visuels d'illustration, pas des
 * photos contractuelles des produits.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// ---------------------------------------------------------------- env ----
function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// ------------------------------------------------------------- images ----
const img = (id) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

const I = {
  agenda: img('1435527173128-983b87201f4d'),
  fournitures: img('1452860606245-08befc0ff44b'),
  plumeEcriture: img('1455390582262-044cdead277a'),
  pots: img('1456735190827-d1262f71b8a3'),
  carnetStylo: img('1471107340929-a87cd0f5b5f3'),
  checklist: img('1484480974693-6ca0a78fb36b'),
  portable: img('1496181133206-80ce9b88a853'),
  bureauVue: img('1497032628192-86f99bcd76bc'),
  casqueJaune: img('1505740420928-5e560c06d30e'),
  calendrier: img('1506784983877-45594efa4cbe'),
  lampe: img('1507473885765-e6ed057f782c'),
  crayonsCouleur: img('1513542789411-b6a5d4f31634'),
  carnetNotes: img('1517842645767-c639042777db'),
  posteTravail: img('1518455027359-f3f8164ba6bd'),
  imac: img('1527443224154-c4a3942d3acf'),
  sourisGrise: img('1527864550417-7fd91fc51a46'),
  cahierBlanc: img('1531346878377-a5be20888e57'),
  feuilles: img('1532153975070-2e9ab71f1b14'),
  clavierBlanc: img('1541140532154-b024d705b90a'),
  casqueClavier: img('1550009158-9ebf69173e03'),
  dossiers1: img('1554224154-26032ffc0d07'),
  dossiers2: img('1554224155-6726b3ff858f'),
  crayonsPastel: img('1568205612837-017257d2310a'),
  fauteuil: img('1580480055273-228ff5388ef8'),
  casqueBlanc: img('1583394838336-acd977736f90'),
  styloNoir: img('1583485088034-697b5bc54ccd'),
  styloBille: img('1585336261022-680e295ce3fe'),
  tablettes: img('1585790050230-5dd28404ccb9'),
  ecranEnceintes: img('1586210579191-33b45e38fa2c'),
  porteBloc: img('1586281380349-632531db7ed4'),
  calculatrice: img('1587145820266-a5951ee6f620'),
  clavierAlu: img('1587829741301-dc798b83add3'),
  portableDell: img('1588872657578-7efd1f1555ed'),
  chaiseNoire: img('1592078615290-033ee584e267'),
  bureauLampe: img('1593062096033-9a26b09da705'),
  bibliotheque: img('1594620302200-9a762244a156'),
  clavierCouleur: img('1595225476474-87563907a212'),
  papierBlanc: img('1604147706283-d7119b5b822c'),
  crayonFormulaire: img('1606326608606-aa0b62935f2b'),
  bureauBois: img('1611269154421-4e27233ac5c7'),
  postitTodo: img('1611224923853-80b023f02d71'),
  clavierRetro: img('1612198188060-c7c2a3b66eae'),
  casqueNoir: img('1612444530582-fc66183b16f7'),
  imprimanteHp: img('1612815154858-60aa4c59eaa6'),
  ecran: img('1614624532983-4ce03382d63d'),
  sourisNoire: img('1615663245857-ac93bb7c39e7'),
  imprimanteEpson: img('1625961332771-3f40b0e2bdcf'),
  formulaires: img('1544377193-33dcf4d68fb5'),
  porteBloc2: img('1586282391129-76a6df230234'),
  postitKraft: img('1586892477838-2b96e85e0f96'),
  tablette: img('1587033411391-5d9e51cce126'),
  doubleEcran: img('1580894894513-541e068a3e2b'),
  chaiseGrise: img('1598300042247-d088f8ab3a91'),
  disqueExterne: img('1602526430780-782d6b1783fa'),
  postit: img('1616628188859-7a11abb6fcc9'),
  trombones: img('1625225233840-695456021cde'),
};

// --------------------------------------------------------- catégories ----
const CATEGORIES = [
  ['Papeterie', 'Ramettes, cahiers, carnets, agendas et notes adhésives', I.carnetStylo],
  ['Écriture', 'Stylos, crayons, surligneurs et marqueurs', I.pots],
  ['Classement', 'Classeurs, chemises, pochettes et archivage', I.dossiers2],
  ['Informatique', 'Ordinateurs, écrans, claviers, souris et accessoires', I.casqueClavier],
  ['Impression', "Imprimantes, cartouches, toners et papiers d'impression", I.imprimanteHp],
  ['Mobilier', 'Bureaux, sièges, rangements et éclairage', I.posteTravail],
  ['Consommables', 'Agrafes, trombones, adhésifs et petit matériel', I.fournitures],
];

// ----------------------------------------------------------- produits ----
// [reference, nom, categorie, marque, prix, ancien_prix, quantite, seuil, note, avis, images[], description]
const PRODUITS = [
  // Papeterie
  ['PAP-A4-80', 'Ramette de papier A4 80 g', 'Papeterie', 'Navigator', 3900, 4900, 250, 30, 5, 128, [I.papierBlanc, I.feuilles],
    "Ramette de 500 feuilles A4 80 g/m², blancheur 169 CIE. Idéale pour l'impression laser, jet d'encre et la photocopie au quotidien."],
  ['PAP-A3-80', 'Ramette de papier A3 80 g', 'Papeterie', 'Navigator', 8900, null, 60, 10, 4, 22, [I.feuilles, I.papierBlanc],
    'Ramette de 500 feuilles A3 80 g/m² pour plans, affiches et tableaux grand format.'],
  ['CAH-A5-96', 'Cahier A5 à spirale 96 pages', 'Papeterie', 'Oxford', 1600, null, 180, 25, 4, 64, [I.cahierBlanc, I.carnetStylo],
    'Cahier A5 à spirale, 96 pages lignées, papier 90 g et couverture cartonnée résistante.'],
  ['CARN-A5-RIG', 'Carnet de notes A5 couverture rigide', 'Papeterie', 'Clairefontaine', 4500, 5200, 95, 15, 5, 41, [I.carnetNotes, I.carnetStylo],
    'Carnet A5 192 pages lignées, couverture rigide, élastique de fermeture et marque-page.'],
  ['AGENDA-2027', 'Agenda semainier 2027', 'Papeterie', 'Exacompta', 6500, null, 70, 12, 4, 18, [I.agenda, I.calendrier],
    'Agenda une semaine sur deux pages, format 16 × 24 cm, planning annuel et répertoire.'],
  ['BLOC-A5-100', 'Bloc-notes A5 ligné 100 feuilles', 'Papeterie', 'Oxford', 2600, 3300, 120, 20, 4, 37, [I.checklist, I.cahierBlanc],
    'Bloc-notes A5 encollé en tête, 100 feuilles lignées détachables. Idéal pour les réunions.'],
  ['POSTIT-76-12', 'Notes adhésives 76 × 76 mm (12 blocs)', 'Papeterie', 'Post-it', 5900, 6900, 140, 20, 5, 86, [I.postit, I.postitKraft, I.postitTodo],
    '12 blocs de 100 notes repositionnables 76 × 76 mm. Adhésif fort, se décollent sans laisser de trace.'],
  ['ENV-C4-50', 'Enveloppes kraft C4 (lot de 50)', 'Papeterie', 'Clairefontaine', 5900, null, 8, 15, 4, 12, [I.formulaires, I.feuilles],
    'Lot de 50 enveloppes kraft C4 (229 × 324 mm), fermeture autoadhésive, pour documents A4 non pliés.'],

  // Écriture
  ['STY-BLEU-10', 'Stylos à bille bleus (lot de 10)', 'Écriture', 'Bic', 3300, 4300, 300, 40, 5, 212, [I.styloBille, I.pots],
    'Lot de 10 stylos à bille, encre bleue fluide, pointe moyenne 1,0 mm, corps ergonomique.'],
  ['STY-GEL-12', 'Stylos gel noirs rétractables (lot de 12)', 'Écriture', 'Pilot', 4200, null, 160, 25, 4, 57, [I.styloNoir, I.bureauVue],
    'Stylos gel rétractables à encre noire, pointe 0,7 mm, grip caoutchouc. Écriture nette et sans bavure.'],
  ['STY-PLUME-N', 'Stylo plume noir', 'Écriture', 'Parker', 8500, 10500, 60, 10, 5, 29, [I.plumeEcriture, I.carnetNotes],
    "Stylo plume corps en résine noire, plume acier inoxydable, livré avec cartouche d'encre bleue."],
  ['STY-JOTTER', 'Stylo bille métal Jotter', 'Écriture', 'Parker', 12500, null, 40, 8, 5, 33, [I.styloBille, I.styloNoir],
    'Stylo à bille iconique, corps en acier inoxydable, mécanisme poussoir. Idéal à offrir.'],
  ['MARQ-PERM-N', 'Marqueurs permanents noirs (lot de 5)', 'Écriture', 'Sharpie', 4300, null, 150, 25, 4, 44, [I.pots, I.styloNoir],
    "Marqueurs permanents pointe fine 1,0 mm, encre résistante à l'eau, séchage rapide."],
  ['CRAY-HB-12', 'Crayons à papier HB (lot de 12)', 'Écriture', 'Staedtler', 2300, 2800, 200, 30, 4, 51, [I.crayonFormulaire, I.crayonsPastel],
    'Crayons graphite HB en bois certifié, bout gomme, mine résistante à la casse.'],
  ['CRAY-COUL-24', 'Crayons de couleur (boîte de 24)', 'Écriture', 'Faber-Castell', 4900, null, 85, 15, 5, 38, [I.crayonsCouleur, I.crayonsPastel],
    '24 crayons de couleur aux pigments intenses, mine tendre de 3,3 mm, boîte métal.'],
  ['CRAY-PASTEL-12', 'Crayons pastel (lot de 12)', 'Écriture', 'Staedtler', 3500, 3900, 4, 10, 4, 9, [I.crayonsPastel, I.crayonsCouleur],
    'Crayons aux teintes pastel pour les plannings, schémas et prises de notes visuelles.'],

  // Classement
  ['CLAS-LEV-A4', 'Classeur à levier A4 dos 80 mm', 'Classement', 'Elba', 2900, 3600, 140, 20, 4, 47, [I.dossiers2, I.dossiers1],
    'Classeur à levier A4, dos 80 mm, mécanisme métal, étiquette de dos interchangeable.'],
  ['POCH-PERF-100', 'Pochettes perforées A4 (lot de 100)', 'Classement', 'Leitz', 5200, null, 110, 15, 4, 26, [I.formulaires, I.feuilles],
    'Pochettes transparentes A4 perforées 11 trous, grain lisse 60 microns.'],
  ['CHEM-CART-50', 'Chemises cartonnées A4 (lot de 50)', 'Classement', 'Exacompta', 6600, 8200, 80, 12, 4, 19, [I.dossiers1, I.formulaires],
    'Chemises cartonnées 220 g, coloris assortis, pour le classement de documents A4.'],
  ['TRIEUR-12', 'Trieur 12 compartiments', 'Classement', 'Exacompta', 7800, null, 0, 8, 4, 14, [I.dossiers2, I.formulaires],
    'Trieur à onglets en carte lustrée, 12 compartiments, fermeture élastique.'],
  ['PORTEBLOC-A4', 'Porte-bloc A4 à pince', 'Classement', 'Exacompta', 2500, null, 75, 12, 4, 21, [I.porteBloc, I.porteBloc2],
    'Porte-bloc rigide A4 avec pince métal, idéal pour les inventaires et prises de notes debout.'],
  ['ARCH-80-10', "Boîtes d'archives dos 80 mm (lot de 10)", 'Classement', 'Esselte', 9500, 11000, 45, 8, 4, 11, [I.feuilles, I.dossiers1],
    "Boîtes d'archives en carton recyclé, montage rapide, dos 80 mm avec zone d'écriture."],

  // Informatique
  ['PC-PORT-14', 'Ordinateur portable 14" Core i5 16 Go', 'Informatique', 'Dell', 485000, 529000, 14, 3, 5, 27, [I.portableDell, I.portable],
    'Portable 14" Full HD, Intel Core i5, 16 Go de RAM, SSD 512 Go, Windows 11 Pro. Léger et autonome pour le travail nomade.'],
  ['ECRAN-24-FHD', 'Écran 24" Full HD IPS', 'Informatique', 'Dell', 98000, 115000, 22, 5, 5, 34, [I.ecran, I.ecranEnceintes, I.doubleEcran],
    'Écran 24" IPS Full HD, bords fins, HDMI + DisplayPort, pied réglable en hauteur.'],
  ['TAB-11-128', 'Tablette 11" 128 Go', 'Informatique', 'Samsung', 265000, null, 9, 3, 4, 15, [I.tablette, I.tablettes],
    'Tablette 11" 128 Go, Wi-Fi, stylet inclus. Parfaite pour la prise de notes et les présentations.'],
  ['SOUR-SF-01', 'Souris sans fil silencieuse', 'Informatique', 'Logitech', 13100, 16400, 75, 10, 4, 98, [I.sourisGrise, I.sourisNoire],
    'Souris optique sans fil, récepteur USB, clics silencieux, autonomie 18 mois.'],
  ['SOUR-ERGO', 'Souris ergonomique Bluetooth', 'Informatique', 'Logitech', 18900, null, 3, 8, 5, 42, [I.sourisNoire, I.sourisGrise],
    'Souris ergonomique Bluetooth multi-appareils, capteur 4000 DPI, recharge USB-C.'],
  ['CLAV-AZ-01', 'Clavier AZERTY filaire', 'Informatique', 'Logitech', 19700, 23000, 50, 8, 4, 61, [I.clavierBlanc, I.clavierAlu],
    'Clavier AZERTY filaire USB, touches silencieuses extra-plates, résistant aux éclaboussures.'],
  ['CLAV-MECA-01', 'Clavier mécanique rétroéclairé', 'Informatique', 'Logitech', 45000, null, 18, 4, 5, 23, [I.clavierRetro, I.clavierCouleur],
    'Clavier mécanique AZERTY, switches tactiles, rétroéclairage réglable, repose-poignets amovible.'],
  ['KIT-CLAV-SOUR', 'Kit clavier + souris sans fil', 'Informatique', 'Logitech', 24500, 28900, 36, 6, 4, 55, [I.casqueClavier, I.clavierBlanc],
    'Ensemble clavier AZERTY et souris sans fil, un seul récepteur USB, autonomie jusqu’à 3 ans.'],
  ['CASQ-BT-ANC', 'Casque Bluetooth à réduction de bruit', 'Informatique', 'Sony', 59000, 69000, 20, 5, 5, 74, [I.casqueBlanc, I.casqueJaune, I.casqueNoir],
    'Casque circum-auriculaire à réduction active du bruit, 30 h d’autonomie, micro pour les visioconférences.'],
  ['WEBCAM-1080', 'Webcam HD 1080p', 'Informatique', 'Logitech', 26200, 32800, 35, 5, 4, 39, [I.imac, I.doubleEcran],
    'Webcam Full HD 1080p avec micro stéréo, correction automatique de la lumière, fixation universelle.'],
  ['SSD-EXT-1TO', 'Disque SSD externe 1 To', 'Informatique', 'Samsung', 52000, null, 28, 5, 5, 46, [I.disqueExterne],
    'SSD portable USB-C 1 To, jusqu’à 1050 Mo/s, boîtier aluminium résistant aux chocs.'],
  ['CAB-HDMI-2M', 'Câble HDMI 2.0 — 2 m', 'Informatique', 'Belkin', 5900, null, 130, 20, 4, 31, [I.ecranEnceintes, I.ecran],
    'Câble HDMI 2.0 haute vitesse, compatible 4K 60 Hz, connecteurs plaqués or, longueur 2 m.'],

  // Impression
  ['IMP-LASER-MFP', 'Imprimante laser couleur multifonction', 'Impression', 'HP', 189000, 215000, 7, 2, 5, 19, [I.imprimanteHp],
    'Imprimante laser couleur 3-en-1 (impression, copie, numérisation), recto verso automatique, Wi-Fi.'],
  ['IMP-ECOTANK', "Imprimante jet d'encre à réservoirs", 'Impression', 'Epson', 145000, null, 10, 2, 4, 24, [I.imprimanteEpson],
    "Imprimante multifonction à réservoirs rechargeables : jusqu'à 7 500 pages couleur avec les encres fournies."],
  ['CART-HP-305', 'Cartouche d’encre noire HP 305', 'Impression', 'HP', 16400, 19700, 70, 10, 4, 58, [I.imprimanteHp, I.imprimanteEpson],
    'Cartouche d’encre noire d’origine HP 305, compatible DeskJet, rendement environ 120 pages.'],
  ['TONER-CAN-725', 'Toner Canon 725 noir', 'Impression', 'Canon', 39400, 45900, 6, 5, 4, 17, [I.imprimanteEpson, I.imprimanteHp],
    'Toner noir d’origine Canon 725 pour i-SENSYS, rendement environ 1 600 pages.'],
  ['PAP-PHOTO-50', 'Papier photo brillant A4 (50 feuilles)', 'Impression', 'Canon', 7900, null, 60, 10, 4, 13, [I.papierBlanc, I.feuilles],
    'Papier photo brillant A4 200 g/m², séchage instantané, rendu des couleurs éclatant.'],

  // Mobilier
  ['FAUT-ERGO-01', 'Fauteuil de bureau ergonomique', 'Mobilier', 'WorkStore Pro', 124000, 150200, 20, 3, 5, 66, [I.fauteuil, I.posteTravail],
    'Fauteuil ergonomique, soutien lombaire réglable, accoudoirs 3D, assise en tissu respirant, garantie 5 ans.'],
  ['CHAISE-VISIT', 'Chaise visiteur rembourrée', 'Mobilier', 'WorkStore Pro', 38000, null, 32, 6, 4, 14, [I.chaiseGrise, I.chaiseNoire],
    'Chaise visiteur au dossier enveloppant, revêtement tissu gris chiné, piètement bois massif.'],
  ['CHAISE-SCAND', 'Chaise scandinave noire', 'Mobilier', 'WorkStore Pro', 29000, 34000, 2, 5, 4, 20, [I.chaiseNoire, I.chaiseGrise],
    'Chaise coque noire, assise rembourrée, pieds en hêtre. Pour salle de réunion ou espace d’accueil.'],
  ['BUREAU-L-01', "Bureau d'angle en L 140 × 140 cm", 'Mobilier', 'WorkStore Pro', 163300, 196100, 12, 2, 4, 25, [I.posteTravail, I.bureauLampe],
    "Bureau d'angle, plateau mélaminé 25 mm, structure acier, passe-câbles intégrés."],
  ['BUREAU-CHENE', 'Bureau droit en chêne 120 cm', 'Mobilier', 'WorkStore Pro', 135000, null, 9, 2, 5, 12, [I.bureauBois, I.bureauLampe],
    'Bureau droit 120 × 60 cm, plateau placage chêne, pieds compas en métal noir.'],
  ['BIBLIO-5ET', 'Bibliothèque 5 étagères', 'Mobilier', 'WorkStore Pro', 89000, null, 11, 2, 4, 16, [I.bibliotheque],
    'Bibliothèque en bois 5 niveaux, 80 × 180 cm, étagères réglables, fixation murale fournie.'],
  ['LAMPE-LED-01', 'Lampe de bureau LED', 'Mobilier', 'Philips', 22900, 26200, 45, 8, 4, 48, [I.lampe, I.bureauLampe],
    'Lampe LED à bras articulé, intensité et température de couleur réglables, port USB de charge.'],

  // Consommables
  ['KIT-BUREAU', 'Kit fournitures : ciseaux, rubans, cutter', 'Consommables', 'Maped', 9900, 11900, 55, 10, 5, 35, [I.fournitures, I.bureauVue],
    'Kit complet : ciseaux 21 cm, cutter, 3 rubans adhésifs décoratifs, règle et taille-crayon.'],
  ['AGRAF-24-6', 'Agrafeuse 24/6 + 1000 agrafes', 'Consommables', 'Rapesco', 5200, 6200, 100, 15, 4, 43, [I.fournitures, I.formulaires],
    'Agrafeuse métal capacité 30 feuilles, chargement par le dessus, livrée avec 1000 agrafes 24/6.'],
  ['TROMB-1000', 'Trombones 28 mm (boîte de 1000)', 'Consommables', 'Rapesco', 2000, null, 220, 40, 4, 27, [I.trombones, I.fournitures],
    'Trombones en acier galvanisé 28 mm, boîte distributrice aimantée.'],
  ['PERFO-2T-01', 'Perforatrice 2 trous', 'Consommables', 'Rapesco', 8500, 9800, 55, 10, 4, 18, [I.fournitures, I.dossiers2],
    'Perforatrice métal 2 trous, capacité 30 feuilles, guide de format réglable.'],
  ['CALC-12', 'Calculatrice de bureau 12 chiffres', 'Consommables', 'Casio', 7500, null, 65, 10, 5, 52, [I.calculatrice, I.trombones],
    'Calculatrice de bureau, grand écran 12 chiffres inclinable, double alimentation solaire/pile.'],
];

// ------------------------------------------------------- clients démo ----
const CLIENTS = [
  ['Kouassi', 'Aya', 'aya.kouassi@demo.workstore.ci', '+225 07 08 12 34 56', 'Bureau', 'Rue des Jardins, Deux-Plateaux Vallon', 'Abidjan — Cocody'],
  ['Traoré', 'Moussa', 'moussa.traore@demo.workstore.ci', '+225 05 44 21 09 87', 'Siège', 'Avenue Chardy, immeuble Alpha 2000', 'Abidjan — Plateau'],
  ["N'Guessan", 'Fabrice', 'fabrice.nguessan@demo.workstore.ci', '+225 01 02 33 44 55', 'Agence', 'Boulevard VGE, zone 4', 'Abidjan — Marcory'],
  ['Koné', 'Mariam', 'mariam.kone@demo.workstore.ci', '+225 07 77 65 43 21', 'Domicile', 'Cité Mamie Faitai', 'Abidjan — Yopougon'],
  ['Bamba', 'Ibrahim', 'ibrahim.bamba@demo.workstore.ci', '+225 05 06 07 08 09', 'Boutique', 'Avenue 16, rue 21', 'Abidjan — Treichville'],
  ['Yao', 'Christelle', 'christelle.yao@demo.workstore.ci', '+225 01 23 45 67 89', 'Cabinet', 'Riviera Palmeraie, rue M43', 'Abidjan — Cocody'],
];

// Pseudo-aléatoire déterministe → mêmes données à chaque exécution.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

async function main() {
  loadEnv();
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connecté à la base.');

  try {
    await client.query('BEGIN');

    // ---- Catégories
    const catIds = new Map();
    for (const [nom, description, image] of CATEGORIES) {
      const found = await client.query('SELECT id FROM categories WHERE nom = $1', [nom]);
      let id = found.rows[0]?.id;
      if (id) {
        await client.query(
          'UPDATE categories SET description = $2, image = $3, actif = true, updated_at = now() WHERE id = $1',
          [id, description, image],
        );
      } else {
        const ins = await client.query(
          'INSERT INTO categories (nom, description, image, actif) VALUES ($1, $2, $3, true) RETURNING id',
          [nom, description, image],
        );
        id = ins.rows[0].id;
      }
      catIds.set(nom, id);
    }
    console.log(`${CATEGORIES.length} catégories à jour.`);

    // ---- Produits, images, stocks
    const produitIds = new Map();
    let crees = 0;
    for (const p of PRODUITS) {
      const [reference, nom, cat, marque, prix, ancien, quantite, seuil, note, avis, images, description] = p;
      const found = await client.query('SELECT id FROM produits WHERE reference = $1', [reference]);
      let id = found.rows[0]?.id;
      const values = [nom, description, prix, ancien, marque, reference, catIds.get(cat), note, avis];
      if (id) {
        await client.query(
          `UPDATE produits SET nom=$2, description=$3, prix=$4, ancien_prix=$5, marque=$6, reference=$7,
             categorie_id=$8, note_moyenne=$9, nombre_avis=$10, actif=true, updated_at=now() WHERE id=$1`,
          [id, ...values],
        );
      } else {
        const ins = await client.query(
          `INSERT INTO produits (nom, description, prix, ancien_prix, marque, reference, categorie_id, note_moyenne, nombre_avis, actif)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING id`,
          values,
        );
        id = ins.rows[0].id;
        crees += 1;
      }
      produitIds.set(reference, { id, nom, prix });

      await client.query('DELETE FROM images_produit WHERE produit_id = $1', [id]);
      for (let i = 0; i < images.length; i += 1) {
        await client.query(
          'INSERT INTO images_produit (produit_id, url, is_principale, ordre) VALUES ($1, $2, $3, $4)',
          [id, images[i], i === 0, i],
        );
      }

      const stock = await client.query('SELECT id FROM stocks WHERE produit_id = $1', [id]);
      if (stock.rows[0]) {
        await client.query(
          'UPDATE stocks SET quantite=$2, seuil_alerte=$3, updated_at=now() WHERE id=$1',
          [stock.rows[0].id, quantite, seuil],
        );
      } else {
        await client.query(
          'INSERT INTO stocks (produit_id, quantite, seuil_alerte) VALUES ($1, $2, $3)',
          [id, quantite, seuil],
        );
      }
    }
    console.log(`${PRODUITS.length} produits à jour (${crees} nouveaux), images et stocks synchronisés.`);

    // ---- Clients fictifs + adresses
    const clients = [];
    for (const [nom, prenom, email, telephone, libelle, adresse, ville] of CLIENTS) {
      const found = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      let id = found.rows[0]?.id;
      if (!id) {
        // Mot de passe aléatoire non communiqué : compte non utilisable pour se connecter.
        const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
        const ins = await client.query(
          `INSERT INTO users (nom, prenom, email, password, telephone, role) VALUES ($1,$2,$3,$4,$5,'client') RETURNING id`,
          [nom, prenom, email, hash, telephone],
        );
        id = ins.rows[0].id;
        await client.query('INSERT INTO profiles (user_id) VALUES ($1)', [id]);
      }
      let adr = await client.query('SELECT id FROM adresses WHERE user_id = $1 LIMIT 1', [id]);
      if (!adr.rows[0]) {
        adr = await client.query(
          `INSERT INTO adresses (user_id, libelle, adresse, ville, pays, telephone, is_principale)
           VALUES ($1,$2,$3,$4,'Côte d''Ivoire',$5,true) RETURNING id`,
          [id, libelle, adresse, ville, telephone],
        );
      }
      clients.push({ id, adresseId: adr.rows[0].id });
    }
    console.log(`${clients.length} clients de démonstration prêts.`);

    // ---- Commandes (uniquement si les clients démo n'en ont pas)
    const existing = await client.query(
      'SELECT count(*)::int AS n FROM commandes WHERE user_id = ANY($1::uuid[])',
      [clients.map((c) => c.id)],
    );
    if (existing.rows[0].n === 0) {
      await client.query('CREATE SEQUENCE IF NOT EXISTS commande_numero_seq START 1');
      const maxNum = await client.query(
        "SELECT COALESCE(MAX(NULLIF(regexp_replace(numero, '.*-', ''), '')::int), 0) AS m FROM commandes",
      );
      await client.query('SELECT setval($1, GREATEST($2::bigint, 1), $3)', [
        'commande_numero_seq',
        maxNum.rows[0].m,
        maxNum.rows[0].m > 0,
      ]);

      const rand = rng(42);
      const refs = [...produitIds.keys()];
      const NB = 34;
      let creees = 0;
      for (let k = 0; k < NB; k += 1) {
        // Répartition sur les 120 derniers jours, plus dense sur les récents.
        const joursAgo = Math.floor(Math.pow(rand(), 1.6) * 120);
        const date = new Date(Date.now() - joursAgo * 86400000 - Math.floor(rand() * 10) * 3600000);
        const statut =
          joursAgo < 2 ? (rand() < 0.5 ? 'EN_ATTENTE' : 'PAYEE')
          : joursAgo < 5 ? (rand() < 0.5 ? 'EN_PREPARATION' : 'PAYEE')
          : joursAgo < 9 ? 'EXPEDIEE'
          : rand() < 0.1 ? 'ANNULEE' : 'LIVREE';
        const c = clients[Math.floor(rand() * clients.length)];

        const nbLignes = 1 + Math.floor(rand() * 4);
        const choisis = new Set();
        while (choisis.size < nbLignes) choisis.add(refs[Math.floor(rand() * refs.length)]);
        const lignes = [...choisis].map((ref) => {
          const p = produitIds.get(ref);
          const qte = p.prix > 100000 ? 1 : 1 + Math.floor(rand() * 5);
          return { ...p, qte, sousTotal: p.prix * qte };
        });
        const sousTotal = lignes.reduce((s, l) => s + l.sousTotal, 0);
        const frais = sousTotal >= 50000 ? 0 : 2000;

        const num = await client.query("SELECT nextval('commande_numero_seq') AS v");
        const numero = `CMD-${date.getFullYear()}-${String(num.rows[0].v).padStart(4, '0')}`;
        const cmd = await client.query(
          `INSERT INTO commandes (numero, user_id, montant_total, frais_livraison, adresse_livraison_id, statut, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
          [numero, c.id, sousTotal + frais, frais, c.adresseId, statut, date],
        );
        for (const l of lignes) {
          await client.query(
            `INSERT INTO detail_commandes (commande_id, produit_id, nom_produit, prix_unitaire, quantite, sous_total, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [cmd.rows[0].id, l.id, l.nom, l.prix, l.qte, l.sousTotal, date],
          );
        }
        creees += 1;
      }
      console.log(`${creees} commandes de démonstration créées.`);
    } else {
      console.log('Commandes de démonstration déjà présentes, ignorées.');
    }

    await client.query('COMMIT');
    console.log('Terminé.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Échec du seed de démonstration :', error.message);
  process.exit(1);
});
