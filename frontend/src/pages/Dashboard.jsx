import { useState } from "react";
import { searchJobs, ingestJobs } from "../api/jobs";
import { matchAllJobs, matchJob } from "../api/match";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearchAndIngest() {
    setLoading(true);
    setError(null);
    try {
      // pull fresh listings from Arbeitnow into Supabase
      await ingestJobs({ query, extract_requirements: true });
      // then read them back from the DB
      const { jobs } = await searchJobs({ query, limit: 20 });
      setJobs(jobs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

async function handleRankMatches() {
  setLoading(true);

  try {

    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();


    const response = await matchAllJobs({
      user_id: session.user.id,
      limit: 20
    });


    console.log(
      "MATCH RESPONSE:",
      response
    );


    setMatches(response.matches || []);


  } catch(err) {
    setError(err.message);
  }
  finally {
    setLoading(false);
  }
}

  async function handleViewMatchDetail(jobId) {
    setLoading(true);
    setError(null);
    try {
      const detail = await matchJob(jobId);
      setSelectedMatch(detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Job Discovery</h1>

      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. python developer"
        />
        <button onClick={handleSearchAndIngest} disabled={loading}>
          {loading ? "Loading..." : "Search Jobs"}
        </button>
        <button onClick={handleRankMatches} disabled={loading}>
          Rank My Matches
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Jobs</h2>
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            <strong>{job.title}</strong> — {job.company} ({job.location})
            <button onClick={() => handleViewMatchDetail(job.id)}>
              View Match
            </button>
          </li>
        ))}
      </ul>

      <h2>Ranked Matches</h2>
      <ul>
  {(matches || []).map((m) => (
    <li key={m.job_id}>
      {m.job_title} — {m.company} — {m.match_score}% match
      <button onClick={() => handleViewMatchDetail(m.job_id)}>
        Details
      </button>
    </li>
  ))}
</ul>

      {selectedMatch && (
        <div>
          <h3>{selectedMatch.job_title} — {selectedMatch.match_score}%</h3>
          <p>{selectedMatch.explanation}</p>
          <p><strong>Strengths:</strong> {selectedMatch.strengths?.join(", ")}</p>
          <p><strong>Missing skills:</strong> {selectedMatch.missing_skills?.join(", ")}</p>
        </div>
      )}
    </div>
  );
}