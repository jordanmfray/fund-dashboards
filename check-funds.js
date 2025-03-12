import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking funds in the database...');
    
    const funds = await prisma.fund.findMany();
    console.log('Funds:');
    funds.forEach(fund => {
      console.log(`ID: ${fund.id}, Name: ${fund.name}`);
    });
    
    console.log('\nChecking programs in the database...');
    const programs = await prisma.program.findMany();
    console.log('Programs:');
    programs.forEach(program => {
      console.log(`ID: ${program.id}, Name: ${program.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 