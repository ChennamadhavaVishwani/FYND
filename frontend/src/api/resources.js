import { apiGet } from "./client";

/**
 * Fetches curated learning resources for a list of skill names.
 * @param {string[]} skills - Array of skill names, e.g. ["React", "Docker"]
 */
export function getSkillResources(skills) {
  const skillsParam = skills.join(",");
  return apiGet("/skill-gap/resources", { skills: skillsParam });
}
