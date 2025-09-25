// Augmentation plus robuste pour Tag d'Ant Design afin d'autoriser la prop `size`.
// On cible à la fois les chemins esm et commonjs possibles.
import 'antd/es/tag';
import 'antd/lib/tag';

declare module 'antd/es/tag' {
  interface TagProps {
    size?: 'small' | 'default' | 'large';
  }
}

declare module 'antd/lib/tag' {
  interface TagProps {
    size?: 'small' | 'default' | 'large';
  }
}

export {};
