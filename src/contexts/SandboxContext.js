import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { computeUserTableData } from '../utils/dataProcessors';
import {
  cloneCompetitors,
  createTheoreticalScore,
  mergeScoresWithTheoretical
} from '../utils/sandboxUtils';
import { useCompetition } from './CompetitionContext';

// Create context
const SandboxContext = createContext();

/**
 * Custom hook to use the sandbox context
 * @returns {Object} Sandbox context value
 */
export const useSandbox = () => {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new Error('useSandbox must be used within a SandboxProvider');
  }
  return context;
};

/**
 * Sandbox (what-if) context provider component.
 * Keeps theoretical tops as local overlay state and recomputes rankings with
 * the existing scoring logic. Real competition data is never modified.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const SandboxProvider = ({ children }) => {
  const {
    categories,
    competitors,
    problems,
    qualificationScores,
    userTableData
  } = useCompetition();

  const [sandboxMode, setSandboxMode] = useState(false);
  // Theoretical scores keyed by competitorNo, each an array of score entries
  const [theoreticalScores, setTheoreticalScores] = useState({});

  const theoreticalTopsCount = useMemo(
    () => Object.values(theoreticalScores).reduce((sum, scores) => sum + scores.length, 0),
    [theoreticalScores]
  );

  const modifiedCompetitorCount = useMemo(
    () => Object.keys(theoreticalScores).length,
    [theoreticalScores]
  );

  // Real scores with theoretical tops layered on top (real data untouched)
  const sandboxQualificationScores = useMemo(() => {
    if (!sandboxMode || theoreticalTopsCount === 0) {
      return qualificationScores;
    }
    return mergeScoresWithTheoretical(qualificationScores, theoreticalScores);
  }, [sandboxMode, theoreticalTopsCount, qualificationScores, theoreticalScores]);

  // Recompute rankings with theoretical tops layered over real scores.
  // Competitors are cloned because computeUserTableData writes ranks onto them.
  const sandboxUserTableData = useMemo(() => {
    if (!sandboxMode || theoreticalTopsCount === 0) {
      return userTableData;
    }
    if (!Object.keys(categories).length || !Object.keys(competitors).length) {
      return userTableData;
    }
    return computeUserTableData(categories, cloneCompetitors(competitors), problems, sandboxQualificationScores);
  }, [
    sandboxMode,
    theoreticalTopsCount,
    categories,
    competitors,
    problems,
    sandboxQualificationScores,
    userTableData
  ]);

  // Add theoretical tops for one or more competitors on one or more problems
  const addTheoreticalTops = useCallback((competitorNos, climbNos, flashed = false) => {
    setTheoreticalScores(prev => {
      const next = { ...prev };
      competitorNos.forEach(competitorNo => {
        const competitor = competitors[competitorNo];
        if (!competitor) return;

        const existing = next[competitorNo] || [];
        const additions = climbNos
          .filter(climbNo => problems[climbNo])
          .filter(climbNo => !existing.some(s => s.climbNo === climbNo))
          .map(climbNo => createTheoreticalScore(competitor, problems[climbNo], flashed));

        if (additions.length) {
          next[competitorNo] = [...existing, ...additions];
        }
      });
      return next;
    });
  }, [competitors, problems]);

  // Remove a single theoretical top
  const removeTheoreticalTop = useCallback((competitorNo, climbNo) => {
    setTheoreticalScores(prev => {
      const existing = prev[competitorNo];
      if (!existing) return prev;

      const remaining = existing.filter(s => s.climbNo !== climbNo);
      const next = { ...prev };
      if (remaining.length) {
        next[competitorNo] = remaining;
      } else {
        delete next[competitorNo];
      }
      return next;
    });
  }, []);

  // Remove all theoretical tops, restoring real rankings
  const clearTheoreticalScores = useCallback(() => {
    setTheoreticalScores({});
  }, []);

  const enterSandbox = useCallback(() => {
    setSandboxMode(true);
  }, []);

  // Leaving sandbox always discards the overlay so real rankings are restored
  const exitSandbox = useCallback(() => {
    setSandboxMode(false);
    setTheoreticalScores({});
  }, []);

  // Context value
  const value = {
    sandboxMode,
    enterSandbox,
    exitSandbox,
    theoreticalScores,
    theoreticalTopsCount,
    modifiedCompetitorCount,
    addTheoreticalTops,
    removeTheoreticalTop,
    clearTheoreticalScores,
    sandboxUserTableData,
    sandboxQualificationScores,
  };

  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  );
};

export default SandboxContext;
