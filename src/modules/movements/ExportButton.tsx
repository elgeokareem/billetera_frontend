import { Button } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorKey } from "../shared/api-errors";
import { saveFile } from "../shared/download";
import { exportMovements, type MovementsQuery } from "./api";

interface ExportButtonProps {
  /** The filters of the list on screen. The export takes the same ones, and no paging. */
  query: Omit<MovementsQuery, "limit" | "cursor">;
}

/** Downloads the CSV of the movements that match the filters. A refused export says why, in the active language. */
export function ExportButton({ query }: ExportButtonProps) {
  const { t } = useTranslation();
  const exportCsv = useMutation({
    mutationFn: () => exportMovements(query),
    onSuccess: ({ blob, filename }) => saveFile(blob, filename),
    onError: (error) => toast.error(t(getApiErrorKey(error))),
  });

  return (
    <Button
      variant="default"
      radius="xl"
      mih={44}
      leftSection={<IconDownload size={18} aria-hidden />}
      loading={exportCsv.isPending}
      onClick={() => exportCsv.mutate()}
    >
      {t("movements.export.button")}
    </Button>
  );
}
