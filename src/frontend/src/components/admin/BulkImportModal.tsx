import type { BonsaiRegistryEntry, Category } from "@/backend.d";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import { useCanisterHealth } from "@/hooks/useCanisterHealth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface RawEntry {
  id?: number | string;
  name: string;
  description?: string;
  url: string;
  ecosystem: string;
  categories?: string[];
  tier?: number | string;
  logoUrl?: string;
  createdAt?: number | string;
}

const EXAMPLE = JSON.stringify(
  [
    {
      name: "Example Project",
      description: "A brief description",
      url: "https://example.com",
      ecosystem: "icp",
      categories: ["defi", "tools"],
      tier: 2,
      logoUrl: "https://example.com/logo.png",
    },
  ],
  null,
  2,
);

const VALID_CATEGORIES = new Set([
  "gaming",
  "nft",
  "defi",
  "wallet",
  "exchange",
  "social",
  "tools",
  "commerce",
]);

function parseEntries(raw: string): {
  entries: BonsaiRegistryEntry[];
  error: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], error: "Invalid JSON — check your syntax" };
  }

  if (!Array.isArray(parsed)) {
    return { entries: [], error: "Expected a JSON array of entries" };
  }

  const entries: BonsaiRegistryEntry[] = [];

  // Deduplicate by URL within the import batch
  const seenUrls = new Set<string>();

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as RawEntry;
    if (!item.name || typeof item.name !== "string") {
      return {
        entries: [],
        error: `Entry ${i + 1}: missing or invalid "name"`,
      };
    }
    if (!item.url || typeof item.url !== "string") {
      return {
        entries: [],
        error: `Entry ${i + 1}: missing or invalid "url"`,
      };
    }
    if (!item.ecosystem || typeof item.ecosystem !== "string") {
      return {
        entries: [],
        error: `Entry ${i + 1}: missing or invalid "ecosystem"`,
      };
    }

    const normalizedUrl = item.url.trim().toLowerCase().replace(/\/+$/, "");
    if (seenUrls.has(normalizedUrl)) continue; // skip duplicate
    seenUrls.add(normalizedUrl);

    const rawCategories = Array.isArray(item.categories) ? item.categories : [];
    const categories = rawCategories.filter((c) =>
      VALID_CATEGORIES.has(c),
    ) as Category[];

    entries.push({
      id: 0n,
      name: item.name.trim(),
      description: (item.description ?? "").trim(),
      url: item.url.trim(),
      ecosystem: item.ecosystem.trim().toLowerCase(),
      categories,
      tier: BigInt(Number.parseInt(String(item.tier ?? "3")) || 3),
      logoUrl: item.logoUrl?.trim() || undefined,
      createdAt: BigInt(Date.now() * 1_000_000),
    });
  }

  return { entries, error: null };
}

export function BulkImportModal({ open, onClose }: BulkImportModalProps) {
  const actor = useAdminActorContext();
  const queryClient = useQueryClient();
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BonsaiRegistryEntry[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    status: healthStatus,
    isChecking: healthChecking,
    retry: healthRetry,
  } = useCanisterHealth(open && !!actor);

  const processJson = useCallback((value: string, name?: string) => {
    setJsonText(value);
    setImportedCount(null);
    if (name !== undefined) setFileName(name);
    if (!value.trim()) {
      setParseError(null);
      setPreview([]);
      return;
    }
    const { entries, error } = parseEntries(value);
    setParseError(error);
    setPreview(entries);
  }, []);

  const handleTextChange = useCallback(
    (value: string) => processJson(value, undefined),
    [processJson],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.endsWith(".json")) {
        toast.error("Please select a .json file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        processJson(text, file.name);
      };
      reader.readAsText(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [processJson],
  );

  const ADMIN_SECRET = "#WakeUp4";

  const mutation = useMutation({
    mutationFn: async (entries: BonsaiRegistryEntry[]) => {
      if (!actor) throw new Error("Not connected");
      return actor.bulkImportEntriesWithSecret(ADMIN_SECRET, entries);
    },
    onSuccess: (ids, submittedEntries) => {
      const count = ids.length;
      const skipped = submittedEntries.length - count;
      setImportedCount(count);
      setSkippedCount(skipped);
      if (skipped > 0) {
        toast.success(
          `Imported ${count} new ${
            count === 1 ? "entry" : "entries"
          }. ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.`,
        );
      } else {
        toast.success(
          `Imported ${count} ${count === 1 ? "entry" : "entries"} successfully`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["registry-entries"] });
      queryClient.invalidateQueries({ queryKey: ["registry-entries-count"] });
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });

  const handleClose = () => {
    setJsonText("");
    setParseError(null);
    setPreview([]);
    setImportedCount(null);
    setSkippedCount(0);
    setFileName(null);
    mutation.reset();
    onClose();
  };

  const handleImport = () => {
    if (preview.length === 0 || parseError) return;
    mutation.mutate(preview);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: "oklch(0.60 0.235 27)" }}
            />
            <DialogTitle className="font-display font-bold text-foreground">
              Bulk Import Entries
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a JSON file or paste a JSON array to import entries into the
            backend registry. Duplicate URLs are automatically skipped.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* File upload area */}
        <div>
          <p className="text-xs font-medium text-foreground mb-2">
            Upload JSON File
          </p>
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-secondary/30 hover:bg-primary/5 transition-colors cursor-pointer py-6 px-4"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            // biome-ignore lint/a11y/useSemanticElements: <explanation>
            role="button"
            tabIndex={0}
            aria-label="Upload JSON file"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileUpload}
              data-ocid="admin.bulk_import.upload_button"
            />
            <Upload className="w-8 h-8 text-muted-foreground/40" />
            {fileName ? (
              <div className="text-center">
                <p className="text-sm font-medium text-primary">{fileName}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  File loaded — review below before importing
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Click to select a{" "}
                  <span className="text-primary font-medium">.json</span> file
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  Or paste JSON directly in the text area below
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Format hint */}
        <div className="rounded-md border border-border bg-secondary/40 p-3">
          <div className="flex items-start gap-2 mb-2">
            <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
              Expected JSON Format
            </p>
          </div>
          <pre className="text-[10px] font-mono text-muted-foreground/80 overflow-x-auto whitespace-pre-wrap">
            {EXAMPLE}
          </pre>
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Valid categories:{" "}
            <span className="text-muted-foreground">
              gaming, nft, defi, wallet, exchange, social, tools, commerce
            </span>
          </p>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">
              Or Paste JSON Directly
            </p>
            {preview.length > 0 && !parseError && (
              <span className="text-[10px] font-mono text-primary">
                ✓ {preview.length} entries ready to import
              </span>
            )}
          </div>
          <Textarea
            data-ocid="admin.bulk_import.textarea"
            value={jsonText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`Paste your JSON array here...\n\n${EXAMPLE}`}
            rows={10}
            className="font-mono text-xs bg-secondary border-border focus-visible:border-primary focus-visible:ring-0 resize-y"
          />

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview count */}
          {preview.length > 0 && !parseError && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-primary/10 border border-primary/20 text-xs text-primary">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Ready to import <strong>{preview.length}</strong> entries
              {fileName && (
                <span className="text-muted-foreground/60">
                  from {fileName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Canister health warning */}
        {(healthStatus === "starting" || healthStatus === "offline") && (
          <div
            data-ocid="admin.bulk_import.health_warning"
            className={[
              "flex items-start gap-2 p-3 rounded border text-xs",
              healthStatus === "starting"
                ? "bg-amber-400/10 border-amber-400/30 text-amber-300"
                : "bg-destructive/10 border-destructive/30 text-destructive",
            ].join(" ")}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {healthStatus === "starting"
                  ? "Canister is starting up — import may fail"
                  : "Canister is offline — import will fail"}
              </p>
              <p className="opacity-80 mt-0.5">
                {healthStatus === "starting"
                  ? "The backend is recovering after a recent deployment. Wait 30-60 seconds before importing."
                  : "The backend could not be reached. Please wait and retry."}
              </p>
              <button
                type="button"
                data-ocid="admin.bulk_import.health_retry_button"
                onClick={healthRetry}
                disabled={healthChecking}
                className="mt-1.5 flex items-center gap-1 font-medium underline underline-offset-2 disabled:opacity-50"
              >
                {healthChecking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {healthChecking ? "Checking..." : "Re-check canister status"}
              </button>
            </div>
          </div>
        )}

        {/* Mutation error */}
        {mutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {mutation.error?.message ?? "Import failed"}
          </div>
        )}

        {/* Success */}
        {importedCount !== null && (
          <div className="flex flex-col gap-1 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                Successfully imported <strong>{importedCount}</strong> new{" "}
                {importedCount === 1 ? "entry" : "entries"}.
              </span>
            </div>
            {skippedCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>{skippedCount}</strong> duplicate
                  {skippedCount === 1 ? "" : "s"} already existed and were
                  skipped.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-1">
          <Button
            data-ocid="admin.bulk_import.cancel_button"
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            {importedCount !== null ? "Close" : "Cancel"}
          </Button>
          <Button
            data-ocid="admin.bulk_import.submit_button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold gap-1.5"
            onClick={handleImport}
            disabled={
              mutation.isPending ||
              preview.length === 0 ||
              !!parseError ||
              importedCount !== null ||
              healthStatus === "offline" ||
              healthStatus === "starting"
            }
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing {preview.length} entries...
              </>
            ) : (
              `Import ${preview.length > 0 ? `${preview.length} ` : ""}Entries`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
