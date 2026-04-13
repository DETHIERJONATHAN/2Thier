/**
 * OnboardingTour — React-Joyride welcome tour for new users.
 * 
 * Shows a guided tour on first login, walking the user through
 * the main Zhiive features. Tour completion is persisted in
 * UserPreference (key: 'onboarding_completed').
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Joyride, STATUS, ACTIONS } from 'react-joyride';
import type { CallBackProps, Step } from 'react-joyride';
import { useUserPreference } from '../hooks/useUserPreference';
import { useTranslation } from 'react-i18next';
import { SF } from './zhiive/ZhiiveTheme';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="wall"]',
    content: 'Bienvenue dans la Ruche ! Le Mur est votre fil d\'actualité — partagez des Buzz, réagissez, commentez.',
    title: '🐝 Le Mur (Wall)',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="messenger"]',
    content: 'Messenger vous permet de discuter en privé avec les membres de votre Ruche, avec appels audio/vidéo intégrés.',
    title: '💬 Messenger',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="mail"]',
    content: 'Votre boîte mail professionnelle @zhiive.com — envoyez et recevez des emails directement depuis la Ruche.',
    title: '📧 Mail',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="wax"]',
    content: 'La carte Wax affiche les épingles géolocalisées de votre réseau — idéal pour repérer vos contacts et chantiers.',
    title: '🗺️ Carte Wax',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="explore"]',
    content: 'Découvrez et connectez-vous avec d\'autres membres de la Ruche. Envoyez des invitations et élargissez votre réseau.',
    title: '🔍 Friends',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="notifications"]',
    content: 'La cloche vous notifie en temps réel : nouveaux messages, réactions, invitations, et plus encore.',
    title: '🔔 Notifications',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="profile-menu"]',
    content: 'Accédez à votre profil, vos paramètres, et basculez entre identité personnelle et organisation.',
    title: '👤 Mon Profil',
    placement: 'bottom-end',
    disableBeacon: true,
  },
];

interface OnboardingTourProps {
  /** Force run even if already completed (for replay from settings) */
  forceRun?: boolean;
  onComplete?: () => void;
}

export default function OnboardingTour({ forceRun, onComplete }: OnboardingTourProps) {
  const { t } = useTranslation();
  const [completed, setCompleted, { loading }] = useUserPreference<boolean>('onboarding_completed', false);
  const [run, setRun] = useState(false);

  // Start tour once preference is loaded and user hasn't completed it
  React.useEffect(() => {
    if (!loading && (!completed || forceRun)) {
      // Small delay to let the layout render so targets exist
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, completed, forceRun]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (!completed) {
        setCompleted(true);
      }
      onComplete?.();
    }

    if (action === ACTIONS.CLOSE) {
      setRun(false);
      if (!completed) {
        setCompleted(true);
      }
    }
  }, [completed, setCompleted, onComplete]);

  const styles = useMemo(() => ({
    options: {
      primaryColor: SF.primary || '#6C5CE7',
      zIndex: 10000,
      arrowColor: '#fff',
      backgroundColor: '#fff',
      textColor: '#333',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
    },
    buttonNext: {
      borderRadius: 8,
      padding: '8px 16px',
      fontSize: 14,
    },
    buttonBack: {
      borderRadius: 8,
      marginRight: 8,
      color: '#666',
    },
    buttonSkip: {
      color: '#999',
      fontSize: 13,
    },
  }), []);

  if (loading || (completed && !forceRun)) return null;

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={styles}
      locale={{
        back: t('common.back', 'Retour'),
        close: t('common.close', 'Fermer'),
        last: t('common.finish', 'Terminer'),
        next: t('common.next', 'Suivant'),
        skip: t('common.skip', 'Passer'),
      }}
    />
  );
}
