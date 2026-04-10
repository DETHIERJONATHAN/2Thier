# 🐝 Audit Fonctionnel — ExplorePanel (Friends)

> Version : Post-refactor Instagram-style — Production  
> Date de dernière mise à jour : auto-générée  
> Fichiers modifiés :  
> - `src/components/zhiive/ExplorePanel.tsx` (rewrite complet)  
> - `src/routes/zhiive.ts` (offset, isSaved, mediaCount, hasMore)  
> - `src/i18n/locales/fr.json` + `en.json` (clés ajoutées)

---

## 1. Fonctionnalités Implémentées

### 1.1 Grille Instagram Mixed Layout (InstaGrid)
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 1 | Grille 3 colonnes standard | Ouvrir Friends → onglet Gallery → les 6 premiers items sont 2 lignes × 3 | ☐ |
| 2 | Item featured (big) | Tous les 9 items : 1 grande image (2×2) + 2 petites empilées | ☐ |
| 3 | Alternance gauche/droite | Le featured alterne de côté entre chaque groupe | ☐ |
| 4 | Responsive gap 3px | Espacement uniforme entre chaque cellule | ☐ |

### 1.2 Infinite Scroll
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 5 | Première page (40 items) | Charger la page → Network tab → `offset=0&limit=40` | ☐ |
| 6 | Chargement automatique | Scroller en bas → spinner apparaît → nouveaux items ajoutés | ☐ |
| 7 | Offset correct | Deuxième requête → `offset=40` dans l'URL | ☐ |
| 8 | Fin de scroll | Quand `hasMore=false` → plus de sentinel visible | ☐ |
| 9 | Pas de duplicata | Scroller 3 pages → IDs n'apparaissent qu'une fois | ☐ |

### 1.3 Double-tap to Like (heartBurst)
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 10 | Double-tap en fullscreen | Ouvrir un post → taper 2x rapidement → cœur rouge animé | ☐ |
| 11 | Incrémente le compteur | Le count de likes +1 après double-tap | ☐ |
| 12 | Pas de re-like | Si déjà liké → animation visible mais pas de deuxième like | ☐ |
| 13 | Single tap = non | Un seul tap ne like PAS | ☐ |

### 1.4 Bouton Save/Bookmark
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 14 | Icône bookmark vide | En fullscreen → BookOutlined visible à droite | ☐ |
| 15 | Clic save → doré | Clic → BookFilled en or (#FFD700) | ☐ |
| 16 | API POST saved-reels | Network tab → `POST /api/zhiive/saved-reels/{postId}` | ☐ |
| 17 | Re-clic unsave | Clic → BookOutlined gris → `DELETE /api/zhiive/saved-reels/{postId}` | ☐ |
| 18 | Optimistic UI | Toggle visuel immédiat, rollback si erreur | ☐ |

### 1.5 Bouton Share
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 19 | Icône share visible | En fullscreen → ShareAltOutlined entre Comment et DM | ☐ |
| 20 | Clic share | Message "Partagé ! 🔗" → `POST /api/wall/posts/{id}/share` body `{targetType:'INTERNAL'}` | ☐ |
| 21 | Erreur share | Couper réseau → "Erreur lors du partage" | ☐ |

### 1.6 Follow/Unfollow depuis Fullscreen
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 22 | Bouton "Suivre" visible | Post d'un autre user → badge "Suivre" à côté du nom | ☐ |
| 23 | Pas de bouton sur soi-même | Ses propres posts → pas de bouton follow | ☐ |
| 24 | Clic follow | `POST /api/zhiive/follow/{userId}` → badge "✓ Suivi" | ☐ |
| 25 | Re-clic unfollow | `DELETE /api/zhiive/follow/{userId}` → badge "Suivre" revient | ☐ |

### 1.7 Send to DM (Whisper)
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 26 | Icône DM visible | En fullscreen → SendOutlined pour les posts d'autres users | ☐ |
| 27 | Clic → ouvre Messenger | `POST /api/messenger/conversations` → CustomEvent `open-messenger` | ☐ |
| 28 | Message succès | "Whisper ouvert 💬" | ☐ |

### 1.8 Relative Time (timeAgo)
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 29 | "now" ou "à l'instant" | Post de < 1min → "now" | ☐ |
| 30 | Minutes | Post de 5 min → "5min" | ☐ |
| 31 | Heures | Post de 3h → "3h" | ☐ |
| 32 | Jours | Post d'hier → "1j" | ☐ |
| 33 | Semaines | Post de 2 semaines → "2sem" | ☐ |

### 1.9 Commentaires Collapsibles
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 34 | "Voir les X commentaires" | Post avec commentaires → lien cliquable en bas | ☐ |
| 35 | Clic → expand | Les commentaires s'affichent (max 140px scroll) | ☐ |
| 36 | Chargement | Spinner pendant le fetch des commentaires | ☐ |
| 37 | Like de commentaire | HeartFilled à côté de chaque commentaire | ☐ |

### 1.10 Auto-play Vidéo dans la Grille
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 38 | Hover sur vidéo → play | Mouse enter sur une cellule vidéo → lecture auto muted | ☐ |
| 39 | Mouse leave → stop | Mouse leave → vidéo pause et rewind à 0 | ☐ |
| 40 | Badge PlayCircleOutlined | Vidéos affichent un badge en haut à droite | ☐ |

### 1.11 Badge Carousel (Multi-média)
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 41 | Badge CopyOutlined | Posts avec mediaCount > 1 → icône copies en haut à droite | ☐ |
| 42 | Backend mediaCount | Réponse API → `mediaCount: N` pour chaque item | ☐ |

### 1.12 Header — Réorganisation des Icônes
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 43 | Ordre : Bees → Gallery → Hashtags | Header → icônes de gauche à droite : TeamOutlined, AppstoreOutlined, RiseOutlined | ☐ |
| 44 | Surlignage actif | L'icône active est en SF.primary | ☐ |
| 45 | Bouton + (créer) | Dernier à droite, dropdown Photo/Vidéo | ☐ |

### 1.13 Fullscreen Viewer — Pas de Flèches
| # | Test | Comment vérifier | Statut |
|---|------|-----------------|--------|
| 46 | Pas de flèche gauche/droite | Navigation uniquement par swipe (touch) ou clavier (←→) | ☐ |
| 47 | Swipe fonctionnel | Touch swipe horizontal → slide animation | ☐ |
| 48 | Keyboard nav | ArrowRight → suivant, ArrowLeft → précédent, Escape → fermer | ☐ |

---

## 2. Backend — Modifications `src/routes/zhiive.ts`

| # | Modification | Ligne approx. | Vérifié |
|---|-------------|---------------|---------|
| B1 | `offset` query param parsing | 257 | ☐ |
| B2 | `skip: offset` dans `db.wallPost.findMany` | 347 | ☐ |
| B3 | `savedBy` select (join SavedReel) | 355 | ☐ |
| B4 | `mediaCount: urls.length` dans le mapping | 370 | ☐ |
| B5 | `isSaved: p.savedBy.length > 0` | 380 | ☐ |
| B6 | `hasMore: galleryItems.length >= limit` | 469 | ☐ |
| B7 | Stories uniquement si `offset === 0` | Conditionnel | ☐ |

---

## 3. i18n — Clés Ajoutées

| Clé | FR | EN |
|-----|----|----|
| `explore.shared` | Partagé ! 🔗 | Shared! 🔗 |
| `explore.shareError` | Erreur lors du partage | Failed to share |
| `explore.viewComments` | Voir les {{count}} commentaires | View all {{count}} comments |
| `explore.publishHint` | Publiez du contenu... | Publish content... |
| `explore.justNow` | à l'instant | just now |

---

## 4. Sécurité & Performance

| # | Check | Détails | Statut |
|---|-------|---------|--------|
| S1 | Pas de `new PrismaClient()` | Backend utilise `db` singleton ✅ | ☐ |
| S2 | Authentification API | Tous les appels via `useAuthenticatedApi` ✅ | ☐ |
| S3 | Optimistic UI + rollback | Like/Save/Follow avec rollback en cas d'erreur ✅ | ☐ |
| S4 | IntersectionObserver cleanup | `observer.disconnect()` dans le return du useEffect | ☐ |
| S5 | Body scroll lock/unlock | Fullscreen → `overflow: hidden`, close → `overflow: ''` | ☐ |
| S6 | `React.memo` sur GridCell/PeopleCard | Prévient les re-rendus inutiles de la grille | ☐ |
| S7 | `useCallback` sur tous les handlers | Stabilité des références pour useEffect | ☐ |
| S8 | `useMemo` sur `filteredUsers`, `categories` | Calculs coûteux mémorisés | ☐ |
| S9 | Offset injection protégée | `Math.max(parseInt(...) || 0, 0)` côté serveur | ☐ |
| S10 | Pas de valeurs hardcodées | Couleurs via SF.*, textes via t('...') | ☐ |

---

## 5. Résumé des Fichiers Modifiés

```
src/components/zhiive/ExplorePanel.tsx    — Rewrite complet (~520 lignes)
src/routes/zhiive.ts                       — offset, savedBy, mediaCount, hasMore
src/i18n/locales/fr.json                   — 5 clés ajoutées
src/i18n/locales/en.json                   — 5 clés ajoutées
```

---

## 6. Checklist Finale

- [ ] `npm run dev` démarre sans erreur
- [ ] Page Friends charge correctement  
- [ ] Grille mixed layout affichée
- [ ] Scroll infini fonctionne
- [ ] Fullscreen : double-tap, save, share, follow, DM, commentaires collapsibles
- [ ] Pas de console.error en développement
- [ ] Build production : `npm run build` OK
