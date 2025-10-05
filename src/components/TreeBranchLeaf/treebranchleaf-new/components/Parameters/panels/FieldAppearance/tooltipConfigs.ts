// 🏭 Configurations prédéfinies pour les tooltips communs
export const TOOLTIP_CONFIGS = {
  // Configuration avec image seule
  FIELD_SIZE_IMAGE: {
    title: "Taille visuelle du champ",
    content: {
      type: 'image' as const,
      imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDI4MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSIzMCIgZmlsbD0iI2Y1ZjVmNSIgc3Ryb2tlPSIjZDlkOWQ5Ii8+Cjx0ZXh0IHg9IjMwIiB5PSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiI+UzwvdGV4dD4KPHJlY3QgeD0iODAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMzAiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iI2Q5ZDlkOSIvPgo8dGV4dCB4PSIxMzAiIHk9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij5NPC90ZXh0Pgo8cmVjdCB4PSIyMDAiIHdpZHRoPSIxNDAiIGhlaWdodD0iMzAiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iI2Q5ZDlkOSIvPgo8dGV4dCB4PSIyNzAiIHk9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij5MPC90ZXh0Pgo8dGV4dCB4PSIzMCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPjIwMHB4PC90ZXh0Pgo8dGV4dCB4PSIxMzAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5Ij4zMDBweDwvdGV4dD4KPHR0ZXh0IHg9IjI3MCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPjQwMHB4PC90ZXh0Pgo8L3N2Zz4K",
      imageAlt: "Comparaison des tailles de champs"
    }
  },

  // Configuration avec texte seul
  FIELD_SIZE_TEXT: {
    title: "Taille visuelle du champ",
    content: {
      type: 'text' as const,
      text: [
        "Petite (200px): Pour les codes courts, IDs",
        "Moyenne (300px): Usage standard", 
        "Grande (400px): Pour les descriptions"
      ]
    }
  },

  // Configuration avec texte + image
  FIELD_SIZE_BOTH: {
    title: "Taille visuelle du champ",
    content: {
      type: 'both' as const,
      text: [
        "Petite (200px): Pour les codes courts, IDs",
        "Moyenne (300px): Usage standard", 
        "Grande (400px): Pour les descriptions"
      ],
      imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDI4MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSIzMCIgZmlsbD0iI2Y1ZjVmNSIgc3Ryb2tlPSIjZDlkOWQ5Ii8+Cjx0ZXh0IHg9IjMwIiB5PSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY2NiI+UzwvdGV4dD4KPHJlY3QgeD0iODAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMzAiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iI2Q5ZDlkOSIvPgo8dGV4dCB4PSIxMzAiIHk9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij5NPC90ZXh0Pgo8cmVjdCB4PSIyMDAiIHdpZHRoPSIxNDAiIGhlaWdodD0iMzAiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iI2Q5ZDlkOSIvPgo8dGV4dCB4PSIyNzAiIHk9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2Ij5MPC90ZXh0Pgo8dGV4dCB4PSIzMCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPjIwMHB4PC90ZXh0Pgo8dGV4dCB4PSIxMzAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5Ij4zMDBweDwvdGV4dD4KPHR0ZXh0IHg9IjI3MCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiPjQwMHB4PC90ZXh0Pgo8L3N2Zz4K",
      imageAlt: "Comparaison des tailles de champs"
    },
    maxWidth: 320
  },

  // Configuration masque avec exemples
  INPUT_MASK: {
    title: "Masque de saisie",
    content: {
      type: 'both' as const,
      text: "Force un format de saisie spécifique:",
      examples: [
        "99/99/9999 → 15/03/2024",
        "99.99.99.99→ 192.168.1.1", 
        "+32 9 999 99 99 → +32 9 123 45 67",
        "****-****-**** → ABCD-1234-EFGH"
      ],
      imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMzIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZmFmYWZhIiBzdHJva2U9IiNkOWQ5ZDkiLz4KPHR0ZXh0IHg9IjEwIiB5PSIyMCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSI+OTkvOTkvOTk5OTwvdGV4dD4KPHR0ZXh0IHg9IjE1MCIgeT0iMjAiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiPuKGkjwvdGV4dD4KPHJlY3QgeD0iMTgwIiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZjZmZmVkIiBzdHJva2U9IiM1MmM0MWEiLz4KPHR0ZXh0IHg9IjE5MCIgeT0iMjAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiMzMzMiPjE1LzAzLzIwMjQ8L3RleHQ+Cjx0ZXh0IHg9IjcwIiB5PSI1MCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSI+TW9kw6hsZTwvdGV4dD4KPHR0ZXh0IHg9IjI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM1MmM0MWEiPlLDqXN1bHRhdDwvdGV4dD4KPC9zdmc+Cg==",
      imageAlt: "Exemple de masque de saisie"
    },
    maxWidth: 350
  },

  // Configuration simple texte
  PLACEHOLDER_SIMPLE: {
    title: "Placeholder",
    content: {
      type: 'text' as const,
      text: "Texte d'aide affiché quand le champ est vide"
    }
  },

  // Configuration avec image seule pour variantes
  TEXT_VARIANTS_IMAGE: {
    title: "Type d'affichage du texte",
    content: {
      type: 'image' as const,
      imageUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDI4MCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAiIGZpbGw9IiNmYWZhZmEiIHN0cm9rZT0iI2Q5ZDlkOSIvPgo8dGV4dCB4PSIxMCIgeT0iMjAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiPlRhcGV6IHZvdHJlIHRleHRlIGljaTwvdGV4dD4KPHR0ZXh0IHg9IjEwIiB5PSI1MCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzY2NiI+TGlnbmUgc2ltcGxlPC90ZXh0PgoKPHJlY3QgeT0iNzAiIHdpZHRoPSIyMDAiIGhlaWdodD0iNDAiIGZpbGw9IiNmYWZhZmEiIHN0cm9rZT0iI2Q5ZDlkOSIvPgo8dGV4dCB4PSIxMCIgeT0iODUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiPkRlc2NyaXB0aW9uIGRldGFpbGzDqWUuLi48L3RleHQ+Cjx0ZXh0IHg9IjEwIiB5PSIxMDAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiPlN1ciBwbHVzaWV1cnMgbGlnbmVzPC90ZXh0Pgo8dGV4dCB4PSIxMCIgeT0iMTI1IiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2Ij5ab25lIGRlIHRleHRlPC90ZXh0Pgo8L3N2Zz4K",
      imageAlt: "Comparaison ligne simple vs zone de texte"
    }
  }
};