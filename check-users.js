import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Checks the users in the database
 */
async function checkUsers() {
  try {
    console.log('Checking users in the database...');
    
    // Get the most recent users
    const users = await prisma.user.findMany({
      orderBy: {
        id: 'desc'
      },
      take: 10
    });
    
    console.log(`Found ${users.length} users:`);
    console.log('----------------------------');
    
    for (const user of users) {
      console.log(`User ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Age: ${user.age}`);
      console.log(`Job Title: ${user.jobTitle}`);
      console.log(`Years in Job: ${user.yearsInJob}`);
      console.log(`Income: ${user.income}`);
      console.log(`Marital Status: ${user.maritalStatus}`);
      console.log(`Number of Children: ${user.numberOfChildren}`);
      console.log(`Current Challenges: ${user.currentChallenges.join(', ')}`);
      console.log(`Hopeful Outcomes: ${user.hopefulOutcomes.join(', ')}`);
      console.log('----------------------------');
    }
    
    console.log('Process completed successfully');
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkUsers()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 