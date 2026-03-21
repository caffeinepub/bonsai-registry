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
import { Textarea } from "@/components/ui/textarea";
import {
  addBannerAdSubmission,
  detectMediaType,
  getBannerPricePerDay,
} from "@/data/monetizationData";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Copy, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ICP_PAYMENT_ADDRESS =
  "65b006befe37a7b1ea0573c201c285fcbdc069719a42c54de4108fc13b5db3c0";

const DURATION_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GetFeaturedModal({ open, onClose }: Props) {
  const pricePerDay = getBannerPricePerDay();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDays, setSelectedDays] = useState(30);
  const [projectName, setProjectName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [paymentMemo, setPaymentMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);

  const totalIcp = +(pricePerDay * selectedDays).toFixed(4);

  const handleClose = () => {
    if (!submitting) {
      onClose();
      // Reset after close animation
      setTimeout(() => {
        setStep(1);
        setSelectedDays(30);
        setProjectName("");
        setProjectUrl("");
        setDescription("");
        setMediaUrl("");
        setPaymentMemo("");
        setSuccess(false);
      }, 300);
    }
  };

  const copyToClipboard = async (text: string, type: "address" | "amount") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = () => {
    if (!paymentMemo.trim()) {
      toast.error("Please enter your payment transaction memo/hash");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      addBannerAdSubmission({
        projectName,
        url: projectUrl,
        description,
        mediaUrl,
        mediaType: detectMediaType(mediaUrl),
        durationDays: selectedDays,
        priceIcp: totalIcp,
        paymentMemo,
        submitterNote: "",
      });
      setSubmitting(false);
      setSuccess(true);
      toast.success(
        "Submission received! Your ad will go live after admin approval.",
      );
    }, 800);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-lg" data-ocid="featured.modal">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Get Featured on Bonsai Registry
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose how long you want to be featured"}
            {step === 2 && "Tell us about your project"}
            {step === 3 && "Send your ICP payment to activate"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                      ? "bg-primary/30 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {s < step ? <Check className="w-3 h-3" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "h-px w-8 transition-colors",
                    s < step ? "bg-primary/40" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {success ? (
          <div className="py-8 text-center" data-ocid="featured.success_state">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-2">
              Submission Received!
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your featured placement is under review. Once your payment is
              verified and admin approves, your banner goes live automatically.
            </p>
            <Button
              onClick={handleClose}
              className="mt-6"
              data-ocid="featured.close_button"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Step 1: Duration */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Current rate: <strong>{pricePerDay} ICP/day</strong>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {DURATION_OPTIONS.map((opt) => {
                    const price = +(pricePerDay * opt.days).toFixed(4);
                    const isSelected = selectedDays === opt.days;
                    return (
                      <button
                        type="button"
                        key={opt.days}
                        onClick={() => setSelectedDays(opt.days)}
                        data-ocid={`featured.duration_${opt.days}.toggle`}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="font-semibold text-sm">
                          {opt.label}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-mono font-bold",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {price} ICP
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Project Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proj-name">Project Name *</Label>
                  <Input
                    id="proj-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Bonsai Registry"
                    data-ocid="featured.input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-url">Project URL *</Label>
                  <Input
                    id="proj-url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://yourproject.xyz"
                    data-ocid="featured.input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proj-desc">
                    Description ({150 - description.length} chars left)
                  </Label>
                  <Textarea
                    id="proj-desc"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, 150))
                    }
                    placeholder="A short description of your project..."
                    rows={2}
                    data-ocid="featured.textarea"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media-url">Banner Media URL (optional)</Label>
                  <Input
                    id="media-url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://cdn.example.com/banner.mp4"
                    data-ocid="featured.input"
                  />
                </div>
                {/* Size recommendations */}
                <div className="rounded-lg border border-blue-400/30 bg-blue-500/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">
                      Banner Size Recommendations
                    </span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                    <li>
                      • Landscape (4:1):{" "}
                      <strong className="text-foreground">1200 × 300 px</strong>{" "}
                      — ideal for most displays
                    </li>
                    <li>
                      • Wide (5:1):{" "}
                      <strong className="text-foreground">1500 × 300 px</strong>{" "}
                      — best for large screens
                    </li>
                    <li>
                      • Max file size:{" "}
                      <strong className="text-foreground">10 MB</strong> images,{" "}
                      <strong className="text-foreground">25 MB</strong> MP4
                    </li>
                    <li>
                      • Formats:{" "}
                      <strong className="text-foreground">
                        PNG, JPEG, GIF, MP4
                      </strong>
                    </li>
                    <li>
                      • Tip: Use high-contrast visuals — banners appear over
                      dark backgrounds
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Send exactly:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded text-amber-400 font-bold">
                      {totalIcp.toFixed(4)} ICP
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(totalIcp.toFixed(4), "amount")
                      }
                      data-ocid="featured.secondary_button"
                    >
                      {copied === "amount" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    To this ICP address:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded text-muted-foreground break-all">
                      {ICP_PAYMENT_ADDRESS}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(ICP_PAYMENT_ADDRESS, "address")
                      }
                      data-ocid="featured.secondary_button"
                    >
                      {copied === "address" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-memo">
                    Payment Transaction Memo / Hash *
                  </Label>
                  <Input
                    id="payment-memo"
                    value={paymentMemo}
                    onChange={(e) => setPaymentMemo(e.target.value)}
                    placeholder="Paste your ICP transaction memo or hash here"
                    data-ocid="featured.input"
                  />
                  <p className="text-xs text-muted-foreground">
                    After sending the ICP payment, paste the transaction ID or
                    memo here so we can verify.
                  </p>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
                  else handleClose();
                }}
                data-ocid="featured.cancel_button"
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              {step < 3 ? (
                <Button
                  onClick={() => {
                    if (
                      step === 2 &&
                      (!projectName.trim() || !projectUrl.trim())
                    ) {
                      toast.error("Project name and URL are required");
                      return;
                    }
                    setStep((s) => (s + 1) as 1 | 2 | 3);
                  }}
                  data-ocid="featured.primary_button"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  data-ocid="featured.submit_button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
