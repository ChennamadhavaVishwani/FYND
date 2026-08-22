import { apiPost } from "./client";

export function getInterviewFeedback(question, response) {
  return apiPost("/interview/feedback", {}, { question, response });
}
