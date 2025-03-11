import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { generateBeneficiaryProfile } from './generate-beneficiary-profile.js';
import { createSyntheticSession } from './generate-session.js';
import { createSessionInDatabase } from './create-session-in-db.js';

dotenv.config();

const execPromise = promisify(exec);
const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Creates a new user with the generated profile
 */
async function createUserWithProfile(profile) {
  try {
    // Create a new user with a unique name based on the profile
    const userName = `${profile.pastorProfile?.name || 'Pastor'} (Beneficiary)`;
    
    const newUser = await prisma.user.create({
      data: {
        name: userName,
        profile: profile
      }
    });
    
    console.log(`Created new user with ID ${newUser.id} and name "${userName}"`);
    return newUser;
  } catch (error) {
    console.error('Error creating user with profile:', error);
    throw error;
  }
}

/**
 * Gets a random program ID from the database
 */
async function getRandomProgramId() {
  const programs = await prisma.program.findMany({
    select: { id: true }
  });
  
  if (!programs || programs.length === 0) {
    throw new Error('No programs found in the database');
  }
  
  const randomIndex = Math.floor(Math.random() * programs.length);
  return programs[randomIndex].id;
}

/**
 * Main function to generate multiple profiles and sessions
 */
async function generateMultipleSessions(count = 1, saveJsonFiles = false) {
  console.log(`Generating ${count} beneficiary profiles and sessions...`);
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`\n--- Generating profile and session ${i + 1} of ${count} ---\n`);
    
    // Randomly select a program ID (19 or 20)
    const programId = Math.random() > 0.5 ? 19 : 20;
    console.log(`Selected program ID: ${programId}`);
    
    // Generate beneficiary profile
    console.log('Generating beneficiary profile...');
    const profile = await generateBeneficiaryProfile(programId);
    
    // Only log the full profile if saving JSON files
    if (saveJsonFiles) {
      console.log(`Generated beneficiary profile: ${JSON.stringify(profile, null, 2)}`);
    } else {
      console.log(`Generated beneficiary profile for ${profile.pastorProfile?.name || 'Unknown Pastor'}`);
    }
    
    // Create user with profile
    console.log('Creating user with profile...');
    const user = await createUserWithProfile(profile);
    
    // Generate session for user
    console.log('Generating session for user...');
    const sessionData = await createSyntheticSession(programId, {
      id: user.id,
      firstName: profile.pastorProfile?.name?.split(' ')[0] || 'Unknown',
      lastName: profile.pastorProfile?.name?.split(' ')[1] || 'Pastor',
      email: `user${user.id}@example.com`,
      // Add other profile fields from the pastorProfile
      churchName: profile.pastorProfile?.churchDetails?.name || 'Unknown Church',
      churchSize: profile.pastorProfile?.churchDetails?.averageAttendance || 100,
      role: profile.pastorProfile?.role || 'Pastor',
      yearsInMinistry: profile.pastorProfile?.yearsInMinistry || 5,
      denomination: profile.pastorProfile?.churchDetails?.denomination || 'Non-denominational',
      location: profile.pastorProfile?.churchDetails?.location?.city 
        ? `${profile.pastorProfile.churchDetails.location.city}, ${profile.pastorProfile.churchDetails.location.state}`
        : 'Unknown Location',
      age: profile.pastorProfile?.age || 40,
      familyStatus: profile.pastorProfile?.familyStatus?.maritalStatus || 'Unknown',
      currentChallenges: profile.pastorProfile?.currentChallenges || [],
      reasonsForSeekingCoaching: profile.pastorProfile?.reasonsForSeekingCoaching || [],
      goalsForCoaching: profile.pastorProfile?.goalsForCoaching || []
    });
    console.log(`Session generation completed for user ID ${user.id}`);
    
    // Save session data to file (optional)
    if (saveJsonFiles) {
      const sessionFilename = `synthetic-session-user-${user.id}.json`;
      fs.writeFileSync(sessionFilename, JSON.stringify(sessionData, null, 2));
      console.log(`Session data saved to ${sessionFilename}`);
    }
    
    // Create session in database
    console.log('Creating session in database...');
    try {
      const sessionId = await createSessionInDatabase(sessionData);
      console.log(`Session created successfully with ID ${sessionId}`);
    } catch (error) {
      console.error('Error creating session in database:', error);
    }
    
    results.push({
      userId: user.id,
      userName: user.name,
      programId: programId,
      sessionGenerated: true
    });
  }
  
  console.log('\n--- Generation Summary ---');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

// Get count from command line arguments
const count = parseInt(process.argv[2]) || 1;

// Check if we should save JSON files (default to false)
const saveJsonFiles = process.argv[3] === 'true';

// Run the function
generateMultipleSessions(count, saveJsonFiles)
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 