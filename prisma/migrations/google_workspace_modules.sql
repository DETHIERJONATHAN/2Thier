-- Migration pour ajouter les modules Google Workspace
-- Ajout à prisma/schema.prisma

model GoogleWorkspaceModule {
  id                   String   @id @default(uuid())
  name                 String   // gmail, calendar, drive, meet, docs, sheets, etc.
  displayName          String   // "Gmail", "Google Agenda", etc.
  description          String?
  iconUrl              String?
  isAvailable          Boolean  @default(true)
  requiresPremium      Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  // Relations
  organizationModules  OrganizationGoogleWorkspaceModule[]
  userModules          UserGoogleWorkspaceModule[]
  
  @@unique([name])
}

model OrganizationGoogleWorkspaceModule {
  id                   String   @id @default(uuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  moduleId             String
  module               GoogleWorkspaceModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  
  isEnabled            Boolean  @default(true)
  maxUsers             Int?     // Limite d'utilisateurs pour ce module
  settings             Json?    // Configuration spécifique par organisation
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  @@unique([organizationId, moduleId])
}

model UserGoogleWorkspaceModule {
  id                   String   @id @default(uuid())
  userId               String
  user                 User @relation(fields: [userId], references: [id], onDelete: Cascade)
  moduleId             String
  module               GoogleWorkspaceModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  
  isEnabled            Boolean  @default(true)
  permissions          Json?    // Permissions spécifiques (read, write, admin, etc.)
  settings             Json?    // Préférences utilisateur
  lastAccessed         DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  @@unique([userId, moduleId])
}

-- Modules de base à créer
INSERT INTO GoogleWorkspaceModule (name, displayName, description, requiresPremium) VALUES
('gmail', 'Gmail', 'Messagerie électronique intégrée', false),
('calendar', 'Google Agenda', 'Gestion des rendez-vous et événements', false),
('drive', 'Google Drive', 'Stockage et partage de fichiers', false),
('docs', 'Google Docs', 'Traitement de texte collaboratif', false),
('sheets', 'Google Sheets', 'Tableur collaboratif', false),
('slides', 'Google Slides', 'Présentations collaboratives', false),
('meet', 'Google Meet', 'Visioconférence', true),
('chat', 'Google Chat', 'Messagerie instantanée', true),
('forms', 'Google Forms', 'Création de formulaires', false),
('sites', 'Google Sites', 'Création de sites web', false);
