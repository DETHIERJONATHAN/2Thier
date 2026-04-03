import { Capacitor } from '@capacitor/core';

/**
 * Détecte si l'app tourne dans un conteneur natif (Android/iOS via Capacitor)
 * ou dans un navigateur web classique.
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): 'android' | 'ios' | 'web' => {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
};

/**
 * Ouvre une URL dans le WebView natif (InAppBrowser) sur mobile,
 * ou retourne false si on est sur le web (le caller doit utiliser le proxy).
 */
export const openInNativeBrowser = async (url: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false; // Sur le web, on ne peut pas utiliser le WebView natif
  }

  const { Browser } = await import('@capacitor/browser');
  await Browser.open({
    url,
    presentationStyle: 'fullscreen',
  });
  return true;
};
