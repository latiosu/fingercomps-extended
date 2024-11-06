import React, { useState, useEffect } from "react";
import axios from "axios";

const baseUrl = 'https://firestore.googleapis.com/v1/projects/fingercomps-lite-au/databases/(default)/documents';

function App() {
  const [comps, setComps] = useState([]);
  const [categories, setCategories] = useState({});
  const [scores, setScores] = useState({});
  const [competitors, setCompetitors] = useState({});
  const [problems, setProblems] = useState({});
  const [selectedComp, setSelectedComp] = useState("");
  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryCode, setSelectedCategoryCode] = useState("");
  const [tableData, setTableData] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [limitScores, setLimitScores] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState('desc');
  const [lastSubmittedScore, setLastSubmittedScore] = useState(null);

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
    // const seconds = Math.floor(diffMs / 1000) % 60;
    const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
    const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Construct the human-readable time difference
    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
    // if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

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
        else console.warn("Expected 'documents' to be an array but received:", documents);

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
      return sum + (parseInt(s.score) + (s.flashed ? flashPoints : 0));
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
        setComps(response.data.filter((item) => item.document.fields?.trash?.booleanValue !== true) || []);
        setSelectedCategory("");
      } catch (error) {
        console.error("Error fetching competitions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (!selectedCompId) return;

    const fetchAllCategories = async (compId) => {
      await fetchPaginatedData(
        `${baseUrl}/competitions/${compId}/categories?pageSize=300`,
        (documents) => {
          const cleanedCategories = documents.reduce((acc, item) => {
            acc[item.fields?.code?.stringValue] = {
              name: item.fields?.name?.stringValue,
              code: item.fields?.code?.stringValue,
              disableFlash: item.fields?.disableFlash?.booleanValue,
              flashExtraPoints: item.fields?.flashExtraPoints?.integerValue,
              scalePoints: item.fields?.scalePoints?.booleanValue,
              pumpfestTopScores: item.fields?.pumpfestTopScores?.integerValue,
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
            acc[c?.competitorNo?.integerValue] = {
              name: `${c?.firstName?.stringValue.trim()} ${c?.lastName?.stringValue.trim()}`,
              category: c?.category?.stringValue,
              competitorNo: c?.competitorNo?.integerValue,
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
            const competitorNo = item.fields?.competitorNo?.integerValue;
            acc[competitorNo] = acc[competitorNo] || [];
            acc[competitorNo].push({
              climbNo: item.fields?.climbNo?.integerValue,
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
              score: item.fields?.score?.integerValue,
              station: item.fields?.station?.stringValue,
              marking: item.fields?.marking?.stringValue,
              climbNo: item.fields?.climbNo?.integerValue,
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

  useEffect(() => {
    const computeTableData = () => {
      const table = Object.entries(competitors).map(([uid, user]) => {
        const cat = categories[user.category];
        const flashExtraPoints = parseInt(cat?.flashExtraPoints || 0);
        const row = {
          ...user,
          scores: (scores[uid] || [])
            .map(s => ({ ...s, ...problems[s?.climbNo] }))
            .sort((a, b) => {
              const aTotal = a.score + (a.flashed ? flashExtraPoints : 0);
              const bTotal = b.score + (b.flashed ? flashExtraPoints : 0);
              return bTotal - aTotal;
            })
        };
        const { tops, flashes, total } = computeScore(
          row.scores,
          flashExtraPoints,
          parseInt(cat?.pumpfestTopScores || 0)
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
      });

      return table;
    };
    setTableData(computeTableData());
  }, [categories, competitors, problems, scores]);

  const handleScoreHeaderClick = () => {
    // Toggle sort direction
    const newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newSortDirection);

    // Sort the tableData immediately based on the new sort direction
    const sortedTableData = [...tableData].sort((a, b) =>
      newSortDirection === 'asc' ? a.total - b.total : b.total - a.total
    );

    // Update tableData directly with sorted data
    setTableData(sortedTableData);
  };

  const handleRowClick = (uid) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
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

  return (
    <div className="app">
      <h1>FingerComps Extended</h1>
      <div>
        <label htmlFor="selectComp">Select Competition:</label>
        <select
          id="selectComp"
          value={selectedComp}
          onChange={(e) => {
            setSelectedComp(e.target.value);
            setSelectedCompId(comps[e.target.selectedIndex].document.name.split('/').pop());
          }}
          disabled={loading}
        >
          {comps.map((item, index) => (
            <option key={index} value={item.document.fields?.name?.stringValue}>
              {item.document.fields?.name?.stringValue}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="selectCategory">Select Category:</label>
        <select
          id="selectCategory"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);  // Directly set category from value
            setSelectedCategoryCode(e.target.selectedOptions[0].dataset.code);  // Get data-code from selected option
          }}
          disabled={loading}
        >
          <option value="">All</option>
          {Object.values(categories).map((item, index) => (
            <option key={index} value={item.name} data-code={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {/* Checkbox to limit the number of sub-scores */}
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
      {/* Loading message */}
      {loading && <p>Loading data, please wait...</p>}
      {/* Table of competitors and scores */}
      <table className="mainTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Overall Rank</th>
            {!selectedCategory ? (<th>Category</th>) : null}
            <th>Name</th>
            <th>Tops</th>
            <th>Flashes</th>
            <th onClick={handleScoreHeaderClick} style={{ cursor: 'pointer' }}>
              Score (+ Flash Bonus) {sortDirection === 'asc' ? '🔼' : '🔽'}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="10">Loading...</td>
            </tr>
          ) : Array.isArray(tableData) && tableData.length > 0 ? (
            tableData
              .filter(item => {
                if (!selectedCategory) return true;
                return item.categoryFullName === selectedCategory;
              })
              .map((item, index) => {
                const isExpanded = expandedRows.has(item.competitorNo);
                return (
                  <React.Fragment key={index}>
                    <tr onClick={() => handleRowClick(item.competitorNo)} style={{ cursor: 'pointer' }} className={isExpanded ? 'expandedRow' : ''}>
                      <td>{isNaN(index) ? 'N/A' : index + 1}</td>
                      <td>{item.rank}</td>
                      {!selectedCategory ? (<td>{item.categoryFullName}</td>) : null}
                      <td>{item.name}</td>
                      <td>{item.tops}</td>
                      <td>{item.flashes}</td>
                      <td>{item.total - item.bonus} {item.bonus > 0 ? `(+${item.bonus})` : ''}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="7">
                          {/* Subtable */}
                          <table style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Problem No.</th>
                                <th>Name/Grade</th>
                                <th>Flashed?</th>
                                <th>Points (+ Flash Bonus)</th>
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
                                  <td>{toTimeAgoString(score.createdAt)}</td>
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
              <td colSpan="10">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
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