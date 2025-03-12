import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateExistingSessions() {
  console.log('Updating existing sessions with correct user names...');
  
  try {
    // Get all sessions
    const sessions = await prisma.session.findMany({
      include: {
        user: true
      }
    });
    
    console.log(`Found ${sessions.length} sessions to update`);
    
    for (const session of sessions) {
      try {
        // Skip sessions that don't have outcomeData
        if (!session.outcomeData) {
          console.log(`Session ${session.id} has no outcomeData, skipping`);
          continue;
        }
        
        // Parse the outcomeData
        const outcomeData = JSON.parse(session.outcomeData);
        
        // Skip sessions that don't have beneficiaryProfile
        if (!outcomeData.beneficiaryProfile) {
          console.log(`Session ${session.id} has no beneficiaryProfile in outcomeData, skipping`);
          continue;
        }
        
        const beneficiaryProfile = outcomeData.beneficiaryProfile;
        
        // Skip if the beneficiary profile doesn't have firstName and lastName
        if (!beneficiaryProfile.firstName || !beneficiaryProfile.lastName) {
          // Check if it has a name field instead
          if (beneficiaryProfile.name) {
            // Split the name into firstName and lastName
            const nameParts = beneficiaryProfile.name.split(' ');
            beneficiaryProfile.firstName = nameParts[0];
            beneficiaryProfile.lastName = nameParts.slice(1).join(' ');
          } else {
            console.log(`Session ${session.id} beneficiaryProfile has no name fields, skipping`);
            continue;
          }
        }
        
        // Create the full name
        const fullName = `${beneficiaryProfile.firstName} ${beneficiaryProfile.lastName}`;
        
        // Update the user name
        await prisma.user.update({
          where: {
            id: session.userId
          },
          data: {
            name: fullName
          }
        });
        
        // Update the pastorName in outcomeData
        outcomeData.pastorName = fullName;
        
        // Update the session outcomeData
        await prisma.session.update({
          where: {
            id: session.id
          },
          data: {
            outcomeData: JSON.stringify(outcomeData)
          }
        });
        
        console.log(`Updated session ${session.id} and user ${session.userId} with name "${fullName}"`);
      } catch (error) {
        console.error(`Error updating session ${session.id}:`, error);
      }
    }
    
    console.log('Session update completed');
  } catch (error) {
    console.error('Error updating sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingSessions(); 