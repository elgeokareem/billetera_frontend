import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { RegisterForm } from "./types";

export function useRegister() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (values: RegisterForm) =>
      axios.post("/auth/register", values),
    onSuccess: () => {
      toast.success(t("auth.registerSuccess"));
    },
  });
}
