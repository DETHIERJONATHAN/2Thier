
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userEmail = 'dethier.jls@gmail.com'; // <-- Mettez ici l'email à activer

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.error(`L'utilisateur avec l'email ${userEmail} n'a pas été trouvé.`);
    return;
  }

  if (user.status === 'active') {
    console.log(`L'utilisateur ${userEmail} est déjà actif.`);
    return;
  }

  await prisma.user.update({
    where: { email: userEmail },
    data: { status: 'active' },
  });

  console.log(`L'utilisateur ${userEmail} a été activé avec succès.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
