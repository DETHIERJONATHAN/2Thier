                    {/* Sélecteurs d'insertion rapide: version temporaire simplifiée */}
                    {item.type === 'cond' && (
                        <div className="mt-2 p-3 border rounded bg-blue-50">
                            <div className="text-xs text-blue-600 mb-2">
                                🔧 Interface Explorer temporairement simplifiée pendant la réparation
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        const next = { ...item };
                                        next.condExpr = [...(next.condExpr || []), { type: 'field', label: 'Test Field', value: 'test_field' }];
                                        if (onUpdate) onUpdate(next);
                                    }} 
                                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                    + Ajouter champ test
                                </button>
                                <Select
                                    size="small"
                                    defaultValue="expr"
                                    placeholder="Cible"
                                    options={[
                                        { label: 'Expression', value: 'expr' },
                                        { label: 'ALORS', value: 'then' },
                                        { label: 'SINON', value: 'else' }
                                    ]}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                L'interface complète avec l'Explorer sera restaurée prochainement
                            </div>
                        </div>
                    )}
