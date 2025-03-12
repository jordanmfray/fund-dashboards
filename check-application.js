import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking application with ID 5...');
    
    const application = await prisma.application.findUnique({
      where: { id: 5 },
      include: {
        questionResponses: {
          include: {
            question: true
          }
        }
      }
    });
    
    if (!application) {
      console.log('Application not found');
      return;
    }
    
    console.log('Application:');
    console.log(`ID: ${application.id}`);
    console.log(`Session ID: ${application.sessionId}`);
    console.log(`Status: ${application.status}`);
    console.log(`Submitted At: ${application.submittedAt}`);
    
    console.log('\nQuestion Responses:');
    if (application.questionResponses.length > 0) {
      application.questionResponses.forEach(qr => {
        console.log(`\nQuestion ID: ${qr.questionId}`);
        console.log(`Question Text: ${qr.question.text}`);
        console.log(`Answer: ${JSON.stringify(qr.answer)}`);
      });
    } else {
      console.log('No question responses found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 