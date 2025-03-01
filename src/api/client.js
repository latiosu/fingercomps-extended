import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  startAfter,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Helper function to fetch all data at once without pagination
 * @param {string} collectionPath - Path to the collection
 * @param {Array} queryConstraints - Array of query constraints (where, orderBy, etc.)
 * @returns {Promise<Array>} Array of documents
 * @note This function fetches all documents at once, which may cause performance issues
 *       for large collections. Firestore has a default limit of 1000 documents per query.
 */
export const fetchAllData = async (collectionPath, queryConstraints = []) => {
  try {
    // Create and execute the query without pagination constraints
    const q = query(collection(db, collectionPath), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    // Process documents
    const docs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Add reference to the original document for compatibility
      ref: doc.ref
    }));
    
    return docs;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

/**
 * Helper function for paginated Firestore queries
 * @param {string} collectionPath - Path to the collection
 * @param {Array} queryConstraints - Array of query constraints (where, orderBy, etc.)
 * @param {number} pageSize - Number of documents per page
 * @returns {Promise<Array>} Array of documents
 */
export const fetchPaginatedData = async (collectionPath, queryConstraints = [], pageSize = 1000) => {
  let lastDoc = null;
  let allDocuments = [];
  
  try {
    while (true) {
      // Create a new query with pagination
      let constraints = [...queryConstraints];
      
      // Add limit constraint
      constraints.push(limit(pageSize));
      
      // Add startAfter constraint if we have a last document
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      // Create and execute the query
      const q = query(collection(db, collectionPath), ...constraints);
      const querySnapshot = await getDocs(q);
      
      // If no documents returned, break the loop
      if (querySnapshot.empty) {
        break;
      }
      
      // Process documents
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Add reference to the original document for compatibility
        ref: doc.ref
      }));
      
      allDocuments = [...allDocuments, ...docs];
      
      // Update the last document for pagination
      lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      // If we got fewer documents than the page size, we've reached the end
      if (querySnapshot.docs.length < pageSize) {
        break;
      }
    }
    
    return allDocuments;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

/**
 * Helper function to convert Firestore Timestamp to ISO string
 * @param {Timestamp} timestamp - Firestore timestamp
 * @returns {string} ISO string
 */
export const timestampToISOString = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate().toISOString();
};

/**
 * Helper function to convert ISO string to Firestore Timestamp
 * @param {string} isoString - ISO string
 * @returns {Timestamp} Firestore timestamp
 */
export const isoStringToTimestamp = (isoString) => {
  if (!isoString) return null;
  return Timestamp.fromDate(new Date(isoString));
};

export { db };