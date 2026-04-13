/**
 * LegalPages — CGU, CGV, Mentions Légales, Politique de Confidentialité
 * 
 * Pages statiques accessibles sans authentification.
 * Conformité RGPD et droit belge.
 */
import React from 'react';
import { Tabs, Typography, Card, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SF } from '../components/zhiive/ZhiiveTheme';

const { Title, Paragraph, Text } = Typography;

const COMPANY = {
  name: '2Thier SRL',
  address: 'Belgique',
  vat: 'BE0XXX.XXX.XXX',
  email: 'legal@zhiive.com',
  dpo: 'dpo@zhiive.com',
};

function CGU() {
  const { t } = useTranslation();
  return (
    <Typography>
      <Title level={3}>{t('legal.cgu.title', "Conditions Générales d'Utilisation")}</Title>
      <Text type="secondary">{t('legal.cgu.lastUpdate', 'Dernière mise à jour')} : {new Date().toLocaleDateString('fr-BE')}</Text>
      <Divider />

      <Title level={4}>1. {t('legal.cgu.objectTitle', 'Objet')}</Title>
      <Paragraph>
        {t('legal.cgu.object', `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Zhiive (ci-après "la Plateforme"), éditée par ${COMPANY.name}. En accédant à la Plateforme, l'Utilisateur accepte sans réserve les présentes CGU.`)}
      </Paragraph>

      <Title level={4}>2. {t('legal.cgu.definitionsTitle', 'Définitions')}</Title>
      <Paragraph>
        {t('legal.cgu.definitions', `• "Plateforme" : l'application web et mobile Zhiive accessible à l'adresse app.zhiive.com.
• "Utilisateur" : toute personne physique ou morale accédant à la Plateforme.
• "Colony" : une organisation créée sur la Plateforme par un Utilisateur.
• "Contenu" : toute donnée, texte, image, vidéo ou fichier publié par un Utilisateur.`)}
      </Paragraph>

      <Title level={4}>3. {t('legal.cgu.inscriptionTitle', 'Inscription et Compte')}</Title>
      <Paragraph>
        {t('legal.cgu.inscription', "L'accès à la Plateforme nécessite la création d'un compte. L'Utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants. Toute utilisation du compte est de la responsabilité de l'Utilisateur.")}
      </Paragraph>

      <Title level={4}>4. {t('legal.cgu.usageTitle', "Utilisation de la Plateforme")}</Title>
      <Paragraph>
        {t('legal.cgu.usage', `L'Utilisateur s'engage à :
• Ne pas publier de contenu illicite, diffamatoire, ou portant atteinte aux droits d'autrui.
• Respecter les droits de propriété intellectuelle.
• Ne pas tenter de compromettre la sécurité de la Plateforme.
• Ne pas utiliser la Plateforme à des fins de spam ou harcèlement.`)}
      </Paragraph>

      <Title level={4}>5. {t('legal.cgu.ipTitle', 'Propriété Intellectuelle')}</Title>
      <Paragraph>
        {t('legal.cgu.ip', `La Plateforme, son code source, son design et son contenu éditorial sont la propriété exclusive de ${COMPANY.name}. L'Utilisateur conserve la propriété de ses Contenus mais accorde à ${COMPANY.name} une licence non-exclusive d'hébergement et d'affichage.`)}
      </Paragraph>

      <Title level={4}>6. {t('legal.cgu.responsabilityTitle', 'Responsabilité')}</Title>
      <Paragraph>
        {t('legal.cgu.responsibility', `${COMPANY.name} s'efforce de maintenir la Plateforme accessible 24h/24 mais ne garantit pas une disponibilité ininterrompue. ${COMPANY.name} ne saurait être tenu responsable des dommages indirects résultant de l'utilisation de la Plateforme.`)}
      </Paragraph>

      <Title level={4}>7. {t('legal.cgu.terminationTitle', 'Résiliation')}</Title>
      <Paragraph>
        {t('legal.cgu.termination', `L'Utilisateur peut supprimer son compte à tout moment depuis ses paramètres. ${COMPANY.name} se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU.`)}
      </Paragraph>

      <Title level={4}>8. {t('legal.cgu.lawTitle', 'Droit Applicable')}</Title>
      <Paragraph>
        {t('legal.cgu.law', "Les présentes CGU sont soumises au droit belge. Tout litige sera soumis aux tribunaux compétents de Belgique.")}
      </Paragraph>
    </Typography>
  );
}

function CGV() {
  const { t } = useTranslation();
  return (
    <Typography>
      <Title level={3}>{t('legal.cgv.title', 'Conditions Générales de Vente')}</Title>
      <Text type="secondary">{t('legal.cgv.lastUpdate', 'Dernière mise à jour')} : {new Date().toLocaleDateString('fr-BE')}</Text>
      <Divider />

      <Title level={4}>1. {t('legal.cgv.servicesTitle', 'Services')}</Title>
      <Paragraph>
        {t('legal.cgv.services', `${COMPANY.name} propose via la Plateforme Zhiive des services de gestion collaborative incluant : messagerie professionnelle, gestion de contacts, outils de collaboration, et modules métier. Les fonctionnalités disponibles dépendent de l'abonnement souscrit.`)}
      </Paragraph>

      <Title level={4}>2. {t('legal.cgv.pricesTitle', 'Tarification')}</Title>
      <Paragraph>
        {t('legal.cgv.prices', "Les tarifs des abonnements sont indiqués en euros (EUR), hors taxes. Les prix peuvent être modifiés avec un préavis de 30 jours. L'Utilisateur sera notifié par email de toute modification tarifaire.")}
      </Paragraph>

      <Title level={4}>3. {t('legal.cgv.paymentTitle', 'Paiement')}</Title>
      <Paragraph>
        {t('legal.cgv.payment', "Le paiement s'effectue par carte bancaire ou virement. Les factures sont émises mensuellement ou annuellement selon le plan choisi. En cas de non-paiement sous 15 jours, l'accès pourra être suspendu.")}
      </Paragraph>

      <Title level={4}>4. {t('legal.cgv.withdrawalTitle', 'Droit de Rétractation')}</Title>
      <Paragraph>
        {t('legal.cgv.withdrawal', "Conformément au droit européen, l'Utilisateur dispose d'un délai de 14 jours à compter de la souscription pour exercer son droit de rétractation, sauf si l'exécution du service a commencé avec son accord exprès.")}
      </Paragraph>

      <Title level={4}>5. {t('legal.cgv.warrantyTitle', 'Garantie')}</Title>
      <Paragraph>
        {t('legal.cgv.warranty', `${COMPANY.name} garantit le bon fonctionnement de la Plateforme conformément à sa documentation. Le support technique est disponible par email à ${COMPANY.email}.`)}
      </Paragraph>
    </Typography>
  );
}

function MentionsLegales() {
  const { t } = useTranslation();
  return (
    <Typography>
      <Title level={3}>{t('legal.mentions.title', 'Mentions Légales')}</Title>
      <Divider />

      <Title level={4}>{t('legal.mentions.editorTitle', 'Éditeur')}</Title>
      <Paragraph>
        {t('legal.mentions.editor', `${COMPANY.name}
Adresse : ${COMPANY.address}
N° TVA : ${COMPANY.vat}
Email : ${COMPANY.email}`)}
      </Paragraph>

      <Title level={4}>{t('legal.mentions.hostingTitle', 'Hébergement')}</Title>
      <Paragraph>
        {t('legal.mentions.hosting', "L'application est hébergée par :\n• Google Cloud Platform (GCP) — données européennes\n• Hetzner Online GmbH — serveurs complémentaires en Allemagne")}
      </Paragraph>

      <Title level={4}>{t('legal.mentions.dpoTitle', 'Délégué à la Protection des Données')}</Title>
      <Paragraph>
        {t('legal.mentions.dpo', `Pour toute question relative à la protection de vos données personnelles, contactez notre DPO à l'adresse : ${COMPANY.dpo}`)}
      </Paragraph>
    </Typography>
  );
}

function PolitiqueConfidentialite() {
  const { t } = useTranslation();
  return (
    <Typography>
      <Title level={3}>{t('legal.privacy.title', 'Politique de Confidentialité')}</Title>
      <Text type="secondary">{t('legal.privacy.lastUpdate', 'Dernière mise à jour')} : {new Date().toLocaleDateString('fr-BE')}</Text>
      <Divider />

      <Title level={4}>1. {t('legal.privacy.collectedTitle', 'Données Collectées')}</Title>
      <Paragraph>
        {t('legal.privacy.collected', `Nous collectons les données suivantes :
• Données d'identification : nom, prénom, adresse email, numéro de téléphone.
• Données professionnelles : nom d'entreprise, numéro de TVA, adresse.
• Données d'utilisation : logs de connexion, pages visitées, interactions.
• Données techniques : adresse IP, type de navigateur, système d'exploitation.`)}
      </Paragraph>

      <Title level={4}>2. {t('legal.privacy.purposeTitle', 'Finalités du Traitement')}</Title>
      <Paragraph>
        {t('legal.privacy.purpose', `Vos données sont traitées pour :
• Fournir et maintenir nos services (base légale : exécution du contrat).
• Vous envoyer des communications liées au service (base légale : intérêt légitime).
• Améliorer nos services via l'analyse anonymisée (base légale : intérêt légitime).
• Satisfaire nos obligations légales (base légale : obligation légale).`)}
      </Paragraph>

      <Title level={4}>3. {t('legal.privacy.retentionTitle', 'Durée de Conservation')}</Title>
      <Paragraph>
        {t('legal.privacy.retention', "Les données personnelles sont conservées pendant la durée du contrat, puis 3 ans après la fin de la relation commerciale à des fins de prospection, et 5 ans pour les obligations comptables et fiscales.")}
      </Paragraph>

      <Title level={4}>4. {t('legal.privacy.rightsTitle', 'Vos Droits')}</Title>
      <Paragraph>
        {t('legal.privacy.rights', `Conformément au RGPD, vous disposez des droits suivants :
• Droit d'accès : obtenir une copie de vos données personnelles.
• Droit de rectification : corriger vos données inexactes.
• Droit à l'effacement : demander la suppression de vos données.
• Droit à la portabilité : recevoir vos données dans un format exploitable.
• Droit d'opposition : vous opposer au traitement de vos données.
• Droit de limitation : restreindre le traitement dans certains cas.

Pour exercer vos droits, envoyez un email à ${COMPANY.dpo}.
Vous pouvez également introduire une réclamation auprès de l'Autorité de Protection des Données (APD) belge.`)}
      </Paragraph>

      <Title level={4}>5. {t('legal.privacy.securityTitle', 'Sécurité')}</Title>
      <Paragraph>
        {t('legal.privacy.security', "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement en transit (TLS), contrôle d'accès strict, sauvegardes régulières, et monitoring continu.")}
      </Paragraph>

      <Title level={4}>6. {t('legal.privacy.cookiesTitle', 'Cookies')}</Title>
      <Paragraph>
        {t('legal.privacy.cookies', "La Plateforme utilise uniquement des cookies techniques essentiels au fonctionnement du service (session, authentification). Aucun cookie de traçage publicitaire n'est utilisé.")}
      </Paragraph>

      <Title level={4}>7. {t('legal.privacy.transferTitle', 'Transferts de Données')}</Title>
      <Paragraph>
        {t('legal.privacy.transfer', "Vos données sont hébergées dans l'Union Européenne (Google Cloud region europe-west1, Belgique). Aucun transfert de données hors UE n'est effectué sans garanties appropriées.")}
      </Paragraph>
    </Typography>
  );
}

export default function LegalPages() {
  const { t } = useTranslation();

  const items = [
    { key: 'cgu', label: t('legal.tabs.cgu', 'CGU'), children: <CGU /> },
    { key: 'cgv', label: t('legal.tabs.cgv', 'CGV'), children: <CGV /> },
    { key: 'mentions', label: t('legal.tabs.mentions', 'Mentions Légales'), children: <MentionsLegales /> },
    { key: 'privacy', label: t('legal.tabs.privacy', 'Confidentialité'), children: <PolitiqueConfidentialite /> },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <Helmet>
        <title>{t('legal.pageTitle', 'Informations Légales')} — Zhiive</title>
      </Helmet>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <Tabs
          defaultActiveKey="cgu"
          items={items}
          tabBarStyle={{ marginBottom: 24 }}
        />
      </Card>
    </div>
  );
}
