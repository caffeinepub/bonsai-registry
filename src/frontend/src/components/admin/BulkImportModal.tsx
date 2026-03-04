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
import { useActor } from "@/hooks/useActor";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
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
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BonsaiRegistryEntry[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleTextChange = useCallback((value: string) => {
    setJsonText(value);
    setImportedCount(null);
    if (!value.trim()) {
      setParseError(null);
      setPreview([]);
      return;
    }
    const { entries, error } = parseEntries(value);
    setParseError(error);
    setPreview(entries);
  }, []);

  const mutation = useMutation({
    mutationFn: async (entries: BonsaiRegistryEntry[]) => {
      if (!actor) throw new Error("Not connected");
      return actor.bulkImportEntries(entries);
    },
    onSuccess: (ids) => {
      const count = ids.length;
      setImportedCount(count);
      toast.success(`Imported ${count} entries successfully`);
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
            Paste a JSON array of entries to import them all at once into the
            backend registry.
          </DialogDescription>
        </DialogHeader>

        <Separator />

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
            <p className="text-xs font-medium text-foreground">JSON Data</p>
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
            rows={12}
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
            </div>
          )}
        </div>

        {/* Mutation error */}
        {mutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {mutation.error?.message ?? "Import failed"}
          </div>
        )}

        {/* Success */}
        {importedCount !== null && (
          <div className="flex items-center gap-2 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Successfully imported <strong>{importedCount}</strong> entries!
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
              importedCount !== null
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
