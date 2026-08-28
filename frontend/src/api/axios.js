import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const baseURL = rawBaseUrl.replace(/\/+$/, "");

const API = axios.create({
  baseURL,
});

export default API;