/**
 * Met à jour les 34 tooltips du Devis > Toiture avec le format structuré :
 * - À quoi sert ce champ ?
 * - Question commerciale à poser au client
 * - Indication / Pourquoi ce champ est important
 */

import { db } from '../src/lib/database';

const DEVIS_NODE_ID = '7528d92c-ade9-4b38-8c60-fbbeffec6df9';
const SUBTAB = 'Toiture';

const TOOLTIPS: Record<string, string> = {

  // ═══════════════════════════════════════════
  // TOUJOURS VISIBLE
  // ═══════════════════════════════════════════

  "Type d'intervention": `À quoi sert ce champ ?
Permet de définir le type de travaux de toiture à réaliser. Ce choix adapte automatiquement le questionnaire : seules les questions pertinentes s'afficheront.

Question commerciale à poser au client :
« Quel type de travaux souhaitez-vous pour votre toiture ? S'agit-il d'une construction neuve, d'une rénovation complète, d'un simple remplacement de couverture ou d'une réparation ciblée ? »

Indication / Pourquoi ce champ est important :
Détermine l'ensemble du parcours de chiffrage. Une rénovation complète implique beaucoup plus de postes (isolation, sous-toiture, lattage, zinguerie) qu'un simple remplacement de couverture.
Impact direct sur le montant global du devis et les délais d'exécution.`,

  "Container / Benne à déchets ?": `À quoi sert ce champ ?
Indique si un container ou une benne est nécessaire pour évacuer les matériaux de démolition (tuiles, ardoises, bois, etc.).

Question commerciale à poser au client :
« Avez-vous besoin qu'on prévoie un container pour évacuer les anciens matériaux ? Ou avez-vous déjà une solution d'évacuation ? »

Indication / Pourquoi ce champ est important :
Poste de coût non négligeable (200-600€ selon le volume). Indispensable pour toute rénovation ou remplacement.
Si le client gère lui-même l'évacuation, on économise ce poste. En construction neuve, le constructeur fournit parfois le container.`,

  "Remarques": `À quoi sert ce champ ?
Zone de texte libre pour ajouter toute information supplémentaire utile au chiffrage.

Question commerciale à poser au client :
« Y a-t-il autre chose que vous souhaitez me signaler concernant votre toiture ou les travaux envisagés ? »

Indication / Pourquoi ce champ est important :
Permet de capturer les demandes spécifiques du client, les contraintes particulières (voisinage, accès limité à certaines heures, exigences esthétiques...).
Ces détails influencent souvent le prix et les méthodes de travail.`,

  "Infos complémentaires hors parcours ?": `À quoi sert ce champ ?
Permet d'ajouter des informations ou travaux supplémentaires qui ne rentrent dans aucune catégorie du questionnaire standard.

Question commerciale à poser au client :
« Avez-vous d'autres travaux ou demandes particulières qui ne sont pas couverts par les questions précédentes ? »

Indication / Pourquoi ce champ est important :
Les chantiers de toiture peuvent impliquer des travaux annexes non standards (dépose d'antenne, déplacement de câbles, nettoyage de grenier...).
Activez ce champ pour documenter ces cas particuliers et les intégrer au devis.`,

  // ═══════════════════════════════════════════
  // PARCOURS RENOV / COUVERTURE
  // ═══════════════════════════════════════════

  "Urgence / Délai souhaité": `À quoi sert ce champ ?
Permet d'évaluer le degré d'urgence des travaux et le délai souhaité par le client.

Question commerciale à poser au client :
« Quelle est l'urgence de ces travaux ? Avez-vous des infiltrations actives ou est-ce un projet planifié ? Dans quel délai souhaiteriez-vous que les travaux soient réalisés ? »

Indication / Pourquoi ce champ est important :
Un chantier urgent (infiltrations) sera priorisé dans le planning mais peut impliquer un surcoût pour la mobilisation rapide.
Aide à planifier les équipes et à donner un délai réaliste au client.
Si infiltrations actives, une intervention temporaire peut être proposée en attendant le chantier complet.`,

  "Présence d'amiante ?": `À quoi sert ce champ ?
Identifie si le bâtiment est susceptible de contenir de l'amiante, ce qui impacte fortement le chantier.

Question commerciale à poser au client :
« Savez-vous si votre toiture ou les matériaux de construction contiennent de l'amiante ? Le bâtiment a-t-il été construit avant 2001 ? Un inventaire amiante a-t-il déjà été réalisé ? »

Indication / Pourquoi ce champ est important :
Obligation légale en Belgique : tout bâtiment construit avant 2001 doit faire l'objet d'un inventaire amiante avant travaux de rénovation. Le non-respect expose à des sanctions.
Si amiante confirmé, un désamiantage certifié est requis, ce qui augmente significativement le coût (1500-5000€ selon la surface) et les délais.
Le "Ne sait pas" déclenche une vérification obligatoire avant le début des travaux.`,

  // ═══════════════════════════════════════════
  // PARCOURS RÉPARATION
  // ═══════════════════════════════════════════

  "Zones à réparer": `À quoi sert ce champ ?
Identifie précisément les zones de la toiture qui nécessitent une intervention de réparation.

Question commerciale à poser au client :
« Quelles parties de votre toiture posent problème ? Est-ce la couverture (tuiles/ardoises cassées), les gouttières, la faîtière, les rives, ou autre chose ? »

Indication / Pourquoi ce champ est important :
Permet de cibler l'intervention et d'estimer les matériaux nécessaires. Plusieurs zones peuvent être cochées si le problème est multiple.
Chaque zone a un coût différent : une réparation de couverture est différente d'un remplacement de noues ou de bavettes.
L'option "Autre" permet de couvrir les cas non listés.`,

  "Échafaudage nécessaire ?": `À quoi sert ce champ ?
Détermine si un échafaudage doit être prévu pour accéder à la zone de réparation.

Question commerciale à poser au client :
« La zone à réparer est-elle accessible à l'échelle ou faut-il prévoir un échafaudage ? À quelle hauteur se situe le problème ? »

Indication / Pourquoi ce champ est important :
L'échafaudage représente un coût significatif (500-2000€ selon la longueur et la durée). Si la réparation est localisée et accessible à l'échelle, ce surcoût peut être évité.
Le choix "À évaluer sur place" indique qu'un technicien devra vérifier avant de chiffrer cette partie.`,

  "Description détaillée de la réparation": `À quoi sert ce champ ?
Zone de texte libre pour décrire en détail le problème constaté et les travaux de réparation nécessaires.

Question commerciale à poser au client :
« Pouvez-vous me décrire le problème que vous constatez ? Depuis quand cela dure-t-il ? Y a-t-il eu un événement déclencheur (tempête, grêle, branche d'arbre) ? »

Indication / Pourquoi ce champ est important :
La description détaillée est essentielle pour le chiffrage d'une réparation ciblée. Mentionner l'emplacement exact, l'étendue visible des dégâts, et la cause probable.
Si le problème est lié à un événement climatique, le client peut potentiellement faire jouer son assurance habitation.`,

  // ═══════════════════════════════════════════
  // ISOLATION (toggle + sous-champs)
  // ═══════════════════════════════════════════

  "Isolation ?": `À quoi sert ce champ ?
Détermine si le client souhaite profiter de la rénovation de toiture pour ajouter ou refaire l'isolation.

Question commerciale à poser au client :
« Souhaitez-vous profiter de ces travaux de rénovation pour isoler ou ré-isoler votre toiture ? C'est le moment idéal car la couverture sera déposée. »

Indication / Pourquoi ce champ est important :
En rénovation complète, c'est l'occasion idéale d'isoler car la toiture est ouverte. Refaire l'isolation séparément coûterait presque autant rien qu'en main-d'œuvre.
L'isolation impacte fortement le montant du devis (+30 à 50%) mais donne droit à des primes énergie en Wallonie/Bruxelles et améliore la valeur PEB du bien.
Un argument de vente fort : économies de chauffage de 25-30% et confort été/hiver.`,

  "Type d'isolation": `À quoi sert ce champ ?
Définit la technique d'isolation à utiliser en fonction de la configuration du toit et de l'usage des combles.

Question commerciale à poser au client :
« Vos combles sont-ils aménagés (chambre, bureau) ou perdus (non utilisés) ? Si aménagés, souhaitez-vous garder l'espace intérieur intact ? »

Indication / Pourquoi ce champ est important :
• Sarking (par-dessus les chevrons) : la meilleure performance thermique. Panneaux rigides posés sur les chevrons. Pas de perte d'espace intérieur. Idéal si les combles sont aménagés. Plus cher mais le meilleur rapport qualité/prix à long terme.
• Sous-chevrons (entre et sous les chevrons) : moins cher mais réduit l'espace habitable. Adapté si le budget est limité.
• Soufflée (combles perdus uniquement) : la solution la plus économique. On souffle de la laine sur le plancher des combles non aménagés.
Le choix impacte les matériaux, le prix et potentiellement les primes disponibles.`,

  "Épaisseur isolation (cm)": `À quoi sert ce champ ?
Définit l'épaisseur du panneau ou de la couche isolante à poser.

Question commerciale à poser au client :
« Connaissez-vous l'épaisseur d'isolation souhaitée ? Sinon, nous recommandons un minimum de 12 cm pour bénéficier des primes. L'idéal se situe entre 16 et 20 cm. »

Indication / Pourquoi ce champ est important :
Normes PEB belges : minimum 12 cm pour les primes en rénovation. 16-20 cm est le meilleur rapport qualité/prix (au-delà, le gain thermique est marginal par rapport au surcoût).
L'épaisseur détermine directement le prix de l'isolant et son poids au m² (important pour la structure).
Référence prix Façozinc : PIR 60mm ≈ 14€/m², 120mm ≈ 26€/m², 160mm ≈ 36€/m².`,

  "Hauteur chevrons (cm)": `À quoi sert ce champ ?
Indique la hauteur (section) des chevrons existants, nécessaire pour le dimensionnement du sarking.

Question commerciale à poser au client :
« Pourriez-vous mesurer la hauteur visible d'un chevron depuis l'intérieur ? Ou serait-il préférable qu'un technicien passe vérifier ? »

Indication / Pourquoi ce champ est important :
Ce champ n'apparaît que si le type d'isolation est "Sarking". La hauteur des chevrons détermine le type de vis de fixation traversante nécessaire (vis longues spéciales pour sarking).
Si le client ne peut pas mesurer, le technicien le fera lors de la visite technique.
Influence le coût de la fixation et la faisabilité technique.`,

  // ═══════════════════════════════════════════
  // SOUS-TOITURE / LATTAGE
  // ═══════════════════════════════════════════

  "Sous-toiture à poser": `À quoi sert ce champ ?
Définit le type de membrane sous-toiture à installer dans le cadre d'une rénovation complète.

Question commerciale à poser au client :
« Ce choix est technique et sera validé par notre équipe. La sous-toiture est la membrane de protection sous les tuiles/ardoises. »

Indication / Pourquoi ce champ est important :
En rénovation complète, la sous-toiture est systématiquement remplacée.
• Écran HPV (Haute Perméabilité Vapeur) : laisse passer la vapeur d'eau vers l'extérieur, évite la condensation. Obligatoire avec isolation sarking.
• Pare-vapeur : posé côté intérieur (chaud), bloque la vapeur venant des pièces.
• HPV + Pare-vapeur : configuration idéale pour une isolation performante.
Ce poste est systématique et non optionnel en rénovation complète.`,

  "Sous-toiture à remplacer ?": `À quoi sert ce champ ?
Évalue si la membrane sous-toiture existante doit être remplacée lors du remplacement de couverture.

Question commerciale à poser au client :
« Lors du remplacement de votre couverture, souhaitez-vous que nous vérifiions l'état de la sous-toiture et la remplacions si nécessaire ? »

Indication / Pourquoi ce champ est important :
En remplacement de couverture (pas de rénovation complète), la sous-toiture n'est pas forcément à remplacer. Mais si elle est dégradée, c'est le moment idéal car la couverture sera déposée.
"Partiel" signifie que seules certaines zones sont abîmées. Représente un coût modéré (15-25€/m²) qui évite des problèmes futurs.`,

  "Lattage à remplacer ?": `À quoi sert ce champ ?
Évalue si le lattage (les lattes horizontales qui supportent la couverture) doit être remplacé.

Question commerciale à poser au client :
« Le lattage est la structure qui supporte directement les tuiles ou ardoises. Lors du remplacement de votre couverture, nous vérifierons son état. Souhaitez-vous prévoir son remplacement ? »

Indication / Pourquoi ce champ est important :
En "Remplacement couverture", le lattage peut être conservé s'il est en bon état. Mais si les lattes sont pourries ou si l'écartement ne correspond pas au nouveau matériau, le remplacement est nécessaire.
En "Rénovation complète", le lattage est automatiquement remplacé (pas besoin de poser la question).
Coût modéré mais essentiel pour une pose correcte de la nouvelle couverture.`,

  // ═══════════════════════════════════════════
  // COUVERTURE
  // ═══════════════════════════════════════════

  "Matériau de couverture": `À quoi sert ce champ ?
Définit le matériau principal qui recouvrira la toiture. C'est le choix esthétique et technique le plus important.

Question commerciale à poser au client :
« Quel type de couverture souhaitez-vous ? Des tuiles en béton (économique), des tuiles en terre cuite, des ardoises naturelles (haut de gamme), du zinc, ou un autre matériau ? Avez-vous des préférences esthétiques ? »

Indication / Pourquoi ce champ est important :
Choix qui détermine le prix total, la durabilité et l'esthétique de la toiture.
• Tuiles béton : le plus économique (25-35€/m²), durée de vie 30-50 ans.
• Tuiles terre cuite : milieu de gamme (35-50€/m²), 50-80 ans.
• Ardoises naturelles : haut de gamme (60-100€/m²), 100+ ans, valorise le bien.
• Ardoises fibro-ciment : aspect ardoise à prix réduit (30-45€/m²), 30-40 ans.
• Zinc : très durable (80+ ans), idéal pour les faibles pentes (<15°).
• EPDM/Roofing : toitures plates uniquement.
Ce choix filtre automatiquement le format (si ardoises) et le type de fixation.`,

  "Format ardoises": `À quoi sert ce champ ?
Définit la taille des ardoises. N'apparaît que si vous avez choisi un matériau ardoise.

Question commerciale à poser au client :
« Pour les ardoises, quel format préférez-vous ? Le 40×40 cm est le standard en Belgique. Les petits formats sont plus esthétiques mais plus coûteux à la pose. »

Indication / Pourquoi ce champ est important :
Le format détermine le nombre d'ardoises au m² et donc le coût de fourniture ET de pose.
• 40×40 cm : standard belge, bon compromis couverture/pose (~23 ardoises/m²).
• 32×22 / 30×20 cm : petits formats, esthétique traditionnelle, mais pose plus longue (~40 ardoises/m²).
• 60×30 cm : grand format moderne, pose rapide.
Plus le format est petit, plus la main-d'œuvre est importante (plus d'ardoises à poser par m²).`,

  "Modèle / Gamme": `À quoi sert ce champ ?
Permet d'indiquer le modèle ou la gamme spécifique du matériau choisi.

Question commerciale à poser au client :
« Avez-vous un modèle ou une gamme en particulier en tête ? Par exemple une marque ou un produit que vous avez vu chez un voisin ou dans un showroom ? »

Indication / Pourquoi ce champ est important :
Le modèle précis détermine le prix exact via le catalogue fournisseur (Façozinc). Exemples : "CUPA 12" (ardoise naturelle), "Bruges Novo+" (tuile béton), "Alterna" (fibro-ciment).
Si le client n'a pas de préférence, laisser vide — le technicien proposera un modèle adapté lors de la visite.`,

  "Couleur": `À quoi sert ce champ ?
Indique la couleur souhaitée pour la couverture.

Question commerciale à poser au client :
« Quelle couleur souhaitez-vous pour votre toiture ? Avez-vous des contraintes urbanistiques dans votre commune ? »

Indication / Pourquoi ce champ est important :
Certaines communes imposent des couleurs via le plan de secteur ou le règlement communal d'urbanisme. Vérifier avant de commander.
Les ardoises naturelles n'existent qu'en gris/noir. Les tuiles terre cuite offrent plus de variantes (rouge, brun, anthracite). Le zinc se patine naturellement avec le temps.`,

  // ═══════════════════════════════════════════
  // ZINGUERIE
  // ═══════════════════════════════════════════

  "Matériau zinguerie": `À quoi sert ce champ ?
Définit le matériau pour l'ensemble de la zinguerie : gouttières, descentes, rives, faîtière, noues.

Question commerciale à poser au client :
« Quel matériau préférez-vous pour les gouttières et éléments de finition ? Le zinc naturel est le standard, mais le cuivre ou l'aluminium laqué sont aussi possibles. »

Indication / Pourquoi ce champ est important :
• Zinc naturel (ZN) : le standard en Belgique, bon rapport qualité/prix, patine naturelle.
• Zinc patiné (ATZ/QZ) : aspect vieilli dès la pose, évite la phase de patinage.
• Cuivre : haut de gamme, développe une patine verte caractéristique. Très durable.
• Aluminium laqué : ne rouille pas, large choix de couleurs, moderne.
• PVC : le plus économique mais durée de vie limitée (15-20 ans).
Le choix de la zinguerie accompagne souvent le choix de couverture (ex: zinc+ardoises = classique Belgique).`,

  "Type d'évacuation eaux": `À quoi sert ce champ ?
Définit le système d'évacuation des eaux de pluie.

Question commerciale à poser au client :
« Quel type de gouttières souhaitez-vous ? Des gouttières classiques demi-rondes, des gouttières corniche (carrées, plus modernes) ou un chéneau encastré ? »

Indication / Pourquoi ce champ est important :
• Gouttière demi-ronde : classique, économique, facile à entretenir et à remplacer.
• Gouttière corniche (carrée) : esthétique moderne, meilleur débit, plus chère.
• Chéneau : système encastré dans le mur ou la corniche, invisible. Plus cher à entretenir mais rendu esthétique supérieur.
Le débit nécessaire dépend de la surface du toit et de la pente.`,

  // ═══════════════════════════════════════════
  // FENÊTRES DE TOIT
  // ═══════════════════════════════════════════

  "Fenêtres de toit ?": `À quoi sert ce champ ?
Indique si des fenêtres de toit (type Velux) doivent être posées ou remplacées.

Question commerciale à poser au client :
« Souhaitez-vous installer des fenêtres de toit ? Ou remplacer celles existantes ? Cela apporte luminosité et ventilation naturelle aux combles. »

Indication / Pourquoi ce champ est important :
Les fenêtres de toit ajoutent de la valeur au bien et du confort. C'est le moment idéal pour les poser lors de travaux de toiture.
Si "Oui", des questions supplémentaires apparaîtront (type, dimensions, quantité, stores).
Poste de coût significatif : 700-2000€ par fenêtre fournie et posée selon le modèle.`,

  "Type d'ouverture fenêtre": `À quoi sert ce champ ?
Définit le mécanisme d'ouverture de la fenêtre de toit.

Question commerciale à poser au client :
« Comment souhaitez-vous que la fenêtre s'ouvre ? En rotation (standard, la plus courante), en projection (vers l'extérieur, permet de rester debout devant), ou en polyuréthane pour pièce humide ? »

Indication / Pourquoi ce champ est important :
• GGL (rotation) : la plus vendue, axe central, bon rapport qualité/prix.
• GPL (projection) : s'ouvre vers l'extérieur, plus pratique si la fenêtre est basse (on peut rester debout devant). Plus chère.
• GGU (rotation polyuréthane) : comme GGL mais finition blanche en polyuréthane. Résiste à l'humidité. Idéal pour salle de bain ou cuisine.`,

  "Dimensions fenêtre": `À quoi sert ce champ ?
Sélectionne la taille standard de la fenêtre de toit.

Question commerciale à poser au client :
« Quelle taille de fenêtre souhaitez-vous ? La MK06 (78×118 cm) est la plus populaire. Si vous voulez beaucoup de lumière, la UK08 (134×140 cm) est la plus grande. »

Indication / Pourquoi ce champ est important :
Les codes correspondent aux dimensions standard Velux (largeur × hauteur).
• CK02 (55×78) et CK04 (55×98) : petits modèles pour espaces restreints.
• MK06 (78×118) : le best-seller, bon compromis lumière/encombrement.
• SK06 (114×118) et UK08 (134×140) : grandes fenêtres, maximisent la lumière.
L'espace entre chevrons détermine souvent la largeur maximale installable.`,

  "Nombre de fenêtres": `À quoi sert ce champ ?
Indique combien de fenêtres de toit doivent être posées.

Question commerciale à poser au client :
« Combien de fenêtres de toit souhaitez-vous ? Pensez au nombre de pièces sous les combles qui nécessitent un éclairage naturel. »

Indication / Pourquoi ce champ est important :
Règle d'or : la surface vitrée devrait représenter 1/6 de la surface au sol de la pièce pour un éclairage naturel optimal.
Chaque fenêtre supplémentaire = un poste de fourniture + pose. Impacte directement le devis.`,

  "Store / Volet": `À quoi sert ce champ ?
Définit l'accessoire de protection ou occultation pour les fenêtres de toit.

Question commerciale à poser au client :
« Souhaitez-vous un store ou volet pour vos fenêtres de toit ? Pour les chambres, un store occultant est recommandé. Pour le confort d'été, un volet roulant est idéal. »

Indication / Pourquoi ce champ est important :
• Aucun : pas de protection supplémentaire.
• Store occultant intérieur : bloque la lumière, économique (80-150€).
• Store pare-soleil extérieur : réduit la chaleur en été de 72%, fixé à l'extérieur (200-350€).
• Volet roulant électrique : protection complète (vue, chaleur, froid), nécessite un câblage (500-800€).
• Volet roulant solaire : comme l'électrique mais avec panneau solaire intégré, pas de câblage nécessaire (600-900€). Le plus vendu en rénovation.`,

  // ═══════════════════════════════════════════
  // CHATIÈRES
  // ═══════════════════════════════════════════

  "Chatières / Ventilation toiture ?": `À quoi sert ce champ ?
Indique si des chatières (aérations de toiture) doivent être intégrées dans la nouvelle couverture.

Question commerciale à poser au client :
« Souhaitez-vous des chatières de ventilation dans votre toiture ? Elles permettent d'évacuer l'humidité sous la couverture. »

Indication / Pourquoi ce champ est important :
Les chatières assurent la ventilation de l'espace sous la couverture, évitant la condensation et la dégradation prématurée de la charpente.
Recommandé si la sous-toiture n'est pas un écran HPV. Obligatoire dans certains DTU.
Ce champ n'apparaît qu'en "Remplacement couverture" (en rénovation complète, la ventilation est gérée par le choix de sous-toiture).`,

  "Nombre de chatières": `À quoi sert ce champ ?
Définit le nombre de chatières à intégrer dans la couverture.

Question commerciale à poser au client :
« Nous calculons habituellement 1 chatière par 20-30 m² de toiture. Le technicien ajustera lors de la visite technique. »

Indication / Pourquoi ce champ est important :
Règle de base : 1 chatière d'entrée d'air et 1 de sortie pour 20-30 m² de couverture.
Coût unitaire modeste (15-30€ pièce + pose). C'est un investissement minime pour la longévité de la toiture.`,

  // ═══════════════════════════════════════════
  // TRAITEMENT CHARPENTE
  // ═══════════════════════════════════════════

  "Traitement charpente ?": `À quoi sert ce champ ?
Indique si un traitement de la charpente bois est souhaité lors des travaux.

Question commerciale à poser au client :
« Votre charpente est-elle en bois ? Si oui, a-t-elle déjà été traitée contre les insectes et champignons ? Quand remonte le dernier traitement ? »

Indication / Pourquoi ce champ est important :
Ce champ n'apparaît qu'en rénovation ou remplacement (la charpente est neuve en construction neuve).
Un traitement préventif est recommandé tous les 10-15 ans. C'est le moment idéal lors de travaux de couverture car la charpente est accessible.
Les charpentes en métal ou béton ne nécessitent pas de traitement (l'info est déjà dans Mesure > Toitures > Charpente : Fer/Béton/Autre).`,

  "Type de traitement charpente": `À quoi sert ce champ ?
Définit le niveau de traitement nécessaire pour la charpente.

Question commerciale à poser au client :
« Constatez-vous des traces d'insectes (petits trous, sciure) ou de champignons (taches noires, bois mou) sur votre charpente ? »

Indication / Pourquoi ce champ est important :
• Préventif (pulvérisation) : pas de dégâts visibles, on protège le bois pour 10-20 ans. Le plus courant (~5-10€/m²).
• Curatif (injection + pulvérisation) : dégâts constatés (vrillettes, capricornes, mérule). Traitement en profondeur par injection dans le bois (~15-25€/m²).
• Remplacement partiel + traitement : certaines pièces de bois sont trop endommagées pour être traitées et doivent être remplacées. Coût variable selon l'ampleur.`,

  // ═══════════════════════════════════════════
  // CONTAINER (sous-champ)
  // ═══════════════════════════════════════════

  "Volume container": `À quoi sert ce champ ?
Définit la taille du container ou de la benne nécessaire pour l'évacuation des déchets de chantier.

Question commerciale à poser au client :
« La taille du container dépend de la surface de votre toiture. Pour une toiture standard (100-150 m²), un container de 10 m³ suffit. »

Indication / Pourquoi ce champ est important :
• 6 m³ : petit chantier, réparation ou petite surface (<80 m²). ~200€.
• 10 m³ : le standard pour un remplacement de couverture (100-150 m²). ~350€.
• 15 m³ : gros chantier, rénovation complète (150-250 m²). ~450€.
• 20 m³ : très grosse toiture ou rénovation avec isolation (déchets volumineux). ~550€.
Un container sous-dimensionné nécessite un second enlèvement (surcoût de 200-300€).`,

  // ═══════════════════════════════════════════
  // HORS PARCOURS (sous-champs)
  // ═══════════════════════════════════════════

  "Détails complémentaires": `À quoi sert ce champ ?
Zone de texte libre pour décrire en détail la demande spécifique ou les travaux supplémentaires.

Question commerciale à poser au client :
« Pouvez-vous me décrire ce besoin supplémentaire en détail ? »

Indication / Pourquoi ce champ est important :
Ce champ permet de documenter tout ce qui sort du cadre standard : dépose d'antenne, déplacement de câbles, travaux de maçonnerie associés, etc.
Plus la description est précise, plus le chiffrage sera juste.`,

  "Photo spécifique": `À quoi sert ce champ ?
Permet d'ajouter une photo illustrant le point particulier ou le problème spécifique.

Question commerciale à poser au client :
« Pouvez-vous me montrer ce dont vous parlez ? Je vais prendre une photo pour notre dossier. »

Indication / Pourquoi ce champ est important :
Une photo vaut mille mots. Elle permet au technicien qui chiffrera le devis de comprendre exactement la situation sans avoir besoin de revenir sur place.`,
};

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Mise à jour des tooltips — Format structuré ║');
  console.log('╚══════════════════════════════════════════╝');

  const fields = await db.treeBranchLeafNode.findMany({
    where: { parentId: DEVIS_NODE_ID, subtab: { equals: SUBTAB } },
    select: { id: true, label: true, metadata: true },
  });

  let updated = 0;
  for (const field of fields) {
    const tooltip = TOOLTIPS[field.label];
    if (!tooltip) {
      console.log(`   ⚠️ Pas de tooltip pour: ${field.label}`);
      continue;
    }

    // Update both the column AND the metadata
    const meta = (field.metadata as any) || {};
    if (meta.appearance) {
      meta.appearance.helpTooltipText = tooltip;
      meta.appearance.helpTooltipType = 'text';
    }

    await db.treeBranchLeafNode.update({
      where: { id: field.id },
      data: {
        text_helpTooltipText: tooltip,
        text_helpTooltipType: 'text',
        metadata: meta,
      },
    });
    updated++;
    console.log(`   ✅ ${field.label}`);
  }

  console.log(`\n📊 ${updated}/${fields.length} tooltips mis à jour`);
}

main().catch(console.error).finally(() => process.exit());
