import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const baseUrl = 'https://firestore.googleapis.com/v1/projects/fingercomps-lite-au/databases/(default)/documents';
  const [comps, setComps] = useState([]);
  const [categories, setCategories] = useState({});
  const [scores, setScores] = useState({});
  const [competitors, setCompetitors] = useState({});
  const [problems, setProblems] = useState({});
  const [selectedComp, setSelectedComp] = useState("");
  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tableData, setTableData] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded rows
  const [limitScores, setLimitScores] = useState(false); // State for the checkbox
  const [loading, setLoading] = useState(true); // State for loading

  function twoMonthsAgoISOString() {
    const now = new Date();
    now.setMonth(now.getMonth() - 2);
    const isoString = now.toISOString();
    return isoString;
  }

  const fetchAllCategories = async (compId, pageSize = 300) => {
    let token = null;
    let allDocuments = [];
    try {
      while (true) {
        // Construct URL with the optional `pageToken`
        const url = `${baseUrl}/competitions/${compId}/categories?pageSize=${pageSize}${token ? `&pageToken=${token}` : ''}`;

        const response = await axios.get(url);
        const { documents, nextPageToken } = response.data;

        // Check if `documents` is an array before spreading it into `allDocuments`
        if (Array.isArray(documents)) {
          allDocuments = [...allDocuments, ...documents];
        } else {
          console.warn("Expected 'documents' to be an array but received:", documents);
        }

        // If there's no `nextPageToken`, we've fetched all pages
        if (!nextPageToken) break;

        // Update token for next iteration
        token = nextPageToken;
      }

      // Clean up retrieved data
      const cleanedCategories = allDocuments.reduce((acc, item) => {
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
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAllCompetitors = async (compId, pageSize = 300) => {
    let token = null;
    let allDocuments = [];
    try {
      while (true) {
        // Construct URL with the optional `pageToken`
        const url = `${baseUrl}/competitions/${compId}/competitors?pageSize=${pageSize}${token ? `&pageToken=${token}` : ''}`;

        const response = await axios.get(url);
        const { documents, nextPageToken } = response.data;

        // Check if `documents` is an array before spreading it into `allDocuments`
        if (Array.isArray(documents)) {
          allDocuments = [...allDocuments, ...documents];
        } else {
          console.warn("Expected 'documents' to be an array but received:", documents);
        }

        // If there's no `nextPageToken`, we've fetched all pages
        if (!nextPageToken) break;

        // Update token for next iteration
        token = nextPageToken;
      }

      // Clean up retrieved data
      const cleanedCompetitors = allDocuments.reduce((acc, item) => {
        acc[item.fields?.competitorNo?.integerValue] = {
          name: `${item.fields?.firstName?.stringValue.trim()} ${item.fields?.lastName?.stringValue.trim()}`,
          category: item.fields?.category?.stringValue,
          competitorNo: item.fields?.competitorNo?.integerValue,
        };
        return acc;
      }, {});

      setCompetitors(cleanedCompetitors);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAllScores = async (compId, pageSize = 300) => {
    let token = null;
    let allDocuments = [];
    try {
      while (true) {
        // Construct URL with the optional `pageToken`
        const url = `${baseUrl}/competitions/${compId}/qualificationScores?pageSize=${pageSize}${token ? `&pageToken=${token}` : ''}`;

        const response = await axios.get(url);
        const { documents, nextPageToken } = response.data;

        // Check if `documents` is an array before spreading it into `allDocuments`
        if (Array.isArray(documents)) {
          allDocuments = [...allDocuments, ...documents];
        } else {
          console.warn("Expected 'documents' to be an array but received:", documents);
        }

        // If there's no `nextPageToken`, we've fetched all pages
        if (!nextPageToken) break;

        // Update token for next iteration
        token = nextPageToken;
      }

      // Clean up retrieved data
      const cleanedScores = allDocuments.reduce((acc, item) => {
        const competitorNo = item.fields?.competitorNo?.integerValue;
        if (!acc[competitorNo]) {
          acc[competitorNo] = [];
        }
        acc[item.fields?.competitorNo?.integerValue].push({
          climbNo: item.fields?.climbNo?.integerValue,
          // competitorNo: item.fields?.competitorNo?.integerValue,
          category: item.fields?.category?.stringValue,
          flashed: item.fields?.flash?.booleanValue,
          topped: item.fields?.topped?.booleanValue,
          // attemps: item.fields?.attempts?.integerValue,
        });
        return acc;
      }, {});

      setScores(cleanedScores);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAllProblems = async (compId, pageSize = 300) => {
    let token = null;
    let allDocuments = [];
    try {
      while (true) {
        // Construct URL with the optional `pageToken`
        const url = `${baseUrl}/competitions/${compId}/climbs?pageSize=${pageSize}${token ? `&pageToken=${token}` : ''}`;

        const response = await axios.get(url);
        const { documents, nextPageToken } = response.data;

        // Check if `documents` is an array before spreading it into `allDocuments`
        if (Array.isArray(documents)) {
          allDocuments = [...allDocuments, ...documents];
        } else {
          console.warn("Expected 'documents' to be an array but received:", documents);
        }

        // If there's no `nextPageToken`, we've fetched all pages
        if (!nextPageToken) break;

        // Update token for next iteration
        token = nextPageToken;
      }

      // Clean up retrieved data
      const cleanedProblems = allDocuments.reduce((acc, item) => {
        acc[item.fields?.climbNo?.integerValue] = {
          score: item.fields?.score?.integerValue,
          station: item.fields?.station?.stringValue,
          marking: item.fields?.marking?.stringValue,
          climbNo: item.fields?.climbNo?.integerValue,
          // categories: item.fields?.categories?.stringValue,
          // notes: item.fields?.notes?.stringValue,
        };
        return acc;
      }, {});

      setProblems(cleanedProblems);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  function computeScore(sortedScores, flashPoints, limit) {
    let tops = 0;
    let flashes = 0;

    const total = sortedScores
      .slice(0, limit)
      .reduce((sum, s) => {
          if (!s) return sum; // If s is undefined, skip it

          tops += 1; // Increment tops for every valid score
          const scoreValue = parseInt(s.score) + (s.flashed ? flashPoints : 0);
          if (s.flashed) flashes += 1; // Increment flashes if s.flashed is true

          return sum + scoreValue; // Accumulate the score
      }, 0);

    return { tops, flashes, total };
}

  useEffect(() => {
    const requestBody = {
      "structuredQuery": {
        "from": [
          {
            "collectionId": "competitions"
          }
        ],
        "where": {
          "fieldFilter": {
            "field": {
              "fieldPath": "modified"
            },
            "op": "GREATER_THAN_OR_EQUAL",
            "value": {
              "timestampValue": twoMonthsAgoISOString()
            }
          }
        },
        "orderBy": [
          {
            "field": {
              "fieldPath": "modified"
            },
            "direction": "DESCENDING"
          },
          {
            "field": {
              "fieldPath": "__name__"
            },
            "direction": "DESCENDING"
          }
        ]
      }
    };

    setLoading(true);
    axios.post(`${baseUrl}:runQuery`, requestBody)  // Second argument is the request body
      .then((response) => {
        console.log(response);  // Log the response to check the structure
        setComps(response.data.filter((item) => item.document.fields?.trash?.booleanValue !== true) || []);  // Safely handle missing documents
        setSelectedCategory(""); // Set to "All" category by default once data is loaded
      })
      .catch((error) => {
        console.error("There was an error fetching the data!", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [baseUrl]);

  useEffect(() => {
    // Skip if compId not known yet
    if (selectedCompId.length === 0) return;

    setLoading(true);
    Promise.all([
      fetchAllCategories(selectedCompId),
      fetchAllCompetitors(selectedCompId),
      fetchAllScores(selectedCompId),
      fetchAllProblems(selectedCompId),
    ])
    .finally(() => {
      setLoading(false);
    });
  }, [selectedCompId]);

  useEffect(() => {
    function computeTableData() {
      const table = [];
      for (const [uid, user] of Object.entries(competitors)) {
        const row = {
          ...user,
          scores: (scores[uid] || [])
          .map(s => ({ ...s, ...problems[s?.climbNo] }))
          .sort((a, b) => parseInt(b.score) - parseInt(a.score)),
        };

        // Compute tops, flashes and score based on category rules
        const cat = categories[row.category];
        const { tops, flashes, total } = computeScore(
          row.scores,
          parseInt(cat?.flashExtraPoints || 0),
          parseInt(cat?.pumpfestTopScores || 0)
        );
        row['tops'] = tops;
        row['flashes'] = flashes;
        row['total'] = total;
        row['categoryFullName'] = cat?.name;

        table.push(row);
      }

      // Sort table by descending total score
      table.sort((a, b) => b.total - a.total);
      setTableData(table);
    }

    computeTableData();
  }, [categories, competitors, problems, scores]);

  const handleRowClick = (index) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index); // Collapse if already expanded
    } else {
      newExpandedRows.add(index); // Expand if not already expanded
    }
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className="App">
      <h1>FingerComps Expanded</h1>
      {/* Dropdown to select a competition */}
      <div>
        <label htmlFor="selectComp">Select Competition:</label>
        <select
          id="selectComp"
          value={selectedComp}
          onChange={(e) => {
            setSelectedComp(e.target.value);
            setSelectedCompId(comps[e.target.selectedIndex].document.name.split('/').pop());
          }}
          disabled={loading} // Disable while loading
        >
          {comps.map((item, index) => (
            <option key={index} value={item.document.fields?.name?.stringValue}>
              {item.document.fields?.name?.stringValue}
            </option>
          ))}
        </select>
      </div>
      {/* Dropdown to select a category */}
      <div>
        <label htmlFor="selectCategory">Select Category:</label>
        <select
          id="selectCategory"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={loading} // Disable while loading
        >
          <option value="">All</option> {/* Option to show all data */}
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
                      <td>{index + 1}</td>
                      <td>{item.categoryFullName}</td>
                      <td>{item.name}</td>
                      <td>{item.tops}</td>
                      <td>{item.flashes}</td>
                      <td>{item.total}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="5">
                          {/* Subtable goes here */}
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