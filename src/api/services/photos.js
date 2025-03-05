import imageCompression from 'browser-image-compression';
import { getClientIdentifier } from '../../utils/clientIdentifier';
import { handleApiError } from '../../utils/errorHandler';
import { supabase } from '../supabase';

/**
 * Compresses an image file before upload
 * @param {File} file - The file to compress
 * @returns {Promise<File>} The compressed file
 */
export const compressImage = async (file) => {
  try {
    const options = {
      maxSizeMB: 1, // Max size in MB
      maxWidthOrHeight: 1920, // Max width/height
      useWebWorker: true // Use web worker for better performance
    };

    return await imageCompression(file, options);
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original file if compression fails
  }
};

/**
 * Generates optimized image URLs with different sizes
 * @param {string} baseUrl - The original image URL
 * @returns {Object} Object containing URLs for different sizes
 */
export const generateImageVariants = (baseUrl) => {
  // Using URL parameters for optimization - this works with some storage services
  // With Supabase, you might need additional setup or services like Imgproxy
  return {
    thumbnail: `${baseUrl}?width=150&height=150&fit=cover`,
    medium: `${baseUrl}?width=800&fit=contain`,
    original: baseUrl
  };
};

/**
 * Uploads a photo for a problem
 * @param {string} competitionId - Competition ID
 * @param {number} climbNo - Problem number
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} The uploaded photo data
 */
export const uploadProblemPhoto = async (competitionId, climbNo, file) => {
  try {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds 5MB limit");
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("File type not supported. Please use JPEG, PNG, GIF, or WebP");
    }

    // Compress image if possible
    const compressedFile = await compressImage(file);

    // Create a unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${competitionId}/${climbNo}/${fileName}`;

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('problem-photos')
      .upload(filePath, compressedFile);

    if (storageError) {
      throw storageError;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('problem-photos')
      .getPublicUrl(filePath);

    // Generate image variants
    const imageVariants = generateImageVariants(publicUrl);

    const uploadedBy = getClientIdentifier();

    // Store metadata in Supabase Database
    const { data, error } = await supabase
      .from('problem_photos')
      .insert({
        competition_id: competitionId,
        climb_no: climbNo,
        image_url: imageVariants.original,
        thumbnail_url: imageVariants.thumbnail,
        medium_url: imageVariants.medium,
        uploaded_by: uploadedBy,
        file_path: filePath
      })
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  } catch (error) {
    const handledError = handleApiError(error, 'uploadProblemPhoto');
    throw new Error(handledError.userMessage);
  }
};

/**
 * Gets photos for a specific problem
 * @param {string} competitionId - Competition ID
 * @param {number} climbNo - Problem number
 * @returns {Promise<Array>} Array of photo objects
 */
export const getProblemPhotos = async (competitionId, climbNo) => {
  try {
    const { data, error } = await supabase
      .from('problem_photos')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('climb_no', climbNo)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching problem photos:", error);
    return [];
  }
};

/**
 * Gets all photos for a competition
 * @param {string} competitionId - Competition ID
 * @returns {Promise<Object>} Object with photos grouped by problem number
 */
export const getAllProblemPhotos = async (competitionId) => {
  try {
    const { data, error } = await supabase
      .from('problem_photos')
      .select('*')
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Group photos by problem number
    const photosByProblem = {};
    data.forEach(photo => {
      const climbNo = photo.climb_no;
      if (!photosByProblem[climbNo]) {
        photosByProblem[climbNo] = [];
      }
      photosByProblem[climbNo].push(photo);
    });

    return photosByProblem;
  } catch (error) {
    const handledError = handleApiError(error, 'getAllProblemPhotos');
    console.error(handledError.userMessage);
    return {};
  }
};
