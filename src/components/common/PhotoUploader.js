import React, { useState } from 'react';
import { useCompetition } from '../../contexts/CompetitionContext';
import { trackPhotoUploaded } from '../../utils/analytics';
import ErrorBoundary from './ErrorBoundary';
import './PhotoUploader.css';

/**
 * Component for uploading photos for a problem
 * @param {number} climbNo - Problem number
 * @param {function} onClose - Function to call when closing the uploader
 */
function PhotoUploader({ climbNo, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const { uploadProblemPhoto, competitionId } = useCompetition();

  /**
   * Handles file selection
   * @param {Event} e - Input change event
   */
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      try {
        // Validate file size
        if (selectedFile.size > 10 * 1024 * 1024) {
          setError('File size exceeds 10MB limit');
          return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(selectedFile.type)) {
          setError('File type not supported. Please use JPEG, PNG, or WebP');
          return;
        }

        // Create preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        const newPreviewUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(newPreviewUrl);
        setFile(selectedFile);
        setError(null);
      } catch (err) {
        setError('Error processing file: ' + err.message);
        console.error('Error processing file:', err);
      }
    }
  };

  /**
   * Handles form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setUploadProgress(10); // Start progress at 10%

    try {
      // Simulate progress increase during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 300);

      // Upload the photo
      await uploadProblemPhoto(climbNo, file);

      // Track successful upload
      trackPhotoUploaded(climbNo, file.type, file.size, competitionId);

      // Clear interval and set progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Close the uploader after a brief delay to show 100% progress
      setTimeout(() => onClose(), 500);
    } catch (err) {
      setError(err.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Resets the form state for retry
   */
  const handleRetry = () => {
    setError(null);
    setUploadProgress(0);
  };

  return (
    <ErrorBoundary>
      <div className="photo-uploader-overlay" onClick={onClose}>
        <div className="photo-uploader-modal" onClick={e => e.stopPropagation()}>
          <h3>Upload Photo for Problem {climbNo}</h3>

          {error && (
            <div className="error-message">
              <div className="error-icon">❌</div>
              <div className="error-text">{error}</div>
              <button className="retry-button" onClick={handleRetry}>
                Try Again
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="photo-file">Select photo (max 5MB)</label>
              <input
                type="file"
                id="photo-file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>

            {previewUrl && (
              <div className="preview">
                <img src={previewUrl} alt="Preview" />
              </div>
            )}

            {uploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="progress-text">{uploadProgress}% Uploaded</div>
              </div>
            )}

            <div className="button-group">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default PhotoUploader;