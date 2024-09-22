import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "react-toastify";
import { RegisterForm } from "./types";

export function useRegister() {
  return useMutation({
    mutationFn: async (values: RegisterForm) => {
      return await axios.post(
        `${import.meta.env.VITE_BACKEND_ENDPOINT}/auth/register`,
        values
      );
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error?.response?.data?.message);
    },
    onSuccess: () => {
      toast.success("Account created successfully!");
    }
  });
}
