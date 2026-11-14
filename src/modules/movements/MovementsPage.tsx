import { Badge, Button, Collapse, Group, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconChevronDown, IconSearch } from "@tabler/icons-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCategories } from "../categories/hooks";
import { CategoriesUnavailable } from "../categories/CategoriesUnavailable";
import { SectionError, SectionSkeleton } from "../dashboard/SectionStates";
import { SyncNow } from "../dashboard/SyncNow";
import { getApiErrorKey } from "../shared/api-errors";
import { useMotionDuration } from "../shared/motion";
import { loadPref, savePref } from "../shared/prefs";
import { useTags } from "../tags/hooks";
import { ExportButton } from "./ExportButton";
import { FilterChips } from "./FilterChips";
import { filterChips } from "./chips";
import { MovementCards } from "./MovementCards";
import { MovementDrawer } from "./MovementDrawer";
import { MovementFilters } from "./MovementFilters";
import { MovementsChart } from "./MovementsChart";
import { MovementsTable } from "./MovementsTable";
import { feedRows, useMovementsFeed, useUpdateMovement } from "./hooks";
import {
  hasFilters,
  listItems,
  type MovementsSearch,
  toMovementsQuery,
  withFilter,
  withList,
  withText,
} from "./search";
import type { Movement } from "./types";

/** The search text is applied this long after the last keystroke. */
export const SEARCH_DEBOUNCE_MS = 300;

/** The saved open state of the filters panel, per viewer. Missing or any other value reads as closed. */
const FILTERS_STORAGE_KEY = "billetera.movementFilters";
const FILTERS_STORAGE_VALUES = ["open", "closed"] as const;
/** The filters panel's id, which the toggle's aria-controls names. */
const FILTERS_PANEL_ID = "movement-filters";

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
  // Closed on every width unless the viewer left it open. The choice is saved per browser.
  const [panelOpen, setPanelOpen] = useState(
    () => loadPref(FILTERS_STORAGE_KEY, FILTERS_STORAGE_VALUES, "closed") === "open",
  );
  const motion = useMotionDuration();

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
  const tags = useTags();
  const knownTags = useMemo(() => tags.data?.map((tag) => tag.name) ?? [], [tags.data]);
  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  );
  const categoryName = useCallback((id: string) => categoryNames.get(Number(id)), [categoryNames]);
  const rows = useMemo(() => feedRows(feed.data?.pages ?? []), [feed.data]);
  const filtered = hasFilters(search);
  // One per active filter chip, so the badge and the chips under the panel always agree.
  const activeFilters = useMemo(
    () => filterChips(search, { now, t, categoryName }).length,
    [search, now, t, categoryName],
  );

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

  // Adds a tag of a table row to the filter, keeping the other filters and tag_match. A tag already there, or a 21st
  // tag, changes nothing.
  const pickTag = useCallback(
    (name: string) => {
      const current = listItems(search.tag);
      if (current.includes(name) || current.length >= 20) {
        return;
      }
      go(withList(search, "tag", [...current, name]));
    },
    [go, search],
  );

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

  // Undo after Dismiss puts the row back under review, as the detector suggested it.
  const restore = useCallback(
    async (movement: Movement) => {
      try {
        await saveMovement({ id: movement.id, body: { review: "suspected" } });
        toast.success(t("movements.detection.restored"));
      } catch (error) {
        toast.error(t(getApiErrorKey(error)));
      }
    },
    [saveMovement, t],
  );

  const onUpdated = useCallback((movement: Movement) => setOpened(movement), []);

  // Saves the choice as it changes, so a reload shows the panel as the viewer left it.
  function toggleFilters() {
    const next = !panelOpen;
    setPanelOpen(next);
    savePref(FILTERS_STORAGE_KEY, next ? "open" : "closed");
  }

  const onDismissed = useCallback(
    (movement: Movement) => {
      setOpened(null);
      const toastId = toast(
        <UndoToast
          message={t("movements.detection.dismissed")}
          actionLabel={t("dashboard.card.undo")}
          onUndo={() => {
            toast.dismiss(toastId);
            void restore(movement);
          }}
        />,
        { autoClose: 8000 },
      );
    },
    [restore, t],
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
          variant="default"
          radius="xl"
          mih={44}
          leftSection={<IconAdjustmentsHorizontal size={18} aria-hidden />}
          rightSection={
            <IconChevronDown
              size={18}
              aria-hidden
              style={{
                transform: panelOpen ? "rotate(180deg)" : undefined,
                transition: motion > 0 ? `transform ${motion}ms ease` : undefined,
              }}
            />
          }
          aria-expanded={panelOpen}
          aria-controls={FILTERS_PANEL_ID}
          aria-label={
            !panelOpen && activeFilters > 0
              ? t("movements.filters.toggleCount", { count: activeFilters })
              : undefined
          }
          onClick={toggleFilters}
        >
          <span>
            {t("movements.filters.toggle")}
            {!panelOpen && activeFilters > 0 && (
              <Badge size="sm" circle ml={6} aria-hidden>
                {activeFilters}
              </Badge>
            )}
          </span>
        </Button>
      </Group>

      <Collapse
        expanded={panelOpen}
        transitionDuration={motion}
        transitionTimingFunction="ease"
      >
        <Paper id={FILTERS_PANEL_ID} bg="dark.6" radius={12} p={{ base: 16, sm: 20 }}>
          <MovementFilters
            search={search}
            onChange={go}
            categories={categories.data}
            knownTags={knownTags}
            now={now}
          />
        </Paper>
      </Collapse>

      <FilterChips search={search} onChange={go} categoryName={categoryName} now={now} />

      <MovementsChart
        search={search}
        now={now}
        onRange={(range) => go(withFilter(withFilter(search, "from", range.from), "to", range.to))}
      />

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
            onTagPick={pickTag}
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

      <MovementDrawer
        movement={opened}
        categories={categories.data}
        knownTags={knownTags}
        onClose={() => setOpened(null)}
        onUpdated={onUpdated}
        onDismissed={onDismissed}
      />
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

function UndoToast({
  message,
  actionLabel,
  onUndo,
}: {
  message: string;
  actionLabel: string;
  onUndo: () => void;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="sm">{message}</Text>
      <Button variant="subtle" size="compact-sm" mih={44} onClick={onUndo}>
        {actionLabel}
      </Button>
    </Group>
  );
}
