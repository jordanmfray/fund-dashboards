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
      
      // Get the application questions for this program
      const applicationQuestions = await prisma.question.findMany({
        where: {
          programId: programId,
          context: 'APPLICATION'
        },
        orderBy: {
          order: 'asc'
        }
      });
      
      if (applicationQuestions.length > 0) {
        console.log(`Found ${applicationQuestions.length} application questions for program ${programId}`);
        
        // Create question responses for each application response
        for (const response of applicationResponses) {
          // Try multiple strategies to match questions with responses
          let matchingQuestion = null;
          
          // Strategy 1: If the response has a questionText property, try to match by text
          if (response.questionText) {
            matchingQuestion = applicationQuestions.find(q => 
              q.text.toLowerCase().includes(response.questionText.toLowerCase()) ||
              response.questionText.toLowerCase().includes(q.text.toLowerCase())
            );
            
            if (matchingQuestion) {
              console.log(`Matched question by text similarity`);
            }
          }
          
          // Strategy 2: If the response has a questionId property and it's a number, try to find by ID
          if (!matchingQuestion && response.questionId && typeof response.questionId === 'number') {
            // First try direct ID match
            matchingQuestion = applicationQuestions.find(q => q.id === response.questionId);
            
            // If that fails, try matching by order
            if (!matchingQuestion) {
              matchingQuestion = applicationQuestions.find(q => q.order === response.questionId);
            }
            
            if (matchingQuestion) {
              console.log(`Matched question by ID or order`);
            }
          }
          
          // Strategy 3: Position-based matching as a fallback
          if (!matchingQuestion) {
            const responseIndex = applicationResponses.indexOf(response);
            // If we have enough questions, use the same index, otherwise use modulo
            const questionIndex = responseIndex % applicationQuestions.length;
            matchingQuestion = applicationQuestions[questionIndex];
            
            if (matchingQuestion) {
              console.log(`Matched question by position (index ${responseIndex} -> question index ${questionIndex})`);
            }
          }
          
          if (matchingQuestion) {
            await prisma.questionResponse.create({
              data: {
                applicationId: application.id,
                questionId: matchingQuestion.id,
                answer: response.response
              }
            });
            console.log(`Created question response for question ID ${matchingQuestion.id} (text: "${matchingQuestion.text.substring(0, 30)}...")`);
          } else {
            console.log(`Failed to find a matching question for response: ${JSON.stringify(response).substring(0, 100)}...`);
          }
        }
      } else {
        console.log(`No application questions found for program ${programId}`);
      }
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
        // Determine the appropriate rating based on the review
        let ratingScore;
        if (review.rating && typeof review.rating === 'number' && review.rating >= 1 && review.rating <= 5) {
          // Use the rating from the review if it's valid
          ratingScore = review.rating;
        } else {
          // Fallback logic based on the review content
          // Check for keywords in the review to determine sentiment
          const reviewText = (review.fullReview || review.text || '').toLowerCase();
          
          if (reviewText.includes('excellent') || reviewText.includes('amazing') || 
              reviewText.includes('outstanding') || reviewText.includes('wonderful')) {
            ratingScore = 5; // Very positive
          } else if (reviewText.includes('good') || reviewText.includes('helpful') || 
                    reviewText.includes('positive') || reviewText.includes('recommend')) {
            ratingScore = 4; // Positive
          } else if (reviewText.includes('okay') || reviewText.includes('average') || 
                    reviewText.includes('neutral') || reviewText.includes('mixed')) {
            ratingScore = 3; // Neutral
          } else if (reviewText.includes('disappointing') || reviewText.includes('mediocre') || 
                    reviewText.includes('lacking')) {
            ratingScore = 2; // Negative
          } else if (reviewText.includes('terrible') || reviewText.includes('awful') || 
                    reviewText.includes('waste') || reviewText.includes('poor')) {
            ratingScore = 1; // Very negative
          } else {
            // Default to a positive rating if we can't determine sentiment
            ratingScore = 4;
          }
        }
        
        console.log(`Creating rating with score: ${ratingScore}`);
        
        // Create the rating
        const rating = await prisma.rating.create({
          data: {
            sessionId: session.id,
            userId: newUser.id,
            score: ratingScore
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