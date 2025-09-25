import React from 'react';
import MainLayout from './MainLayout';

const TestPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="bg-white bg-opacity-10 p-8 rounded-lg shadow-xl">
        <h1 className="text-white text-4xl font-bold mb-4">Page de Test</h1>
        <p className="text-gray-200 text-lg">
          Ceci est la zone de contenu. Vous pouvez commencer à ajouter vos composants et pages ici.
        </p>
      </div>
    </MainLayout>
  );
};

export default TestPage;
