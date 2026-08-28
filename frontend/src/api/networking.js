import { apiGet, apiPost } from "./client";

export function getCompanyPersonas({ company, role_title }) {
  return apiGet("/networking/company-personas", {
    company,
    role_title,
  });
}

export function generateOutreach({
  company,
  role_title,
  recipient_name,
  persona_type,
  channel,
  tone,
  custom_note,
}) {
  return apiPost("/networking/generate-outreach", {}, {
    company,
    role_title,
    recipient_name,
    persona_type,
    channel,
    tone,
    custom_note,
  });
}
