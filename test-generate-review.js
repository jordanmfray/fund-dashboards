import { PrismaClient } from '@prisma/client';
import { createSyntheticSession } from './generate-session.js';

const prisma = new PrismaClient();

// Mock the generateReview function since it's not exported
async function generateReview(beneficiaryProfile, outcomeType) {
  // Determine rating range based on outcome type
  let rating = 0;
  if (outcomeType === 'positive') {
    rating = Math.random() < 0.5 ? 4 : 5; // 50% chance of 4 or 5
  } else if (outcomeType === 'neutral') {
    rating = 3; // Always 3 for neutral
  } else if (outcomeType === 'negative') {
    rating = Math.random() < 0.5 ? 1 : 2; // 50% chance of 1 or 2
  }
  
  // Generate a sample review text based on outcome type
  let text = '';
  if (outcomeType === 'positive') {
    text = 'The coaching program was transformative and helped me address my challenges effectively.';
  } else if (outcomeType === 'neutral') {
    text = 'The coaching program had some helpful elements, but I still face some of the same challenges.';
  } else if (outcomeType === 'negative') {
    text = 'The coaching program did not meet my expectations and I continue to struggle with the same issues.';
  }
  
  return { rating, text };
}

async function main() {
  try {
    // Create a sample beneficiary profile
    const beneficiaryProfile = {
      firstName: 'Test',
      lastName: 'Pastor',
      email: 'test@example.com',
      churchName: 'Test Church',
      churchSize: 100,
      role: 'Pastor',
      yearsInMinistry: 5,
      denomination: 'Non-denominational',
      location: 'Test City, Test State',
      age: 40,
      familyStatus: 'Married',
      currentChallenges: ['Challenge 1', 'Challenge 2'],
      reasonsForSeekingCoaching: ['Reason 1', 'Reason 2'],
      goalsForCoaching: ['Goal 1', 'Goal 2']
    };
    
    // Test outcome distribution
    const outcomes = ['positive', 'neutral', 'negative'];
    const counts = { positive: 0, neutral: 0, negative: 0 };
    const ratings = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    // Generate 100 reviews and count the outcomes and ratings
    for (let i = 0; i < 100; i++) {
      // Determine outcome type based on target distribution
      const randomValue = Math.floor(Math.random() * 100) + 1;
      let outcomeType = 'positive';
      
      if (randomValue > 70 && randomValue <= 90) {
        outcomeType = 'neutral';
      } else if (randomValue > 90) {
        outcomeType = 'negative';
      }
      
      counts[outcomeType]++;
      
      // Generate a review for this outcome type
      const review = await generateReview(beneficiaryProfile, outcomeType);
      ratings[review.rating]++;
    }
    
    console.log('Outcome distribution:');
    console.log(`Positive: ${counts.positive} (${(counts.positive / 100 * 100).toFixed(1)}%)`);
    console.log(`Neutral: ${counts.neutral} (${(counts.neutral / 100 * 100).toFixed(1)}%)`);
    console.log(`Negative: ${counts.negative} (${(counts.negative / 100 * 100).toFixed(1)}%)`);
    console.log('Target distribution: 70% positive, 20% neutral, 10% negative');
    
    console.log('\nRating distribution:');
    console.log(`Rating 5: ${ratings[5]} (${(ratings[5] / 100 * 100).toFixed(1)}%)`);
    console.log(`Rating 4: ${ratings[4]} (${(ratings[4] / 100 * 100).toFixed(1)}%)`);
    console.log(`Rating 3: ${ratings[3]} (${(ratings[3] / 100 * 100).toFixed(1)}%)`);
    console.log(`Rating 2: ${ratings[2]} (${(ratings[2] / 100 * 100).toFixed(1)}%)`);
    console.log(`Rating 1: ${ratings[1]} (${(ratings[1] / 100 * 100).toFixed(1)}%)`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 