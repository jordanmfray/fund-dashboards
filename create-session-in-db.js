import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Creates a session in the database from synthetic session data
 * @param {Object} sessionData - The synthetic session data
 * @param {number} [overrideFundId] - Optional fund ID to override the one in sessionData
 * @returns {Promise<number>} - The ID of the created session
 */
export async function createSessionInDatabase(sessionData, overrideFundId = null) {
  try {
    // Extract data from the session data
    const { 
      beneficiaryProfile, 
      programId, 
      fundId: sessionFundId, 
      userId,
      applicationResponses,
      preSurveyResponses,
      milestoneReflections,
      postSurveyResponses,
      review
    } = sessionData;

    // Use the override fund ID if provided, otherwise use the one from sessionData
    const fundId = overrideFundId || sessionFundId;

    // Extract the name from the beneficiary profile
    const userName = beneficiaryProfile?.firstName && beneficiaryProfile?.lastName 
      ? `${beneficiaryProfile.firstName} ${beneficiaryProfile.lastName}`
      : 'User';

    console.log(`Creating session for user ${userId} in program ${programId}...`);

    // Create a new user for this session to avoid unique constraint issues
    const newUser = await prisma.user.create({
      data: {
        name: userName,
        age: beneficiaryProfile?.age || null,
        jobTitle: beneficiaryProfile?.jobTitle || null,
        yearsInJob: beneficiaryProfile?.yearsInJob || null,
        income: beneficiaryProfile?.income || null,
        maritalStatus: beneficiaryProfile?.maritalStatus || null,
        numberOfChildren: beneficiaryProfile?.numberOfChildren || null,
        currentChallenges: beneficiaryProfile?.currentChallenges || [],
        hopefulOutcomes: beneficiaryProfile?.hopefulOutcomes || []
      }
    });
    
    console.log(`Created new user with ID ${newUser.id} for session`);

    // Create the session with the new user
    const session = await prisma.session.create({
      data: {
        status: 'COMPLETED',
        programId: programId,
        fundId: fundId,
        userId: newUser.id,
        outcomeData: JSON.stringify({
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          beneficiaryProfile: beneficiaryProfile,
          pastorName: userName
        })
      }
    });
    
    console.log(`Created session with ID ${session.id}`);

    // Create application if responses exist
    if (applicationResponses && applicationResponses.length > 0) {
      const application = await prisma.application.create({
        data: {
          sessionId: session.id,
          userId: newUser.id,
          responses: applicationResponses,
          status: 'approved'
        }
      });
      console.log(`Created application with ID ${application.id}`);
    }

    // Create pre-survey response if it exists
    if (preSurveyResponses && preSurveyResponses.length > 0) {
      const preSurvey = await prisma.surveyResponse.create({
        data: {
          surveyId: sessionData.preSurveyId || 1, // Default to ID 1 if not provided
          sessionId: session.id,
          userId: newUser.id,
          completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          questionResponses: {
            create: preSurveyResponses.map(response => ({
              questionId: response.questionId,
              answer: response.response
            }))
          }
        }
      });
      console.log(`Created pre-survey response with ID ${preSurvey.id}`);
    }

    // Create milestone reflections if they exist
    if (milestoneReflections && milestoneReflections.length > 0) {
      // Create a map to track which milestone IDs have been processed
      const processedMilestoneIds = new Set();
      
      for (const reflection of milestoneReflections) {
        // Skip if we've already processed this milestone ID
        if (processedMilestoneIds.has(reflection.milestoneId)) {
          console.log(`Skipping duplicate milestone reflection for milestone ID ${reflection.milestoneId}`);
          continue;
        }
        
        // Add this milestone ID to the set of processed IDs
        processedMilestoneIds.add(reflection.milestoneId);
        
        const milestoneReflection = await prisma.milestoneReflection.create({
          data: {
            milestoneId: reflection.milestoneId,
            sessionId: session.id,
            userId: newUser.id,
            content: reflection.reflection,
            completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
          }
        });
        console.log(`Created milestone reflection with ID ${milestoneReflection.id}`);
      }
    }

    // Create post-survey response if it exists
    if (postSurveyResponses && postSurveyResponses.length > 0) {
      const postSurvey = await prisma.surveyResponse.create({
        data: {
          surveyId: sessionData.postSurveyId || 2, // Default to ID 2 if not provided
          sessionId: session.id,
          userId: newUser.id,
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          questionResponses: {
            create: postSurveyResponses.map(response => ({
              questionId: response.questionId,
              answer: response.response
            }))
          }
        }
      });
      console.log(`Created post-survey response with ID ${postSurvey.id}`);
    }

    // Create rating and review if they exist
    if (review) {
      try {
        // Create the rating
        const rating = await prisma.rating.create({
          data: {
            sessionId: session.id,
            userId: newUser.id,
            score: review.rating || Math.floor(Math.random() * 2) + 4 // Random 4-5 rating
          }
        });
        console.log(`Created rating with ID ${rating.id}`);

        // Create the review
        const reviewRecord = await prisma.review.create({
          data: {
            sessionId: session.id,
            userId: newUser.id,
            content: review.fullReview || review.text
          }
        });
        console.log(`Created review with ID ${reviewRecord.id}`);
      } catch (error) {
        console.error('Error creating rating or review:', error);
      }
    }

    console.log(`Successfully created complete session in database with ID ${session.id}`);
    return session.id;
  } catch (error) {
    console.error('Error creating session in database:', error);
    throw error;
  }
}

/**
 * Main function to read session data and create a session in the database
 */
async function main() {
  try {
    // Get the file path from command line arguments or use a default
    const filePath = process.argv[2] || 'synthetic-session.json';
    
    console.log(`Reading session data from ${filePath}...`);
    const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    await createSessionInDatabase(sessionData);
    
    console.log('Session created successfully');
  } catch (error) {
    console.error('Error in main function:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the main function only if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('Process completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} 