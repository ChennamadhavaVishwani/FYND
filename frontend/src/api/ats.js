import { apiPost } from "./client";

export function runAtsScan({ profile_id, resume_text } = {}) {
  return apiPost("/resume/ats-scan", {}, { profile_id, resume_text });
}

export function runAtsJdMatch({ profile_id, resume_text, job_title, job_description }) {
  return apiPost("/resume/ats-jd-match", {}, {
    profile_id,
    resume_text,
    job_title,
    job_description,
  });
}

export function optimizeBullet({ bullet_text, target_role }) {
  return apiPost("/resume/optimize-bullet", {}, {
    bullet_text,
    target_role,
  });
}
