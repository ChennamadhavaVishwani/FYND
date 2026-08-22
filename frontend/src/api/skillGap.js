import { apiGet } from "./client";

export function getSkillGapForJob(jobId) {
  return apiGet(`/skill-gap/job/${jobId}`);
}

export function getSkillGapOverview({ limit = 20 } = {}) {
  return apiGet("/skill-gap/overview", { limit });
}