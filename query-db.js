import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Querying programs...');
    const programs = await prisma.program.findMany();
    console.log('Programs:');
    console.log(JSON.stringify(programs, null, 2));
    
    console.log('\nQuerying funds...');
    const funds = await prisma.fund.findMany();
    console.log('Funds:');
    console.log(JSON.stringify(funds, null, 2));
    
    console.log('\nQuerying users...');
    const users = await prisma.user.findMany();
    console.log('Users:');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\nQuerying surveys...');
    const surveys = await prisma.survey.findMany();
    console.log('Surveys:');
    console.log(JSON.stringify(surveys, null, 2));
    
    console.log('\nQuerying milestones...');
    const milestones = await prisma.milestone.findMany();
    console.log('Milestones:');
    console.log(JSON.stringify(milestones, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 