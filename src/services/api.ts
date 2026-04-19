import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

export const getProduct = async (qrId: string) => {
  const res = await API.get(`/product/${qrId}`);
  return res.data;
};
