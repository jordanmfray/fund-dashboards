import dotenv from 'dotenv';
dotenv.config();

import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates application responses based on the beneficiary profile and application template
 */
async function generateApplicationResponses(programId, beneficiaryProfile) {
  try {
    console.log('Generating application responses...');
    
    // Get the program with its application template
    const program = await prisma.program.findUnique({
      where: { id: programId }
    });
    
    if (!program || !program.applicationTemplate) {
      console.log('No application template found for this program');
      return [];
    }
    
    // Parse the application template from JSON if needed
    const applicationTemplate = typeof program.applicationTemplate === 'string' 
      ? JSON.parse(program.applicationTemplate) 
      : program.applicationTemplate;
    
    // Create questions array from the application template
    const questions = [];
    
    // Add some default questions if the template doesn't have any
    if (!applicationTemplate.questions || applicationTemplate.questions.length === 0) {
      questions.push(
        { id: 1, text: "Why are you seeking coaching at this time?" },
        { id: 2, text: "What are the biggest challenges you're currently facing in your ministry?" },
        { id: 3, text: "What are your primary goals for this coaching experience?" }
      );
    } else {
      // Use the questions from the template
      for (let i = 0; i < applicationTemplate.questions.length; i++) {
        const q = applicationTemplate.questions[i];
        questions.push({
          id: q.id || i + 1,
          text: q.text || q.questionText || `Question ${i + 1}`
        });
      }
    }
    
    console.log(`Found ${questions.length} application questions`);
    
    const prompt = `
You are helping to generate realistic application responses for a person applying to a program called "${program.name}".

Program Description: ${program.description || "A coaching program designed to support individuals in their personal and professional growth."}

Here is the applicant's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the application questions:
${JSON.stringify(questions, null, 2)}

Please generate thoughtful and detailed responses to these questions that reflect the applicant's background, challenges, and goals. The responses should:
1. Be realistic and thoughtful
2. Reference specific challenges and goals from the applicant's profile
3. Show why the applicant is seeking support from this specific program
4. Be written in first person from the applicant's perspective
5. Directly relate to the program description and purpose

Format your response as a JSON array of objects, where each object has:
- questionId: the ID of the question
- response: the applicant's response to that question

The response should be valid JSON that can be parsed with JSON.parse().
Do not include any markdown formatting or backticks in your response.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that generates realistic application responses. You always respond with valid JSON." 
        },
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

    console.log('Raw application responses:', responseContent);
    const parsedResponse = JSON.parse(responseContent);
    
    // Format the responses as needed for the database
    const formattedResponses = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.responses || [];
    
    console.log('Generated application responses:', formattedResponses);
    return formattedResponses;
  } catch (error) {
    console.error('Error generating application responses:', error);
    
    // Return an empty array instead of generating fallback data
    return [];
  }
}

/**
 * Generates pre-survey responses based on the beneficiary profile
 */
async function generatePreSurveyResponses(surveyId, beneficiaryProfile, programName, programDescription) {
  try {
    console.log('Generating pre-survey responses...');
    
    // Get the survey questions
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true }
    });
    
    if (!survey || !survey.questions || survey.questions.length === 0) {
      console.log('No survey found with this ID or no questions in survey');
      return [];
    }
    
    const questions = survey.questions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type
    }));
    
    const prompt = `
You are helping to generate realistic pre-survey responses for a person who is about to start a program called "${programName || 'Support Program'}".

Program Description: ${programDescription || "A program designed to support individuals in their personal and professional growth."}

Here is the applicant's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the pre-survey questions:
${JSON.stringify(questions, null, 2)}

Please generate thoughtful responses to each question that reflect the applicant's initial state BEFORE starting the program. The responses should:
1. Align with the challenges and struggles mentioned in the applicant's profile
2. Reflect their current state before receiving any support
3. Show their expectations and hopes related to the specific program they're entering
4. Be relevant to the program description and purpose
5. The 12 likert scale items should be between 0 and 10, with 5 or less being below average, 6-8 being average, and 9-10 being above average.

Format your response as a JSON array of objects, where each object has:
- questionId: the ID of the question
- response: the applicant's response to that question

The response should be valid JSON that can be parsed with JSON.parse().
Do not include any markdown formatting or backticks in your response.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that generates realistic survey responses. You always respond with valid JSON." 
        },
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

    console.log('Raw pre-survey responses:', responseContent);
    const parsedResponse = JSON.parse(responseContent);
    
    // Format the responses as needed for the database
    const formattedResponses = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.responses || [];
    
    console.log('Generated pre-survey responses:', formattedResponses);
    return formattedResponses;
  } catch (error) {
    console.error('Error generating pre-survey responses:', error);
    
    // Return an empty array instead of generating fallback data
    return [];
  }
}

/**
 * Generates milestone reflections based on the beneficiary profile and program milestones
 */
async function generateMilestoneReflections(programId, beneficiaryProfile, outcomeType = 'positive') {
  try {
    console.log('Generating milestone reflections...');
    
    // Get the program details and milestones
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { milestones: true }
    });
    
    if (!program || !program.milestones || program.milestones.length === 0) {
      console.log('No milestones found for this program');
      return [];
    }
    
    const milestones = program.milestones;
    
    // Determine reflection tone based on outcome type
    let reflectionTone = '';
    if (outcomeType === 'positive') {
      reflectionTone = 'positive, showing growth and improvement';
    } else if (outcomeType === 'neutral') {
      reflectionTone = 'mixed, showing some improvement but also ongoing challenges';
    } else if (outcomeType === 'negative') {
      reflectionTone = 'negative, showing minimal improvement and continued struggles';
    }
    
    const prompt = `
You are helping to generate realistic milestone reflections for a person going through a program called "${program.name}".

Program Description: ${program.description || "A program designed to support individuals in their personal and professional growth."}

Here is the participant's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the program milestones:
${JSON.stringify(milestones, null, 2)}

Please generate ${reflectionTone} reflections for each milestone that show the participant's journey through the program. 

IMPORTANT: Create reflections with VARIABLE LENGTH. Some should be a single sentence, others 2-3 sentences, and others 4-5 sentences. Mix them up randomly.

Each reflection should:
1. Reference specific challenges from the participant's profile
2. Show the participant's experience with that milestone
3. Be written in first person from the participant's perspective
4. Relate directly to the program description and purpose
5. Show progression through the program (earlier milestones should show initial experiences, later ones should show development)

Format your response as a JSON array of objects, where each object has:
- milestoneId: the ID of the milestone
- reflection: the participant's reflection on that milestone (varying in length as specified)

The response should be valid JSON that can be parsed with JSON.parse().
Do not include any markdown formatting or backticks in your response.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that generates realistic milestone reflections. You always respond with valid JSON and create reflections with variable lengths as instructed." 
        },
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

    console.log('Raw milestone reflections:', responseContent);
    const parsedResponse = JSON.parse(responseContent);
    
    // Format the responses as needed for the database
    const formattedReflections = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.reflections || [];
    
    console.log('Generated milestone reflections:', formattedReflections);
    return formattedReflections;
  } catch (error) {
    console.error('Error generating milestone reflections:', error);
    
    // Return an empty array instead of generating fallback data
    return [];
  }
}

/**
 * Generates post-survey responses based on the beneficiary profile
 */
async function generatePostSurveyResponses(programId, beneficiaryProfile, outcomeType = 'positive') {
  try {
    console.log('Generating post-survey responses...');
    
    // Get the program details
    const program = await prisma.program.findUnique({
      where: { id: programId }
    });
    
    if (!program) {
      console.log('Program not found');
      return [];
    }
    
    // Get the post-survey for this program
    const postSurvey = await prisma.survey.findFirst({
      where: {
        type: 'POST',
        programs: {
          some: {
            id: programId
          }
        }
      },
      include: {
        questions: true
      }
    });
    
    if (!postSurvey || !postSurvey.questions || postSurvey.questions.length === 0) {
      console.log('No post-survey or questions found for this program');
      return [];
    }
    
    // Determine response tone based on outcome type
    let responseTone = '';
    if (outcomeType === 'positive') {
      responseTone = 'very positive, showing significant improvement';
    } else if (outcomeType === 'neutral') {
      responseTone = 'neutral, showing some improvement but also ongoing challenges';
    } else if (outcomeType === 'negative') {
      responseTone = 'negative, showing minimal improvement and continued struggles';
    }
    
    const prompt = `
You are helping to generate realistic post-survey responses for a person who has completed a program called "${program.name}".

Program Description: ${program.description || "A program designed to support individuals in their personal and professional growth."}

Here is the participant's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the post-survey questions:
${JSON.stringify(postSurvey.questions, null, 2)}

Please generate ${responseTone} responses that reflect the participant's experience after completing the program. The responses should:
1. Directly reference the program description and purpose
2. Mention specific aspects of the program that were helpful or not helpful
3. Relate to the participant's initial challenges and how they were addressed
4. Show the impact of the program on their personal and professional life

Format your response as a JSON array of objects, where each object has:
- questionId: the ID of the question
- response: the participant's response to that question

For questions that ask for a rating (1-5), provide a numeric response that aligns with the ${outcomeType} outcome.
For open-ended questions, provide a detailed response (2-4 sentences) that reflects the participant's experience.

The response should be valid JSON that can be parsed with JSON.parse().
Do not include any markdown formatting or backticks in your response.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that generates realistic survey responses. You always respond with valid JSON." 
        },
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

    console.log('Raw post-survey responses:', responseContent);
    const parsedResponse = JSON.parse(responseContent);
    
    // Format the responses as needed for the database
    const formattedResponses = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : parsedResponse.responses || [];
    
    console.log('Generated post-survey responses:', formattedResponses);
    return formattedResponses;
  } catch (error) {
    console.error('Error generating post-survey responses:', error);
    
    // Return an empty array instead of generating fallback data
    return [];
  }
}

/**
 * Generates a review of the coaching program
 */
async function generateReview(beneficiaryProfile, programName, programDescription, outcomeType = 'positive') {
  try {
    console.log('Generating review...');
    
    // Determine rating range based on outcome type
    let ratingRange = '';
    let ratingValue = '';
    if (outcomeType === 'positive') {
      ratingRange = 'between 4 and 5';
      ratingValue = 'either 4 or 5';
    } else if (outcomeType === 'neutral') {
      ratingRange = 'exactly 3'; // Neutral outcomes should have a rating of exactly 3
      ratingValue = '3';
    } else if (outcomeType === 'negative') {
      ratingRange = 'between 1 and 2';
      ratingValue = 'either 1 or 2';
    }
    
    const prompt = `
You are helping to generate a realistic review from a person who has completed a program called "${programName || 'Support Program'}".

Program Description: ${programDescription || "A program designed to support individuals in their personal and professional growth."}

Here is the participant's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Please generate a ${outcomeType} review of the participant's experience with the program. The review should:
1. Reference the specific challenges the participant was facing before the program
2. Describe ways the program helped or didn't help address those challenges
3. Mention improvements or lack thereof in the participant's personal and professional life
4. Include emotional elements about how the participant feels about the experience
5. End with a recommendation or warning for others in similar situations
6. Directly reference the program's purpose and description

Format your response as a JSON object with these fields:
- rating: a number ${ratingRange} (integer only). The rating MUST be ${ratingValue}.
- text: a short summary (1-2 sentences)
- fullReview: the detailed review (at least 250 words)
- impact: a one-sentence statement about the impact of the program

The response should be valid JSON that can be parsed with JSON.parse().
Do not include any markdown formatting or backticks in your response.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that generates realistic reviews. You always respond with valid JSON and follow the rating scale instructions exactly." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const responseContent = response.choices[0].message.content;
    console.log('Raw review:', responseContent);
    
    try {
      const parsedReview = JSON.parse(responseContent);
      console.log('Generated review:', parsedReview);
      return parsedReview;
    } catch (parseError) {
      console.error('Error parsing review JSON:', parseError);
      
      // Return null instead of generating fallback data
      return null;
    }
  } catch (error) {
    console.error('Error generating review:', error);
    
    // Return null instead of generating fallback data
    return null;
  }
}

/**
 * Creates a synthetic session with all components
 */
export async function createSyntheticSession(programId, beneficiaryProfile) {
  try {
    console.log(`Creating synthetic session for program ${programId} and beneficiary ${beneficiaryProfile.firstName} ${beneficiaryProfile.lastName}`);
    
    // Get the program details
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        milestones: true,
        funds: true // Include the funds associated with this program
      }
    });
    
    if (!program) {
      throw new Error(`Program with ID ${programId} not found`);
    }
    
    console.log(`Found program: ${program.name}`);
    
    // Get the fund ID from the program's associated funds
    let fundId = 1; // Default fallback
    if (program.funds && program.funds.length > 0) {
      fundId = program.funds[0].id;
      console.log(`Using fund ID ${fundId} from program's associated funds`);
    } else {
      // If no funds are associated with the program, find any fund
      const anyFund = await prisma.fund.findFirst();
      if (anyFund) {
        fundId = anyFund.id;
        console.log(`No funds associated with program. Using fund ID ${fundId} from database`);
      } else {
        console.log(`No funds found in database. Using default fund ID ${fundId}`);
      }
    }
    
    // Get the pre and post surveys for this program
    const preSurvey = await prisma.survey.findFirst({
      where: {
        type: 'PRE',
        programs: {
          some: {
            id: programId
          }
        }
      }
    });
    
    const postSurvey = await prisma.survey.findFirst({
      where: {
        type: 'POST',
        programs: {
          some: {
            id: programId
          }
        }
      }
    });
    
    if (!preSurvey) {
      console.log('No pre-survey found for this program');
    } else {
      console.log(`Found pre-survey: ${preSurvey.id}`);
    }
    
    if (!postSurvey) {
      console.log('No post-survey found for this program');
    } else {
      console.log(`Found post-survey: ${postSurvey.id}`);
    }
    
    // Determine outcome type (positive, neutral, negative)
    // This will influence the tone of the responses and the rating
    console.log(`Found pre-survey: ${preSurvey?.id}`);
    console.log(`Found post-survey: ${postSurvey?.id}`);
    
    // Determine the outcome type (positive, neutral, negative)
    // 70% positive, 20% neutral, 10% negative
    const randomValue = Math.floor(Math.random() * 100) + 1;
    let outcomeType = 'positive';
    
    if (randomValue > 70 && randomValue <= 90) {
      outcomeType = 'neutral';
    } else if (randomValue > 90) {
      outcomeType = 'negative';
    }
    
    console.log(`Selected outcome type: ${outcomeType} (random value: ${randomValue})`);
    
    // Generate application responses
    console.log('Generating application responses...');
    let applicationResponses = [];
    if (program.applicationTemplate) {
      applicationResponses = await generateApplicationResponses(programId, beneficiaryProfile);
    }
    
    // Generate pre-survey responses
    console.log('Generating pre-survey responses...');
    let preSurveyResponses = [];
    if (preSurvey) {
      preSurveyResponses = await generatePreSurveyResponses(preSurvey.id, beneficiaryProfile, program.name, program.description);
    }
    
    // Generate milestone reflections
    console.log('Generating milestone reflections...');
    const milestoneReflections = await generateMilestoneReflections(programId, beneficiaryProfile, outcomeType);
    
    // Generate post-survey responses
    console.log('Generating post-survey responses...');
    let postSurveyResponses = [];
    if (postSurvey) {
      postSurveyResponses = await generatePostSurveyResponses(programId, beneficiaryProfile, outcomeType);
    }
    
    // Generate a review
    console.log('Generating review...');
    const review = await generateReview(beneficiaryProfile, program.name, program.description, outcomeType);
    
    // Create the session data
    const sessionData = {
      beneficiaryProfile,
      programId,
      fundId, // Use the fund ID we determined above
      userId: beneficiaryProfile.id,
      preSurveyId: preSurvey?.id || 1, // Include the pre-survey ID
      postSurveyId: postSurvey?.id || 2, // Include the post-survey ID
      applicationResponses,
      preSurveyResponses,
      milestoneReflections,
      postSurveyResponses,
      review
    };
    
    return sessionData;
  } catch (error) {
    console.error('Error creating synthetic session:', error);
    throw error;
  }
}
