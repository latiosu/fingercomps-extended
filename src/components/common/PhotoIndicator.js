import React from 'react';

/**
 * Component to display a photo indicator (camera icon or upload button)
 * @param {Object} props - Component props
 * @param {string|number} props.climbNo - Climb/problem number
 * @param {Object} props.problemPhotos - Object mapping climb numbers to arrays of photos
 * @param {Function} props.onViewPhoto - Callback for when the photo icon is clicked
 * @param {Function} props.onUploadPhoto - Callback for when the upload button is clicked (optional)
 * @param {boolean} props.showUploadButton - Whether to show the upload button when no photos exist (default: false)
 * @returns {JSX.Element|null} PhotoIndicator component
 */
function PhotoIndicator({
  climbNo,
  problemPhotos,
  onViewPhoto,
  onUploadPhoto,
  showUploadButton = false
}) {
  const hasPhotos = problemPhotos[climbNo]?.length > 0;

  const handleViewClick = (e) => {
    e.stopPropagation(); // Prevent row expansion
    onViewPhoto(climbNo);
  };

  const handleUploadClick = (e) => {
    e.stopPropagation(); // Prevent row expansion
    onUploadPhoto(climbNo);
  };

  if (hasPhotos) {
    return (
      <span
        className="photo-icon"
        onClick={handleViewClick}
        title={`View ${problemPhotos[climbNo].length} photo(s)`}
        style={{
          marginLeft: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        🖼️
      </span>
    );
  } else if (showUploadButton) {
    return (
      <button
        onClick={handleUploadClick}
        title="Upload a photo for this problem"
        style={{
          marginLeft: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '10px',
          color: '#666',
          padding: '0 2px'
        }}
      >
        ➕
      </button>
    );
  }

  return null;
}

export default PhotoIndicator;