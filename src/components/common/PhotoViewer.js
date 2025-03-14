import React, { useState } from 'react';
import { supabase } from '../../api/supabase';
import { useCompetition } from '../../contexts/CompetitionContext';
import { trackPhotoReportConfirmed, trackPhotoReportInitiated, trackPhotoViewed } from '../../utils/analytics';
import { getClientIdentifier } from '../../utils/clientIdentifier';
import { getMainLocation } from '../../utils/scoreCalculators';
import ErrorBoundary from './ErrorBoundary';
import './PhotoViewer.css';

// Report reason options
const REPORT_REASONS = [
  "Incorrect photo",
  "Inappropriate content",
  "Spam",
  "Other"
];

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
  const [showReportConfirmation, setShowReportConfirmation] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);

  // Get competitionId from competition context
  const { competitionId } = useCompetition();

  // Track when a photo is viewed (when photo changes or on first view)
  React.useEffect(() => {
    if (photos && photos.length > 0) {
      const photo = photos[currentIndex];
      trackPhotoViewed(photo.climb_no, photo.id, competitionId);
    }
  }, [photos, currentIndex, competitionId]);

  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    // Add class to body when component mounts
    document.body.classList.add('modal-open');

    // Remove class when component unmounts
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

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
   * Reports an inappropriate photo
   * @param {string} photoId - ID of the photo to report
   * @param {string} reason - Reason for reporting the photo
   * @param {string} [reportedBy] - Optional identifier of who reported the photo
   * @returns {Promise<boolean>} Success status
   */
  const reportPhoto = async (photoId, reason, reportedBy) => {
    try {
      // Get client identifier if no reporter ID is provided
      const reporter = reportedBy || getClientIdentifier();

      const { error } = await supabase
        .from('problem_photo_reports')
        .insert({
          photo_id: photoId,
          reported_at: new Date(),
          reported_by: reporter,
          report_reason: reason
        });

      if (error) throw error;
      setReported(true);

      // Track the confirmed report
      trackPhotoReportConfirmed(currentPhoto.climb_no, photoId, currentPhoto.competition_id);
    } catch (error) {
      console.error("Error reporting photo:", error);
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
      <div className="photo-viewer-overlay" onClick={(e) => {
        e.stopPropagation();
        if (!showReportConfirmation) onClose();
      }}>
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
            Uploaded by {currentPhoto.uploaded_by} • {formatDate(currentPhoto.created_at)} •
            {!reported ? (
              <button
                className="report-button"
                onClick={() => {
                  trackPhotoReportInitiated(currentPhoto.climb_no, currentPhoto.id, competitionId);
                  setShowReportConfirmation(true);
                }}
                title="Report inappropriate content"
              >
                ⚠️ Report
              </button>
            ) : (
              <div className="reported-message">
                Photo reported. Thank you, it will be investigated.
              </div>
            )}
          </div>
        </div>

        {showReportConfirmation && (
          <div className="report-confirmation-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="report-confirmation-dialog">
              <h3>Report Photo</h3>
              <p>Please select a reason for reporting this photo:</p>

              <div className="report-reason-selector">
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="reason-dropdown"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div className="report-confirmation-buttons">
                <button
                  className="cancel-button"
                  onClick={() => setShowReportConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-button"
                  onClick={() => {
                    reportPhoto(currentPhoto.id, selectedReason);
                    setShowReportConfirmation(false);
                  }}
                >
                  Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default PhotoViewer;