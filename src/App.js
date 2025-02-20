import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import ProblemsTable from "./ProblemsTable";
import loadPosthog from "./Posthog";

const baseUrl = 'https://firestore.googleapis.com/v1/projects/fingercomps-lite-au/databases/(default)/documents';

function App() {
  // Product analytics and surveys
  loadPosthog();

  const [comps, setComps] = useState([]);
  const [categories, setCategories] = useState({});
  const [scores, setScores] = useState({});
  const [competitors, setCompetitors] = useState({});
  const [problems, setProblems] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [selectedComp, setSelectedComp] = useState(() => {
    return localStorage.getItem('lastSelectedComp') || "";
  });
  const [selectedCompId, setSelectedCompId] = useState(() => {
    return localStorage.getItem('lastSelectedCompId') || "";
  });
  const [compNotFoundMessage, setCompNotFoundMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [userTableData, setUserTableData] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [limitScores, setLimitScores] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState('desc');
  const [lastSubmittedScore, setLastSubmittedScore] = useState(null);
  const [focusView, setFocusView] = useState('user');
  const [minScoresToCount] = useState(1); // TODO initialise to 50% pumpfestTopScores

  const formatDateForHover = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const twoMonthsAgoISOString = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 2);
    return now.toISOString();
  };

  function toTimeAgoString(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past; // Difference in milliseconds

    // Calculate time components
    const seconds = Math.floor(diffMs / 1000) % 60;
    const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
    const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Construct the human-readable time difference
    const parts = [];
    if (days > 0) {
      parts.push(`${days} day${days > 1 ? 's' : ''}`);
    } else {
      if (hours > 0) {
        parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
      } else {
        if (minutes > 0) {
          parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
        } else {
          if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
        }
      }
    }

    // Join parts with commas and add "ago"
    return parts.length > 0 ? parts.join(' ') + ' ago' : 'just now';
  }

  const fetchPaginatedData = async (url, processData) => {
    let token = null;
    let allDocuments = [];
    try {
      while (true) {
        const response = await axios.get(`${url}${token ? `&pageToken=${token}` : ''}`);
        const { documents, nextPageToken } = response.data;

        if (Array.isArray(documents)) allDocuments = [...allDocuments, ...documents];
        else {
          console.warn("No data found for current competition");
          break;
        }

        if (!nextPageToken) break;
        token = nextPageToken;
      }
      await processData(allDocuments);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const computeScore = (sortedScores, flashPoints, limit) => {
    let tops = 0, flashes = 0;
    const total = sortedScores.slice(0, limit).reduce((sum, s) => {
      if (!s) return sum;
      tops += 1;
      if (s.flashed) flashes += 1;
      return sum + (s.score + (s.flashed ? flashPoints : 0));
    }, 0);
    return { tops, flashes, total };
  };

  useEffect(() => {
    const fetchCompetitions = async () => {
      setLoading(true);
      const requestBody = {
        "structuredQuery": {
          "from": [{ "collectionId": "competitions" }],
          "where": {
            "fieldFilter": {
              "field": { "fieldPath": "modified" },
              "op": "GREATER_THAN_OR_EQUAL",
              "value": { "timestampValue": twoMonthsAgoISOString() }
            }
          },
          "orderBy": [
            { "field": { "fieldPath": "modified" }, "direction": "DESCENDING" },
            { "field": { "fieldPath": "__name__" }, "direction": "DESCENDING" }
          ]
        }
      };
      try {
        const response = await axios.post(`${baseUrl}:runQuery`, requestBody);
        const compsAndLinks = await Promise.all(response.data.map(async item => {
          const compId = item.document.name.split('/').pop();
          const response = await axios.get(`${baseUrl}/competitions/${compId}/links`);
          const { documents } = response.data;
          if (Array.isArray(documents)) {
            item.document.links = documents;
          }
          return item;
        }));
        const availableComps = compsAndLinks.filter(item => {
          if (item.document?.links)
            return true; // Keep comps with sharing links created
          return false;
        }) || [];
        setComps(availableComps);

        // Check if previously selected competition still exists
        if (selectedCompId) {
          const compExists = availableComps.some(comp =>
            comp.document?.name.split('/').pop() === selectedCompId
          );

          if (!compExists) {
            setCompNotFoundMessage(`The competition "${selectedComp}" is no longer available for viewing as it has been archived.`);
            setSelectedComp("");
            setSelectedCompId("");
            localStorage.removeItem('lastSelectedComp');
            localStorage.removeItem('lastSelectedCompId');
            setLoading(false); // Only set loading to false if no competition is selected
          }
        } else {
          setLoading(false); // Only set loading to false if no competition is selected
        }

        setSelectedCategory("");
      } catch (error) {
        console.error("Error fetching competitions:", error);
        setLoading(false); // Set loading to false on error
      }
    };
    fetchCompetitions();
  }, [selectedComp, selectedCompId]);

  useEffect(() => {
    if (!selectedCompId) return;

    // Clear state to avoid mixing data between competitions
    setCategories({});
    setCompetitors({});
    setScores({});
    setProblems({});

    const fetchAllCategories = async (compId) => {
      await fetchPaginatedData(
        `${baseUrl}/competitions/${compId}/categories?pageSize=300`,
        (documents) => {
          const cleanedCategories = documents.reduce((acc, item) => {
            acc[item.fields?.code?.stringValue] = {
              name: item.fields?.name?.stringValue,
              code: item.fields?.code?.stringValue,
              disableFlash: item.fields?.disableFlash?.booleanValue,
              flashExtraPoints: parseInt(item.fields?.flashExtraPoints?.integerValue),
              scalePoints: item.fields?.scalePoints?.booleanValue,
              pumpfestTopScores: parseInt(item.fields?.pumpfestTopScores?.integerValue),
            };
            return acc;
          }, {});
          setCategories(cleanedCategories);
        }
      );
    };

    const fetchAllCompetitors = async (compId) => {
      await fetchPaginatedData(
        `${baseUrl}/competitions/${compId}/competitors?pageSize=300`,
        (documents) => {
          const cleanedCompetitors = documents.reduce((acc, item) => {
            const c = item.fields;
            acc[parseInt(c?.competitorNo?.integerValue)] = {
              name: `${c?.firstName?.stringValue.trim()} ${c?.lastName?.stringValue.trim()}`,
              category: c?.category?.stringValue,
              competitorNo: parseInt(c?.competitorNo?.integerValue),
            };
            return acc;
          }, {});
          setCompetitors(cleanedCompetitors);
        }
      );
    };

    const fetchAllScores = async (compId) => {
      await fetchPaginatedData(
        `${baseUrl}/competitions/${compId}/qualificationScores?pageSize=300`,
        (documents) => {
          const cleanedScores = documents.reduce((acc, item) => {
            const competitorNo = parseInt(item.fields?.competitorNo?.integerValue);
            acc[competitorNo] = acc[competitorNo] || [];
            acc[competitorNo].push({
              climbNo: parseInt(item.fields?.climbNo?.integerValue),
              category: item.fields?.category?.stringValue,
              flashed: item.fields?.flash?.booleanValue,
              topped: item.fields?.topped?.booleanValue,
              competitorNo: competitorNo,
              createdAt: item.fields?.created?.timestampValue,
            });
            return acc;
          }, {});
          setScores(cleanedScores);
        }
      );
    };

    const fetchAllProblems = async (compId) => {
      await fetchPaginatedData(
        `${baseUrl}/competitions/${compId}/climbs?pageSize=300`,
        (documents) => {
          const cleanedProblems = documents.reduce((acc, item) => {
            acc[item.fields?.climbNo?.integerValue] = {
              score: parseInt(item.fields?.score?.integerValue),
              station: item.fields?.station?.stringValue,
              marking: item.fields?.marking?.stringValue,
              climbNo: parseInt(item.fields?.climbNo?.integerValue),
              createdAt: item.fields?.created?.timestampValue,
            };
            return acc;
          }, {});
          setProblems(cleanedProblems);
        }
      );
    };

    setLoading(true);
    Promise.all([
      fetchAllCategories(selectedCompId),
      fetchAllCompetitors(selectedCompId),
      fetchAllScores(selectedCompId),
      fetchAllProblems(selectedCompId),
    ]).finally(() => setLoading(false));
  }, [selectedCompId]);

  const computeUserTableData = useMemo(() => {
    return () => {
      const table = Object.entries(competitors).map(([uid, user]) => {
        const cat = categories[user.category];
        const flashExtraPoints = cat?.flashExtraPoints || 0;
        const row = {
          ...user,
          scores: (scores[uid] || [])
            // Spread order matters so createdAt date is not overwritten
            // TODO: rename keys to avoid conflict when merging
            .map(s => ({ ...problems[s?.climbNo], ...s }))
            .sort((a, b) => {
              const aTotal = a.score + (a.flashed ? flashExtraPoints : 0);
              const bTotal = b.score + (b.flashed ? flashExtraPoints : 0);
              return bTotal - aTotal;
            })
        };
        const { tops, flashes, total } = computeScore(
          row.scores,
          flashExtraPoints,
          cat?.pumpfestTopScores || 0
        );
        return {
          ...row,
          tops,
          flashes,
          total,
          bonus: flashExtraPoints * flashes,
          flashExtraPoints: flashExtraPoints,
          categoryFullName: cat?.name
        };
      });

      // Rank Assignment in descending order by default
      let currentRank = 0;
      let lastScore = null;
      table.sort((a, b) => b.total - a.total).forEach((item, index) => {
        if (lastScore === null || item.total !== lastScore) {
          currentRank = index + 1;
          lastScore = item.total;
        }
        item.rank = currentRank;
        competitors[item.competitorNo].rank = currentRank;
      });

      return table;
    };
  }, [categories, competitors, problems, scores]);

  const computeProblemStats = useMemo(() => {
    return () => {
      const seen = new Set();
      Object.entries(scores).forEach(([cptNo, cptScores]) => {
        cptScores.forEach((score) => {
          const tmpId = `${cptNo},${score.climbNo}`;
          // Skip duplicates
          if (seen.has(tmpId)) {
            console.warn(`Duplicate climb detected: ${tmpId}`);
            return;
          } else {
            seen.add(tmpId);
          }
          const climb = problems[score.climbNo];
          if (!climb) {
            // Skip processing if data is missing
            return;
          }
          if (!climb.stats) {
            climb['stats'] = {};
            Object.keys(categories).forEach((category) => {
              climb.stats[category] = {
                'tops': 0,
                'flashes': 0,
              }
            });
          }
          if (!climb.sends) {
            climb['sends'] = [];
          }
          if (score.flashed) {
            if (!climb.stats.hasOwnProperty(score.category)) {
              console.warn(`Unrecognised category (${score.category}) in categories set (${categories})`);
              return;
            }
            climb.stats[score.category].flashes += 1;
          }
          if (score.topped) {
            if (!climb.stats.hasOwnProperty(score.category)) {
              console.warn(`Unrecognised category (${score.category}) in categories set (${Object.keys(categories)})`);
              return;
            }
            climb.stats[score.category].tops += 1;
            climb.sends.push({
              competitorNo: score.competitorNo,
              rank: competitors[score.competitorNo]?.rank,
              category: categories[score.category]?.name,
              categoryCode: score.category,
              name: competitors[score.competitorNo]?.name,
              flashed: score.flashed,
              createdAt: score.createdAt,
            });
          }
        });
      });
    };
  }, [scores, problems, categories, competitors]);

  useEffect(() => {
    setUserTableData(computeUserTableData());
    computeProblemStats();
  }, [computeUserTableData, computeProblemStats]);

  const computeCategoryTops = () => {
    const categoryTops = {};
    Object.keys(categories).forEach((category) => {
      categoryTops[category] = [];
    });
    Object.values(scores).forEach((competitorScores) => {
      // Assume competitor is just in one category and add their score
      if (competitorScores.length > 0) {
        categoryTops[competitorScores[0].category]?.push(competitorScores.length);
      }
    });
    return categoryTops;
  };
  const categoryTops = useMemo(computeCategoryTops, [categories, scores]);

  const handleScoreHeaderClick = () => {
    // Toggle sort direction
    const newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newSortDirection);

    // Sort the userTableData immediately based on the new sort direction
    const sortedUserTableData = [...userTableData].sort((a, b) =>
      newSortDirection === 'asc' ? a.total - b.total : b.total - a.total
    );

    // Update userTableData directly with sorted data
    setUserTableData(sortedUserTableData);
  };

  const handleRowClick = (id) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Function to compute last score date for a selected category
  useEffect(() => {
    const getLastSubmittedScoreForCategory = () => {
      const filteredScores = Object.values(scores).flat()
        .filter(score => selectedCategoryCode ? score.category === selectedCategoryCode : true)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort in descending order
      return filteredScores.length > 0 ? filteredScores[0] : null;
    };
    setLastSubmittedScore(getLastSubmittedScoreForCategory());
    setExpandedRows(new Set()); // Collapse expanded rows when changing category
  }, [scores, selectedCategoryCode]);

  const countCompetitors = (category) => {
    const count = categoryTops[category].reduce((acc, curr) => (curr >= minScoresToCount) ? acc + 1 : acc, 0);
    return count/100;
  };

  return (
    <div className="app">
      <h1>FingerComps Extended</h1>
      <div className="filters">
        <div>
          <label htmlFor="selectComp">Select Competition:</label>
          <select
            id="selectComp"
            value={selectedComp}
            onChange={(e) => {
              const newComp = e.target.value;
              const newCompId = comps[e.target.selectedIndex].document?.name.split('/').pop();
              setSelectedComp(newComp);
              setSelectedCompId(newCompId);
              localStorage.setItem('lastSelectedComp', newComp);
              localStorage.setItem('lastSelectedCompId', newCompId);
              setCompNotFoundMessage(""); // Clear any error message
            }}
            disabled={loading}
          >
            {comps.sort((a, b) =>
                (a.document?.fields?.name?.stringValue || '').localeCompare(b.document?.fields?.name?.stringValue || '')
              )
              .map((item, index) => (
                <option key={index} value={item.document?.fields?.name?.stringValue}>
                  {item.document?.fields?.name?.stringValue}
                </option>
              )
            )}
          </select>
        </div>
        <div>
          <label htmlFor="focusView">Focus on:</label>
          <select
            id="focusView"
            value={focusView}
            onChange={(e) => {
              setFocusView(e.target.value);
            }}
            disabled={loading}
          >
            <option value="user">
              Users
            </option>
            <option value="problems">
              Problems
            </option>
          </select>
        </div>
        <div>
          <label htmlFor="filterCategory">Show Category:</label>
          <select
            id="filterCategory"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedCategoryCode(e.target.selectedOptions[0].dataset.code);
            }}
            disabled={loading}
          >
            <option value="">All</option>
            {Object.values(categories).map((item, index) => (
              <option key={index} value={item.name} data-code={item.code}>
                {item.name || 'TBC'}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Competition not found message */}
      {compNotFoundMessage && (
        <div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px' }}>
          {compNotFoundMessage}
        </div>
      )}
      {/* Table of competitors and scores */}
      {focusView === 'user' ? (
        <React.Fragment>
          <div className="filters">
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={limitScores}
                  onChange={(e) => setLimitScores(e.target.checked)}
                  disabled={loading} // Disable while loading
                />
                Hide scores that don't affect total
              </label>
            </div>
          </div>
          <table border="1" className="mainTable">
            <thead className="tableHeader">
              <tr>
                {!isMobile && <th>#</th>}
                <th>{!isMobile && "Overall"} Rank</th>
                {!selectedCategory ? (<th>Category</th>) : null}
                <th>Name</th>
                <th>Tops</th>
                <th>Flashes</th>
                <th onClick={handleScoreHeaderClick} style={{ cursor: 'pointer' }}>
                  Score{!isMobile && "(+ Flash Bonus)"} {sortDirection === 'asc' ? '🔼' : '🔽'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10"><span className="loading-dots">Loading</span></td>
                </tr>
              ) : Array.isArray(userTableData) && userTableData.length > 0 ? (
                userTableData
                  .filter(item => {
                    if (!selectedCategory) return true;
                    return item.categoryFullName === selectedCategory;
                  })
                  .map((item, index) => {
                    const isExpanded = expandedRows.has(item.competitorNo);
                    return (
                      <React.Fragment key={index}>
                        <tr onClick={() => handleRowClick(item.competitorNo)} style={{ cursor: 'pointer' }}>
                          <td>{isNaN(index) ? 'N/A' : index + 1}</td>
                          {!isMobile && <td>{item.rank}</td>}
                          {!selectedCategory ? (<td>{item.categoryFullName}</td>) : null}
                          <td>{item.name}</td>
                          <td>{item.tops}</td>
                          <td>{item?.flashes}</td>
                          <td>{item.total - item.bonus} {item.bonus > 0 ? `(+${item.bonus})` : ''}</td>
                        </tr>
                        {isExpanded && (
                          <tr className="subTableContainer">
                            <td colSpan="7">
                              {/* Subtable */}
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
                                  {/* Limit the number of scores based on the checkbox state */}
                                  {item.scores && item.scores
                                    .slice(0, limitScores ? categories[item.category].pumpfestTopScores : item.scores.length)
                                    .map((score, subIndex) =>
                                  (
                                    <tr key={subIndex}>
                                      <td>{score.climbNo}</td>
                                      <td>{score.marking}</td>
                                      <td>{score.flashed ? 'Y' : ''}</td>
                                      <td>{score.score} {score.flashed ? `(+${item.flashExtraPoints})` : ''}</td>
                                      <td title={formatDateForHover(score.createdAt)}>{toTimeAgoString(score.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan="10">No data available or scores are hidden</td>
                </tr>
              )}
            </tbody>
          </table>
        </React.Fragment>
      ) : (
        <ProblemsTable
          categories={categories}
          categoryTops={categoryTops}
          problems={problems}
          loading={loading}
          countCompetitors={countCompetitors}
          toTimeAgoString={toTimeAgoString}
          formatDateForHover={formatDateForHover}
          selectedCategoryCode={selectedCategoryCode}
          isMobile={isMobile}
        />
      )}
      {/* Last score date display */}
      <div style={{ marginTop: '20px' }}>
        {lastSubmittedScore ? (
          <p>Last score in this category was submitted at: {toTimeAgoString(lastSubmittedScore.createdAt)} by {competitors[lastSubmittedScore.competitorNo]?.name}</p>
        ) : (
          <p>No scores available for the selected category.</p>
        )}
      </div>
    </div>
  );
}

export default App;