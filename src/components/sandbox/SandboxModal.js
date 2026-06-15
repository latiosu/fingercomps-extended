import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompetition } from '../../contexts/CompetitionContext';
import { useSandbox } from '../../contexts/SandboxContext';
import './Sandbox.css';

/**
 * Modal for adding theoretical tops to one or more competitors at once.
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @returns {JSX.Element} SandboxModal component
 */
function SandboxModal({ onClose }) {
  const { selectedCategory } = useApp();
  const { problems, userTableData } = useCompetition();
  const { addTheoreticalTops, theoreticalScores } = useSandbox();

  const [competitorSearch, setCompetitorSearch] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [selectedCompetitors, setSelectedCompetitors] = useState(new Set());
  const [selectedProblems, setSelectedProblems] = useState(new Set());
  const [flashed, setFlashed] = useState(false);

  // Competitors, respecting the currently selected category filter
  const competitorList = useMemo(() => {
    const term = competitorSearch.toLowerCase();
    return userTableData
      .filter(user => !selectedCategory || user.categoryFullName === selectedCategory)
      .filter(user => !term || user.name?.toLowerCase().includes(term));
  }, [userTableData, selectedCategory, competitorSearch]);

  // Problems sorted by points, searchable by number or name/grade
  const problemList = useMemo(() => {
    return Object.values(problems)
      .filter(problem => {
        if (!problemSearch) return true;
        const term = problemSearch.toLowerCase();
        return String(problem.climbNo).includes(problemSearch)
          || (problem.marking || '').toLowerCase().includes(term)
          || (problem.station || '').toLowerCase().includes(term);
      })
      .sort((a, b) => b.score - a.score);
  }, [problems, problemSearch]);

  const toggleSelection = (setSelection, key) => {
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllVisible = (setSelection, keys) => {
    setSelection(prev => new Set([...prev, ...keys]));
  };

  const handleApply = () => {
    addTheoreticalTops([...selectedCompetitors], [...selectedProblems], flashed);
    onClose();
  };

  const canApply = selectedCompetitors.size > 0 && selectedProblems.size > 0;

  return (
    <div className="modal-overlay" onClick={(e) => {
      e.stopPropagation();
      onClose();
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🧪 Add theoretical tops</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="sandbox-modal-columns">
            <div className="sandbox-modal-column">
              <h3>Competitors ({selectedCompetitors.size} selected)</h3>
              <input
                type="text"
                placeholder="Search by name..."
                value={competitorSearch}
                onChange={(e) => setCompetitorSearch(e.target.value)}
              />
              <div className="sandbox-select-actions">
                <button onClick={() => selectAllVisible(
                  setSelectedCompetitors,
                  competitorList.map(user => user.competitorNo)
                )}>
                  Select all shown
                </button>
                <button onClick={() => setSelectedCompetitors(new Set())}>
                  Clear selection
                </button>
              </div>
              <div className="sandbox-checkbox-list">
                {competitorList.length > 0 ? (
                  competitorList.map(user => (
                    <label key={user.competitorNo}>
                      <input
                        type="checkbox"
                        checked={selectedCompetitors.has(user.competitorNo)}
                        onChange={() => toggleSelection(setSelectedCompetitors, user.competitorNo)}
                      />
                      <span>
                        {user.name}
                        {theoreticalScores[user.competitorNo]?.length > 0 && (
                          <span className="sandbox-badge">
                            🧪+{theoreticalScores[user.competitorNo].length}
                          </span>
                        )}
                      </span>
                      <span className="sandbox-option-detail">
                        {user.categoryFullName} · {user.total} pts
                      </span>
                    </label>
                  ))
                ) : (
                  <div style={{ padding: '8px', color: '#666' }}>No competitors found</div>
                )}
              </div>
            </div>

            <div className="sandbox-modal-column">
              <h3>Problems ({selectedProblems.size} selected)</h3>
              <input
                type="text"
                placeholder="Search by number or colour..."
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
              />
              <div className="sandbox-select-actions">
                <button onClick={() => selectAllVisible(
                  setSelectedProblems,
                  problemList.map(problem => problem.climbNo)
                )}>
                  Select all shown
                </button>
                <button onClick={() => setSelectedProblems(new Set())}>
                  Clear selection
                </button>
              </div>
              <div className="sandbox-checkbox-list">
                {problemList.length > 0 ? (
                  problemList.map(problem => (
                    <label key={problem.climbNo}>
                      <input
                        type="checkbox"
                        checked={selectedProblems.has(problem.climbNo)}
                        onChange={() => toggleSelection(setSelectedProblems, problem.climbNo)}
                      />
                      <span>#{problem.climbNo} {problem.marking}</span>
                      <span className="sandbox-option-detail">
                        {problem.station ? `${problem.station} · ` : ''}
                        {problem.score} pts
                      </span>
                    </label>
                  ))
                ) : (
                  <div style={{ padding: '8px', color: '#666' }}>No problems found</div>
                )}
              </div>
            </div>
          </div>

          <div className="sandbox-modal-footer">
            <label>
              <input
                type="checkbox"
                checked={flashed}
                onChange={(e) => setFlashed(e.target.checked)}
              />
              Count as flashes
            </label>
            <button
              className="sandbox-apply-btn"
              onClick={handleApply}
              disabled={!canApply}
            >
              Add {selectedProblems.size || ''} top{selectedProblems.size !== 1 ? 's' : ''} to{' '}
              {selectedCompetitors.size || ''} competitor{selectedCompetitors.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SandboxModal;
