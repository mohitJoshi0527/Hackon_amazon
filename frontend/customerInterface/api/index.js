import axios from "axios";
import { API_TIMEOUT, API_HEADERS } from "./config";
import { FLASK_API } from "@env";

const API = axios.create({
  baseURL: FLASK_API,
  timeout: API_TIMEOUT,
  headers: API_HEADERS,
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default API;
