import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking recent sessions in the database...');
    
    // First, let's check what models are available
    console.log('Checking schema...');
    const sessionModel = await prisma.session.findFirst();
    console.log('Session model exists:', sessionModel !== null);
    
    // Get sessions without relations first
    const sessions = await prisma.session.findMany({
      orderBy: { id: 'desc' },
      take: 20
    });
    
    console.log(`Found ${sessions.length} sessions:`);
    
    // Track outcome distribution
    const outcomeDistribution = {
      positive: 0, // Rating 4-5
      neutral: 0,  // Rating 3
      negative: 0, // Rating 1-2
      noRating: 0  // No rating
    };
    
    for (const session of sessions) {
      console.log(`\nSession ID: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Program ID: ${session.programId}`);
      console.log(`Fund ID: ${session.fundId}`);
      console.log(`User ID: ${session.userId}`);
      
      // Check for application
      const application = await prisma.application.findFirst({
        where: { sessionId: session.id }
      });
      console.log(`Application: ${application ? 'Yes' : 'No'}`);
      
      // Check for survey responses
      const surveyResponses = await prisma.surveyResponse.findMany({
        where: { sessionId: session.id }
      });
      console.log(`Survey Responses: ${surveyResponses.length}`);
      
      // Check for milestone reflections
      const milestoneReflections = await prisma.milestoneReflection.findMany({
        where: { sessionId: session.id }
      });
      console.log(`Milestone Reflections: ${milestoneReflections.length}`);
      
      // Check for rating
      const rating = await prisma.rating.findFirst({
        where: { sessionId: session.id }
      });
      console.log(`Rating: ${rating ? `Yes (Score: ${rating.score})` : 'No'}`);
      
      // Update outcome distribution
      if (rating) {
        if (rating.score >= 4) {
          outcomeDistribution.positive++;
        } else if (rating.score === 3) {
          outcomeDistribution.neutral++;
        } else {
          outcomeDistribution.negative++;
        }
      } else {
        outcomeDistribution.noRating++;
      }
    }
    
    // Calculate percentages
    const totalWithRatings = outcomeDistribution.positive + outcomeDistribution.neutral + outcomeDistribution.negative;
    const positivePercent = totalWithRatings > 0 ? (outcomeDistribution.positive / totalWithRatings * 100).toFixed(1) : 0;
    const neutralPercent = totalWithRatings > 0 ? (outcomeDistribution.neutral / totalWithRatings * 100).toFixed(1) : 0;
    const negativePercent = totalWithRatings > 0 ? (outcomeDistribution.negative / totalWithRatings * 100).toFixed(1) : 0;
    
    // Display outcome distribution summary
    console.log('\n--- Outcome Distribution Summary ---');
    console.log(`Positive outcomes (Rating 4-5): ${outcomeDistribution.positive} (${positivePercent}%)`);
    console.log(`Neutral outcomes (Rating 3): ${outcomeDistribution.neutral} (${neutralPercent}%)`);
    console.log(`Negative outcomes (Rating 1-2): ${outcomeDistribution.negative} (${negativePercent}%)`);
    console.log(`Sessions without ratings: ${outcomeDistribution.noRating}`);
    console.log(`Total sessions with ratings: ${totalWithRatings}`);
    console.log(`Target distribution: 70% positive, 20% neutral, 10% negative`);
    
    return sessions;
  } catch (error) {
    console.error('Error checking sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the main function
main()
  .then(() => {
    console.log('\nProcess completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 