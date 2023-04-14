import axios from "axios";

export const fetchServer = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL
});
