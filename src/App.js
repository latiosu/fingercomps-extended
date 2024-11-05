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
  const [tableData, setTableData] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [limitScores, setLimitScores] = useState(false);
  const [loading, setLoading] = useState(true);

  const twoMonthsAgoISOString = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 2);
    return now.toISOString();
  };

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
        const row = { 
          ...user,
          scores: (scores[uid] || [])
            .map(s => ({ ...s, ...problems[s?.climbNo] }))
            .sort((a, b) => b.score - a.score)
        };
        const cat = categories[row.category];
        const { tops, flashes, total } = computeScore(
          row.scores,
          parseInt(cat?.flashExtraPoints || 0),
          parseInt(cat?.pumpfestTopScores || 0)
        );
        return { ...row, tops, flashes, total, categoryFullName: cat?.name };
      });
      setTableData(table.sort((a, b) => b.total - a.total));
    };
    computeTableData();
  }, [categories, competitors, problems, scores]);

  const handleRowClick = (index) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="App">
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
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={loading}
        >
          <option value="">All</option>
          {Object.values(categories).map((item, index) => (
            <option key={index} value={item.name}>
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
      <table border="1">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Category</th>
            <th>Name</th>
            <th>Tops</th>
            <th>Flashes</th>
            <th>Score (+ Flash Bonus)</th>
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
                const isExpanded = expandedRows.has(index);
                return (
                  <React.Fragment key={index}>
                    <tr onClick={() => handleRowClick(index)} style={{ cursor: 'pointer' }}>
                      <td>{isNaN(index) ? "N/A" : index + 1}</td>
                      <td>{item.categoryFullName}</td>
                      <td>{item.name}</td>
                      <td>{item.tops}</td>
                      <td>{item.flashes}</td>
                      <td>{item.total}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="5">
                          {/* Subtable */}
                          <table border="1" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Problem No.</th>
                                <th>Name/Grade</th>
                                <th>Flashed?</th>
                                <th>Points</th>
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
                                  <td>{score.score}</td>
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
    </div>
  );
}

export default App;