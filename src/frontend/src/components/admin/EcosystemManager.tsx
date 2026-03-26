import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ecosystemGroups } from "@/data/registryData";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Info,
  Plus,
  RotateCcw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "bonsai_ecosystem_overrides";
const CUSTOM_KEY = "bonsai_custom_ecosystems";

interface EcosystemOverride {
  sortOrder: number;
  hidden: boolean;
  customName?: string;
  customToken?: string;
}
interface CustomEcosystem {
  slug: string;
  name: string;
  token: string;
  sortOrder: number;
  hidden: boolean;
}
interface EcoRow {
  slug: string;
  name: string;
  token: string;
  entryCount: number;
  isCustom: boolean;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

export function EcosystemManager() {
  const actor = useAdminActorContext();
  const [overrides, setOverrides] = useState<Record<string, EcosystemOverride>>(
    () => loadFromStorage(STORAGE_KEY, {}),
  );
  const [customEcosystems, setCustomEcosystems] = useState<CustomEcosystem[]>(
    () => loadFromStorage(CUSTOM_KEY, []),
  );
  const [rows, setRows] = useState<EcoRow[]>([]);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [addError, setAddError] = useState("");
  const [saved, setSaved] = useState(false);
  const [canisterLoaded, setCanisterLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from canister on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: actor is stable
  useEffect(() => {
    (actor as any)
      .getEcosystemOrder()
      .then((json) => {
        if (json?.trim()) {
          try {
            const parsed = JSON.parse(json) as {
              overrides?: Record<string, EcosystemOverride>;
              customEcosystems?: CustomEcosystem[];
            };
            if (parsed.overrides) {
              setOverrides(parsed.overrides);
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(parsed.overrides),
              );
            }
            if (parsed.customEcosystems) {
              setCustomEcosystems(parsed.customEcosystems);
              localStorage.setItem(
                CUSTOM_KEY,
                JSON.stringify(parsed.customEcosystems),
              );
            }
          } catch {}
        }
        setCanisterLoaded(true);
      })
      .catch(() => setCanisterLoaded(true));
  }, []);

  // Build sorted rows
  useEffect(() => {
    const staticRows: EcoRow[] = ecosystemGroups.map((g) => ({
      slug: g.slug,
      name: g.name,
      token: g.token,
      entryCount: g.entries.length,
      isCustom: false,
    }));
    const customRows: EcoRow[] = customEcosystems.map((c) => ({
      slug: c.slug,
      name: c.name,
      token: c.token,
      entryCount: 0,
      isCustom: true,
    }));
    const all = [...staticRows, ...customRows];
    all.sort(
      (a, b) =>
        (overrides[a.slug]?.sortOrder ?? all.indexOf(a)) -
        (overrides[b.slug]?.sortOrder ?? all.indexOf(b)),
    );
    setRows(all);
  }, [overrides, customEcosystems]);

  const persist = useCallback(
    async (
      ov: Record<string, EcosystemOverride>,
      customs: CustomEcosystem[],
    ) => {
      const payload = JSON.stringify({
        overrides: ov,
        customEcosystems: customs,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ov));
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customs));
      try {
        await (actor as any).saveEcosystemOrderWithSecret("#WakeUp4", payload);
      } catch (e) {
        console.error("Canister save failed:", e);
      }
    },
    [actor],
  );

  const debouncedSave = useCallback(
    (ov: Record<string, EcosystemOverride>, customs?: CustomEcosystem[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        persist(ov, customs ?? customEcosystems).then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }, 600);
    },
    [persist, customEcosystems],
  );

  const updateOverride = (
    slug: string,
    patch: Partial<EcosystemOverride>,
    idx: number,
  ) => {
    setOverrides((prev) => {
      const updated = {
        ...prev,
        [slug]: {
          ...(prev[slug] ?? { sortOrder: idx, hidden: false }),
          ...patch,
        },
      };
      debouncedSave(updated);
      return updated;
    });
  };

  const moveRow = (idx: number, dir: "up" | "down") => {
    const newRows = [...rows];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newRows.length) return;
    [newRows[idx], newRows[swapIdx]] = [newRows[swapIdx], newRows[idx]];
    const newOv = { ...overrides };
    newRows.forEach((row, i) => {
      newOv[row.slug] = {
        ...(newOv[row.slug] ?? { hidden: false }),
        sortOrder: i,
      };
    });
    setRows(newRows);
    setOverrides(newOv);
    debouncedSave(newOv);
  };

  const toggleHidden = (slug: string, idx: number) =>
    updateOverride(slug, { hidden: !overrides[slug]?.hidden }, idx);

  const handleAddCustom = () => {
    setAddError("");
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) return setAddError("Slug is required");
    if (!newName.trim()) return setAddError("Name is required");
    if (
      ecosystemGroups.some((g) => g.slug === slug) ||
      customEcosystems.some((c) => c.slug === slug)
    )
      return setAddError("Slug already exists");
    const newCustom: CustomEcosystem = {
      slug,
      name: newName.trim(),
      token: newToken.trim().toUpperCase() || slug.toUpperCase(),
      sortOrder: rows.length,
      hidden: false,
    };
    const updated = [...customEcosystems, newCustom];
    setCustomEcosystems(updated);
    debouncedSave(overrides, updated);
    setNewSlug("");
    setNewName("");
    setNewToken("");
    toast.success(`Added custom ecosystem: ${newCustom.name}`);
  };

  const handleReset = () => {
    setOverrides({});
    persist({}, customEcosystems);
    toast.success("Ecosystem overrides reset");
  };
  const handleManualSave = async () => {
    await persist(overrides, customEcosystems);
    toast.success("Saved to ICP canister");
  };

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground">Note:</strong> Ecosystem changes
            are saved to the ICP canister and reflect across all devices and
            browsers immediately.
            {!canisterLoaded && (
              <span className="text-amber-400 ml-1">
                Loading from canister…
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
              {rows.length} ecosystems ·{" "}
              {rows.filter((r) => overrides[r.slug]?.hidden).length} hidden
            </span>
            {saved && (
              <span className="font-mono text-[10px] text-emerald-400">
                \u2713 Saved to canister
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              data-ocid="admin.ecosystem.reset_button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
              onClick={handleManualSave}
            >
              <Save className="w-3 h-3" />
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          {rows.map((row, idx) => {
            const ov = overrides[row.slug];
            const isHidden = ov?.hidden ?? false;
            const customName = ov?.customName ?? "";
            const customToken = ov?.customToken ?? "";
            return (
              <div
                key={row.slug}
                data-ocid={`admin.ecosystem.item.${idx + 1}`}
                className={`rounded-lg border transition-colors ${isHidden ? "border-border/50 bg-secondary/20 opacity-60" : "border-border bg-secondary/40 hover:border-primary/20"}`}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      data-ocid={`admin.ecosystem.up_button.${idx + 1}`}
                      onClick={() => moveRow(idx, "up")}
                      disabled={idx === 0}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors hover:bg-secondary"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-ocid={`admin.ecosystem.down_button.${idx + 1}`}
                      onClick={() => moveRow(idx, "down")}
                      disabled={idx === rows.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors hover:bg-secondary"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground/40 w-6 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-sm text-foreground truncate">
                        {customName || row.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono px-1.5 h-4 border-primary/20 text-primary/70"
                      >
                        {customToken || row.token}
                      </Badge>
                      <span className="font-mono text-[9px] text-muted-foreground/40">
                        {row.slug}
                      </span>
                      {row.isCustom && (
                        <Badge className="text-[9px] px-1.5 h-4 bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          custom
                        </Badge>
                      )}
                      {row.entryCount > 0 && (
                        <span className="text-[9px] text-muted-foreground/50">
                          {row.entryCount} entries
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block w-36 flex-shrink-0">
                    <Input
                      value={customName}
                      onChange={(e) =>
                        updateOverride(
                          row.slug,
                          { customName: e.target.value },
                          idx,
                        )
                      }
                      placeholder={row.name}
                      className="h-7 text-xs bg-background/40 border-border/50 focus-visible:border-primary focus-visible:ring-0 placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <div className="hidden lg:block w-20 flex-shrink-0">
                    <Input
                      value={customToken}
                      onChange={(e) =>
                        updateOverride(
                          row.slug,
                          { customToken: e.target.value },
                          idx,
                        )
                      }
                      placeholder={row.token}
                      className="h-7 text-xs bg-background/40 border-border/50 focus-visible:border-primary focus-visible:ring-0 placeholder:text-muted-foreground/30 font-mono uppercase"
                      maxLength={8}
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isHidden ? (
                          <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-muted-foreground/60" />
                        )}
                        <Switch
                          data-ocid={`admin.ecosystem.toggle.${idx + 1}`}
                          checked={!isHidden}
                          onCheckedChange={() => toggleHidden(row.slug, idx)}
                          className="data-[state=checked]:bg-primary scale-75"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {isHidden
                        ? "Hidden from registry"
                        : "Visible in registry"}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="md:hidden flex gap-2 px-3 pb-3">
                  <Input
                    value={customName}
                    onChange={(e) =>
                      updateOverride(
                        row.slug,
                        { customName: e.target.value },
                        idx,
                      )
                    }
                    placeholder={`Custom name (${row.name})`}
                    className="h-7 text-xs bg-background/40 border-border/50 focus-visible:border-primary focus-visible:ring-0 flex-1"
                  />
                  <Input
                    value={customToken}
                    onChange={(e) =>
                      updateOverride(
                        row.slug,
                        { customToken: e.target.value },
                        idx,
                      )
                    }
                    placeholder={row.token}
                    className="h-7 text-xs bg-background/40 border-border/50 focus-visible:border-primary focus-visible:ring-0 w-20 font-mono uppercase"
                    maxLength={8}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="rounded-lg border border-dashed border-primary/25 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-sm text-foreground">
              Add Custom Ecosystem
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Add a new ecosystem group. Changes are saved to the ICP canister and
            reflect immediately everywhere.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Slug *
              </Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="e.g. near"
                className="h-8 text-xs bg-secondary border-border focus-visible:border-primary focus-visible:ring-0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Name *
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. NEAR Protocol"
                className="h-8 text-xs bg-secondary border-border focus-visible:border-primary focus-visible:ring-0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Token
              </Label>
              <Input
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="e.g. NEAR"
                className="h-8 text-xs bg-secondary border-border focus-visible:border-primary focus-visible:ring-0 font-mono uppercase"
                maxLength={8}
              />
            </div>
          </div>
          {addError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>\u26a0</span> {addError}
            </p>
          )}
          <Button
            size="sm"
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleAddCustom}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Ecosystem
          </Button>
        </div>

        {customEcosystems.length > 0 && (
          <div className="text-xs text-muted-foreground/60 text-center pt-1">
            {customEcosystems.length} custom ecosystem
            {customEcosystems.length !== 1 ? "s" : ""} saved to canister
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
