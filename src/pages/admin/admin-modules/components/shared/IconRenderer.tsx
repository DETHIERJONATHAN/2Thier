import React from 'react';
import * as AntIcons from '@ant-design/icons';

export type IconRendererProps = {
	name?: string | null;
	color?: string;
	size?: number;
	className?: string;
	style?: React.CSSProperties;
};

/**
 * Rend dynamiquement une icône Ant Design à partir de son nom (string)
 * avec fallback vers AppstoreOutlined si l'icône n'existe pas.
 */
const IconRenderer: React.FC<IconRendererProps> = ({ name, color = '#1890ff', size = 20, className, style }) => {
	const iconName = (name && String(name)) || 'AppstoreOutlined';
			// Accès dynamique au mapping des icônes AntD
		const iconsMap = AntIcons as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;
		// @ts-expect-error accès dynamique basé sur le nom
		const Comp = iconsMap[iconName] as React.ComponentType<Record<string, unknown>> | undefined;
	const finalStyle = { color, fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', ...style } as React.CSSProperties;
	if (Comp) return <Comp className={className} style={finalStyle} />;
	// Fallback
			const Fallback = (AntIcons as unknown as Record<string, React.ComponentType<Record<string, unknown>>>).AppstoreOutlined;
	return <Fallback className={className} style={finalStyle} />;
};

export default IconRenderer;

