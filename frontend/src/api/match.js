import { apiGet } from "./client";

export function matchJob(jobId) {
  return apiGet(`/match/job/${jobId}`);
}

export function matchAllJobs({ user_id, limit = 20 } = {}) {
  return apiGet("/match/jobs", {
    user_id,
    limit
  });
}