#!/bin/bash
echo "🔍 Vérification des SIP Endpoints..."
PGPASSWORD="${PGPASSWORD}" psql -h 127.0.0.1 -p 5432 -U postgres -d 2thier -t -A -F'|' -c "SELECT name, \"sipUsername\", \"sipDomain\", \"userId\", priority FROM \"TelnyxSipEndpoint\" ORDER BY priority;" | while IFS='|' read -r name username domain userid priority; do
  echo ""
  echo "📞 Endpoint: $name"
  echo "   Username: $username"
  echo "   Domain: $domain"
  echo "   Priorité: $priority"
  echo "   User: $userid"
done

COUNT=$(PGPASSWORD="${PGPASSWORD}" psql -h 127.0.0.1 -p 5432 -U postgres -d 2thier -t -c "SELECT COUNT(*) FROM \"TelnyxSipEndpoint\";")
echo ""
echo "Total: $COUNT endpoint(s)"
