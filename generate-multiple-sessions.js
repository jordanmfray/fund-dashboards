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
 * Gets all available program IDs from the database
 */
async function getAvailableProgramIds() {
  try {
    const programs = await prisma.program.findMany({
      select: { id: true }
    });
    
    if (!programs || programs.length === 0) {
      throw new Error('No programs found in the database');
    }
    
    return programs.map(program => program.id);
  } catch (error) {
    console.error('Error fetching program IDs:', error);
    throw error;
  }
}

/**
 * Validates that a program exists in the database
 */
async function validateProgramId(programId) {
  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        funds: true
      }
    });
    
    if (!program) {
      throw new Error(`Program with ID ${programId} not found in the database`);
    }
    
    return program;
  } catch (error) {
    console.error('Error validating program ID:', error);
    throw error;
  }
}

/**
 * Validates that a fund exists in the database
 */
async function validateFundId(fundId) {
  try {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId }
    });
    
    if (!fund) {
      throw new Error(`Fund with ID ${fundId} not found in the database`);
    }
    
    return fund;
  } catch (error) {
    console.error('Error validating fund ID:', error);
    throw error;
  }
}

/**
 * Main function to generate multiple profiles and sessions
 */
async function generateMultipleSessions(count = 1, specificProgramId = null, specificFundId = null, saveJsonFiles = false) {
  console.log(`Generating ${count} beneficiary profiles and sessions...`);
  
  let programId;
  let fundId = specificFundId;
  
  // If a specific program ID is provided, validate it
  if (specificProgramId) {
    const program = await validateProgramId(specificProgramId);
    programId = specificProgramId;
    console.log(`Using specified program: ${program.name} (ID: ${programId})`);
    
    // If no fund ID is specified but the program has associated funds, use the first one
    if (!fundId && program.funds && program.funds.length > 0) {
      fundId = program.funds[0].id;
      console.log(`Using fund associated with program: ${program.funds[0].name} (ID: ${fundId})`);
    }
  } else {
    // Get available program IDs from the database
    const programIds = await getAvailableProgramIds();
    console.log(`Available program IDs: ${programIds.join(', ')}`);
    
    // Randomly select a program ID from the available IDs
    programId = programIds[Math.floor(Math.random() * programIds.length)];
  }
  
  // If a specific fund ID is provided, validate it
  if (fundId) {
    const fund = await validateFundId(fundId);
    console.log(`Using specified fund: ${fund.name} (ID: ${fundId})`);
  } else {
    // Use default fund ID 1 if none is specified
    fundId = 1;
    console.log(`Using default fund ID: ${fundId}`);
  }
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`\n--- Generating profile and session ${i + 1} of ${count} ---\n`);
    
    console.log(`Selected program ID: ${programId}`);
    
    // Generate beneficiary profile and user in one step
    console.log('Generating beneficiary profile and user...');
    const { profile, user } = await generateBeneficiaryProfile(programId);
    
    // Only log the full profile if saving JSON files
    if (saveJsonFiles) {
      console.log(`Generated beneficiary profile: ${JSON.stringify(profile, null, 2)}`);
    } else {
      console.log(`Generated beneficiary profile for ${profile.name || 'Unknown User'}`);
    }
    
    console.log(`Using user with ID ${user.id} and name "${user.name}"`);
    
    // Generate session for user
    console.log('Generating session for user...');
    const sessionData = await createSyntheticSession(programId, {
      id: user.id,
      firstName: profile.name?.split(' ')[0] || 'Unknown',
      lastName: profile.name?.split(' ')[1] || 'User',
      email: `user${user.id}@example.com`,
      // Add other profile fields from the standardized profile
      jobTitle: profile.jobTitle || 'Professional',
      yearsInJob: profile.yearsInJob || 3,
      income: profile.income || 75000,
      age: profile.age || 40,
      maritalStatus: profile.maritalStatus || 'Unknown',
      numberOfChildren: profile.numberOfChildren || 0,
      currentChallenges: profile.currentChallenges || [],
      hopefulOutcomes: profile.hopefulOutcomes || []
    });
    console.log(`Session generation completed for user ID ${user.id}`);
    
    // Save session data to file (optional)
    if (saveJsonFiles) {
      const sessionFilename = `synthetic-session-user-${user.id}.json`;
      fs.writeFileSync(sessionFilename, JSON.stringify(sessionData, null, 2));
      console.log(`Session data saved to ${sessionFilename}`);
    }
    
    // Create session in database with the specified fund ID
    console.log('Creating session in database...');
    try {
      const sessionId = await createSessionInDatabase(sessionData, fundId);
      console.log(`Session created successfully with ID ${sessionId}`);
    } catch (error) {
      console.error('Error creating session in database:', error);
    }
    
    results.push({
      userId: user.id,
      userName: user.name,
      programId: programId,
      fundId: fundId,
      sessionGenerated: true
    });
  }
  
  console.log('\n--- Generation Summary ---');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

// Parse command line arguments
const count = parseInt(process.argv[2]) || 1;
const programId = process.argv[3] ? parseInt(process.argv[3]) : null;
const fundId = process.argv[4] ? parseInt(process.argv[4]) : null;
const saveJsonFiles = process.argv[5] === 'true';

// Run the function
generateMultipleSessions(count, programId, fundId, saveJsonFiles)
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 