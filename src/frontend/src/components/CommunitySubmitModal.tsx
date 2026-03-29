import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { Loader2, Lock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  "nft",
  "tools",
  "social",
  "defi",
  "gaming",
  "wallet",
  "commerce",
  "exchange",
];

interface CommunitySubmitModalProps {
  open: boolean;
  onClose: () => void;
}

export function CommunitySubmitModal({
  open,
  onClose,
}: CommunitySubmitModalProps) {
  const { identity, login } = useInternetIdentity();
  const { actor } = useActor();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    description: "",
    ecosystem: "",
    category: "tools" as string,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !actor) return;
    if (
      !form.name.trim() ||
      !form.url.trim() ||
      !form.description.trim() ||
      !form.ecosystem.trim()
    ) {
      toast.error("Please fill in all fields.");
      return;
    }
    try {
      setSubmitting(true);
      await (actor as any).submitCommunityEntry({
        id: 0n,
        name: form.name.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        ecosystem: form.ecosystem.trim().toLowerCase().replace(/\s+/g, "-"),
        categories: [form.category],
        tier: 1n,
        createdAt: 0n,
      });
      toast.success("Submitted! Your project is under review.", {
        description: "You'll earn a Contributor badge once approved.",
      });
      setForm({
        name: "",
        url: "",
        description: "",
        ecosystem: "",
        category: "tools",
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="submit.dialog"
        className="max-w-md bg-card border-border"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <span className="text-primary">🌿</span> Submit a Project
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Free community submissions go into a review queue. Approved projects
            earn you a{" "}
            <span className="text-emerald-400 font-medium">Contributor</span>{" "}
            badge.
          </DialogDescription>
        </DialogHeader>

        {!identity ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Lock className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Sign in with Internet Identity to submit a project.
            </p>
            <Button
              onClick={login}
              data-ocid="submit.login_button"
              className="w-full"
            >
              Sign in with Internet Identity
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Project Name *
              </Label>
              <Input
                data-ocid="submit.name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. MyDApp"
                className="h-8 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Website URL *
              </Label>
              <Input
                data-ocid="submit.url.input"
                type="url"
                value={form.url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="https://"
                className="h-8 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Ecosystem *
              </Label>
              <Input
                data-ocid="submit.ecosystem.input"
                value={form.ecosystem}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ecosystem: e.target.value }))
                }
                placeholder="e.g. ICP, Ethereum, Solana"
                className="h-8 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Category *
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger
                  data-ocid="submit.category.select"
                  className="h-8 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Description *
              </Label>
              <Textarea
                data-ocid="submit.description.textarea"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Brief description of the project..."
                className="text-sm resize-none h-20"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              data-ocid="submit.submit_button"
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Submit for Review
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
