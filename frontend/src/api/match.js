import { apiGet } from "./client";

export function matchJob(jobId) {
  return apiGet(`/match/job/${jobId}`);
}

export function matchAllJobs({ limit = 20 } = {}) {
  return apiGet("/match/jobs", {
    limit
  });
}