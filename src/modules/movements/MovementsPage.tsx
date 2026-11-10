import { Button, Collapse, Group, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconAdjustmentsHorizontal, IconSearch } from "@tabler/icons-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCategories } from "../categories/hooks";
import { CategoriesUnavailable } from "../categories/CategoriesUnavailable";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { SyncNow } from "../dashboard/SyncNow";
import { getApiErrorKey } from "../shared/api-errors";
import { ExportButton } from "./ExportButton";
import { FilterChips } from "./FilterChips";
import { MovementCards } from "./MovementCards";
import { MovementDrawer } from "./MovementDrawer";
import { MovementFilters } from "./MovementFilters";
import { MovementsTable } from "./MovementsTable";
import { feedRows, useMovementsFeed, useUpdateMovement } from "./hooks";
import { hasFilters, type MovementsSearch, toMovementsQuery, withText } from "./search";
import type { Movement } from "./types";

/** The search text is applied this long after the last keystroke. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The Movements view. Its filters live in the URL, so a filtered view can be shared and survives a reload. The list is
 * paged: Load more asks for the next cursor with the same filters.
 */
export function MovementsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/_app/movements" });
  const navigate = useNavigate();
  // Taken once, so the date presets hold while the page is open.
  const [now] = useState(() => new Date());
  // The filters are always open on a wide screen, and behind a button on a narrow one.
  const wide = useMediaQuery("(min-width: 48em)", false, { getInitialValueInEffect: false });
  const [panelOpen, setPanelOpen] = useState(false);

  const [text, setText] = useState(search.q ?? "");
  const timer = useRef<number | undefined>(undefined);
  // The q this page last asked for. It tells a change from the page apart from one from outside, such as Back.
  const committedText = useRef(search.q ?? "");
  // The movement whose drawer is open. It's kept as it was opened, so a refetch can't close the drawer under the user.
  const [opened, setOpened] = useState<Movement | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const update = useUpdateMovement();

  const query = useMemo(() => toMovementsQuery(search), [search]);
  const feed = useMovementsFeed(query);
  const categories = useCategories();
  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );
  const categoryName = useCallback((id: string) => categoryNames.get(Number(id)), [categoryNames]);
  const rows = useMemo(() => feedRows(feed.data?.pages ?? []), [feed.data]);
  const filtered = hasFilters(search);

  // A search that changes some other way (a chip removed, Clear all, the back button) replaces the text. Text being typed
  // stays, while the URL catches up with it. The check runs during render, as React documents for state that follows a prop.
  const urlText = search.q ?? "";
  const [seenUrlText, setSeenUrlText] = useState(urlText);
  if (urlText !== seenUrlText) {
    setSeenUrlText(urlText);
    if (urlText !== text.trim()) {
      setText(urlText);
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // q changed from outside the page, such as Back or Forward. A search still waiting to be applied belongs to the old URL.
  useEffect(() => {
    if (urlText !== committedText.current) {
      window.clearTimeout(timer.current);
      committedText.current = urlText;
    }
  }, [urlText]);

  const go = useCallback(
    (next: MovementsSearch) => {
      window.clearTimeout(timer.current);
      committedText.current = next.q ?? "";
      setText(next.q ?? "");
      navigate({ to: "/movements", search: next });
    },
    [navigate],
  );

  // Replaces the history entry, so each pause in typing doesn't leave a step to go back to.
  function commitText(value: string) {
    window.clearTimeout(timer.current);
    committedText.current = withText({}, value).q ?? "";
    navigate({ to: "/movements", search: (prev) => withText(prev, value), replace: true });
  }

  function onTextChange(value: string) {
    setText(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commitText(value), SEARCH_DEBOUNCE_MS);
  }

  // Files a movement under a category, or under none, from the table. The list refetches once the save settles.
  // mutateAsync is a stable function, unlike the mutation's result, so the callback keeps its identity between renders.
  const saveMovement = update.mutateAsync;
  const setCategory = useCallback(
    async (movement: Movement, categoryId: number | null) => {
      setSavingId(movement.id);
      try {
        await saveMovement({ id: movement.id, body: { category_id: categoryId } });
      } catch (error) {
        toast.error(t(getApiErrorKey(error)));
      } finally {
        setSavingId(null);
      }
    },
    [saveMovement, t],
  );

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.1}>
          {t("movements.title")}
        </Title>
        <Text c="dimmed" mt="xs">
          {t("movements.subtitle")}
        </Text>
      </div>

      <Group gap="sm" align="center" wrap="wrap">
        <TextInput
          flex={1}
          miw={220}
          leftSection={<IconSearch size={18} aria-hidden />}
          placeholder={t("movements.filters.searchPlaceholder")}
          aria-label={t("movements.filters.search")}
          value={text}
          maxLength={100}
          onChange={(event) => onTextChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitText(text);
            }
          }}
          styles={{ input: { minHeight: 44 } }}
        />
        <ExportButton query={query} />
        <Button
          hiddenFrom="sm"
          variant="default"
          radius="xl"
          mih={44}
          leftSection={<IconAdjustmentsHorizontal size={18} aria-hidden />}
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((open) => !open)}
        >
          {t("movements.filters.toggle")}
        </Button>
      </Group>

      <Collapse expanded={wide || panelOpen}>
        <Paper bg="dark.6" radius={12} p={{ base: 16, sm: 20 }}>
          <MovementFilters search={search} onChange={go} categories={categories.data} now={now} />
        </Paper>
      </Collapse>

      <FilterChips search={search} onChange={go} categoryName={categoryName} now={now} />

      {categories.isError && <CategoriesUnavailable onRetry={() => categories.refetch()} />}

      {feed.isPending ? (
        <SectionSkeleton lines={6} />
      ) : feed.isError && rows.length === 0 ? (
        <SectionError error={feed.error} onRetry={() => feed.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyMovements filtered={filtered} onClear={() => go({})} />
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t("movements.list.count", { count: rows.length })}
          </Text>
          <MovementsTable
            rows={rows}
            categories={categories.data}
            onOpen={setOpened}
            onCategoryChange={setCategory}
            savingId={savingId}
          />
          <MovementCards rows={rows} categoryNames={categoryNames} onOpen={setOpened} />
          {feed.isFetchNextPageError && (
            <SectionError error={feed.error} onRetry={() => feed.fetchNextPage()} />
          )}
          {feed.hasNextPage && (
            <Group justify="center">
              <Button
                variant="default"
                radius="xl"
                mih={44}
                loading={feed.isFetchingNextPage}
                onClick={() => feed.fetchNextPage()}
              >
                {t("movements.list.loadMore")}
              </Button>
            </Group>
          )}
        </Stack>
      )}

      <MovementDrawer movement={opened} categories={categories.data} onClose={() => setOpened(null)} />
    </Stack>
  );
}

function EmptyMovements({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  const { t } = useTranslation();

  return (
    <Paper bg="dark.6" radius={12} p={{ base: 20, sm: 28 }}>
      <Stack gap="sm" align="flex-start">
        <Title order={2} fz={22} lh={1.2}>
          {filtered ? t("movements.empty.nothingTitle") : t("movements.empty.noneTitle")}
        </Title>
        <Text c="dimmed">{filtered ? t("movements.empty.nothingBody") : t("movements.empty.noneBody")}</Text>
        {filtered ? (
          <Button variant="default" radius="xl" mih={44} onClick={onClear}>
            {t("movements.filters.clearAll")}
          </Button>
        ) : (
          <SyncNow label={t("dashboard.sync.actionNow")} />
        )}
      </Stack>
    </Paper>
  );
}
