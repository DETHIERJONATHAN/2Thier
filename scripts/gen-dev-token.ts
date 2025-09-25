import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config.js';

const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) {
      console.error('Aucun utilisateur en base.');
      process.exit(1);
    }
    const userOrg = await prisma.userOrganization.findFirst({ where: { userId: user.id } });
    const organizationId = userOrg?.organizationId;

    const token = jwt.sign({
      userId: user.id,
      role: user.role,
      organizationId
    }, JWT_SECRET, { expiresIn: '2h' });

    console.log('USER ID      :', user.id);
    console.log('ROLE         :', user.role);
    console.log('ORG ID       :', organizationId || '(aucune)');
    console.log('JWT SECRET   :', JWT_SECRET);
    console.log('TOKEN        :', token);
    console.log('\n curl -X POST http://localhost:4000/api/calendar/notes \\\n  -H "Content-Type: application/json" \\\n  -H "Cookie: token=' + token + '" \\\n  -d "' + JSON.stringify({ title: 'Note via curl', type: 'note', organizationId, dueDate: new Date(Date.now()+3600000).toISOString() }).replace(/"/g, '\\"') + '"');
  } catch (e) {
    console.error('Erreur génération token:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
