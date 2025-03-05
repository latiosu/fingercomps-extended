import React, { useEffect, useMemo, useState } from 'react';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useHighlightedProblems } from '../../contexts/HighlightedProblemsContext';
import useExpandableRows from '../../hooks/useExpandableRows';
import { formatDateForHover, toTimeAgoString } from '../../utils/dateFormatters';
import PhotoUploader from '../common/PhotoUploader';
import PhotoViewer from '../common/PhotoViewer';
import PhotoIndicator from '../common/PhotoIndicator';
import SendsSubTable from '../common/SendsSubTable';

/**
 * Component to display a user's scores
 * @param {Object} props - Component props
 * @param {Array} props.scores - Array of user scores
 * @param {boolean} props.limitScores - Whether to limit scores to those that affect the total
 * @param {number} props.categoryPumpfestTopScores - Number of top scores to count for the category
 * @param {number} props.flashExtraPoints - Extra points for flashing a problem
 * @param {boolean} props.isMobile - Whether the device is mobile
 * @returns {JSX.Element} UserScoresTable component
 */
function UserScoresTable({
  scores = [],
  limitScores = true,
  categoryPumpfestTopScores = 0,
  flashExtraPoints = 0,
  isMobile = false
}) {
  // Use expandable rows hook
  const { toggleRow, isRowExpanded } = useExpandableRows();
  // State for photo viewer and uploader
  const [selectedPhotoClimbNo, setSelectedPhotoClimbNo] = useState(null);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  // Get problems and photos from competition context
  const { problems, problemPhotos } = useCompetition();

  // Get highlighting functions from context
  const { registerProblems, shouldHighlight } = useHighlightedProblems();

  // Get the current user's competitor number from the first score
  const currentUserCompetitorNo = scores[0]?.competitorNo;

  // Limit the number of scores based on the checkbox state
  // Memoize to prevent creating a new array on every render
  const displayedScores = useMemo(() => {
    return limitScores
      ? scores.slice(0, categoryPumpfestTopScores)
      : scores;
  }, [scores, limitScores, categoryPumpfestTopScores]);

  // Register problems with the context when component mounts or scores change
  useEffect(() => {
    // Extract problem numbers from displayed scores
    const problemNumbers = displayedScores.map(score => score.climbNo);

    // Register problems and store cleanup function
    const cleanup = registerProblems(problemNumbers);

    // Clean up when component unmounts or scores change
    return cleanup;
  }, [displayedScores, registerProblems]);

  return (
    <>
      <table border="1" className="subTable" style={{ width: '100%' }}>
        <thead>
          <tr className="subTableHeader">
            <th>Problem{!isMobile && " No."}</th>
            <th>Name{!isMobile && "/Grade"}</th>
            <th>Flashed?</th>
            <th>Points{!isMobile && " (+ Flash Bonus)"}</th>
            <th>Sent</th>
          </tr>
        </thead>
        <tbody>
          {displayedScores.length > 0 ? (
            displayedScores.map((score, index) => (
              <React.Fragment key={index}>
                <tr
                  className="pointer"
                  onClick={() => toggleRow(score.climbNo)}
                  style={shouldHighlight(score.climbNo) ? { backgroundColor: '#E9FFDB'  } : {backgroundColor: '#F9F9F9' }}
                >
                  <td>
                    {shouldHighlight(score.climbNo) ? '✅' : ''}
                    {score.climbNo}
                    <PhotoIndicator
                      climbNo={score.climbNo}
                      problemPhotos={problemPhotos}
                      onViewPhoto={setSelectedPhotoClimbNo}
                      onUploadPhoto={null}
                      showUploadButton={false}
                    />
                  </td>
                  <td>{score.marking}</td>
                  <td>{score.flashed ? 'Y' : ''}</td>
                  <td>
                    {score.score}
                    {score.flashed ? ` (+${flashExtraPoints})` : ''}
                  </td>
                  <td title={formatDateForHover(score.createdAt)}>
                    {toTimeAgoString(score.createdAt)}
                  </td>
                </tr>
                {isRowExpanded(score.climbNo) && problems[score.climbNo]?.sends && (
                  <tr>
                    <td colSpan="5">
                      <div>
                        <h4 style={{margin: '5px'}}>Others who topped Problem {score.climbNo}</h4>
                        <SendsSubTable
                          sends={(problems[score.climbNo]?.sends || [])
                            // Filter out the current user's sends
                            .filter(send => send.competitorNo !== currentUserCompetitorNo)}
                          emptyText="None found. Congratulations on the first top! 🎉"
                          isMobile={isMobile}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan="5">No scores available</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Photo Viewer Modal */}
      {selectedPhotoClimbNo && problemPhotos[selectedPhotoClimbNo]?.length > 0 && (
        <PhotoViewer
          photos={problemPhotos[selectedPhotoClimbNo]}
          onClose={() => setSelectedPhotoClimbNo(null)}
        />
      )}

      {/* Photo Uploader Modal */}
      {showPhotoUploader && selectedPhotoClimbNo && (
        <PhotoUploader
          climbNo={selectedPhotoClimbNo}
          onClose={() => {
            setShowPhotoUploader(false);
            setSelectedPhotoClimbNo(null);
          }}
        />
      )}
    </>
  );
}

export default UserScoresTable;