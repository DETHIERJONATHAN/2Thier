/**
 * OnboardingTour — React-Joyride welcome tour for new users.
 * 
 * Shows a guided tour on first login, walking the user through
 * the main Zhiive features. Tour completion is persisted in
 * UserPreference (key: 'onboarding_completed').
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Joyride, STATUS, ACTIONS } from 'react-joyride';
import type { CallBackProps, Step, TooltipRenderProps } from 'react-joyride';
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

interface OnboardingTooltipExtraProps {
  hideOnClose: boolean;
  onHideOnCloseChange: (checked: boolean) => void;
  labels: {
    back: string;
    close: string;
    doNotShowAgain: string;
    last: string;
    next: string;
    skip: string;
  };
}

function OnboardingTooltip({
  backProps,
  closeProps,
  hideOnClose,
  index,
  isLastStep,
  labels,
  onHideOnCloseChange,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps & OnboardingTooltipExtraProps) {
  return (
    <div
      {...tooltipProps}
      style={{
        position: 'relative',
        width: 'min(92vw, 480px)',
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 24px 70px rgba(15, 23, 42, 0.18)',
        padding: '28px 28px 22px',
        color: '#1f1f1f',
      }}
    >
      <button
        type="button"
        {...closeProps}
        aria-label={labels.close}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          border: 0,
          background: 'transparent',
          fontSize: 28,
          lineHeight: 1,
          color: '#555',
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>

      {step.title && (
        <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 14, paddingRight: 24 }}>
          {step.title}
        </div>
      )}

      <div style={{ fontSize: 16, lineHeight: 1.65, textAlign: 'center', marginBottom: 18 }}>
        {step.content}
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
          fontSize: 14,
          color: '#555',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={hideOnClose}
          onChange={(event) => onHideOnCloseChange(event.target.checked)}
          style={{ width: 16, height: 16, margin: 0, accentColor: SF.primary }}
        />
        <span>{labels.doNotShowAgain}</span>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ fontSize: 12, color: '#7a7a7a', minWidth: 40 }}>
          {size > 1 ? `${index + 1}/${size}` : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {!isLastStep && (
            <button
              type="button"
              {...skipProps}
              style={{
                border: 0,
                background: 'transparent',
                color: '#7a7a7a',
                fontSize: 14,
                cursor: 'pointer',
                padding: '8px 10px',
              }}
            >
              {labels.skip}
            </button>
          )}

          {index > 0 && (
            <button
              type="button"
              {...backProps}
              style={{
                border: '1px solid #d9d9d9',
                background: '#fff',
                color: '#333',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {labels.back}
            </button>
          )}

          <button
            type="button"
            {...primaryProps}
            style={{
              border: 0,
              background: '#111',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isLastStep ? labels.last : labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingTour({ forceRun, onComplete }: OnboardingTourProps) {
  const { t } = useTranslation();
  const [completed, setCompleted, { loading }] = useUserPreference<boolean>('onboarding_completed', false);
  const [run, setRun] = useState(false);
  const [hideOnClose, setHideOnClose] = useState(false);

  // Start tour once preference is loaded and user hasn't completed it
  React.useEffect(() => {
    if (!loading && (!completed || forceRun)) {
      // Small delay to let the layout render so targets exist
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, completed, forceRun]);

  React.useEffect(() => {
    if (run) {
      setHideOnClose(false);
    }
  }, [run]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action } = data;
    const finished = status === STATUS.FINISHED;
    const skipped = status === STATUS.SKIPPED;
    const closed = action === ACTIONS.CLOSE;

    if (finished || skipped || closed) {
      setRun(false);

      if (finished && hideOnClose && !completed) {
        setCompleted(true);
      }

      onComplete?.();
    }
  }, [completed, hideOnClose, setCompleted, onComplete]);

  const styles = useMemo(() => ({
    options: {
      primaryColor: SF.primary,
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

  const labels = useMemo(() => ({
    back: t('common.back', 'Retour'),
    close: t('common.close', 'Fermer'),
    doNotShowAgain: t('common.doNotShowAgain', 'Ne plus afficher ce guide'),
    last: t('common.finish', 'Terminer'),
    next: t('common.next', 'Suivant'),
    skip: t('common.skip', 'Passer'),
  }), [t]);

  const steps = useMemo<Step[]>(() => (
    TOUR_STEPS.map((step) => ({
      ...step,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ lineHeight: 1.6 }}>
            {step.content}
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              color: '#555',
              cursor: 'pointer',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={hideOnClose}
              onChange={(event) => setHideOnClose(event.target.checked)}
              style={{ width: 16, height: 16, margin: 0, accentColor: SF.primary }}
            />
            <span>{labels.doNotShowAgain}</span>
          </label>
        </div>
      ),
    }))
  ), [hideOnClose, labels.doNotShowAgain]);

  if (loading || (completed && !forceRun)) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={styles}
      locale={labels}
    />
  );
}
