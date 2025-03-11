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
 */
export async function generateBeneficiaryProfile(programId) {
  // Get the program details to provide context
  const program = await prisma.program.findUnique({
    where: { id: programId }
  });

  if (!program) {
    throw new Error(`Program with ID ${programId} not found`);
  }

  console.log(`Generating profile for program: ${program.name}`);

  const prompt = `
Generate a detailed profile of a pastor who is seeking coaching through a ministry support program called "${program.name}".
Program Description: ${program.description}

The profile should include:

1. Name (first and last)
2. Age (between 35-65)
3. Church details:
   - Name (should sound like a real church)
   - Location (city, state)
   - Denomination
   - Average attendance (between 50-1000)
4. Role (Senior Pastor, Associate Pastor, etc.)
5. Years in ministry (between 5-30)
6. Family status:
   - Marital status
   - Spouse name (if married)
   - Children (names and ages, if any)
7. Current challenges (list 3-5 specific challenges they're facing in ministry that would make them a good fit for this specific program)
8. Reasons for seeking coaching (list 3-4 specific reasons related to the program description)
9. Goals for coaching (list 3-4 specific goals that align with what the program offers)

Make the profile realistic, detailed, and specific. Include personal struggles that would be common for pastors seeking this specific type of program.
Format the response as a JSON object that can be parsed with JSON.parse().
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates realistic profiles for pastors seeking coaching. You always respond with valid JSON." },
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
    return profile;
  } catch (error) {
    console.error('Error generating beneficiary profile:', error);
    // Create a fallback profile
    return {
      name: "John Smith",
      age: 45,
      church: {
        name: "Grace Community Church",
        location: "Springfield, IL",
        denomination: "Non-denominational",
        averageAttendance: 200
      },
      role: "Senior Pastor",
      yearsInMinistry: 15,
      familyStatus: {
        maritalStatus: "Married",
        spouseName: "Mary",
        children: [
          { name: "James", age: 12 },
          { name: "Sarah", age: 10 }
        ]
      },
      currentChallenges: [
        "Experiencing burnout from the demands of ministry",
        "Struggling to balance family life and church responsibilities",
        "Difficulty delegating tasks to church staff and volunteers"
      ],
      reasonsForSeekingCoaching: [
        "Need tools for managing stress and preventing burnout",
        "Want to improve leadership skills",
        "Seeking strategies for better church engagement"
      ],
      goalsForCoaching: [
        "Achieve better work-life balance",
        "Develop effective delegation techniques",
        "Improve communication with church staff and congregation"
      ]
    };
  }
}

/**
 * Creates or updates a user with the generated profile
 */
export async function saveProfileToUser(profile, userName = "Regular User") {
  try {
    // Find the user or create a new one
    const user = await prisma.user.findFirst({
      where: { name: userName }
    });

    if (!user) {
      console.log(`User "${userName}" not found, creating new user...`);
      const newUser = await prisma.user.create({
        data: {
          name: userName,
          profile: profile
        }
      });
      console.log(`Created new user with ID ${newUser.id} and profile`);
      return newUser;
    } else {
      console.log(`Updating user "${userName}" with new profile...`);
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { profile: profile }
      });
      console.log(`Updated user with ID ${updatedUser.id} with new profile`);
      return updatedUser;
    }
  } catch (error) {
    console.error('Error saving profile to user:', error);
    throw error;
  }
}

/**
 * Main function to generate a profile and save it to a user
 */
async function main() {
  try {
    // Get program ID from command line arguments or use a default
    const programId = process.argv[2] ? parseInt(process.argv[2]) : 19; // Default to program ID 19
    
    console.log(`Generating beneficiary profile for program ID ${programId}...`);
    const profile = await generateBeneficiaryProfile(programId);
    
    console.log('Saving profile to user...');
    const userName = profile.pastorProfile?.name ? `${profile.pastorProfile.name} (Beneficiary)` : "Regular User";
    const user = await saveProfileToUser(profile, userName);
    
    console.log('Profile saved successfully!');
    console.log('User ID:', user.id);
    console.log('User Name:', user.name);
    
    return user;
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