import { apiGet, apiPut, apiPost, apiDelete } from "./client";

export function getProfile() {
  return apiGet("/career/profile");
}

export function updateProfile(data) {
  return apiPut("/career/profile", {}, data);
}

export function addSkill(skill) {
  return apiPost("/career/profile/skills", {}, skill);
}

export function deleteSkill(skillId) {
  return apiDelete(`/career/profile/skills/${skillId}`);
}

export function addProject(project) {
  return apiPost("/career/profile/projects", {}, project);
}

export function deleteProject(projectId) {
  return apiDelete(`/career/profile/projects/${projectId}`);
}

export function addExperience(experience) {
  return apiPost("/career/profile/experience", {}, experience);
}

export function deleteExperience(experienceId) {
  return apiDelete(`/career/profile/experience/${experienceId}`);
}

export function chatWithCopilot(message, history = []) {
  return apiPost("/career/copilot", {}, { message, history });
}

// ── Career Goals ────────────────────────────────────────────

export function listGoals() {
  return apiGet("/career/goals");
}

export function createGoal(role_title) {
  return apiPost("/career/goals", {}, { role_title });
}

export function toggleGoalSkill(goalId, skill, category, checked) {
  return apiPut(`/career/goals/${goalId}/skill`, {}, { skill, category, checked });
}

export function deleteGoal(goalId) {
  return apiDelete(`/career/goals/${goalId}`);
}

// ── Resume ──────────────────────────────────────────────────

export function getLatestResume() {
  return apiGet("/resume/latest");
}
