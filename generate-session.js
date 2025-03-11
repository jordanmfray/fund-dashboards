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
You are helping to generate realistic application responses for a pastor applying to a coaching program.

Here is the pastor's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the application questions:
${JSON.stringify(questions, null, 2)}

Please generate thoughtful and detailed responses to these questions that reflect the pastor's background, challenges, and goals. The responses should:
1. Be realistic and thoughtful
2. Reference specific challenges and goals from the pastor's profile
3. Show why the pastor is seeking coaching
4. Be written in first person from the pastor's perspective

Format your response as a JSON array of objects, where each object has:
- questionId: the ID of the question
- response: the pastor's response to that question

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
    
    // Create fallback responses if there's an error
    return [
      {
        questionId: 1,
        response: "I'm seeking coaching to help me navigate the challenges I'm facing in my ministry. I'm struggling with burnout and finding a healthy work-life balance. I hope this program can provide me with the tools and support I need to become a more effective pastor while also taking care of my personal well-being."
      },
      {
        questionId: 2,
        response: "My biggest challenges include managing the expectations of my congregation, dealing with conflicts within the church, and feeling isolated in my role. I've been in ministry for several years, but these challenges have become more pronounced recently."
      },
      {
        questionId: 3,
        response: "My primary goal is to develop a sustainable approach to ministry that allows me to serve effectively without sacrificing my health or family relationships. I also want to improve my leadership and communication skills to better guide my congregation."
      }
    ];
  }
}

/**
 * Generates pre-survey responses based on the beneficiary profile
 */
async function generatePreSurveyResponses(surveyId, beneficiaryProfile) {
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
You are helping to generate realistic pre-survey responses for a pastor starting a coaching program.

Here is the pastor's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the pre-survey questions:
${JSON.stringify(questions, null, 2)}

Please generate thoughtful responses to each question that reflect the pastor's initial state BEFORE starting the coaching program. The responses should align with the challenges and struggles mentioned in the pastor's profile.

Format your response as a JSON array of objects, where each object has:
- questionId: the ID of the question
- response: the pastor's response to that question

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
    
    // Create fallback responses if there's an error
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true }
    });
    
    if (!survey || !survey.questions) {
      return [];
    }
    
    return survey.questions.map(question => ({
      questionId: question.id,
      response: `Before coaching, I was struggling with ${beneficiaryProfile.currentChallenges[0]} and needed help with ${beneficiaryProfile.reasonsForSeekingCoaching[0]}.`
    }));
  }
}

/**
 * Generates milestone reflections based on the beneficiary profile and program milestones
 */
async function generateMilestoneReflections(programId, beneficiaryProfile, outcomeType = 'positive') {
  try {
    console.log('Generating milestone reflections...');
    
    // Get the program milestones
    const milestones = await prisma.milestone.findMany({
      where: { programId: programId }
    });
    
    if (!milestones || milestones.length === 0) {
      console.log('No milestones found for this program');
      return [];
    }
    
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
You are helping to generate realistic milestone reflections for a pastor going through a coaching program.

Here is the pastor's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the program milestones:
${JSON.stringify(milestones, null, 2)}

Please generate ${reflectionTone} reflections for each milestone that show the pastor's journey through the coaching program. 

IMPORTANT: Create reflections with VARIABLE LENGTH. Some should be a single sentence, others 2-3 sentences, and others 4-5 sentences. Mix them up randomly.

Each reflection should:
1. Reference specific challenges from the pastor's profile
2. Show the pastor's experience with that milestone
3. Be written in first person from the pastor's perspective

Format your response as a JSON array of objects, where each object has:
- milestoneId: the ID of the milestone
- reflection: the pastor's reflection on that milestone (varying in length as specified)

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
    
    // Create fallback reflections if there's an error
    const milestones = await prisma.milestone.findMany({
      where: { programId: programId }
    });
    
    if (!milestones || milestones.length === 0) {
      return [];
    }
    
    // Create fallback reflections based on outcome type
    return milestones.map((milestone, index) => {
      let reflection = '';
      
      // Vary the length of reflections
      const reflectionLength = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      
      if (outcomeType === 'positive') {
        if (reflectionLength === 1) {
          reflection = `This milestone was very helpful for my growth as a pastor.`;
        } else if (reflectionLength === 2) {
          reflection = `I found this milestone to be transformative. The insights I gained have already improved my ministry and family life.`;
        } else {
          reflection = `Completing this milestone was a significant turning point in my journey. I've gained valuable tools that have helped me address my challenges effectively. I feel more confident and equipped to lead my congregation now.`;
        }
      } else if (outcomeType === 'neutral') {
        if (reflectionLength === 1) {
          reflection = `This milestone had some helpful elements, but also some challenges.`;
        } else if (reflectionLength === 2) {
          reflection = `I found parts of this milestone useful, though I'm still working through some of the same issues. There's been some improvement but not as much as I'd hoped.`;
        } else {
          reflection = `This milestone provided some insights, but I'm still struggling with implementing the concepts consistently. While I've seen small improvements in some areas, other challenges remain largely the same. I'm cautiously optimistic about continued progress.`;
        }
      } else { // negative
        if (reflectionLength === 1) {
          reflection = `I didn't find this milestone particularly helpful for my situation.`;
        } else if (reflectionLength === 2) {
          reflection = `This milestone didn't address my specific challenges. I'm still facing the same issues with little improvement.`;
        } else {
          reflection = `I found this milestone to be disconnected from my actual needs as a pastor. The concepts presented were too general and didn't provide practical solutions to my specific challenges. I'm still struggling with the same issues I had before.`;
        }
      }
      
      return {
        milestoneId: milestone.id,
        reflection: reflection
      };
    });
  }
}

/**
 * Generates post-survey responses based on the beneficiary profile
 */
async function generatePostSurveyResponses(programId, beneficiaryProfile, outcomeType = 'positive') {
  try {
    console.log('Generating post-survey responses...');
    
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
You are helping to generate realistic post-survey responses for a pastor who has completed a coaching program.

Here is the pastor's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Here are the post-survey questions:
${JSON.stringify(postSurvey.questions, null, 2)}

Please generate ${responseTone} responses that reflect the pastor's experience after completing the coaching program.

Format your response as a JSON array of objects, where each object has:
- questionId: the ID of the question
- response: the pastor's response to that question

For questions that ask for a rating (1-5), provide a numeric response that aligns with the ${outcomeType} outcome.
For open-ended questions, provide a detailed response (2-4 sentences) that reflects the pastor's experience.

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
    
    // Create fallback responses if there's an error
    try {
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
        return [];
      }
      
      // Create fallback responses based on outcome type
      return postSurvey.questions.map(question => {
        let response = '';
        
        // For rating questions (assuming they're on a 1-5 scale)
        if (question.questionText?.toLowerCase().includes('rate') || 
            question.questionText?.toLowerCase().includes('rating') ||
            question.questionText?.toLowerCase().includes('scale') ||
            question.text?.toLowerCase().includes('rate') || 
            question.text?.toLowerCase().includes('rating') ||
            question.text?.toLowerCase().includes('scale')) {
          if (outcomeType === 'positive') {
            response = Math.floor(Math.random() * 2) + 4; // 4 or 5
          } else if (outcomeType === 'neutral') {
            response = 3; // 3
          } else {
            response = Math.floor(Math.random() * 2) + 1; // 1 or 2
          }
        } 
        // For open-ended questions
        else {
          if (outcomeType === 'positive') {
            response = "The coaching program has been transformative for both my ministry and personal life. I've gained valuable tools and insights that have helped me address my challenges effectively.";
          } else if (outcomeType === 'neutral') {
            response = "The coaching program had some helpful elements, though I'm still working through some of the same issues. There's been some improvement but not as much as I'd hoped.";
          } else {
            response = "I didn't find the coaching program particularly helpful for my situation. I'm still facing the same challenges with little improvement.";
          }
        }
        
        return {
          questionId: question.id,
          response: response
        };
      });
    } catch (innerError) {
      console.error('Error creating fallback post-survey responses:', innerError);
      return [];
    }
  }
}

/**
 * Generates a review of the coaching program
 */
async function generateReview(beneficiaryProfile, outcomeType = 'positive') {
  try {
    console.log('Generating review...');
    
    // Determine rating range based on outcome type
    let ratingRange = '';
    if (outcomeType === 'positive') {
      ratingRange = 'between 4 and 5';
    } else if (outcomeType === 'neutral') {
      ratingRange = 'between 2 and 3';
    } else if (outcomeType === 'negative') {
      ratingRange = 'between 1 and 2';
    }
    
    const prompt = `
You are helping to generate a realistic review from a pastor who has completed a coaching program.

Here is the pastor's profile:
${JSON.stringify(beneficiaryProfile, null, 2)}

Please generate a ${outcomeType} review of the pastor's experience with the coaching program. The review should:
1. Reference the specific challenges the pastor was facing before the program
2. Describe ways the coaching helped or didn't help address those challenges
3. Mention improvements or lack thereof in the pastor's ministry and personal life
4. Include emotional elements about how the pastor feels about the experience
5. End with a recommendation or warning for other pastors in similar situations

Format your response as a JSON object with these fields:
- rating: a number ${ratingRange} (integer only)
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
      
      // Create a fallback review
      let rating = 5;
      let text = '';
      let fullReview = '';
      let impact = '';
      
      if (outcomeType === 'positive') {
        rating = Math.floor(Math.random() * 2) + 4; // 4 or 5
        text = "This coaching program transformed my ministry and helped me overcome burnout.";
        fullReview = "When I started this coaching program, I was struggling with burnout and feeling isolated in my role. The coaching provided me with practical tools to address these challenges and achieve my goals of better work-life balance and improved leadership skills. I'm now a more effective pastor and have a better relationship with my congregation and family. I highly recommend this program to any pastor facing similar challenges.";
        impact = "Transformed my approach to ministry and restored my passion for serving.";
      } else if (outcomeType === 'neutral') {
        rating = 3;
        text = "The coaching program had some helpful elements, but didn't fully address my challenges.";
        fullReview = "I entered this coaching program hoping to find solutions for my burnout and leadership challenges. While some aspects of the program were helpful, I found that many of the strategies weren't tailored to my specific situation. I've made some progress in certain areas, but still struggle with the same issues in others. The program might be more beneficial for pastors in different circumstances.";
        impact = "Provided some useful tools but didn't fully resolve my ministry challenges.";
      } else {
        rating = Math.floor(Math.random() * 2) + 1; // 1 or 2
        text = "This coaching program didn't address my needs and left me feeling more frustrated.";
        fullReview = "I was hopeful that this coaching program would help me navigate the challenges I was facing in my ministry, particularly with burnout and conflict resolution. Unfortunately, the program seemed disconnected from the real-world issues pastors face. The strategies suggested were too theoretical and didn't translate well to my specific context. I'm still struggling with the same issues and now feel even more isolated. I would not recommend this program to other pastors facing similar challenges.";
        impact = "Added to my stress rather than alleviating it.";
      }
      
      return {
        rating,
        text,
        fullReview,
        impact
      };
    }
  } catch (error) {
    console.error('Error generating review:', error);
    
    // Create a fallback review
    let rating = 5;
    let text = '';
    let fullReview = '';
    let impact = '';
    
    if (outcomeType === 'positive') {
      rating = Math.floor(Math.random() * 2) + 4; // 4 or 5
      text = "This coaching program transformed my ministry and helped me overcome burnout.";
      fullReview = "When I started this coaching program, I was struggling with burnout and feeling isolated in my role. The coaching provided me with practical tools to address these challenges and achieve my goals of better work-life balance and improved leadership skills. I'm now a more effective pastor and have a better relationship with my congregation and family. I highly recommend this program to any pastor facing similar challenges.";
      impact = "Transformed my approach to ministry and restored my passion for serving.";
    } else if (outcomeType === 'neutral') {
      rating = 3;
      text = "The coaching program had some helpful elements, but didn't fully address my challenges.";
      fullReview = "I entered this coaching program hoping to find solutions for my burnout and leadership challenges. While some aspects of the program were helpful, I found that many of the strategies weren't tailored to my specific situation. I've made some progress in certain areas, but still struggle with the same issues in others. The program might be more beneficial for pastors in different circumstances.";
      impact = "Provided some useful tools but didn't fully resolve my ministry challenges.";
    } else {
      rating = Math.floor(Math.random() * 2) + 1; // 1 or 2
      text = "This coaching program didn't address my needs and left me feeling more frustrated.";
      fullReview = "I was hopeful that this coaching program would help me navigate the challenges I was facing in my ministry, particularly with burnout and conflict resolution. Unfortunately, the program seemed disconnected from the real-world issues pastors face. The strategies suggested were too theoretical and didn't translate well to my specific context. I'm still struggling with the same issues and now feel even more isolated. I would not recommend this program to other pastors facing similar challenges.";
      impact = "Added to my stress rather than alleviating it.";
    }
    
    return {
      rating,
      text,
      fullReview,
      impact
    };
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
        milestones: true
      }
    });
    
    if (!program) {
      throw new Error(`Program with ID ${programId} not found`);
    }
    
    console.log(`Found program: ${program.name}`);
    
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
    console.log(`Found pre-survey: ${preSurvey.id}`);
    console.log(`Found post-survey: ${postSurvey.id}`);
    
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
      preSurveyResponses = await generatePreSurveyResponses(preSurvey.id, beneficiaryProfile);
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
    const review = await generateReview(beneficiaryProfile, outcomeType);
    
    // Create the session data
    const sessionData = {
      beneficiaryProfile,
      programId,
      fundId: 19, // Use a valid fund ID
      userId: beneficiaryProfile.id,
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
