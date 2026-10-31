import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { getApiErrorKey } from "../shared/api-errors";
import { formatDateTime } from "../shared/format";
import { sessionQuery } from "../shared/session";
import { CredentialsForm } from "./CredentialsForm";
import { useDeleteCredentials } from "./hooks";

/** The Binance section of Settings: the saved key and its state, with replace and remove. */
export function ConnectionCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQuery);
  const [replaceOpened, replace] = useDisclosure(false);
  const [removeOpened, remove] = useDisclosure(false);
  const removeKey = useDeleteCredentials();

  if (!session) {
    return null;
  }

  if (!session.configured) {
    return (
      <Paper bg="dark.6" radius="lg" p="xl">
        <Title order={2} size="h3">
          {t("binance.card.title")}
        </Title>
        <Text c="dimmed" mt="sm">
          {t("binance.card.notConnected")}
        </Text>
        <Button mt="lg" component={Link} to="/connect">
          {t("binance.card.connect")}
        </Button>
      </Paper>
    );
  }

  const rejected = session.state === "rejected";

  const closeRemove = () => {
    remove.close();
    removeKey.reset();
  };

  const confirmRemove = () => {
    removeKey.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("binance.remove.removed"));
        navigate({ to: "/connect" });
      },
    });
  };

  return (
    <Paper bg="dark.6" radius="lg" p="xl">
      <Title order={2} size="h3">
        {t("binance.card.title")}
      </Title>

      {rejected && (
        <Alert color="red" title={t("binance.rejected.title")} mt="md">
          <Text size="sm">{t("binance.rejected.body")}</Text>
          <Button
            mt="sm"
            variant="white"
            color="red"
            size="sm"
            onClick={replace.open}
          >
            {t("binance.card.replace")}
          </Button>
        </Alert>
      )}

      <Stack gap="sm" mt="lg">
        <DetailRow label={t("binance.card.apiKey")}>
          <Text ff="monospace">{session.api_key_masked}</Text>
        </DetailRow>
        <DetailRow label={t("binance.card.status")}>
          <Badge color={rejected ? "red" : "accent"} variant="light">
            {t(`binance.state.${session.state}`)}
          </Badge>
        </DetailRow>
        <DetailRow label={t("binance.card.lastChecked")}>
          <Text>{formatDateTime(session.validated_at)}</Text>
        </DetailRow>
      </Stack>

      {!session.ip_restricted && (
        <Text c="dimmed" size="sm" mt="md">
          {t("binance.card.ipNote")}
        </Text>
      )}

      <Group gap="sm" mt="xl">
        <Button variant="default" onClick={replace.open}>
          {t("binance.card.replace")}
        </Button>
        <Button variant="subtle" color="red" onClick={remove.open}>
          {t("binance.card.remove")}
        </Button>
      </Group>

      <Modal
        opened={replaceOpened}
        onClose={replace.close}
        title={t("binance.replace.title")}
        closeButtonProps={{
          "aria-label": t("common.close"),
          size: 44,
          iconSize: 18,
        }}
        centered
      >
        <CredentialsForm
          submitLabel={t("binance.replace.submit")}
          onSaved={() => {
            replace.close();
            toast.success(t("binance.replace.saved"));
          }}
        />
      </Modal>

      <Modal
        opened={removeOpened}
        onClose={closeRemove}
        title={t("binance.remove.title")}
        closeButtonProps={{
          "aria-label": t("common.close"),
          size: 44,
          iconSize: 18,
        }}
        centered
      >
        <Text size="sm">{t("binance.remove.body")}</Text>
        {removeKey.isError && (
          <Alert color="red" mt="md">
            {t(getApiErrorKey(removeKey.error))}
          </Alert>
        )}
        <Group justify="flex-end" gap="sm" mt="xl">
          <Button variant="default" onClick={closeRemove}>
            {t("binance.remove.cancel")}
          </Button>
          <Button
            color="red"
            loading={removeKey.isPending}
            onClick={confirmRemove}
          >
            {t("binance.remove.confirm")}
          </Button>
        </Group>
      </Modal>
    </Paper>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" gap="md" wrap="wrap">
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      {children}
    </Group>
  );
}
