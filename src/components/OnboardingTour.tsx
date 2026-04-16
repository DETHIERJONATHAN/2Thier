/**
 * OnboardingTour — React-Joyride welcome tour for new users.
 * 
 * Shows a guided tour on first login, walking the user through
 * the main Zhiive features. Tour completion is persisted in
 * UserPreference (key: 'onboarding_completed').
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Joyride, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import type { CallBackProps, Step, TooltipRenderProps } from 'react-joyride';
import { useUserPreference } from '../hooks/useUserPreference';
import { useTranslation } from 'react-i18next';
import { useZhiiveNav } from '../contexts/ZhiiveNavContext';
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
void TOUR_STEPS;

type TourStepConfig = Step & {
  key: string;
};

const TOUR_STEP_CONFIGS: Record<string, TourStepConfig> = {
  nectar: {
    key: 'nectar',
    target: '[data-tour="nectar"]',
    content: 'Nectar rassemble les impulsions sociales de la Ruche et sert de point d\'entree rapide vers vos contenus vivants.',
    title: 'Nectar',
    placement: 'bottom',
    disableBeacon: true,
  },
  wax: {
    key: 'wax',
    target: '[data-tour="wax"]',
    content: 'La carte Wax affiche les epingles geolocalisees de votre reseau pour reperer contacts, opportunites et chantiers.',
    title: 'Carte Wax',
    placement: 'bottom',
    disableBeacon: true,
  },
  explore: {
    key: 'explore',
    target: '[data-tour="explore"]',
    content: 'Friends vous aide a decouvrir de nouvelles personnes, envoyer des invitations et agrandir votre reseau.',
    title: 'Friends',
    placement: 'bottom',
    disableBeacon: true,
  },
  reels: {
    key: 'reels',
    target: '[data-tour="reels"]',
    content: 'Reels met en avant les formats video courts pour capter l\'attention et partager rapidement.',
    title: 'Reels',
    placement: 'bottom',
    disableBeacon: true,
  },
  wall: {
    key: 'wall',
    target: '[data-tour="wall"]',
    content: 'Bienvenue dans la Ruche ! Le Mur est votre fil d\'actualite pour publier, reagir, commenter et suivre la vie du Hive.',
    title: 'Le Mur (Hive)',
    placement: 'bottom',
    disableBeacon: true,
  },
  arena: {
    key: 'arena',
    target: '[data-tour="arena"]',
    content: 'Arena centralise les defis, tournois et activites competitives de votre ecosysteme.',
    title: 'Arena',
    placement: 'bottom',
    disableBeacon: true,
  },
  mail: {
    key: 'mail',
    target: '[data-tour="mail"]',
    content: 'Votre boite mail @zhiive.com reste integree a la Ruche pour ecrire, recevoir et organiser vos messages.',
    title: 'Mail',
    placement: 'bottom',
    disableBeacon: true,
  },
  agenda: {
    key: 'agenda',
    target: '[data-tour="agenda"]',
    content: 'Agenda vous aide a planifier rendez-vous, disponibilites et evenements sans quitter Zhiive.',
    title: 'Agenda',
    placement: 'bottom',
    disableBeacon: true,
  },
  search: {
    key: 'search',
    target: '[data-tour="search"]',
    content: 'Search retrouve rapidement les personnes, contenus, conversations et informations utiles dans la plateforme.',
    title: 'Search',
    placement: 'bottom',
    disableBeacon: true,
  },
  stats: {
    key: 'stats',
    target: '[data-tour="stats"]',
    content: 'Stats regroupe vos indicateurs clefs pour suivre l\'activite, la traction et la performance.',
    title: 'Stats',
    placement: 'bottom',
    disableBeacon: true,
  },
  messenger: {
    key: 'messenger',
    target: '[data-tour="messenger"]',
    content: 'Messenger vous permet de discuter en prive avec les membres de votre Ruche, avec appels audio et video integres.',
    title: 'Messenger',
    placement: 'left',
    disableBeacon: true,
  },
  notifications: {
    key: 'notifications',
    target: '[data-tour="notifications"]',
    content: 'La cloche vous notifie en temps reel : nouveaux messages, reactions, invitations et autres signaux importants.',
    title: 'Notifications',
    placement: 'bottom',
    disableBeacon: true,
  },
  'profile-menu': {
    key: 'profile-menu',
    target: '[data-tour="profile-menu"]',
    content: 'Accedez a votre profil, vos parametres et basculez entre identite personnelle et organisation.',
    title: 'Mon Profil',
    placement: 'bottom-end',
    disableBeacon: true,
  },
};

const HEADER_TOUR_ORDER = ['nectar', 'wax', 'explore', 'reels', 'mur', 'arena', 'mail', 'agenda', 'search', 'stats'] as const;
const EXTRA_TOUR_STEP_KEYS = ['notifications', 'profile-menu', 'messenger'] as const;

const hasTourTarget = (target: Step['target']) => {
  if (typeof target !== 'string' || typeof document === 'undefined') {
    return true;
  }

  return !!document.querySelector(target);
};

const scrollTourTargetIntoView = (
  target: Step['target'],
  options: {
    alignStart?: boolean;
    behavior?: ScrollBehavior;
  } = {},
) => {
  if (typeof target !== 'string' || typeof document === 'undefined') {
    return;
  }

  const { alignStart = false, behavior = 'smooth' } = options;
  const targetElement = document.querySelector(target) as HTMLElement | null;
  if (!targetElement) {
    return;
  }

  const tabsContainer = targetElement.closest('.zhiive-tabs-scroll') as HTMLElement | null;
  if (tabsContainer) {
    const maxScrollLeft = Math.max(tabsContainer.scrollWidth - tabsContainer.clientWidth, 0);
    const targetLeft = alignStart ? 0 : Math.min(Math.max(targetElement.offsetLeft, 0), maxScrollLeft);
    tabsContainer.scrollTo({ left: targetLeft, behavior });
    return;
  }

  targetElement.scrollIntoView({ behavior, block: 'nearest', inline: alignStart ? 'start' : 'nearest' });
};

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
        width: 'min(86vw, 340px)',
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 18px 50px rgba(15, 23, 42, 0.16)',
        padding: '20px 20px 16px',
        color: '#1f1f1f',
      }}
    >
      <button
        type="button"
        {...closeProps}
        aria-label={labels.close}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          border: 0,
          background: 'transparent',
          fontSize: 22,
          lineHeight: 1,
          color: '#555',
          cursor: 'pointer',
          padding: 2,
        }}
      >
        ×
      </button>

      {step.title && (
        <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 10, paddingRight: 18 }}>
          {step.title}
        </div>
      )}

      <div style={{ fontSize: 14, lineHeight: 1.5, textAlign: 'center', marginBottom: 14 }}>
        {step.content}
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          fontSize: 13,
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 11, color: '#7a7a7a', minWidth: 32 }}>
          {size > 1 ? `${index + 1}/${size}` : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {!isLastStep && (
            <button
              type="button"
              {...skipProps}
              style={{
                border: 0,
                background: 'transparent',
                color: '#7a7a7a',
                fontSize: 13,
                cursor: 'pointer',
                padding: '6px 8px',
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
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
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
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
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
  const { tabOrder } = useZhiiveNav();
  const [completed, setCompleted, { loading }] = useUserPreference<boolean>('onboarding_completed', false);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hideOnClose, setHideOnClose] = useState(false);
  const stepAdvanceTimerRef = useRef<number | null>(null);
  const clearStepAdvanceTimer = useCallback(() => {
    if (stepAdvanceTimerRef.current !== null) {
      window.clearTimeout(stepAdvanceTimerRef.current);
      stepAdvanceTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (run) {
      setHideOnClose(false);
    }
  }, [run]);

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

  const baseSteps = useMemo<TourStepConfig[]>(() => {
    const orderedHeaderKeys = (tabOrder.length > 0 ? tabOrder : [...HEADER_TOUR_ORDER]).map((tabId) => (
      tabId === 'mur' ? 'wall' : tabId
    ));
    const orderedKeys = [...orderedHeaderKeys, ...EXTRA_TOUR_STEP_KEYS];
    const seen = new Set<string>();

    return orderedKeys.reduce<TourStepConfig[]>((acc, key) => {
      const step = TOUR_STEP_CONFIGS[key];
      if (!step || seen.has(step.key)) {
        return acc;
      }

      seen.add(step.key);
      acc.push(step);
      return acc;
    }, []);
  }, [tabOrder]);

  const steps = useMemo<Step[]>(() => (
    run ? baseSteps.filter((step) => hasTourTarget(step.target)) : baseSteps
  ), [baseSteps, run]);

  React.useEffect(() => {
    return clearStepAdvanceTimer;
  }, [clearStepAdvanceTimer]);

  // Start the presentation with the header strip reset on the first app.
  React.useEffect(() => {
    if (loading || (completed && !forceRun)) {
      return;
    }

    let openTimer: number | null = null;
    const timer = window.setTimeout(() => {
      const availableSteps = baseSteps.filter((step) => hasTourTarget(step.target));
      const firstTarget = availableSteps[0]?.target;

      setStepIndex(0);

      if (firstTarget) {
        scrollTourTargetIntoView(firstTarget, { alignStart: true, behavior: 'auto' });
      }

      openTimer = window.setTimeout(() => setRun(true), 180);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      if (openTimer !== null) {
        window.clearTimeout(openTimer);
      }
    };
  }, [baseSteps, completed, forceRun, loading]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type } = data;
    const finished = status === STATUS.FINISHED;
    const skipped = status === STATUS.SKIPPED;
    const closed = action === ACTIONS.CLOSE;

    if (finished || skipped || closed) {
      clearStepAdvanceTimer();
      setRun(false);
      setStepIndex(0);

      if (finished && hideOnClose && !completed) {
        setCompleted(true);
      }

      onComplete?.();
      return;
    }

    if (type !== EVENTS.STEP_AFTER && type !== EVENTS.TARGET_NOT_FOUND) {
      return;
    }

    const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
    const nextStep = steps[nextIndex];

    if (!nextStep) {
      return;
    }

    clearStepAdvanceTimer();
    scrollTourTargetIntoView(nextStep.target, { alignStart: nextIndex === 0 });
    stepAdvanceTimerRef.current = window.setTimeout(() => {
      setStepIndex(nextIndex);
      stepAdvanceTimerRef.current = null;
    }, 220);
  }, [clearStepAdvanceTimer, completed, hideOnClose, onComplete, setCompleted, steps]);

  if (loading || (completed && !forceRun)) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={run && steps.length > 0}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={styles}
      locale={labels}
      tooltipComponent={(props) => (
        <OnboardingTooltip
          {...props}
          hideOnClose={hideOnClose}
          onHideOnCloseChange={setHideOnClose}
          labels={labels}
        />
      )}
    />
  );
}
