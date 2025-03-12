import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Checks the session details in the database
 */
async function checkSessionDetails() {
  try {
    console.log('Checking session details in the database...');
    
    // Get the most recent sessions
    const sessions = await prisma.session.findMany({
      orderBy: {
        id: 'desc'
      },
      take: 5,
      include: {
        user: true,
        program: true,
        fund: true
      }
    });
    
    console.log(`Found ${sessions.length} sessions:`);
    
    for (const session of sessions) {
      console.log('----------------------------');
      console.log(`Session ID: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Program: ${session.program.name}`);
      console.log(`Fund: ${session.fund.name}`);
      console.log(`User ID: ${session.userId}`);
      console.log(`User Name: ${session.user.name}`);
      
      // Parse the outcomeData JSON
      const outcomeData = JSON.parse(session.outcomeData);
      console.log('Outcome Data:');
      console.log(`  Completed At: ${outcomeData.completedAt}`);
      console.log(`  Pastor Name: ${outcomeData.pastorName || 'N/A'}`);
      console.log('  Beneficiary Profile:');
      if (outcomeData.beneficiaryProfile) {
        console.log(JSON.stringify(outcomeData.beneficiaryProfile, null, 2));
      } else {
        console.log('    N/A');
      }
      console.log('----------------------------');
    }
    
    console.log('Process completed successfully');
  } catch (error) {
    console.error('Error checking session details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
checkSessionDetails()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 