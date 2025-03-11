import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({apiKey: OPENAI_API_KEY});

async function generateBeneficiaryProfile() {
  const prompt = `Create a detailed profile of a pastor who would benefit from a coaching program. 
Include their name, age, church details, specific challenges they face in ministry, 
why they are seeking coaching, and what they hope to achieve. 
Make it realistic and detailed, focusing on burnout, leadership challenges, and personal struggles. 
Format as JSON with fields for name, age, church, role, yearsInMinistry, familyStatus, 
currentChallenges (array), reasonForSeeking (array), and goalsForCoaching (array).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates realistic profiles of pastors seeking coaching." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    console.log(response.choices[0].message.content);
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating beneficiary profile:', error);
  }
}

generateBeneficiaryProfile(); 