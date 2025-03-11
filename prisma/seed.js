import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Function to create a program with all its components
async function createProgram(programData, fundIds, userIds) {
  console.log(`Creating program: ${programData.name}`);
  
  // Create the program
  const program = await prisma.program.create({
    data: {
      name: programData.name,
      description: programData.description,
      applicationTemplate: programData.applicationTemplate || null,
      funds: {
        connect: fundIds.map(id => ({ id }))
      }
    }
  });
  
  console.log(`Created program: ${program.name} (ID: ${program.id})`);
  
  // Create milestones
  if (programData.milestones && programData.milestones.length > 0) {
    console.log(`Creating ${programData.milestones.length} milestones for program: ${program.name}`);
    
    for (let i = 0; i < programData.milestones.length; i++) {
      const milestoneData = programData.milestones[i];
      await prisma.milestone.create({
        data: {
          title: milestoneData.title,
          description: milestoneData.description,
          order: i + 1,
          programId: program.id
        }
      });
    }
  }
  
  return program;
}

async function main() {
  console.log('Starting database seeding with programs and surveys...');

  // Clear existing data in the correct order (respecting foreign key constraints)
  console.log('Clearing existing data...');
  
  // First, clear models with foreign keys to other models
  await prisma.questionResponse.deleteMany({});
  await prisma.surveyResponse.deleteMany({});
  await prisma.milestoneReflection.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.application.deleteMany({});
  
  // Then clear models that are referenced by the above
  await prisma.question.deleteMany({});
  await prisma.survey.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.session.deleteMany({});
  
  // Finally clear the base models
  await prisma.program.deleteMany({});
  await prisma.fund.deleteMany({});
  await prisma.user.deleteMany({});

  // Create users for testing
  console.log('Creating users...');
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin User"
    }
  });
  console.log(`Created user: ${adminUser.name}`);
  
  const fundManager = await prisma.user.create({
    data: {
      name: "Fund Manager"
    }
  });
  console.log(`Created user: ${fundManager.name}`);
  
  const regularUser = await prisma.user.create({
    data: {
      name: "Regular User"
    }
  });
  console.log(`Created user: ${regularUser.name}`);

  // Create funds
  console.log('Creating fund...');
  
  const fund = await prisma.fund.create({
    data: {
      name: "LeaderCare",
      description: "By working together as a collaboration of over 40 organizations, we demystify the landscape of available help and leverage informed generosity, making it easier for leaders to take actionable steps toward flourishing in ministry. Our dimensions of flourishing include: Spiritual, Relational, Mental/Physical, Financial, and Vocational. We enable authenticated philanthropy to drive real-world flourishing outcomes for Christian leaders. Through AWARENESS, COLLABORATION, and FUNDING we seek to reverse the current trends around deep isolation and burnout in Christian Leaders.",
      totalAmount: 2500000.00,
    }
  });
  console.log(`Created fund: ${fund.name}`);
  
  // Create the programs provided by the user
  console.log('Creating programs...');
  
  // Program 1: Care & Coaching for Pastors
  const program1Data = {
    name: "Care & Coaching for Pastors, Church Leaders, and Spouses",
    description: "Our coaches have experienced the joys and difficulties of ministry and will help you make progress and gain perspective on the personal and relational challenges you face serving and leading others.",
    applicationTemplate: {
      questions: [
        {
          questionText: "What is your full name?",
          responseType: "short_text"
        },
        {
          questionText: "What is the name of your church and your current role?",
          responseType: "short_text"
        },
        {
          questionText: "How many years have you been in ministry?",
          responseType: "multiple_choice",
          options: [
            "Less than 5 years",
            "5-10 years",
            "11-20 years",
            "More than 20 years"
          ]
        },
        {
          questionText: "What is your biggest leadership challenge right now?",
          responseType: "long_text"
        },
        {
          questionText: "What are your top 2-3 goals for this coaching program?",
          responseType: "long_text"
        },
        {
          questionText: "Do you have any scheduling constraints or preferred session times?",
          responseType: "short_text"
        }
      ]
    },
    milestones: [
      {
        title: "First Coaching Session Completed",
        description: "Mark as complete when the beneficiary has completed the first session.",
        paymentAmount: 150.00,
        reflection: "How was your first coaching session? Did it meet your expectations?"
      },
      {
        title: "Second Coaching Session Completed",
        description: "Mark as complete when the beneficiary has completed the second session.",
        paymentAmount: 150.00,
        reflection: "How was your second coaching session? Are you making the progress you hoped to make?"
      },
      {
        title: "Third Coaching Session Completed",
        description: "Mark as complete when the beneficiary has completed the third session.",
        paymentAmount: 150.00,
        reflection: "How was your third coaching session? Do you feel like you need more sessions or are do you feel confident on your own?"
      }
    ]
  };
  
  // Program 2: Strengthening Our Souls
  const program2Data = {
    name: "Strengthening Our Souls",
    description: "Strengthening Our Souls is a self-paced journey through frameworks and practices that will provide the foundation for leading your life and ministry from a grounded, peace-filled place despite surrounding circumstances.",
    applicationTemplate: {
      questions: [
        {
          questionText: "What is your full name?",
          responseType: "short_text"
        },
        {
          questionText: "What is the name of your church or organization and your role?",
          responseType: "short_text"
        },
        {
          questionText: "What drew you to this program? What do you hope to gain from it?",
          responseType: "long_text"
        },
        {
          questionText: "How would you describe your current level of soul health (peace, rest, and spiritual well-being)?",
          responseType: "multiple_choice",
          options: [
            "Thriving – I feel deeply connected and at peace",
            "Stable – I have a good rhythm, but there is room to grow",
            "Struggling – I feel drained and need renewal",
            "Uncertain – I'm not sure how to gauge my soul health"
          ]
        },
        {
          questionText: "What are the biggest challenges that make it difficult for you to lead from a place of peace and grounding?",
          responseType: "long_text"
        },
        {
          questionText: "Do you have any specific expectations or hopes for how this program might impact your life and ministry?",
          responseType: "long_text"
        }
      ]
    },
    milestones: [
      {
        title: "Onboard into Strengthening Our Souls",
        description: "Sign up for a soul care account.",
        paymentAmount: 25.00,
        reflection: "What motivated you to sign up for this soul care journey? What do you hope to gain from this experience?"
      },
      {
        title: "Complete: Soul Drives Everything",
        description: "Complete this within the course.",
        paymentAmount: 25.00,
        reflection: "Reflect on how your inner well-being influences your daily life. In what ways have you noticed your soul impacting your decisions and interactions?"
      },
      {
        title: "Complete: Soul & Speed",
        description: "Complete this within the course.",
        paymentAmount: 25.00,
        reflection: "How does the pace of your life affect your soul? What adjustments, if any, do you feel prompted to make to maintain a healthier rhythm?"
      },
      {
        title: "Complete: Power of Relationships",
        description: "Complete this within the course.",
        paymentAmount: 25.00,
        reflection: "Think about a meaningful relationship in your life. How does it nourish your soul? What steps can you take to deepen your connections with others?"
      },
      {
        title: "Complete: Returning to Joy",
        description: "Complete this within the course.",
        paymentAmount: 25.00,
        reflection: "What does joy mean to you? Reflect on a recent moment of joy and how you can cultivate more of it in your daily life."
      },
      {
        title: "Complete: Restoring Life",
        description: "Complete this within the course.",
        paymentAmount: 25.00,
        reflection: "Consider an area of your life that needs restoration. What small steps can you take toward renewal and healing?"
      },
      {
        title: "Complete: Rest is a Weapon",
        description: "Complete this within the course.",
        paymentAmount: 25.00,
        reflection: "How does true rest empower you? What barriers keep you from prioritizing rest, and how can you overcome them?"
      },
      {
        title: "Day Retreat and Soul Care Plan",
        description: "",
        paymentAmount: 25.00,
        reflection: "Looking back on this experience, what key insights have you gained? How will you integrate soul care into your daily life moving forward?"
      }
    ]
  };
  
  // Program 3: Ministry Couples Retreat
  const program3Data = {
    name: "Ministry Couples Retreat",
    description: "Quite often, couples in ministry become so involved in giving to others that their personal lives are neglected. They miss out on the first part of the biblical principle found in Matthew 10:8, 'Freely you have received, freely give.' A Galatians 6:6 Retreat is a time of personal renewal and encouragement for ministry couples...a time to 'freely receive' God's good things for your marriage, family, and ministry. Galatians 6:6 Retreats are 3-day/2-night retreats for pastoral couples in full-time ministry.",
    applicationTemplate: {
      questions: [
        {
          questionText: "What are your full names (Pastor & Spouse)?",
          responseType: "short_text"
        },
        {
          questionText: "What is the name of your church and your role?",
          responseType: "short_text"
        },
        {
          questionText: "How many years have you been married?",
          responseType: "multiple_choice",
          options: [
            "Less than 5 years",
            "5-10 years",
            "11-20 years",
            "More than 20 years"
          ]
        },
        {
          questionText: "What is one area of your marriage you hope to strengthen during this retreat?",
          responseType: "long_text"
        },
        {
          questionText: "Have you attended a marriage retreat before? If so, what was your experience?",
          responseType: "long_text"
        },
        {
          questionText: "Do you have any dietary restrictions or special accommodations we should be aware of?",
          responseType: "short_text"
        }
      ]
    },
    milestones: [
      {
        title: "Send Retreat Details",
        description: "Send details to this applicant after approving their scholarship.",
        paymentAmount: 0.00,
        reflection: ""
      },
      {
        title: "Attend Retreat",
        description: "Travel to the location of the retreat and have a great time!",
        paymentAmount: 900.00,
        reflection: "How did the retreat impact your marriage? What surprised you? What has your biggest takeway?"
      }
    ]
  };
  
  // Create the programs
  const fundIds = [fund.id];
  const userIds = [regularUser.id];
  
  const program1 = await createProgram(program1Data, fundIds, userIds);
  const program2 = await createProgram(program2Data, fundIds, userIds);
  const program3 = await createProgram(program3Data, fundIds, userIds);
  
  // Create shared surveys
  console.log('Creating shared surveys for all programs...');
  
  // Create a single pre-survey (Flourishing Pulse)
  console.log('Creating Flourishing Pulse pre-survey...');
  const preSurvey = await prisma.survey.create({
    data: {
      title: "Flourishing Pulse",
      description: "A comprehensive assessment of human flourishing developed by the Human Flourishing Program",
      type: 'PRE'
    }
  });
  
  // Create a single post-survey (Harvard Flourishing Index)
  console.log('Creating Harvard Flourishing Index post-survey...');
  const postSurvey = await prisma.survey.create({
    data: {
      title: "Harvard Flourishing Index - Post Survey",
      description: "Compared to before participating in this experience, how much growth have you experienced in the following areas?",
      type: 'POST'
    }
  });
  
  // Associate surveys with all programs
  console.log('Associating surveys with programs...');
  await prisma.program.update({
    where: { id: program1.id },
    data: {
      surveys: {
        connect: [{ id: preSurvey.id }, { id: postSurvey.id }]
      }
    }
  });
  
  await prisma.program.update({
    where: { id: program2.id },
    data: {
      surveys: {
        connect: [{ id: preSurvey.id }, { id: postSurvey.id }]
      }
    }
  });
  
  await prisma.program.update({
    where: { id: program3.id },
    data: {
      surveys: {
        connect: [{ id: preSurvey.id }, { id: postSurvey.id }]
      }
    }
  });
  
  // Create pre-survey questions (Flourishing Pulse)
  console.log('Creating questions for Flourishing Pulse survey...');
  const preQuestions = [
    {
      text: "Overall, how satisfied are you with life as a whole these days?",
      type: "RATING",
      options: [
        "0 - Not Satisfied at All",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Completely Satisfied"
      ],
      required: true,
      order: 1
    },
    {
      text: "In general, how happy or unhappy do you usually feel?",
      type: "RATING",
      options: [
        "0 - Extremely Unhappy",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Extremely Happy"
      ],
      required: true,
      order: 2
    },
    {
      text: "In general, how would you rate your physical health?",
      type: "RATING",
      options: [
        "0 - Poor",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Excellent"
      ],
      required: true,
      order: 3
    },
    {
      text: "How would you rate your overall mental health?",
      type: "RATING",
      options: [
        "0 - Poor",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Excellent"
      ],
      required: true,
      order: 4
    },
    {
      text: "Overall, to what extent do you feel the things you do in your life are worthwhile?",
      type: "RATING",
      options: [
        "0 - Not at all worthwhile",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Completely worthwhile"
      ],
      required: true,
      order: 5
    },
    {
      text: "I understand my purpose in life.",
      type: "RATING",
      options: [
        "0 - Disagree Strongly",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Agree Strongly"
      ],
      required: true,
      order: 6
    },
    {
      text: "I always act to promote good in all circumstances, even in difficult and challenging situations.",
      type: "RATING",
      options: [
        "0 - Not True of Me",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Completely True of Me"
      ],
      required: true,
      order: 7
    },
    {
      text: "I am always able to give up some happiness now for greater happiness later.",
      type: "RATING",
      options: [
        "0 - Not True of Me",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Completely True of Me"
      ],
      required: true,
      order: 8
    },
    {
      text: "I am content with my friendships and relationships.",
      type: "RATING",
      options: [
        "0 - Disagree Strongly",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Agree Strongly"
      ],
      required: true,
      order: 9
    },
    {
      text: "My relationships are as satisfying as I would want them to be.",
      type: "RATING",
      options: [
        "0 - Disagree Strongly",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Agree Strongly"
      ],
      required: true,
      order: 10
    },
    {
      text: "How often do you worry about being able to meet normal monthly living expenses?",
      type: "RATING",
      options: [
        "0 - Worry all of the time",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Do not ever worry"
      ],
      required: true,
      order: 11
    },
    {
      text: "How often do you worry about safety, food, or housing?",
      type: "RATING",
      options: [
        "0 - Worry all of the time",
        "1", "2", "3", "4", "5", "6", "7", "8", "9",
        "10 - Do not ever worry"
      ],
      required: true,
      order: 12
    },
    {
      text: "Which area(s) of your flourishing do you hope this experience will help you grow in?",
      type: "CHECKBOX",
      options: [
        "Happiness and Life Satisfaction",
        "Mental and Physical Health",
        "Meaning and Purpose",
        "Character and Virtue",
        "Close Social Relationships",
        "Financial and Material Stability"
      ],
      required: true,
      order: 13
    },
    {
      text: "How do you hope to grow from this experience? Please share your aspirations or expectations.",
      type: "TEXT",
      required: true,
      order: 14
    }
  ];
  
  // Create the pre-survey questions
  for (const questionData of preQuestions) {
    await prisma.question.create({
      data: {
        text: questionData.text,
        type: questionData.type,
        options: questionData.options,
        required: questionData.required,
        order: questionData.order,
        surveyId: preSurvey.id
      }
    });
  }
  console.log(`Created ${preQuestions.length} questions for Flourishing Pulse survey`);
  
  // Create post-survey questions (Harvard Flourishing Index)
  console.log('Creating questions for Harvard Flourishing Index survey...');
  const postQuestions = [
    {
      text: "How much has this experience contributed to improvements in your overall satisfaction with life?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 1
    },
    {
      text: "How much has this experience contributed to you feeling happier in general?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 2
    },
    {
      text: "How much has this experience contributed to improvements in your physical health?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 3
    },
    {
      text: "How much has this experience contributed to improvements in your mental health?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 4
    },
    {
      text: "How much has this experience contributed to you finding more worth in the things you do?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 5
    },
    {
      text: "How much has this experience contributed to your understanding of your life's purpose?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 6
    },
    {
      text: "How much has this experience helped you act to promote good, even in challenging situations?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 7
    },
    {
      text: "How much has this experience helped you prioritize long-term happiness over short-term happiness?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 8
    },
    {
      text: "How much has this experience contributed to your contentment with your friendships and relationships?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 9
    },
    {
      text: "How much has this experience contributed to the satisfaction you feel in your relationships?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 10
    },
    {
      text: "How much has this experience helped reduce your worry about meeting monthly living expenses?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 11
    },
    {
      text: "How much has this experience helped reduce your worry about safety, food, or housing?",
      type: "MULTIPLE_CHOICE",
      options: [
        "None – This experience did not focus on this area",
        "None – In spite of the experience focusing on this area",
        "A little",
        "A lot"
      ],
      required: true,
      order: 12
    },
    {
      text: "What private message would you like to share with the organizer of this experience about how it helped you grow? Please feel free to share any insights, reflections, or feedback on how this has impacted you. You will have an opportunity to share a public review of this program later.",
      type: "TEXT",
      required: true,
      order: 13
    }
  ];
  
  // Create the post-survey questions
  for (const questionData of postQuestions) {
    await prisma.question.create({
      data: {
        text: questionData.text,
        type: questionData.type,
        options: questionData.options,
        required: questionData.required,
        order: questionData.order,
        surveyId: postSurvey.id
      }
    });
  }
  console.log(`Created ${postQuestions.length} questions for Harvard Flourishing Index survey`);

  // Create sessions for each program
  console.log('Creating sessions for programs...');
  
  // Get users for sessions
  const users = await prisma.user.findMany({
    where: {
      name: {
        in: ['Regular User']
      }
    }
  });
  
  // Create sessions for Program 1: Care & Coaching for Pastors
  console.log('Creating sessions for Care & Coaching for Pastors...');
  
  // Session 1 - Completed with all milestones
  const session1 = await prisma.session.create({
    data: {
      title: "Coaching for Pastor John",
      status: "COMPLETED",
      outcomeData: { 
        coachingHours: 3,
        goalsAchieved: true,
        satisfactionRating: 9
      },
      fundId: fund.id,
      programId: program1.id,
      userId: users[0].id
    }
  });
  console.log(`Created session: ${session1.title}`);
  
  // Create application for session 1
  await prisma.application.create({
    data: {
      responses: {
        "What is your full name?": "John Anderson",
        "What is the name of your church and your current role?": "Grace Community Church, Lead Pastor",
        "How many years have you been in ministry?": "11-20 years",
        "What is your biggest leadership challenge right now?": "Balancing church growth with maintaining a healthy staff culture. We've grown rapidly in the past two years, and I'm struggling to keep up with the leadership demands.",
        "What are your top 2-3 goals for this coaching program?": "1. Develop a sustainable leadership model for our growing church\n2. Improve my work-life balance\n3. Create better systems for staff development",
        "Do you have any scheduling constraints or preferred session times?": "Prefer mornings, Mondays or Wednesdays"
      },
      status: "APPROVED",
      sessionId: session1.id,
      userId: users[0].id
    }
  });
  console.log(`Created application for session: ${session1.title}`);
  
  // Create milestone reflections for session 1
  const program1Milestones = await prisma.milestone.findMany({
    where: { programId: program1.id },
    orderBy: { order: 'asc' }
  });
  
  for (const milestone of program1Milestones) {
    await prisma.milestoneReflection.create({
      data: {
        content: `Completed milestone: ${milestone.title}. This was a valuable experience that helped me gain clarity on my leadership challenges.`,
        milestoneId: milestone.id,
        sessionId: session1.id,
        userId: users[0].id
      }
    });
  }
  console.log(`Created milestone reflections for session: ${session1.title}`);
  
  // Create survey responses for session 1
  const preSurveyResponse = await prisma.surveyResponse.create({
    data: {
      surveyId: preSurvey.id,
      sessionId: session1.id,
      userId: users[0].id
    }
  });
  
  const preQuestionsList = await prisma.question.findMany({
    where: { surveyId: preSurvey.id },
    orderBy: { order: 'asc' }
  });
  
  for (const question of preQuestionsList) {
    let response;
    if (question.type === 'RATING') {
      response = Math.floor(Math.random() * 6) + 5; // Random number between 5-10
    } else if (question.type === 'CHECKBOX') {
      response = [question.options[0], question.options[2]]; // Select two random options
    } else if (question.type === 'TEXT') {
      response = "I hope to grow in my leadership capacity and find better balance in my ministry life.";
    } else {
      response = question.options ? question.options[Math.floor(Math.random() * question.options.length)] : "N/A";
    }
    
    await prisma.questionResponse.create({
      data: {
        answer: JSON.stringify(response),
        questionId: question.id,
        surveyResponseId: preSurveyResponse.id
      }
    });
  }
  console.log(`Created pre-survey response for session: ${session1.title}`);
  
  const postSurveyResponse = await prisma.surveyResponse.create({
    data: {
      surveyId: postSurvey.id,
      sessionId: session1.id,
      userId: users[0].id
    }
  });
  
  const postQuestionsList = await prisma.question.findMany({
    where: { surveyId: postSurvey.id },
    orderBy: { order: 'asc' }
  });
  
  for (const question of postQuestionsList) {
    let response;
    if (question.type === 'MULTIPLE_CHOICE') {
      response = "A lot"; // Most positive response
    } else if (question.type === 'TEXT') {
      response = "This coaching program has been transformative for my ministry. I've gained valuable insights and practical tools that I'm already implementing in my church.";
    } else {
      response = question.options ? question.options[Math.floor(Math.random() * question.options.length)] : "N/A";
    }
    
    await prisma.questionResponse.create({
      data: {
        answer: JSON.stringify(response),
        questionId: question.id,
        surveyResponseId: postSurveyResponse.id
      }
    });
  }
  console.log(`Created post-survey response for session: ${session1.title}`);
  
  // Create a review for session 1
  await prisma.review.create({
    data: {
      content: "The coaching program exceeded my expectations. My coach was insightful, challenging, and supportive. I've gained clarity on my leadership challenges and have practical steps to address them.",
      sessionId: session1.id,
      userId: users[0].id
    }
  });
  console.log(`Created review for session: ${session1.title}`);
  
  // Session 2 - In Progress for Program 2: Strengthening Our Souls
  console.log('Creating sessions for Strengthening Our Souls...');
  
  const session2 = await prisma.session.create({
    data: {
      title: "Soul Care for Sarah",
      status: "IN_PROGRESS",
      outcomeData: { 
        modulesCompleted: 3,
        journalEntriesSubmitted: 5,
        practiceMinutes: 120
      },
      fundId: fund.id,
      programId: program2.id,
      userId: users[0].id
    }
  });
  console.log(`Created session: ${session2.title}`);
  
  // Create application for session 2
  await prisma.application.create({
    data: {
      responses: {
        "What is your full name?": "Sarah Johnson",
        "What is the name of your church or organization and your role?": "Hope Fellowship, Worship Pastor",
        "What drew you to this program? What do you hope to gain from it?": "I've been feeling spiritually and emotionally drained after several years of intense ministry. I'm hoping to reconnect with God in a deeper way and establish sustainable rhythms for my soul care.",
        "How would you describe your current level of soul health (peace, rest, and spiritual well-being)?": "Struggling – I feel drained and need renewal",
        "What are the biggest challenges that make it difficult for you to lead from a place of peace and grounding?": "Constant demands from others, difficulty setting boundaries, and a tendency to overcommit. I also struggle with comparing myself to other worship leaders and feeling inadequate.",
        "Do you have any specific expectations or hopes for how this program might impact your life and ministry?": "I hope to develop practical rhythms of rest and renewal that I can maintain even during busy seasons. I also want to reconnect with the joy of ministry that I've lost somewhere along the way."
      },
      status: "APPROVED",
      sessionId: session2.id,
      userId: users[0].id
    }
  });
  console.log(`Created application for session: ${session2.title}`);
  
  // Create milestone reflections for session 2 (only first 3 completed)
  const program2Milestones = await prisma.milestone.findMany({
    where: { programId: program2.id },
    orderBy: { order: 'asc' }
  });
  
  for (let i = 0; i < 3; i++) {
    await prisma.milestoneReflection.create({
      data: {
        content: `Completed milestone: ${program2Milestones[i].title}. I'm learning to slow down and be more intentional about my spiritual practices.`,
        milestoneId: program2Milestones[i].id,
        sessionId: session2.id,
        userId: users[0].id
      }
    });
  }
  console.log(`Created milestone reflections for session: ${session2.title}`);
  
  // Create pre-survey response for session 2
  const preSurveyResponse2 = await prisma.surveyResponse.create({
    data: {
      surveyId: preSurvey.id,
      sessionId: session2.id,
      userId: users[0].id
    }
  });
  
  for (const question of preQuestionsList) {
    let response;
    if (question.type === 'RATING') {
      response = Math.floor(Math.random() * 4) + 3; // Random number between 3-6 (lower scores)
    } else if (question.type === 'CHECKBOX') {
      response = [question.options[1], question.options[3]]; // Select two random options
    } else if (question.type === 'TEXT') {
      response = "I hope to find rest for my soul and reconnect with God in a meaningful way.";
    } else {
      response = question.options ? question.options[Math.floor(Math.random() * question.options.length)] : "N/A";
    }
    
    await prisma.questionResponse.create({
      data: {
        answer: JSON.stringify(response),
        questionId: question.id,
        surveyResponseId: preSurveyResponse2.id
      }
    });
  }
  console.log(`Created pre-survey response for session: ${session2.title}`);
  
  // Session 3 - Pending Application for Program 3: Ministry Couples Retreat
  console.log('Creating sessions for Ministry Couples Retreat...');
  
  const session3 = await prisma.session.create({
    data: {
      title: "Retreat for Michael & Lisa",
      status: "IN_PROGRESS",
      outcomeData: { 
        applicationSubmitted: true,
        reviewDate: new Date().toISOString()
      },
      fundId: fund.id,
      programId: program3.id,
      userId: users[0].id
    }
  });
  console.log(`Created session: ${session3.title}`);
  
  // Create application for session 3
  await prisma.application.create({
    data: {
      responses: {
        "What are your full names (Pastor & Spouse)?": "Michael & Lisa Thompson",
        "What is the name of your church and your role?": "New Life Church, Youth Pastor",
        "How many years have you been married?": "5-10 years",
        "What is one area of your marriage you hope to strengthen during this retreat?": "Communication, especially around ministry boundaries and family time. We've struggled to balance the demands of youth ministry with our family life.",
        "Have you attended a marriage retreat before? If so, what was your experience?": "We attended one retreat 3 years ago. It was helpful but focused more on general marriage principles than the specific challenges of ministry couples.",
        "Do you have any dietary restrictions or special accommodations we should be aware of?": "Lisa is gluten-free, and Michael has a peanut allergy."
      },
      status: "PENDING",
      sessionId: session3.id,
      userId: users[0].id
    }
  });
  console.log(`Created application for session: ${session3.title}`);

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 