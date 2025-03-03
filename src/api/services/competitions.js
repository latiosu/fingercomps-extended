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
    const [categories, competitors, scores, problems] = await Promise.all([
      getCategories(compId),
      getCompetitors(compId),
      getScores(compId),
      getProblems(compId),
    ]);

    return {
      categories,
      competitors,
      scores,
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
export const getScores = async (compId) => {
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
      });
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching scores:", error);
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