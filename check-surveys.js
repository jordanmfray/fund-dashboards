import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking available surveys in the database...');
    const surveys = await prisma.survey.findMany();
    console.log('Available surveys:');
    console.log(JSON.stringify(surveys, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 