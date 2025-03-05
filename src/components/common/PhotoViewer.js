import React, { useState } from 'react';
import { supabase } from '../../api/supabase';
import { useCompetition } from '../../contexts/CompetitionContext';
import { getMainLocation } from '../../utils/scoreCalculators';
import ErrorBoundary from './ErrorBoundary';
import './PhotoViewer.css';

/**
 * Component for viewing problem photos
 * @param {Array} photos - Array of photo objects to display
 * @param {function} onClose - Function to call when closing the viewer
 */
function PhotoViewer({ photos, onClose }) {
  const { problems } = useCompetition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [reported, setReported] = useState(false);

  if (!photos || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];
  const currentProblem = problems[currentPhoto.climb_no];

  /**
   * Navigate to the next photo
   */
  const goToNext = () => {
    setImageLoaded(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  /**
   * Navigate to the previous photo
   */
  const goToPrevious = () => {
    setImageLoaded(false);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  /**
   * Report inappropriate photo
   */
  const reportPhoto = async () => {
    try {
      const { error } = await supabase
        .from('problem_photo_reports')
        .insert({
          photo_id: currentPhoto.id,
          reported_at: new Date()
        });

      if (error) throw error;
      setReported(true);
    } catch (error) {
      console.error("Error reporting photo:", error);
      // Show error but still set reported to true to prevent multiple attempts
      setReported(true);
    }
  };

  /**
   * Format the date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <ErrorBoundary>
      <div className="photo-viewer-overlay" onClick={onClose}>
        <div className="photo-viewer-modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={onClose}>×</button>

          <div className="photo-container">
            {!imageLoaded && <div className="loading-placeholder">Loading image...</div>}
            <img
              src={currentPhoto.medium_url || currentPhoto.image_url}
              alt={`Problem ${currentPhoto.climbNo}`}
              onLoad={() => setImageLoaded(true)}
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />

            {!reported ? (
              <button
                className="report-button"
                onClick={reportPhoto}
                title="Report inappropriate content"
              >
                ⚠️ Report
              </button>
            ) : (
              <div className="reported-message">
                Photo reported. Thank you.
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="navigation">
              <button onClick={goToPrevious}>←</button>
              <span>{currentIndex + 1} of {photos.length}</span>
              <button onClick={goToNext}>→</button>
            </div>
          )}

          <div className="caption">
            <strong>
              Problem #{currentPhoto.climb_no}
              {currentProblem?.marking && <span> | {currentProblem.marking}</span>}
              {currentProblem?.grade && <span> ({currentProblem.grade})</span>}
              {currentProblem?.station && (
                <span>
                  {' | '}
                  {getMainLocation(currentProblem.station)}
                </span>
              )}
              {currentProblem?.score && <span> | {currentProblem.score} pts</span>}
            </strong>
          </div>

          <div className="metadata">
            Uploaded by {currentPhoto.uploaded_by} • {formatDate(currentPhoto.created_at)}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default PhotoViewer;