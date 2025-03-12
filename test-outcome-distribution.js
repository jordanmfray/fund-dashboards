// Test the outcome type distribution
const randomValues = [];
for (let i = 0; i < 1000; i++) {
  const randomValue = Math.floor(Math.random() * 100) + 1;
  let outcomeType = 'positive';
  
  if (randomValue > 70 && randomValue <= 90) {
    outcomeType = 'neutral';
  } else if (randomValue > 90) {
    outcomeType = 'negative';
  }
  
  randomValues.push({ value: randomValue, type: outcomeType });
}

const counts = { positive: 0, neutral: 0, negative: 0 };
randomValues.forEach(rv => counts[rv.type]++);

console.log('Distribution:');
console.log(`Positive: ${counts.positive} (${(counts.positive / 1000 * 100).toFixed(1)}%)`);
console.log(`Neutral: ${counts.neutral} (${(counts.neutral / 1000 * 100).toFixed(1)}%)`);
console.log(`Negative: ${counts.negative} (${(counts.negative / 1000 * 100).toFixed(1)}%)`);
console.log('Target distribution: 70% positive, 20% neutral, 10% negative'); 