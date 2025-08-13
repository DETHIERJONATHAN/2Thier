// Extension légère des types Ant Design utilisés dans le projet
// Permet d'accepter la prop `size` sur Tag (utilisée dans plusieurs pages) sans erreurs TS.

import 'antd';

declare module 'antd' {
  interface TagProps {
    size?: 'small' | 'default' | 'large';
  }
}

export {};
