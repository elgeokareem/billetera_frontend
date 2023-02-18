import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// make a generic type object that has a message key with a string value
type ErrorType = {
  message: string;
};

export function useFetchUser() {
  console.log("ENTRA AL USE FETCH USER");
  async function fetchTodoList() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_KEK}/auth/login`);

      return res.data;
    } catch (error) {
      return error;
    }
  }

  const { isLoading, isError, data, error } = useQuery({
    queryKey: ["user", "info"],
    queryFn: fetchTodoList
  });

  if (isLoading) {
    return <span>Loading...</span>;
  }

  if (isError) {
    return <span>Error: {(error as ErrorType).message}</span>;
  }

  return data;
}
