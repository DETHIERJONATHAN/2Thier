import { createContext, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface WallNavigationContextType {
  isInWall: boolean;
  openModule: (route: string) => void;
  goHome: () => void;
}

const WallNavigationContext = createContext<WallNavigationContextType>({
  isInWall: false,
  openModule: () => {},
  goHome: () => {},
});

export const WallNavigationProvider = WallNavigationContext.Provider;

/**
 * Hook to access wall navigation context.
 * When isInWall is true, modules should use openModule() instead of navigate().
 */
export const useWallNavigation = () => useContext(WallNavigationContext);

/**
 * Hook that returns a navigate function that works both inside and outside the wall.
 * Inside the wall: uses openModule (sets ?module= search param)
 * Outside the wall: uses regular React Router navigate()
 */
export const useModuleNavigation = () => {
  const { isInWall, openModule, goHome } = useWallNavigation();
  const navigate = useNavigate();

  const moduleNavigate = useCallback((route: string) => {
    if (isInWall) {
      openModule(route);
    } else {
      navigate(route);
    }
  }, [isInWall, openModule, navigate]);

  return { moduleNavigate, isInWall, goHome };
};
