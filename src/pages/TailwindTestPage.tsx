import React from 'react';

export default function TailwindTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          🎨 Test Tailwind CSS
        </h1>

        {/* Grille de test des couleurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-blue-500 rounded-full mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bleu</h3>
            <p className="text-gray-600">bg-blue-500</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-green-500 rounded-full mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Vert</h3>
            <p className="text-gray-600">bg-green-500</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-red-500 rounded-full mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Rouge</h3>
            <p className="text-gray-600">bg-red-500</p>
          </div>
        </div>

        {/* Test des layouts */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Layout Flexbox</h2>
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <span className="text-gray-700">Gauche</span>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-all">
              Bouton
            </button>
            <span className="text-gray-700">Droite</span>
          </div>
        </div>

        {/* Test des espacements */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Espacements</h2>
          <div className="space-y-4">
            <div className="bg-blue-100 p-2 rounded">Padding 2</div>
            <div className="bg-blue-200 p-4 rounded">Padding 4</div>
            <div className="bg-blue-300 p-6 rounded">Padding 6</div>
          </div>
        </div>

        {/* Test Ant Design + Tailwind */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Mixte</h2>
          <p className="text-gray-600 mb-4">
            Si vous voyez des couleurs, espacements et layouts corrects, 
            alors Tailwind CSS fonctionne ! 🎉
          </p>
          
          <div className="flex gap-4">
            <button className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
              ✅ Tailwind OK
            </button>
            <button className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors">
              ❌ CSS Conflit
            </button>
          </div>
        </div>

        {/* Debug info */}
        <div className="mt-8 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🔧 Informations de débogage</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Si les couleurs ne s'affichent pas : CSS conflits</li>
            <li>• Si les espacements sont incorrects : Tailwind non appliqué</li>
            <li>• Si tout est gris/blanc : global-premium.css écrase Tailwind</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
