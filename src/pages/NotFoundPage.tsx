import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Result
        status="404"
        title="404"
        subTitle={t('notFound.subtitle')}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {t('notFound.backHome')}
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundPage;
