/**
 * 🎨 HOOK CUSTOM - USE SCROLL ANIMATION
 * 
 * Détecte quand un élément entre dans le viewport et lui ajoute une classe d'animation
 * Utilisation: const ref = useScrollAnimation('animate-on-scroll');
 */

import { useEffect, useRef } from 'react';

export const useScrollAnimation = (animationClass = 'animate-on-scroll', threshold = 0.1) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add(animationClass);
            // Une fois animé, on arrête d'observer
            observer.unobserve(element);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [animationClass, threshold]);

  return ref;
};
