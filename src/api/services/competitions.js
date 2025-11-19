import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where
} from "firebase/firestore";
import { twoMonthsAgoISOString } from "../../utils/dateFormatters";
import { db, fetchAllData, isoStringToTimestamp, timestampToISOString } from "../client";

/**
 * Fetches all competitions modified in the last two months
 * @returns {Promise<Array>} Array of competition objects
 */
export const getCompetitions = async () => {
  try {
    // Create a timestamp for two months ago
    const twoMonthsAgo = isoStringToTimestamp(twoMonthsAgoISOString());

    // Create a query to get competitions modified in the last two months
    const competitionsQuery = query(
      collection(db, "competitions"),
      where("modified", ">=", twoMonthsAgo),
      orderBy("modified", "desc"),
      orderBy("__name__", "desc")
    );

    // Execute the query
    const querySnapshot = await getDocs(competitionsQuery);

    // Process the results and fetch links for each competition
    const compsAndLinks = await Promise.all(
      querySnapshot.docs.map(async (docSnapshot) => {
        const compId = docSnapshot.id;
        const compData = docSnapshot.data();

        // Fetch links for this competition
        const linksQuery = query(collection(db, `competitions/${compId}/links`));
        const linksSnapshot = await getDocs(linksQuery);

        // Convert links to the expected format
        const links = linksSnapshot.docs.map(linkDoc => ({
          id: linkDoc.id,
          ...linkDoc.data()
        }));

        // Return the competition with its links
        return {
          document: {
            name: `competitions/${compId}`,
            fields: Object.entries(compData).reduce((acc, [key, value]) => {
              // Convert values to the format expected by the rest of the app
              if (value instanceof Timestamp) {
                acc[key] = { timestampValue: timestampToISOString(value) };
              } else if (typeof value === 'string') {
                acc[key] = { stringValue: value };
              } else if (typeof value === 'number') {
                acc[key] = { integerValue: value.toString() };
              } else if (typeof value === 'boolean') {
                acc[key] = { booleanValue: value };
              }
              return acc;
            }, {}),
            links: links.length > 0 ? links : undefined
          }
        };
      })
    );

    // Filter competitions to only include those with links
    return compsAndLinks.filter(item => item.document?.links) || [];
  } catch (error) {
    console.error("Error fetching competitions:", error);
    throw error;
  }
};

/**
 * Fetches all data for a specific competition
 * @param {string} compId - Competition ID
 * @returns {Promise<Object>} Object containing categories, competitors, scores, and problems
 */
export const getCompetitionData = async (compId) => {
  try {
    const [categories, competitors, qualificationScores, problems] = await Promise.all([
      getCategories(compId),
      getCompetitors(compId),
      getQualificationScores(compId),
      getProblems(compId),
    ]);

    return {
      categories,
      competitors,
      qualificationScores,
      problems
    };
  } catch (error) {
    console.error("Error fetching competition data:", error);
    throw error;
  }
};

/**
 * Fetches categories for a specific competition
 * @param {string} compId - Competition ID
 * @returns {Promise<Object>} Object containing category data
 */
export const getCategories = async (compId) => {
  try {
    const collectionPath = `competitions/${compId}/categories`;
    const documents = await fetchAllData(collectionPath);

    return documents.reduce((acc, item) => {
      // Convert the document to the format expected by the rest of the app
      acc[item.code] = {
        name: item.name,
        code: item.code,
        disableFlash: item.disableFlash,
        flashExtraPoints: item.flashExtraPoints,
        scalePoints: item.scalePoints,
        pumpfestTopScores: item.pumpfestTopScores,
        sortBy: item.sortBy,
        hasFinals: item.finalFormat !== "",
        finalsBoulderCount: item.numberOfClimbsworldCup ?? 4,
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

/**
 * Fetches competitors for a specific competition
 * @param {string} compId - Competition ID
 * @returns {Promise<Object>} Object containing competitor data
 */
export const getCompetitors = async (compId) => {
  try {
    const collectionPath = `competitions/${compId}/competitors`;
    const documents = await fetchAllData(collectionPath);

    return documents.reduce((acc, item) => {
      // Convert the document to the format expected by the rest of the app
      acc[item.competitorNo] = {
        name: `${item.firstName.trim()} ${item.lastName.trim()}`,
        category: item.category,
        competitorNo: item.competitorNo,
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching competitors:", error);
    throw error;
  }
};

/**
 * Fetches scores for a specific competition
 * @param {string} compId - Competition ID
 * @returns {Promise<Object>} Object containing score data
 */
export const getQualificationScores = async (compId) => {
  try {
    const collectionPath = `competitions/${compId}/qualificationScores`;
    const documents = await fetchAllData(collectionPath);

    return documents.reduce((acc, item) => {
      const competitorNo = item.competitorNo;
      acc[competitorNo] = acc[competitorNo] || [];
      acc[competitorNo].push({
        climbNo: item.climbNo,
        category: item.category,
        flashed: item.flash,
        topped: item.topped,
        competitorNo: competitorNo,
        createdAt: timestampToISOString(item.created),
        ...item
      });
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching qualification scores:", error);
    throw error;
  }
};

/**
 * Fetches scores for a specific competition
 * @param {string} compId - Competition ID
 * @returns {Promise<Object>} Object containing score data
 */
export const getFinalsScores = async (compId) => {
  try {
    const collectionPath = `competitions/${compId}/finalScores`;
    const documents = await fetchAllData(collectionPath);

    // TODO: Handle variable number of finals problems
    return documents.reduce((acc, item) => {
      const competitorNo = item.competitorNo;
      acc[competitorNo] = {
        climb1: {
          attemptsToZone: item.attemptsZone1,
          attemptsToTop: item.attemptsTop1,
          hasZone: item.zone1,
          hasTop: item.topped1,
        },
        climb2: {
          attemptsToZone: item.attemptsZone2,
          attemptsToTop: item.attemptsTop2,
          hasZone: item.zone2,
          hasTop: item.topped2,
        },
        climb3: {
          attemptsToZone: item.attemptsZone3,
          attemptsToTop: item.attemptsTop3,
          hasZone: item.zone3,
          hasTop: item.topped3,
        },
        climb4: {
          attemptsToZone: item.attemptsZone4,
          attemptsToTop: item.attemptsTop4,
          hasZone: item.zone4,
          hasTop: item.topped4,
        },
        climb5: {
          attemptsToZone: item.attemptsZone5,
          attemptsToTop: item.attemptsTop5,
          hasZone: item.zone5,
          hasTop: item.topped5,
        },
        climb6: {
          attemptsToZone: item.attemptsZone6,
          attemptsToTop: item.attemptsTop6,
          hasZone: item.zone6,
          hasTop: item.topped6,
        },
        category: item.category,
        competitorNo: competitorNo,
        modifiedAt: timestampToISOString(item.modified),
        createdAt: timestampToISOString(item.created),
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching finals scores:", error);
    throw error;
  }
};

/**
 * Fetches problems for a specific competition
 * @param {string} compId - Competition ID
 * @returns {Promise<Object>} Object containing problem data
 */
export const getProblems = async (compId) => {
  try {
    const collectionPath = `competitions/${compId}/climbs`;
    const documents = await fetchAllData(collectionPath);

    return documents.reduce((acc, item) => {
      acc[item.climbNo] = {
        score: item.score,
        station: item.station,
        marking: item.marking,
        climbNo: item.climbNo,
        createdAt: timestampToISOString(item.created),
      };
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching problems:", error);
    throw error;
  }
};