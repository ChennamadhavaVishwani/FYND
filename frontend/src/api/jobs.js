import { apiGet, apiPost } from "./client";

// Search stored jobs
export function searchJobs({ query = "", limit = 20, offset = 0 } = {}) {
  return apiGet("/jobs/search", { query, limit, offset });
}

// Ingest jobs from Arbeitnow (supports multi-page sweep)
export function ingestJobs({
  query = "",
  page = 1,
  pages = 1,
  extract_requirements = false,
} = {}) {
  const params = new URLSearchParams();
  if (query) params.append("query", query);
  params.append("page", page.toString());
  params.append("pages", pages.toString());
  params.append("extract_requirements", extract_requirements.toString());
  return apiPost(`/jobs/ingest?${params.toString()}`);
}

// Ingest jobs targeted at the user's saved career goals
export function ingestForGoals({ pages = 2, extract_requirements = true } = {}) {
  const params = new URLSearchParams();
  params.append("pages", pages.toString());
  params.append("extract_requirements", extract_requirements.toString());
  return apiPost(`/jobs/ingest-for-goals?${params.toString()}`);
}

// Get one job
export function getJob(jobId) {
  return apiGet(`/jobs/${jobId}`);
}

// Extract requirements for one job
export function extractJobRequirements(jobId) {
  return apiPost(`/jobs/${jobId}/extract-requirements`);
}