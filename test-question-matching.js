import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing question matching logic...');
    
    // Get a program to test with
    const program = await prisma.program.findFirst({
      where: {
        questions: {
          some: {
            context: 'APPLICATION'
          }
        }
      },
      include: {
        questions: {
          where: {
            context: 'APPLICATION'
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    if (!program) {
      console.log('No program with application questions found');
      return;
    }
    
    console.log(`Using program: ${program.name} (ID: ${program.id})`);
    console.log(`Found ${program.questions.length} application questions`);
    
    // Display the questions
    program.questions.forEach((q, index) => {
      console.log(`Question ${index + 1}: ID=${q.id}, Order=${q.order}, Text="${q.text}"`);
    });
    
    // Sample application responses with different formats
    const sampleResponses = [
      // Format 1: Using questionId that matches a question's ID
      { questionId: program.questions[0].id, response: "Response matching by direct ID" },
      
      // Format 2: Using questionId that matches a question's order
      { questionId: program.questions[1].order, response: "Response matching by order" },
      
      // Format 3: Using questionText that matches a question's text
      { questionText: program.questions[2].text, response: "Response matching by text" },
      
      // Format 4: No matching properties, will use position-based matching
      { response: "Response with no matching properties" }
    ];
    
    console.log('\nTesting matching logic with sample responses:');
    
    // Simulate our matching logic
    for (const response of sampleResponses) {
      console.log(`\nProcessing response: ${JSON.stringify(response)}`);
      
      // Try multiple strategies to match questions with responses
      let matchingQuestion = null;
      let matchMethod = '';
      
      // Strategy 1: If the response has a questionText property, try to match by text
      if (response.questionText) {
        matchingQuestion = program.questions.find(q => 
          q.text.toLowerCase().includes(response.questionText.toLowerCase()) ||
          response.questionText.toLowerCase().includes(q.text.toLowerCase())
        );
        
        if (matchingQuestion) {
          matchMethod = 'text similarity';
        }
      }
      
      // Strategy 2: If the response has a questionId property and it's a number, try to find by ID
      if (!matchingQuestion && response.questionId && typeof response.questionId === 'number') {
        // First try direct ID match
        matchingQuestion = program.questions.find(q => q.id === response.questionId);
        
        if (matchingQuestion) {
          matchMethod = 'direct ID match';
        } else {
          // If that fails, try matching by order
          matchingQuestion = program.questions.find(q => q.order === response.questionId);
          
          if (matchingQuestion) {
            matchMethod = 'order match';
          }
        }
      }
      
      // Strategy 3: Position-based matching as a fallback
      if (!matchingQuestion) {
        const responseIndex = sampleResponses.indexOf(response);
        // If we have enough questions, use the same index, otherwise use modulo
        const questionIndex = responseIndex % program.questions.length;
        matchingQuestion = program.questions[questionIndex];
        
        if (matchingQuestion) {
          matchMethod = `position-based (index ${responseIndex})`;
        }
      }
      
      if (matchingQuestion) {
        console.log(`✅ Matched to question ID ${matchingQuestion.id} using ${matchMethod}`);
        console.log(`   Question text: "${matchingQuestion.text}"`);
      } else {
        console.log(`❌ Failed to find a matching question`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 