import React, { lazy, Suspense } from 'react';
import { Spin } from 'antd';

const MyCommercialLinks = lazy(() => import('../MyCommercialLinks'));

const CommercialSettings: React.FC = () => {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spin /></div>}>
      <MyCommercialLinks />
    </Suspense>
  );
};

export default CommercialSettings;
