import { apiGet, apiPost } from "./client";

export function searchJobs({ query, limit = 20, offset = 0 } = {}) {
  return apiGet("/jobs/search", { query, limit, offset });
}

export function ingestJobs({ query, page = 1, extract_requirements = false } = {}) {
  return apiPost("/jobs/ingest", { query, page, extract_requirements });
}

export function getJob(jobId) {
  return apiGet(`/jobs/${jobId}`);
}

export function extractJobRequirements(jobId) {
  return apiPost(`/jobs/${jobId}/extract-requirements`);
}