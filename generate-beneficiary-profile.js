import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates a detailed beneficiary profile for a pastor based on program context
 * and creates a user with this profile
 */
export async function generateBeneficiaryProfile(programId) {
  try {
    // Get the program details to provide context
    const program = await prisma.program.findUnique({
      where: { id: programId }
    });

    if (!program) {
      throw new Error(`Program with ID ${programId} not found`);
    }

    console.log(`Generating profile for program: ${program.name}`);
    
    // First, create an empty user to get a user ID
    console.log('Creating initial empty user...');
    const initialUser = await prisma.user.create({
      data: {
        name: "Temporary User",
        currentChallenges: [],
        hopefulOutcomes: []
      }
    });
    console.log(`Created initial user with ID ${initialUser.id}`);

    const prompt = `
Generate a detailed profile of a person who is seeking support from a program called "${program.name}".
Program Description: ${program.description}

The profile should be returned as a JSON object with the following structure:
{
  "name": "Full Name",
  "age": 35,
  "jobTitle": "Job Title",
  "yearsInJob": 5,
  "income": 75000,
  "maritalStatus": "Single|Married|Divorced|Widowed",
  "numberOfChildren": 2,
  "currentChallenges": ["Challenge 1", "Challenge 2", "Challenge 3"],
  "hopefulOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
}

Guidelines:
1. Name: Make up a unique and uncommon full name (don't include "beneficiary" or "pastor" in the name)
2. Age: Between 30-70
3. Job Title: Should sound like a real job title
4. Years in current job: Between 1-10
5. Income: Between 50,000-200,000 (just the number, no currency symbol)
6. Marital Status: One of "Single", "Married", "Divorced", or "Widowed"
7. Number of Children: Integer between 0-5
8. Current Challenges: List 2-3 specific challenges they're facing related to the program description
9. Hopeful Outcomes: List 2-3 specific goals that align with what the program offers

Make the profile realistic, detailed, and specific. Include personal struggles that would be common for people seeking this specific type of program.
Ensure your response is a valid JSON object that can be parsed with JSON.parse().
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates realistic profiles of people seeking support. You always respond with valid JSON that strictly follows the requested structure." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      let responseContent = response.choices[0].message.content;
      // Clean up the response to ensure it's valid JSON
      responseContent = responseContent.trim();
      if (responseContent.startsWith('```json')) {
        responseContent = responseContent.replace(/```json\n/, '').replace(/\n```$/, '');
      } else if (responseContent.startsWith('```')) {
        responseContent = responseContent.replace(/```\n/, '').replace(/\n```$/, '');
      }

      console.log('Raw profile response:', responseContent);
      const profile = JSON.parse(responseContent);
      console.log('Generated beneficiary profile:', profile);
      
      // Now update the user with the generated profile and proper name
      const userName = profile.name || "Anonymous User";
      console.log(`Updating user ${initialUser.id} with name "${userName}" and profile...`);
      
      const updatedUser = await prisma.user.update({
        where: { id: initialUser.id },
        data: {
          name: userName,
          age: profile.age || null,
          jobTitle: profile.jobTitle || null,
          yearsInJob: profile.yearsInJob || null,
          income: profile.income || null,
          maritalStatus: profile.maritalStatus || null,
          numberOfChildren: profile.numberOfChildren || null,
          currentChallenges: profile.currentChallenges || [],
          hopefulOutcomes: profile.hopefulOutcomes || []
        }
      });
      
      console.log(`Updated user with ID ${updatedUser.id} and name "${updatedUser.name}"`);
      
      // Return both the profile and the user
      return {
        profile,
        user: updatedUser
      };
    } catch (error) {
      console.error('Error generating beneficiary profile:', error);
      
      // Create a fallback profile with the new structure
      const fallbackProfile = {
        name: "John Smith",
        age: 45,
        jobTitle: "Marketing Manager",
        yearsInJob: 5,
        income: 85000,
        maritalStatus: "Married",
        numberOfChildren: 2,
        currentChallenges: [
          "Experiencing burnout from high work demands",
          "Struggling to balance career and family responsibilities",
          "Difficulty delegating tasks to team members"
        ],
        hopefulOutcomes: [
          "Achieve better work-life balance",
          "Develop effective delegation techniques",
          "Improve communication with colleagues and family"
        ]
      };
      
      // Update the user with the fallback profile
      const userName = fallbackProfile.name;
      console.log(`Updating user ${initialUser.id} with fallback profile...`);
      
      const updatedUser = await prisma.user.update({
        where: { id: initialUser.id },
        data: {
          name: userName,
          age: fallbackProfile.age,
          jobTitle: fallbackProfile.jobTitle,
          yearsInJob: fallbackProfile.yearsInJob,
          income: fallbackProfile.income,
          maritalStatus: fallbackProfile.maritalStatus,
          numberOfChildren: fallbackProfile.numberOfChildren,
          currentChallenges: fallbackProfile.currentChallenges,
          hopefulOutcomes: fallbackProfile.hopefulOutcomes
        }
      });
      
      console.log(`Updated user with ID ${updatedUser.id} and fallback profile`);
      
      // Return both the profile and the user
      return {
        profile: fallbackProfile,
        user: updatedUser
      };
    }
  } catch (error) {
    console.error('Error in generateBeneficiaryProfile:', error);
    throw error;
  }
}

/**
 * Main function to generate a profile and create a user
 */
async function main() {
  try {
    // Get program ID from command line arguments or use a default
    const programId = process.argv[2] ? parseInt(process.argv[2]) : 1; // Default to program ID 1
    
    console.log(`Generating beneficiary profile for program ID ${programId}...`);
    const { profile, user } = await generateBeneficiaryProfile(programId);
    
    console.log('Profile and user created successfully!');
    console.log('User ID:', user.id);
    console.log('User Name:', user.name);
    
    return { profile, user };
  } catch (error) {
    console.error('Error in main function:', error);
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
      console.error('Fatal error:', error);
      process.exit(1);
    });
} 