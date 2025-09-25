-- Migration pour ajouter la table des événements du calendrier CRM

-- Table pour stocker les événements de calendrier intégrés
CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    "start" TIMESTAMP NOT NULL,
    "end" TIMESTAMP NOT NULL,
    "meetingType" VARCHAR(50) NOT NULL CHECK ("meetingType" IN ('client', 'internal', 'demo', 'followup')),
    location VARCHAR(255),
    attendees TEXT[], -- Array of email addresses
    "projectId" VARCHAR(36),
    "leadId" VARCHAR(36),
    "googleEventId" VARCHAR(255),
    "meetingLink" VARCHAR(500),
    "createdBy" VARCHAR(36) NOT NULL,
    "organizationId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_calendar_event_organization 
        FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE,
    CONSTRAINT fk_calendar_event_created_by 
        FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT fk_calendar_event_project 
        FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE,
    CONSTRAINT fk_calendar_event_lead 
        FOREIGN KEY ("leadId") REFERENCES "Lead"(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_calendar_event_organization ON "CalendarEvent"("organizationId");
CREATE INDEX IF NOT EXISTS idx_calendar_event_date_range ON "CalendarEvent"("start", "end");
CREATE INDEX IF NOT EXISTS idx_calendar_event_project ON "CalendarEvent"("projectId");
CREATE INDEX IF NOT EXISTS idx_calendar_event_lead ON "CalendarEvent"("leadId");
CREATE INDEX IF NOT EXISTS idx_calendar_event_created_by ON "CalendarEvent"("createdBy");
CREATE INDEX IF NOT EXISTS idx_calendar_event_google_id ON "CalendarEvent"("googleEventId");

-- Trigger pour mettre à jour automatiquement updatedAt
CREATE OR REPLACE FUNCTION update_calendar_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_calendar_event_updated_at
    BEFORE UPDATE ON "CalendarEvent"
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_event_updated_at();

-- Insérer quelques événements d'exemple (optionnel)
INSERT INTO "CalendarEvent" (
    title, 
    description, 
    "start", 
    "end", 
    "meetingType", 
    location, 
    attendees, 
    "createdBy", 
    "organizationId"
) VALUES 
(
    'Réunion de lancement projet',
    'Première réunion pour discuter des objectifs et du planning',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '1 hour',
    'client',
    'Salle de réunion A',
    ARRAY['client@exemple.com'],
    (SELECT id FROM "User" WHERE email = 'dethier.jls@gmail.com' LIMIT 1),
    (SELECT id FROM "Organization" WHERE name = '2Thier CRM' LIMIT 1)
),
(
    'Demo produit',
    'Présentation des fonctionnalités principales',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '30 minutes',
    'demo',
    'https://meet.google.com/abc-defg-hij',
    ARRAY['prospect@exemple.com'],
    (SELECT id FROM "User" WHERE email = 'dethier.jls@gmail.com' LIMIT 1),
    (SELECT id FROM "Organization" WHERE name = '2Thier CRM' LIMIT 1)
);

-- Vérification
SELECT 
    title,
    "meetingType",
    "start",
    location,
    array_length(attendees, 1) as attendee_count
FROM "CalendarEvent" 
ORDER BY "start";
