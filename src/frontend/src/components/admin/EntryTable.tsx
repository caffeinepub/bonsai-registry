import type { BonsaiRegistryEntry } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ecosystemGroups } from "@/data/registryData";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DeleteEntryDialog } from "./DeleteEntryDialog";
import { EntryFormDrawer } from "./EntryFormDrawer";

type SortField = "name" | "ecosystem" | "tier" | "createdAt";
type SortDir = "asc" | "desc" | "none";

const CATEGORIES = [
  "gaming",
  "nft",
  "defi",
  "wallet",
  "exchange",
  "social",
  "tools",
  "commerce",
] as const;
const PAGE_SIZE = 25;

const CATEGORY_COLORS: Record<string, string> = {
  gaming: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  nft: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  defi: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  wallet: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  exchange: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  social: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  tools: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  commerce: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const allEcosystems = ecosystemGroups.map((g) => g.slug);

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) {
  if (sortField !== field || sortDir === "none")
    return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  if (sortDir === "asc")
    return <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary" />;
  return <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

export function EntryTable() {
  const actor = useAdminActorContext();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [ecosystemFilter, setEcosystemFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BonsaiRegistryEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<BonsaiRegistryEntry | null>(
    null,
  );

  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<BonsaiRegistryEntry[]>({
    queryKey: ["registry-entries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRegistryEntries(0n, 5000n);
    },
    enabled: !!actor,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      if (ecosystemFilter !== "all" && e.ecosystem !== ecosystemFilter)
        return false;
      if (
        categoryFilter !== "all" &&
        !e.categories.includes(categoryFilter as never)
      )
        return false;
      if (
        q &&
        !e.name.toLowerCase().includes(q) &&
        !e.description.toLowerCase().includes(q) &&
        !e.ecosystem.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [entries, search, ecosystemFilter, categoryFilter]);

  const sorted = useMemo(() => {
    if (sortDir === "none") return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "ecosystem")
        cmp = a.ecosystem.localeCompare(b.ecosystem);
      else if (sortField === "tier") cmp = Number(a.tier) - Number(b.tier);
      else if (sortField === "createdAt")
        cmp = Number(a.createdAt) - Number(b.createdAt);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const onEntryMutated = () => {
    queryClient.invalidateQueries({ queryKey: ["registry-entries"] });
    queryClient.invalidateQueries({ queryKey: ["registry-entries-count"] });
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              data-ocid="admin.entry_search_input"
              placeholder="Search entries..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 h-8 text-xs bg-secondary border-border focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          {/* Ecosystem filter */}
          <Select
            value={ecosystemFilter}
            onValueChange={(v) => {
              setEcosystemFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger
              data-ocid="admin.ecosystem_filter_select"
              className="h-8 w-[160px] text-xs bg-secondary border-border"
            >
              <SelectValue placeholder="All Ecosystems" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-64 overflow-y-auto">
              <SelectItem value="all" className="text-xs">
                All Ecosystems
              </SelectItem>
              {allEcosystems.map((eco) => (
                <SelectItem
                  key={eco}
                  value={eco}
                  className="text-xs capitalize"
                >
                  {eco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger
              data-ocid="admin.category_filter_select"
              className="h-8 w-[140px] text-xs bg-secondary border-border"
            >
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-xs">
                All Categories
              </SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem
                  key={cat}
                  value={cat}
                  className="text-xs capitalize"
                >
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add button */}
        <Button
          data-ocid="admin.add_entry_button"
          size="sm"
          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          onClick={() => setAddDrawerOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Entry
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
          {sorted.length} entries
          {(search || ecosystemFilter !== "all" || categoryFilter !== "all") &&
            " (filtered)"}
        </p>
        {totalPages > 1 && (
          <p className="font-mono text-[10px] text-muted-foreground/60">
            Page {page + 1} / {totalPages}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
                <TableHead
                  className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("name")}
                >
                  <span className="flex items-center">
                    Name
                    <SortIcon
                      field="name"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead
                  className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("ecosystem")}
                >
                  <span className="flex items-center">
                    Ecosystem
                    <SortIcon
                      field="ecosystem"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  Categories
                </TableHead>
                <TableHead
                  className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("tier")}
                >
                  <span className="flex items-center">
                    Tier
                    <SortIcon
                      field="tier"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  URL
                </TableHead>
                <TableHead
                  className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort("createdAt")}
                >
                  <span className="flex items-center">
                    Created
                    <SortIcon
                      field="createdAt"
                      sortField={sortField}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide text-muted-foreground text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                [...Array(8)].map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are purely decorative
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full bg-secondary/50" />
                    </TableCell>
                  </TableRow>
                ))}

              {isError && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div
                      data-ocid="admin.table.error_state"
                      className="flex items-center gap-2 py-6 justify-center text-destructive text-sm"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Failed to load entries.
                      <button
                        type="button"
                        onClick={() => refetch()}
                        className="underline"
                      >
                        Retry
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div
                      data-ocid="admin.table.empty_state"
                      className="py-16 text-center"
                    >
                      <div className="text-4xl mb-3 opacity-40">🌿</div>
                      <p className="font-display font-bold text-foreground mb-1">
                        No backend entries yet
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {entries.length === 0
                          ? "Add your first entry or bulk import from the static registry."
                          : "No entries match your current filters."}
                      </p>
                      {entries.length === 0 && (
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border text-xs gap-1"
                            onClick={() => setAddDrawerOpen(true)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Entry
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !isError &&
                paginated.map((entry, idx) => (
                  <TableRow
                    key={entry.id.toString()}
                    data-ocid={`admin.entry.item.${page * PAGE_SIZE + idx + 1}`}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    {/* Name */}
                    <TableCell className="py-2">
                      <div className="flex items-start gap-2 max-w-[200px]">
                        {entry.logoUrl && (
                          <img
                            src={entry.logoUrl}
                            alt=""
                            className="w-5 h-5 rounded object-cover flex-shrink-0 mt-0.5 opacity-80"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {entry.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">
                            {entry.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Ecosystem */}
                    <TableCell className="py-2">
                      <span className="font-mono text-[10px] text-muted-foreground capitalize">
                        {entry.ecosystem}
                      </span>
                    </TableCell>

                    {/* Categories */}
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {entry.categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
                            className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${CATEGORY_COLORS[cat] ?? "text-muted-foreground bg-muted/10 border-border"}`}
                          >
                            {cat}
                          </span>
                        ))}
                        {entry.categories.length > 2 && (
                          <span className="text-[9px] text-muted-foreground/60">
                            +{entry.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Tier */}
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono border-border text-muted-foreground h-5 px-1.5"
                      >
                        T{entry.tier.toString()}
                      </Badge>
                    </TableCell>

                    {/* URL */}
                    <TableCell className="py-2">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors max-w-[140px] group"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0 group-hover:text-primary" />
                        <span className="truncate">
                          {entry.url.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    </TableCell>

                    {/* Created */}
                    <TableCell className="py-2">
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {entry.createdAt
                          ? new Date(
                              Number(entry.createdAt) / 1_000_000,
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          data-ocid={`admin.entry.edit_button.${page * PAGE_SIZE + idx + 1}`}
                          onClick={() => setEditEntry(entry)}
                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit entry"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          data-ocid={`admin.entry.delete_button.${page * PAGE_SIZE + idx + 1}`}
                          onClick={() => setDeleteEntry(entry)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="font-mono text-[10px] text-muted-foreground/60">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              data-ocid="admin.table.pagination_prev"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-border"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              data-ocid="admin.table.pagination_next"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-border"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Drawers & Dialogs */}
      <EntryFormDrawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onSuccess={onEntryMutated}
        entry={null}
      />
      <EntryFormDrawer
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        onSuccess={onEntryMutated}
        entry={editEntry}
      />
      <DeleteEntryDialog
        entry={deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onSuccess={onEntryMutated}
      />
    </div>
  );
}
