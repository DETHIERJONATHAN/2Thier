import React from 'react';
import {
  FontSizeOutlined,
  FormOutlined,
  LockOutlined,
  NumberOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  FunctionOutlined,
  ShoppingCartOutlined,
  PictureOutlined,
  CameraOutlined,
  PaperClipOutlined,
  QuestionCircleOutlined,
  TableOutlined,
} from '@ant-design/icons';

export const iconForFieldType = (name: string): React.ReactNode => {
  const map: Record<string, React.ReactNode> = {
    text: <FontSizeOutlined />,
    textarea: <FormOutlined />,
    password: <LockOutlined />,
    number: <NumberOutlined />,
    date: <CalendarOutlined />,
  select: <AppstoreOutlined />,
  advanced_select: <AppstoreOutlined />,
    radio: <CheckCircleOutlined />,
    checkboxes: <CheckSquareOutlined />,
    checkbox: <CheckSquareOutlined />,
    donnee: <FunctionOutlined />,
    produit: <ShoppingCartOutlined />,
    image_admin: <PictureOutlined />,
    image_user: <CameraOutlined />,
    photo: <CameraOutlined />,
    fichier_user: <PaperClipOutlined />,
  tableau: <TableOutlined />,
  };
  return map[name] || <QuestionCircleOutlined />;
};

export default iconForFieldType;
