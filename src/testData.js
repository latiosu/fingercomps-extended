// Test data generation
export const generateTestData = () => {
  const testCompetitors = {};
  const testScores = {};

  // Generate 10 competitors
  for (let i = 1; i <= 10; i++) {
    testCompetitors[i] = {
      name: `Test User ${i}`,
      category: "A",
      competitorNo: i
    };

    // Assign varying number of scores to create a spread
    const numScores = Math.max(1, Math.min(5, Math.floor(Math.random() * 6))); // 1-5 scores
    testScores[i] = [];

    for (let j = 1; j <= numScores; j++) {
      testScores[i].push({
        climbNo: j,
        category: "A",
        flashed: Math.random() > 0.5, // 50% chance of flash
        topped: true,
        competitorNo: i,
        createdAt: new Date().toISOString()
      });
    }
  }

  const testCategories = {
    "A": {
      name: "Category A",
      code: "A",
      flashExtraPoints: 2,
      pumpfestTopScores: 5 // Increased to show more scores
    }
  };

  const testProblems = {};
  // Generate 5 problems with varying scores
  for (let i = 1; i <= 5; i++) {
    testProblems[i] = {
      score: 10 + i * 2, // Scores: 12, 14, 16, 18, 20
      station: i.toString(),
      marking: `Problem ${i}`,
      climbNo: i
    };
  }

  return {
    competitors: testCompetitors,
    categories: testCategories,
    scores: testScores,
    problems: testProblems,
    selectedCategory: "Category A",
    selectedCategoryCode: "A"
  };
};

// Keep track of the highest climb number used
let nextClimbNo = 3; // Start after initial test data climbs (1,2)

// Simulate score changes
export const generateNewScore = (competitorNo) => {
  const climbNo = nextClimbNo++;

  // Create new problem for this climb
  const newProblem = {
    score: Math.floor(Math.random() * 10) + 10, // Random score between 10-20
    station: climbNo.toString(),
    marking: `Problem ${climbNo}`,
    climbNo: climbNo
  };

  return {
    score: newProblem,
    submission: {
      climbNo: climbNo,
      category: "A",
      flashed: true,
      topped: true,
      competitorNo: competitorNo,
      createdAt: new Date().toISOString()
    }
  };
};