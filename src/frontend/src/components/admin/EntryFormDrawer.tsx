import type { BonsaiRegistryEntry, Category } from "@/backend.d";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ecosystemGroups } from "@/data/registryData";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CATEGORIES: Category[] = [
  "gaming" as Category,
  "nft" as Category,
  "defi" as Category,
  "wallet" as Category,
  "exchange" as Category,
  "social" as Category,
  "tools" as Category,
  "commerce" as Category,
];

const CATEGORY_LABELS: Record<string, string> = {
  gaming: "🎮 Gaming",
  nft: "🖼️ NFT",
  defi: "💰 DeFi",
  wallet: "👛 Wallet",
  exchange: "🔄 Exchange",
  social: "💬 Social",
  tools: "🔧 Tools",
  commerce: "🛒 Commerce",
};

const allEcosystemSlugs = ecosystemGroups.map((g) => g.slug);

interface EntryFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: BonsaiRegistryEntry | null;
}

interface FormState {
  name: string;
  description: string;
  url: string;
  ecosystem: string;
  categories: Category[];
  tier: string;
  logoUrl: string;
}

const defaultForm: FormState = {
  name: "",
  description: "",
  url: "",
  ecosystem: "",
  categories: [],
  tier: "3",
  logoUrl: "",
};

function entryToForm(entry: BonsaiRegistryEntry): FormState {
  return {
    name: entry.name,
    description: entry.description,
    url: entry.url,
    ecosystem: entry.ecosystem,
    categories: entry.categories,
    tier: entry.tier.toString(),
    logoUrl: entry.logoUrl ?? "",
  };
}

function validateForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.url.trim()) errors.url = "URL is required";
  else if (!form.url.startsWith("https://") && !form.url.startsWith("http://"))
    errors.url = "URL must start with https://";
  if (!form.ecosystem.trim()) errors.ecosystem = "Ecosystem is required";
  return errors;
}

export function EntryFormDrawer({
  open,
  onClose,
  onSuccess,
  entry,
}: EntryFormDrawerProps) {
  const actor = useAdminActorContext();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!entry;

  useEffect(() => {
    if (open) {
      setForm(entry ? entryToForm(entry) : defaultForm);
      setErrors({});
    }
  }, [open, entry]);

  const ADMIN_SECRET = "#WakeUp4";

  const mutation = useMutation({
    mutationFn: async (f: FormState) => {
      if (!actor) throw new Error("Not connected");
      const entryData: BonsaiRegistryEntry = {
        id: isEdit ? entry!.id : 0n,
        name: f.name.trim(),
        description: f.description.trim(),
        url: f.url.trim(),
        ecosystem: f.ecosystem.trim().toLowerCase(),
        categories: f.categories,
        tier: BigInt(Number.parseInt(f.tier)),
        createdAt: isEdit ? entry!.createdAt : BigInt(Date.now() * 1_000_000),
        logoUrl: f.logoUrl.trim() || undefined,
      };
      if (isEdit) {
        await actor.updateRegistryEntryWithSecret(
          ADMIN_SECRET,
          entry!.id,
          entryData,
        );
      } else {
        await actor.addRegistryEntryWithSecret(ADMIN_SECRET, entryData);
      }
    },
    onSuccess: () => {
      toast.success(
        isEdit ? "Entry updated successfully" : "Entry added successfully",
      );
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    mutation.mutate(form);
  };

  const toggleCategory = (cat: Category) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-card border-l border-border overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: "oklch(0.60 0.235 27)" }}
            />
            <SheetTitle className="font-display font-bold text-foreground">
              {isEdit ? "Edit Entry" : "Add New Entry"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {isEdit
              ? "Update the details for this registry entry."
              : "Fill in the details to add a new entry to the registry."}
          </SheetDescription>
        </SheetHeader>

        <Separator className="mb-5" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ef-name"
              className="text-xs font-medium text-foreground"
            >
              Name <span className="text-primary">*</span>
            </Label>
            <Input
              id="ef-name"
              data-ocid="admin.entry_form.name_input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. OpenChat"
              className="h-9 text-sm bg-secondary border-border focus-visible:border-primary focus-visible:ring-0"
            />
            {errors.name && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ef-desc"
              className="text-xs font-medium text-foreground"
            >
              Description
            </Label>
            <Textarea
              id="ef-desc"
              data-ocid="admin.entry_form.description_textarea"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Brief description of the project..."
              rows={3}
              className="text-sm bg-secondary border-border focus-visible:border-primary focus-visible:ring-0 resize-none"
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ef-url"
              className="text-xs font-medium text-foreground"
            >
              URL <span className="text-primary">*</span>
            </Label>
            <Input
              id="ef-url"
              data-ocid="admin.entry_form.url_input"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://example.com"
              className="h-9 text-sm bg-secondary border-border focus-visible:border-primary focus-visible:ring-0 font-mono"
            />
            {errors.url && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.url}
              </p>
            )}
          </div>

          {/* Ecosystem */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ef-eco"
              className="text-xs font-medium text-foreground"
            >
              Ecosystem <span className="text-primary">*</span>
            </Label>
            <div className="relative">
              <Input
                id="ef-eco"
                data-ocid="admin.entry_form.ecosystem_input"
                list="ecosystem-suggestions"
                value={form.ecosystem}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ecosystem: e.target.value }))
                }
                placeholder="e.g. icp"
                className="h-9 text-sm bg-secondary border-border focus-visible:border-primary focus-visible:ring-0"
              />
              <datalist id="ecosystem-suggestions">
                {allEcosystemSlugs.map((slug) => (
                  <option key={slug} value={slug} />
                ))}
              </datalist>
            </div>
            {errors.ecosystem && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.ecosystem}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/60">
              Use lowercase slug (e.g. "icp", "hedera", "bitcoin")
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">
              Categories
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <Checkbox
                    id={`cat-${cat}`}
                    checked={form.categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label
                    htmlFor={`cat-${cat}`}
                    className="text-xs text-muted-foreground group-hover:text-foreground transition-colors cursor-pointer"
                  >
                    {CATEGORY_LABELS[cat]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tier */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Tier</Label>
            <Select
              value={form.tier}
              onValueChange={(v) => setForm((p) => ({ ...p, tier: v }))}
            >
              <SelectTrigger
                data-ocid="admin.entry_form.tier_select"
                className="h-9 text-sm bg-secondary border-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {[1, 2, 3, 4, 5].map((t) => (
                  <SelectItem key={t} value={t.toString()} className="text-sm">
                    Tier {t}{" "}
                    {t === 1
                      ? "— Foundation"
                      : t === 2
                        ? "— Core"
                        : t === 3
                          ? "— Standard"
                          : t === 4
                            ? "— Extended"
                            : "— Niche"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ef-logo"
              className="text-xs font-medium text-foreground"
            >
              Logo URL{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="ef-logo"
              data-ocid="admin.entry_form.logo_input"
              value={form.logoUrl}
              onChange={(e) =>
                setForm((p) => ({ ...p, logoUrl: e.target.value }))
              }
              placeholder="https://example.com/logo.png"
              className="h-9 text-sm bg-secondary border-border focus-visible:border-primary focus-visible:ring-0 font-mono"
            />
          </div>

          {/* Error message */}
          {mutation.isError && (
            <div className="flex items-center gap-2 p-3 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {mutation.error?.message ?? "An error occurred"}
            </div>
          )}

          {/* Success message */}
          {mutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Saved successfully!
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              data-ocid="admin.entry_form.submit_button"
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Entry"
              ) : (
                "Add Entry"
              )}
            </Button>
            <Button
              data-ocid="admin.entry_form.cancel_button"
              type="button"
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
