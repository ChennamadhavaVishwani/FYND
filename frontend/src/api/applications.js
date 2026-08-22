import { apiGet, apiPost, apiPut, apiDelete } from "./client";

export function listApplications() {
  return apiGet("/applications");
}

export function createApplication(jobId, status = "saved", notes = "") {
  return apiPost("/applications", {}, { job_id: jobId, status, notes });
}

export function updateApplication(appId, status, notes, appliedAt) {
  return apiPut(`/applications/${appId}`, {}, { status, notes, applied_at: appliedAt });
}

export function deleteApplication(appId) {
  return apiDelete(`/applications/${appId}`);
}
