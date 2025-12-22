/**
 * 📑 PAGE TABS - Onglets de navigation entre les pages du document
 */

import { useState } from 'react';
import { Button, Input, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DocumentPage } from './types';

interface PageTabsProps {
  pages: DocumentPage[];
  activePageId: string | null;
  onPageSelect: (pageId: string) => void;
  onPageAdd: () => void;
  onPageDelete: (pageId: string) => void;
  onPageRename: (pageId: string, newName: string) => void;
  onPageDuplicate: (pageId: string) => void;
  onPagesReorder: (pages: DocumentPage[]) => void;
}

const PageTabs = ({
  pages,
  activePageId,
  onPageSelect,
  onPageAdd,
  onPageDelete,
  onPageRename,
  onPageDuplicate,
  onPagesReorder,
}: PageTabsProps) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Mettre à jour les ordres
    const reordered = items.map((page, index) => ({
      ...page,
      order: index,
    }));

    onPagesReorder(reordered);
  };

  const startEditing = (page: DocumentPage) => {
    setEditingPageId(page.id);
    setEditingName(page.name);
  };

  const finishEditing = () => {
    if (editingPageId && editingName.trim()) {
      onPageRename(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  };

  return (
    <div style={{
      backgroundColor: '#1f1f1f',
      borderBottom: '1px solid #333',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {/* Label */}
      <div style={{ 
        color: '#888', 
        fontSize: '12px', 
        fontWeight: 600,
        marginRight: '8px',
        whiteSpace: 'nowrap',
      }}>
        📄 PAGES
      </div>

      {/* Tabs Container */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="page-tabs" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                display: 'flex',
                gap: '4px',
                flex: 1,
                overflowX: 'auto',
                paddingBottom: '4px',
              }}
            >
              {pages.map((page, index) => (
                <Draggable key={page.id} draggableId={page.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => onPageSelect(page.id)}
                      style={{
                        ...provided.draggableProps.style,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '6px 6px 0 0',
                        backgroundColor: activePageId === page.id ? '#2d2d2d' : 'transparent',
                        borderBottom: activePageId === page.id ? '2px solid #1890ff' : '2px solid transparent',
                        color: activePageId === page.id ? '#fff' : '#aaa',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        minWidth: '100px',
                        position: 'relative',
                        opacity: snapshot.isDragging ? 0.8 : 1,
                      }}
                    >
                      {/* Numéro de page */}
                      <span style={{
                        backgroundColor: activePageId === page.id ? '#1890ff' : '#444',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}>
                        {index + 1}
                      </span>

                      {/* Nom de la page */}
                      {editingPageId === page.id ? (
                        <Input
                          size="small"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={finishEditing}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          style={{
                            width: '100px',
                            height: '24px',
                            backgroundColor: '#333',
                            border: '1px solid #1890ff',
                            color: '#fff',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span style={{ 
                          fontSize: '13px',
                          fontWeight: activePageId === page.id ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '120px',
                        }}>
                          {page.name}
                        </span>
                      )}

                      {/* Actions (visibles au survol ou si actif) */}
                      {activePageId === page.id && (
                        <div style={{
                          display: 'flex',
                          gap: '2px',
                          marginLeft: '4px',
                        }}>
                          <Tooltip title="Renommer">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(page);
                              }}
                              style={{ 
                                color: '#888',
                                padding: '2px',
                                height: '20px',
                                width: '20px',
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Dupliquer">
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                onPageDuplicate(page.id);
                              }}
                              style={{ 
                                color: '#888',
                                padding: '2px',
                                height: '20px',
                                width: '20px',
                              }}
                            />
                          </Tooltip>
                          {pages.length > 1 && (
                            <Popconfirm
                              title="Supprimer cette page ?"
                              description="Cette action est irréversible"
                              onConfirm={(e) => {
                                e?.stopPropagation();
                                onPageDelete(page.id);
                              }}
                              onCancel={(e) => e?.stopPropagation()}
                              okText="Supprimer"
                              cancelText="Annuler"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="Supprimer">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ 
                                    color: '#ff4d4f',
                                    padding: '2px',
                                    height: '20px',
                                    width: '20px',
                                  }}
                                />
                              </Tooltip>
                            </Popconfirm>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Bouton Ajouter Page */}
      <Tooltip title="Ajouter une page">
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={onPageAdd}
          style={{
            backgroundColor: '#52c41a',
            borderColor: '#52c41a',
            borderRadius: '6px',
          }}
        >
          Page
        </Button>
      </Tooltip>
    </div>
  );
};

export default PageTabs;
