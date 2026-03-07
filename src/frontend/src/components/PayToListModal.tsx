/**
 * PayToListModal — Multi-step modal for paid project submission.
 *
 * Flow:
 *   Step 1: Fill project details
 *   Step 2: Review fee + confirm payment
 *   Step 3: OISY payment (ICRC-49 icrc1_transfer)
 *   Step 4: Success / waiting for review
 */
import { type BonsaiRegistryEntry, Category } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createActorWithConfig, loadConfig } from "@/config";
import { ecosystemGroups } from "@/data/registryData";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useOisyWallet } from "@/hooks/useOisyWallet";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Loader2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ICP Ledger canister ID
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Convert e8s to ICP display string
function e8sToIcp(e8s: bigint): string {
  const icp = Number(e8s) / 1e8;
  return icp.toFixed(4).replace(/\.?0+$/, "");
}

// Generate a random 32-byte hex memo
function randomMemo(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: Category.nft, label: "NFT" },
  { value: Category.defi, label: "DeFi" },
  { value: Category.gaming, label: "Gaming" },
  { value: Category.wallet, label: "Wallet" },
  { value: Category.exchange, label: "Exchange" },
  { value: Category.social, label: "Social" },
  { value: Category.tools, label: "Tools" },
  { value: Category.commerce, label: "Commerce" },
];

const ALL_ECOSYSTEMS = ecosystemGroups.map((g) => ({
  value: g.slug,
  label: g.name,
}));

interface ProjectFormData {
  name: string;
  url: string;
  description: string;
  ecosystem: string;
  categories: Category[];
  logoUrl: string;
}

const EMPTY_FORM: ProjectFormData = {
  name: "",
  url: "",
  description: "",
  ecosystem: "",
  categories: [],
  logoUrl: "",
};

type Step = 1 | 2 | 3 | 4;

interface PayToListModalProps {
  open: boolean;
  onClose: () => void;
}

export function PayToListModal({ open, onClose }: PayToListModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({});
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [memo] = useState(() => randomMemo());

  const { identity } = useInternetIdentity();
  const oisy = useOisyWallet();

  // Fetch listing fee
  const { data: listingFeeE8s, isLoading: feeLoading } = useQuery<bigint>({
    queryKey: ["listing-fee"],
    queryFn: async () => {
      const actor = await createActorWithConfig();
      return actor.getListingFee();
    },
    staleTime: 30_000,
    enabled: open,
  });

  const feeIcp = listingFeeE8s !== undefined ? e8sToIcp(listingFeeE8s) : "…";

  const handleClose = () => {
    setStep(1);
    setForm(EMPTY_FORM);
    setErrors({});
    setPaymentError(null);
    setIsSubmitting(false);
    onClose();
  };

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const newErrors: Partial<ProjectFormData> = {};
    if (!form.name.trim()) newErrors.name = "Project name is required";
    if (!form.url.trim()) {
      newErrors.url = "URL is required";
    } else {
      try {
        new URL(form.url.trim());
      } catch {
        newErrors.url = "Please enter a valid URL (e.g. https://example.com)";
      }
    }
    if (!form.description.trim())
      newErrors.description = "Description is required";
    if (!form.ecosystem) newErrors.ecosystem = "Please select an ecosystem";
    if (form.categories.length === 0)
      newErrors.categories = ["nft"] as unknown as Category[]; // Trick to pass type
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  // ── Payment flow ──────────────────────────────────────────────────────────
  const handlePayAndSubmit = async () => {
    if (!oisy.connected || !oisy.accounts[0]) {
      setPaymentError("Please connect your OISY wallet first before paying.");
      return;
    }
    if (!identity) {
      setPaymentError(
        "Please sign in with Internet Identity before submitting.",
      );
      return;
    }
    if (listingFeeE8s === undefined) {
      setPaymentError("Could not load listing fee. Please try again.");
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);
    setStep(3);

    try {
      // Get the backend canister ID (listing fee recipient)
      const cfg = await loadConfig();
      const backendCanisterId = cfg.backend_canister_id;

      // Properly encode the ICRC-1 transfer argument using @dfinity/candid.
      // OISY uses this to fetch an ICRC-21 consent message from the ICP Ledger,
      // which it displays to the user before asking for approval.
      // A malformed/empty arg causes OISY error 2000 ("Not supported").
      const transferArg = encodeIcrc1TransferArg({
        to: backendCanisterId, // registry canister receives the listing fee
        amount: listingFeeE8s,
        memo: hexToBytes(memo),
      });

      const callResult = await oisy.sendCallCanisterRequest({
        canisterId: ICP_LEDGER_CANISTER_ID,
        method: "icrc1_transfer",
        arg: transferArg,
      });

      if (callResult.error) {
        setPaymentError(`Payment failed: ${callResult.error.message}`);
        setStep(2);
        setIsSubmitting(false);
        return;
      }

      // Payment succeeded — now submit to backend
      const entry: BonsaiRegistryEntry = {
        id: 0n,
        name: form.name.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        ecosystem: form.ecosystem,
        categories: form.categories,
        tier: 3n,
        logoUrl: form.logoUrl.trim() || undefined,
        createdAt: BigInt(Date.now()) * 1_000_000n, // nanoseconds
      };

      // Call backend with II identity
      const { createActorWithConfig: createActor } = await import("@/config");
      const actor = await createActor({ agentOptions: { identity } });
      await actor.submitProjectListing(entry, memo);

      setStep(4);
      toast.success("Project submitted for review!");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.";
      setPaymentError(message);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        data-ocid="pay_to_list.dialog"
        className="max-w-lg bg-card border-border w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto"
      >
        {/* Progress indicator */}
        <div className="flex gap-1.5 mb-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className={[
                "h-0.5 flex-1 rounded-full transition-all duration-300",
                step >= s ? "bg-primary" : "bg-border",
              ].join(" ")}
            />
          ))}
        </div>

        {/* ── Step 1: Project Details ── */}
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] text-primary/60 uppercase tracking-widest">
                  Step 1 of 4
                </span>
              </div>
              <DialogTitle className="font-display font-bold text-xl">
                List Your Project
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Add your Web3 project to the Bonsai Registry. Fill in the
                details below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="proj-name" className="text-xs font-mono">
                  Project Name *
                </Label>
                <Input
                  id="proj-name"
                  data-ocid="pay_to_list.name_input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. KongSwap"
                  className="bg-secondary border-border text-sm"
                />
                {errors.name && (
                  <p
                    data-ocid="pay_to_list.name_error"
                    className="text-[11px] text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <Label htmlFor="proj-url" className="text-xs font-mono">
                  Project URL *
                </Label>
                <Input
                  id="proj-url"
                  data-ocid="pay_to_list.url_input"
                  value={form.url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://example.com"
                  className="bg-secondary border-border text-sm"
                />
                {errors.url && (
                  <p
                    data-ocid="pay_to_list.url_error"
                    className="text-[11px] text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.url}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc" className="text-xs font-mono">
                  Description *
                </Label>
                <Textarea
                  id="proj-desc"
                  data-ocid="pay_to_list.description_textarea"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description of your project..."
                  className="bg-secondary border-border text-sm min-h-[80px] resize-none"
                  maxLength={300}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {form.description.length}/300
                </p>
                {errors.description && (
                  <p
                    data-ocid="pay_to_list.description_error"
                    className="text-[11px] text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Ecosystem */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono">Ecosystem *</Label>
                <Select
                  value={form.ecosystem}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, ecosystem: v }))
                  }
                >
                  <SelectTrigger
                    data-ocid="pay_to_list.ecosystem_select"
                    className="bg-secondary border-border text-sm h-9"
                  >
                    <SelectValue placeholder="Select ecosystem…" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    {ALL_ECOSYSTEMS.map((eco) => (
                      <SelectItem
                        key={eco.value}
                        value={eco.value}
                        className="text-xs"
                      >
                        {eco.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ecosystem && (
                  <p
                    data-ocid="pay_to_list.ecosystem_error"
                    className="text-[11px] text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {errors.ecosystem}
                  </p>
                )}
              </div>

              {/* Categories */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono">
                  Categories * (select at least one)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <label
                      key={cat.value}
                      htmlFor={`cat-${cat.value}`}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <Checkbox
                        id={`cat-${cat.value}`}
                        data-ocid={`pay_to_list.category_${cat.value}_checkbox`}
                        checked={form.categories.includes(cat.value)}
                        onCheckedChange={(checked) => {
                          setForm((f) => ({
                            ...f,
                            categories: checked
                              ? [...f.categories, cat.value]
                              : f.categories.filter((c) => c !== cat.value),
                          }));
                        }}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.categories && (
                  <p
                    data-ocid="pay_to_list.categories_error"
                    className="text-[11px] text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Please select at least one category
                  </p>
                )}
              </div>

              {/* Logo URL (optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="proj-logo" className="text-xs font-mono">
                  Logo URL{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="proj-logo"
                  data-ocid="pay_to_list.logo_url_input"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, logoUrl: e.target.value }))
                  }
                  placeholder="https://example.com/logo.png"
                  className="bg-secondary border-border text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                data-ocid="pay_to_list.cancel_button"
                variant="outline"
                className="flex-1 border-border text-muted-foreground text-sm"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                data-ocid="pay_to_list.next_button"
                className="flex-1 bg-primary text-primary-foreground font-display font-bold text-sm"
                onClick={handleNext}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2: Payment Confirmation ── */}
        {step === 2 && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] text-primary/60 uppercase tracking-widest">
                  Step 2 of 4
                </span>
              </div>
              <DialogTitle className="font-display font-bold text-xl">
                Review & Pay
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Review your submission and confirm payment via OISY wallet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Project summary */}
              <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2.5">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-3">
                  Project Summary
                </p>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <span className="text-xs font-medium text-foreground text-right">
                      {form.name}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">URL</span>
                    <span className="text-xs text-primary text-right truncate max-w-[180px]">
                      {form.url}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Ecosystem
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {form.ecosystem}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Categories
                    </span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                      {form.categories.map((c) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 border-border"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee display */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="font-mono text-[9px] text-primary/60 uppercase tracking-widest mb-2">
                  Listing Fee
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <div>
                      {feeLoading ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">
                            Loading fee…
                          </span>
                        </div>
                      ) : (
                        <p className="font-display font-bold text-2xl text-primary">
                          {feeIcp}{" "}
                          <span className="text-base font-mono">ICP</span>
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Paid via OISY wallet (ICP Ledger)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet status */}
              {!oisy.connected ? (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4">
                  <p className="font-mono text-[9px] text-amber-400/70 uppercase tracking-widest mb-2">
                    Wallet Required
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Connect your OISY wallet to pay the listing fee.
                  </p>
                  <button
                    type="button"
                    onClick={() => oisy.connect()}
                    disabled={oisy.isConnecting}
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-mono hover:bg-amber-400/20 transition-colors"
                  >
                    {oisy.isConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5" />
                    )}
                    {oisy.isConnecting ? "Connecting…" : "Connect OISY Wallet"}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-400 font-medium">
                      OISY wallet connected
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {oisy.principal
                        ? `${oisy.principal.slice(0, 10)}…${oisy.principal.slice(-5)}`
                        : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* II check */}
              {!identity && (
                <div
                  data-ocid="pay_to_list.ii_required_state"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    You must also sign in with Internet Identity to submit. The
                    II identity is your on-chain account for the registry.
                  </p>
                </div>
              )}

              {/* Payment error */}
              {paymentError && (
                <div
                  data-ocid="pay_to_list.payment_error_state"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">{paymentError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                data-ocid="pay_to_list.back_button"
                variant="outline"
                className="flex-1 border-border text-muted-foreground text-sm gap-1"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
              <Button
                data-ocid="pay_to_list.submit_button"
                className="flex-1 bg-primary text-primary-foreground font-display font-bold text-sm gap-1.5"
                onClick={handlePayAndSubmit}
                disabled={
                  !oisy.connected ||
                  !identity ||
                  feeLoading ||
                  listingFeeE8s === undefined
                }
              >
                <Coins className="w-4 h-4" />
                Pay {feeIcp} ICP &amp; Submit
              </Button>
            </div>
          </>
        )}

        {/* ── Step 3: Processing ── */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-10 gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-md" />
            </div>
            <div className="text-center space-y-1.5">
              <p
                data-ocid="pay_to_list.payment_loading_state"
                className="font-display font-bold text-xl text-foreground"
              >
                Processing Payment
              </p>
              <p className="text-sm text-muted-foreground">
                OISY wallet is requesting your confirmation…
              </p>
              <p className="text-xs text-muted-foreground/60 font-mono">
                Please approve in your OISY wallet popup
              </p>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-10 gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-400/40 bg-emerald-400/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-400/10 blur-md" />
            </div>
            <div
              data-ocid="pay_to_list.success_state"
              className="text-center space-y-2"
            >
              <p className="font-display font-bold text-xl text-foreground">
                Submitted for Review!
              </p>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Your project has been submitted and will be reviewed by the
                Bonsai Registry team. We&apos;ll add it to the registry shortly.
              </p>
              <div className="mt-2 px-3 py-1.5 rounded-md bg-secondary border border-border inline-block">
                <p className="text-[10px] font-mono text-muted-foreground">
                  Memo:{" "}
                  <span className="text-foreground">
                    {memo.slice(0, 12)}…{memo.slice(-6)}
                  </span>
                </p>
              </div>
            </div>
            <Button
              data-ocid="pay_to_list.close_button"
              className="bg-primary text-primary-foreground font-display font-bold"
              onClick={handleClose}
            >
              Back to Registry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── ICRC-1 transfer arg encoder using @dfinity/candid ────────────────────────
// Properly encodes icrc1_transfer arguments so OISY can:
//  1. Decode them to fetch an ICRC-21 consent message from the ICP Ledger
//  2. Display the transfer details to the user before signing
//
// icrc1_transfer signature:
//   transfer : (TransferArg) -> (TransferResult)
//   type TransferArg = record {
//     from_subaccount : opt blob;       // opt vec nat8 (32 bytes)
//     to              : Account;        // record { owner: principal; subaccount: opt blob }
//     amount          : nat;
//     fee             : opt nat;
//     memo            : opt blob;       // opt vec nat8
//     created_at_time : opt nat64;
//   }

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function encodeIcrc1TransferArg(params: {
  to: string; // principal text (canister ID that receives the fee)
  amount: bigint;
  memo: Uint8Array;
}): string {
  // Build the Candid IDL types matching the ICRC-1 ledger interface
  const AccountType = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const TransferArgType = IDL.Record({
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    to: AccountType,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });

  const transferArg = {
    from_subaccount: [], // None
    to: {
      owner: Principal.fromText(params.to),
      subaccount: [], // None = default subaccount
    },
    amount: params.amount,
    fee: [], // None = use default fee
    memo: [Array.from(params.memo)], // Some(memo bytes)
    created_at_time: [], // None
  };

  // Encode as Candid binary (returns ArrayBuffer)
  const encoded = IDL.encode([TransferArgType], [transferArg]);
  const bytes = new Uint8Array(encoded);

  // Convert to standard base64 (ICRC-49 spec uses base64-encoded blob)
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
