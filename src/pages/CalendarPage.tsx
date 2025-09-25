import { useAuth } from '../auth/useAuth';
import { Alert } from 'antd';
import AgendaPage from '../plugins/ModuleAgenda/AgendaPage';

function CalendarPage() {
  const { user, modules } = useAuth();

  // Vérifier si l'utilisateur a accès au module agenda
  const hasCalendarAccess = modules?.some(module => 
    (module.key === 'Agenda' || module.key === 'calendar' || module.key === 'agenda') && module.active
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert
          message="Non connecté"
          description="Vous devez être connecté pour accéder à l'agenda."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  if (!hasCalendarAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert
          message="Accès refusé"
          description="Vous n'avez pas accès au module agenda. Contactez votre administrateur."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="calendar-page-wrapper">
      <AgendaPage />
    </div>
  );
}

export { CalendarPage as default };
