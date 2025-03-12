import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking available funds in the database...');
    const funds = await prisma.fund.findMany();
    console.log('Available funds:');
    console.log(JSON.stringify(funds, null, 2));
    
    console.log('\nChecking available programs in the database...');
    const programs = await prisma.program.findMany();
    console.log('Available programs:');
    console.log(JSON.stringify(programs, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 