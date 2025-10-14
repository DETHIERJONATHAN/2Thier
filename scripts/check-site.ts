import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.webSite.findFirst({
    where: { slug: 'site-vitrine-2thier' },
    include: {
      config: true,
      services: true,
      projects: true,
      testimonials: true,
      theme: true
    }
  });
  console.log(JSON.stringify(site, null, 2));
}

main().finally(() => prisma.$disconnect());
