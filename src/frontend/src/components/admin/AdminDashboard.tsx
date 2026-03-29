import type { backendInterface } from "@/backend";
import type { PendingSubmission } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getBannerPricePerDay,
  setBannerPricePerDay,
} from "@/data/monetizationData";
import { allEntries, ecosystemGroups } from "@/data/registryData";
import {
  AdminActorProvider,
  useAdminActorContext,
} from "@/hooks/useAdminActorContext";
import { useCanisterHealth } from "@/hooks/useCanisterHealth";
import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  Coins,
  Copy,
  Database,
  Download,
  ExternalLink,
  Flag,
  InboxIcon,
  LayoutGrid,
  Loader2,
  LogOut,
  Mail,
  Megaphone,
  RefreshCw,
  Save,
  SendHorizontal,
  ShieldCheck,
  Star,
  TreePine,
  Upload,
  Users,
  Vault,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnalyticsTab } from "./AnalyticsTab";
import { BannerAdsTab } from "./BannerAdsTab";
import { BulkImportModal } from "./BulkImportModal";
import { CanisterHealthBadge } from "./CanisterHealthBadge";
import { EcosystemManager } from "./EcosystemManager";
import { EmailListTab } from "./EmailListTab";
import { EntryTable } from "./EntryTable";

const ADMIN_SECRET = "#WakeUp4";

function e8sToIcp(e8s: bigint): string {
  const icp = Number(e8s) / 1e8;
  return icp.toFixed(4).replace(/\.?0+$/, "");
}

// ── Community Submissions Tab ──────────────────────────────────────────────────
function CommunitySubmissionsTab() {
  const actor = useAdminActorContext();
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["pending-submissions"],
    queryFn: async () => actor.getPendingSubmissions(ADMIN_SECRET),
    enabled: !!actor,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: bigint) =>
      actor.approvePendingSubmissionWithSecret(ADMIN_SECRET, id),
    onSuccess: () => {
      toast.success("Submission approved!");
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
    },
    onError: () => toast.error("Failed to approve submission."),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: bigint) =>
      actor.rejectPendingSubmissionWithSecret(ADMIN_SECRET, id),
    onSuccess: () => {
      toast.success("Submission rejected.");
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
    },
    onError: () => toast.error("Failed to reject submission."),
  });

  const communitySubmissions =
    submissions?.filter((s) => s.paymentMemo === "community") ?? [];

  if (isLoading)
    return (
      <div
        data-ocid="admin.community.loading_state"
        className="flex items-center gap-2 py-8 justify-center"
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading submissions...
        </span>
      </div>
    );

  if (communitySubmissions.length === 0)
    return (
      <div
        data-ocid="admin.community.empty_state"
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          No community submissions yet.
        </p>
      </div>
    );

  return (
    <div className="space-y-3" data-ocid="admin.community.table">
      <p className="text-xs text-muted-foreground font-mono">
        {communitySubmissions.length} community submission
        {communitySubmissions.length !== 1 ? "s" : ""} pending review
      </p>
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Name
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              URL
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Ecosystem
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Submitted
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Submitter
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Status
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {communitySubmissions.map((sub, idx) => (
            <TableRow
              key={sub.id.toString()}
              data-ocid={`admin.community.row.item.${idx + 1}`}
              className="border-border"
            >
              <TableCell className="text-sm font-medium text-foreground">
                {sub.entry.name}
              </TableCell>
              <TableCell>
                <a
                  href={sub.entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-mono truncate max-w-[160px] block"
                >
                  {sub.entry.url}
                </a>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {sub.entry.ecosystem}
              </TableCell>
              <TableCell className="text-[11px] text-muted-foreground font-mono">
                {new Date(
                  Number(sub.submittedAt / 1_000_000n),
                ).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                {sub.submitter.toText().slice(0, 12)}...
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    sub.status === "pending"
                      ? "text-amber-400 border-amber-400/40"
                      : sub.status === "approved"
                        ? "text-emerald-400 border-emerald-400/40"
                        : "text-red-400 border-red-400/40"
                  }
                >
                  {sub.status}
                </Badge>
              </TableCell>
              <TableCell>
                {sub.status === "pending" && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => approveMutation.mutate(sub.id)}
                      disabled={approveMutation.isPending}
                      data-ocid={`admin.community.approve_button.${idx + 1}`}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                      onClick={() => rejectMutation.mutate(sub.id)}
                      disabled={rejectMutation.isPending}
                      data-ocid={`admin.community.delete_button.${idx + 1}`}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Flagged Comments Tab ──────────────────────────────────────────────────────
function FlaggedCommentsTab() {
  const actor = useAdminActorContext();
  const queryClient = useQueryClient();

  const { data: flagged, isLoading } = useQuery({
    queryKey: ["flagged-comments"],
    queryFn: async () => (actor as any).getFlaggedComments(ADMIN_SECRET),
    enabled: !!actor,
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: bigint) =>
      (actor as any).deleteCommentWithSecret(ADMIN_SECRET, commentId),
    onSuccess: () => {
      toast.success("Comment deleted.");
      queryClient.invalidateQueries({ queryKey: ["flagged-comments"] });
    },
    onError: () => toast.error("Failed to delete comment."),
  });

  if (isLoading)
    return (
      <div
        data-ocid="admin.flagged.loading_state"
        className="flex items-center gap-2 py-8 justify-center"
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading flagged comments...
        </span>
      </div>
    );

  if (!flagged || flagged.length === 0)
    return (
      <div
        data-ocid="admin.flagged.empty_state"
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <Flag className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No flagged comments.</p>
      </div>
    );

  return (
    <div className="space-y-3" data-ocid="admin.flagged.table">
      <p className="text-xs text-muted-foreground font-mono">
        {flagged.length} flagged comment{flagged.length !== 1 ? "s" : ""}{" "}
        awaiting review
      </p>
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Comment
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Author
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Flags
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Entry ID
            </TableHead>
            <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flagged.map((comment: any, idx: number) => (
            <TableRow
              key={comment.id.toString()}
              data-ocid={`admin.flagged.row.item.${idx + 1}`}
              className="border-border"
            >
              <TableCell className="text-xs text-foreground max-w-xs">
                <p className="line-clamp-2">{comment.text}</p>
              </TableCell>
              <TableCell className="text-[10px] text-muted-foreground font-mono">
                {comment.authorName ||
                  `${comment.author?.toText?.()?.slice(0, 12)}...`}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="text-amber-400 border-amber-400/40 font-mono text-[10px]"
                >
                  {comment.flagCount.toString()} flags
                </Badge>
              </TableCell>
              <TableCell className="text-[10px] text-muted-foreground font-mono">
                #{comment.entryId.toString()}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteMutation.mutate(comment.id)}
                  disabled={deleteMutation.isPending}
                  data-ocid={`admin.flagged.delete_button.${idx + 1}`}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface AdminDashboardProps {
  actor: backendInterface;
  onLogout: () => void;
}

export function AdminDashboard({
  actor: actorProp,
  onLogout,
}: AdminDashboardProps) {
  return (
    <AdminActorProvider actor={actorProp}>
      <AdminDashboardInner onLogout={onLogout} />
    </AdminActorProvider>
  );
}

// ── Listing Fee Settings ──────────────────────────────────────────────────────
function ListingFeeCard() {
  const actor = useAdminActorContext();
  const queryClient = useQueryClient();
  const [feeInput, setFeeInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: currentFee, isLoading: feeLoading } = useQuery<bigint>({
    queryKey: ["listing-fee"],
    queryFn: async () => actor.getListingFee(),
    enabled: !!actor,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (newFeeIcp: number) => {
      const newFeeE8s = BigInt(Math.round(newFeeIcp * 1e8));
      await actor.setListingFeeWithSecret(ADMIN_SECRET, newFeeE8s);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-fee"] });
      setFeeInput("");
      setSaveError(null);
      toast.success("Listing fee updated!");
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "Failed to update fee");
    },
  });

  const handleSave = () => {
    setSaveError(null);
    const val = Number.parseFloat(feeInput);
    if (Number.isNaN(val) || val < 0) {
      setSaveError("Please enter a valid fee in ICP (e.g. 0.5)");
      return;
    }
    saveMutation.mutate(val);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Coins className="w-4 h-4 text-primary" />
        <h3 className="font-display font-semibold text-sm text-foreground">
          Listing Fee
        </h3>
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 rounded-md bg-secondary border border-border">
        <div className="text-xs text-muted-foreground font-mono">
          Current fee:
        </div>
        {feeLoading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <div className="font-display font-bold text-primary text-lg">
            {currentFee !== undefined ? e8sToIcp(currentFee) : "—"}{" "}
            <span className="text-sm font-mono text-muted-foreground">ICP</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-mono">Set New Fee (ICP)</Label>
        <div className="flex gap-2">
          <Input
            data-ocid="admin.listing_fee.input"
            type="number"
            min="0"
            step="0.01"
            value={feeInput}
            onChange={(e) => {
              setFeeInput(e.target.value);
              setSaveError(null);
            }}
            placeholder={
              currentFee !== undefined ? e8sToIcp(currentFee) : "0.5"
            }
            className="bg-secondary border-border text-sm h-8 font-mono flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            data-ocid="admin.listing_fee.save_button"
            size="sm"
            className="bg-primary text-primary-foreground gap-1.5 text-xs h-8"
            onClick={handleSave}
            disabled={saveMutation.isPending || !feeInput}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Update
          </Button>
        </div>
        {saveError && (
          <p
            data-ocid="admin.listing_fee.error_state"
            className="text-[11px] text-destructive flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
}

// ── ICP Ledger helpers ────────────────────────────────────────────────────────
const ICP_LEDGER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

const balanceIDLFactory = ({ IDL: I }: { IDL: typeof IDL }) =>
  I.Service({
    icrc1_balance_of: I.Func(
      [
        I.Record({
          owner: I.Principal,
          subaccount: I.Opt(I.Vec(I.Nat8)),
        }),
      ],
      [I.Nat],
      ["query"],
    ),
  });

const transferIDLFactory = ({ IDL: I }: { IDL: typeof IDL }) =>
  I.Service({
    icrc1_transfer: I.Func(
      [
        I.Record({
          to: I.Record({
            owner: I.Principal,
            subaccount: I.Opt(I.Vec(I.Nat8)),
          }),
          amount: I.Nat,
          fee: I.Opt(I.Nat),
          memo: I.Opt(I.Vec(I.Nat8)),
          created_at_time: I.Opt(I.Nat64),
          from_subaccount: I.Opt(I.Vec(I.Nat8)),
        }),
      ],
      [
        I.Variant({
          Ok: I.Nat,
          Err: I.Variant({
            BadFee: I.Record({ expected_fee: I.Nat }),
            BadBurn: I.Record({ min_burn_amount: I.Nat }),
            InsufficientFunds: I.Record({ balance: I.Nat }),
            TooOld: I.Null,
            CreatedInFuture: I.Record({ ledger_time: I.Nat64 }),
            Duplicate: I.Record({ duplicate_of: I.Nat }),
            TemporarilyUnavailable: I.Null,
            GenericError: I.Record({ error_code: I.Nat, message: I.Text }),
          }),
        }),
      ],
      [],
    ),
  });

async function getCanisterIcpBalance(canisterId: string): Promise<bigint> {
  const agent = await HttpAgent.create({ host: "https://icp-api.io" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor(balanceIDLFactory as any, {
    agent,
    canisterId: ICP_LEDGER_ID,
  }) as unknown as {
    icrc1_balance_of: (arg: {
      owner: Principal;
      subaccount: [] | [Uint8Array[]];
    }) => Promise<bigint>;
  };
  const balance = await actor.icrc1_balance_of({
    owner: Principal.fromText(canisterId),
    subaccount: [],
  });
  return balance;
}

async function getBackendCanisterId(): Promise<string> {
  try {
    const { loadConfig } = await import("@/config");
    const cfg = await loadConfig();
    return cfg.backend_canister_id;
  } catch {
    // fallback
    return "gv2fb-ayaaa-aaaan-q43aq-cai";
  }
}

// ── Banner Price Per Day Card ─────────────────────────────────────────────
function BannerPriceCard() {
  const [price, setPrice] = useState(() => getBannerPricePerDay());
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const val = Number.parseFloat(input);
    if (Number.isNaN(val) || val < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setBannerPricePerDay(val);
    setPrice(val);
    setInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Banner price updated!");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-4 h-4 text-amber-400" />
        <h3 className="font-display font-semibold text-sm text-foreground">
          Banner Ad Price
        </h3>
      </div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-md bg-secondary border border-border">
        <div className="text-xs text-muted-foreground font-mono">
          Price/day:
        </div>
        <div className="font-display font-bold text-amber-400 text-lg">
          {price}{" "}
          <span className="text-sm font-mono text-muted-foreground">ICP</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono">Set Price Per Day (ICP)</Label>
        <div className="flex gap-2">
          <Input
            data-ocid="admin.banner_price.input"
            type="number"
            min="0"
            step="0.01"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={price.toString()}
            className="bg-secondary border-border text-sm h-8 font-mono flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            data-ocid="admin.banner_price.save_button"
            size="sm"
            className="bg-primary text-primary-foreground gap-1.5 text-xs h-8"
            onClick={handleSave}
            disabled={!input}
          >
            {saved ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}
// ── Treasury Card ─────────────────────────────────────────────────────────────
function TreasuryCard() {
  const [copied, setCopied] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendState, setSendState] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [blockIndex, setBlockIndex] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{
    balance: bigint;
    canisterId: string;
  }>({
    queryKey: ["treasury-balance"],
    queryFn: async () => {
      const canisterId = await getBackendCanisterId();
      const balance = await getCanisterIcpBalance(canisterId);
      return { balance, canisterId };
    },
    staleTime: 60_000,
    retry: 2,
  });

  const balance = data?.balance;
  const canisterId = data?.canisterId ?? "";
  const dashboardUrl = canisterId
    ? `https://dashboard.internetcomputer.org/canister/${canisterId}`
    : "";

  const handleCopyCanisterId = () => {
    if (!canisterId) return;
    navigator.clipboard.writeText(canisterId).then(() => {
      setCopied(true);
      toast.success("Canister ID copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSend = async () => {
    setSendError(null);
    setSendState("sending");
    setBlockIndex(null);

    // Validate destination principal
    let destPrincipal: Principal;
    try {
      destPrincipal = Principal.fromText(sendTo.trim());
    } catch {
      setSendError(
        "Invalid destination principal. Check the format and try again.",
      );
      setSendState("error");
      return;
    }

    // Validate amount
    const amountFloat = Number.parseFloat(sendAmount);
    if (Number.isNaN(amountFloat) || amountFloat <= 0) {
      setSendError("Enter a valid amount greater than 0.");
      setSendState("error");
      return;
    }

    const amountE8s = BigInt(Math.round(amountFloat * 1e8));
    const ICP_FEE = 10_000n; // 0.0001 ICP standard fee

    try {
      const agent = await HttpAgent.create({ host: "https://icp-api.io" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ledger = Actor.createActor(transferIDLFactory as any, {
        agent,
        canisterId: ICP_LEDGER_ID,
      }) as unknown as {
        icrc1_transfer: (arg: {
          to: { owner: Principal; subaccount: [] };
          amount: bigint;
          fee: [bigint];
          memo: [];
          created_at_time: [];
          from_subaccount: [];
        }) => Promise<{ Ok: bigint } | { Err: Record<string, unknown> }>;
      };

      const result = await ledger.icrc1_transfer({
        to: { owner: destPrincipal, subaccount: [] },
        amount: amountE8s,
        fee: [ICP_FEE],
        memo: [],
        created_at_time: [],
        from_subaccount: [],
      });

      if ("Ok" in result) {
        const idx = result.Ok.toString();
        setBlockIndex(idx);
        setSendState("success");
        setSendTo("");
        setSendAmount("");
        toast.success(`ICP sent! Block index: ${idx}`);
      } else {
        const errKey = Object.keys(result.Err)[0] ?? "Unknown";
        const errDetail =
          (result.Err as Record<string, { message?: string }>)[errKey]
            ?.message ?? errKey;
        setSendError(`Transfer failed: ${errDetail}`);
        setSendState("error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setSendError(msg);
      setSendState("error");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Vault className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-sm text-foreground">
            Treasury
          </h3>
        </div>
        <Button
          data-ocid="admin.treasury.refresh_button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh balance"
        >
          <RefreshCw
            className={["w-3.5 h-3.5", isFetching ? "animate-spin" : ""].join(
              " ",
            )}
          />
        </Button>
      </div>

      {/* Balance display */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-md bg-secondary border border-border">
        <div className="text-xs text-muted-foreground font-mono">Balance:</div>
        {isLoading ? (
          <Skeleton
            data-ocid="admin.treasury.loading_state"
            className="h-5 w-24"
          />
        ) : isError ? (
          <span
            data-ocid="admin.treasury.error_state"
            className="flex items-center gap-1 text-xs text-destructive font-mono"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Failed to load
          </span>
        ) : (
          <div
            data-ocid="admin.treasury.balance_display"
            className="font-display font-bold text-primary text-lg"
          >
            {balance !== undefined ? (Number(balance) / 1e8).toFixed(4) : "—"}{" "}
            <span className="text-sm font-mono text-muted-foreground">ICP</span>
          </div>
        )}
      </div>

      {/* Withdrawal info */}
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          To withdraw ICP from the registry canister, use the NNS Dashboard or a
          wallet that supports direct canister calls. Copy the canister ID below
          and use it to initiate the transfer.
        </p>

        {/* Canister ID row */}
        <div className="flex items-center gap-2">
          <code className="flex-1 px-2.5 py-1.5 rounded border border-border bg-secondary text-[10px] font-mono text-muted-foreground truncate select-all">
            {canisterId || "Loading…"}
          </code>
          <Button
            data-ocid="admin.treasury.canister_id_copy_button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 border-border text-muted-foreground hover:text-primary gap-1.5 text-[11px] flex-shrink-0"
            onClick={handleCopyCanisterId}
            disabled={!canisterId}
          >
            <Copy className="w-3 h-3" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* NNS Dashboard link */}
        {dashboardUrl && (
          <a
            data-ocid="admin.treasury.dashboard_link"
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-mono underline underline-offset-2 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open in NNS Dashboard
          </a>
        )}
      </div>

      {/* Send ICP section */}
      <Separator className="my-3" />
      <div className="space-y-2">
        {/* Section header */}
        <div className="flex items-center gap-1.5">
          <SendHorizontal className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono text-foreground font-medium">
            Send ICP
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            from your wallet
          </span>
        </div>

        {/* Destination */}
        <Input
          data-ocid="admin.treasury.send_to.input"
          value={sendTo}
          onChange={(e) => {
            setSendTo(e.target.value);
            if (sendState === "error") setSendState("idle");
            setSendError(null);
          }}
          placeholder="Destination principal (xxxxx-xxxxx-...)"
          className="bg-secondary border-border text-[11px] h-8 font-mono placeholder:text-muted-foreground/50"
          disabled={sendState === "sending"}
        />

        {/* Amount */}
        <Input
          data-ocid="admin.treasury.send_amount.input"
          type="number"
          min="0.0001"
          step="0.0001"
          value={sendAmount}
          onChange={(e) => {
            setSendAmount(e.target.value);
            if (sendState === "error") setSendState("idle");
            setSendError(null);
          }}
          placeholder="Amount in ICP (e.g. 0.5)"
          className="bg-secondary border-border text-[11px] h-8 font-mono placeholder:text-muted-foreground/50"
          disabled={sendState === "sending"}
        />

        {/* Send button */}
        <Button
          data-ocid="admin.treasury.send_button"
          size="sm"
          className="w-full h-8 bg-primary text-primary-foreground gap-1.5 text-xs font-mono"
          onClick={handleSend}
          disabled={sendState === "sending" || !sendTo.trim() || !sendAmount}
        >
          {sendState === "sending" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <SendHorizontal className="w-3.5 h-3.5" />
          )}
          {sendState === "sending" ? "Sending…" : "Send ICP"}
        </Button>

        {/* Error state */}
        {sendState === "error" && sendError && (
          <div
            data-ocid="admin.treasury.send_error_state"
            className="flex items-start gap-1.5 rounded border border-destructive/30 bg-destructive/8 px-2.5 py-2"
          >
            <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-destructive leading-snug">
              {sendError}
            </p>
          </div>
        )}

        {/* Success state */}
        {sendState === "success" && blockIndex && (
          <div
            data-ocid="admin.treasury.send_success_state"
            className="flex items-start gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/8 px-2.5 py-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-400 leading-snug">
              Transfer complete!{" "}
              <span className="font-mono">Block #{blockIndex}</span>
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          This sends ICP from your connected Internet Identity wallet. To
          withdraw funds accumulated in the canister treasury, use the NNS
          Dashboard link above.
        </p>
      </div>
    </div>
  );
}

// ── Submissions Tab ───────────────────────────────────────────────────────────
// ── Airdrop Tab ─────────────────────────────────────────────────────────────────
function AirdropTab() {
  const actorRaw = useAdminActorContext();
  // biome-ignore lint/suspicious/noExplicitAny: extended backend methods
  const actor = actorRaw as any;
  const [manualPrincipal, setManualPrincipal] = useState("");
  const [manualOisy, setManualOisy] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const {
    data: approvedList = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["bonsai-approved-list"],
    queryFn: async () => {
      try {
        return await actor.getBonsaiApprovedListWithSecret(ADMIN_SECRET);
      } catch {
        return [];
      }
    },
    enabled: !!actor,
  });

  const handleAdd = async () => {
    if (!manualPrincipal.trim() || !manualOisy.trim() || !manualEmail.trim()) {
      toast.error("All fields are required.");
      return;
    }
    setAdding(true);
    try {
      await actor.markBonsaiApprovedWithSecret(
        ADMIN_SECRET,
        manualPrincipal.trim(),
        manualOisy.trim(),
        manualEmail.trim(),
      );
      toast.success("User marked as Bonsai Approved!");
      setManualPrincipal("");
      setManualOisy("");
      setManualEmail("");
      refetch();
    } catch (err) {
      toast.error(
        `Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setAdding(false);
    }
  };

  const exportCsv = () => {
    const header = "principalId,oisyPrincipal,email,approvedAt";
    const rows = (
      approvedList as Array<{
        principalId: string;
        oisyPrincipal: string;
        email: string;
        approvedAt: bigint;
      }>
    ).map(
      (e) =>
        `${e.principalId},${e.oisyPrincipal},${e.email},${new Date(Number(e.approvedAt) / 1_000_000).toISOString()}`,
    );
    const csv = [header, ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bonsai-approved.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-base text-foreground">
            Bonsai Approved NFT Airdrop
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Subscribers who provided their OISY Principal are eligible for the
          Bonsai Approved NFT airdrop. Manually approve users or export the
          list.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">
          Mark User as Bonsai Approved
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            data-ocid="admin.airdrop.principal_input"
            value={manualPrincipal}
            onChange={(e) => setManualPrincipal(e.target.value)}
            placeholder="Principal ID"
            className="bg-background border-border text-xs font-mono"
          />
          <Input
            data-ocid="admin.airdrop.oisy_input"
            value={manualOisy}
            onChange={(e) => setManualOisy(e.target.value)}
            placeholder="OISY Principal"
            className="bg-background border-border text-xs font-mono"
          />
          <Input
            data-ocid="admin.airdrop.email_input"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="Email"
            className="bg-background border-border text-xs"
          />
        </div>
        <Button
          data-ocid="admin.airdrop.add_button"
          size="sm"
          onClick={handleAdd}
          disabled={adding}
          className="bg-primary text-primary-foreground"
        >
          {adding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Star className="w-3.5 h-3.5 mr-1" />
          )}
          Mark Approved
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Approved List ({Array.isArray(approvedList) ? approvedList.length : 0}
          )
        </p>
        <Button
          data-ocid="admin.airdrop.export_button"
          size="sm"
          variant="outline"
          onClick={exportCsv}
          className="border-border text-xs gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
                Principal
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
                OISY Principal
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
                Email
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase">
                Approved
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(
              approvedList as Array<{
                principalId: string;
                oisyPrincipal: string;
                email: string;
                approvedAt: bigint;
              }>
            ).map((e, idx) => (
              <TableRow
                key={e.principalId}
                data-ocid={`admin.airdrop.item.${idx + 1}`}
                className="border-border"
              >
                <TableCell className="font-mono text-[10px] text-muted-foreground">
                  {e.principalId.slice(0, 16)}…
                </TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">
                  {e.oisyPrincipal.slice(0, 16)}…
                </TableCell>
                <TableCell className="text-xs text-foreground">
                  {e.email}
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground">
                  {new Date(
                    Number(e.approvedAt) / 1_000_000,
                  ).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ── Admin Ambassadors Tab ──────────────────────────────────────────────────────────
function AdminAmbassadorsTab() {
  const actorRaw = useAdminActorContext();
  // biome-ignore lint/suspicious/noExplicitAny: extended backend methods
  const actor = actorRaw as any;
  const queryClient = useQueryClient();
  const [resolveContractId, setResolveContractId] = useState("");
  const [resolveText, setResolveText] = useState("");
  const [resolving, setResolving] = useState(false);

  const { data: allAmbassadors = [], isLoading } = useQuery({
    queryKey: ["admin-all-ambassadors"],
    queryFn: async () => {
      try {
        return await actor.getAllAmbassadors();
      } catch {
        return [];
      }
    },
    enabled: !!actor,
  });

  const { data: disputedContracts = [], isLoading: loadingDisputed } = useQuery(
    {
      queryKey: ["admin-disputed-contracts"],
      queryFn: async () => {
        try {
          return await actor.getDisputedContracts();
        } catch {
          return [];
        }
      },
      enabled: !!actor,
    },
  );

  const handleApprove = async (principalId: string) => {
    try {
      await actor.approveAmbassadorWithSecret(ADMIN_SECRET, principalId);
      toast.success("Ambassador approved!");
      queryClient.invalidateQueries({ queryKey: ["admin-all-ambassadors"] });
    } catch (err) {
      toast.error(`Failed: ${String(err)}`);
    }
  };

  const handleSuspend = async (principalId: string) => {
    try {
      await actor.suspendAmbassadorWithSecret(ADMIN_SECRET, principalId);
      toast.success("Ambassador suspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-all-ambassadors"] });
    } catch (err) {
      toast.error(`Failed: ${String(err)}`);
    }
  };

  const handleResolve = async () => {
    if (!resolveContractId.trim() || !resolveText.trim()) {
      toast.error("Contract ID and resolution required.");
      return;
    }
    setResolving(true);
    try {
      await actor.resolveContractWithSecret(
        ADMIN_SECRET,
        resolveContractId.trim(),
        resolveText.trim(),
      );
      toast.success("Contract resolved!");
      setResolveContractId("");
      setResolveText("");
      queryClient.invalidateQueries({ queryKey: ["admin-disputed-contracts"] });
    } catch (err) {
      toast.error(`Failed: ${String(err)}`);
    } finally {
      setResolving(false);
    }
  };

  const getStatusLabel = (
    status: { pending: null } | { approved: null } | { suspended: null },
  ) => {
    if ("approved" in status)
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
          Approved
        </Badge>
      );
    if ("suspended" in status)
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
          Suspended
        </Badge>
      );
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-bold text-base text-foreground mb-3">
          All Ambassadors (
          {Array.isArray(allAmbassadors) ? allAmbassadors.length : 0})
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-[10px] font-mono uppercase text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-mono uppercase text-muted-foreground">
                  Price
                </TableHead>
                <TableHead className="text-[10px] font-mono uppercase text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-mono uppercase text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                allAmbassadors as Array<{
                  principalId: string;
                  displayName: string;
                  pricePerCampaign: number;
                  status:
                    | { pending: null }
                    | { approved: null }
                    | { suspended: null };
                }>
              ).map((a, idx) => (
                <TableRow
                  key={a.principalId}
                  data-ocid={`admin.ambassadors.item.${idx + 1}`}
                  className="border-border"
                >
                  <TableCell className="text-sm text-foreground font-semibold">
                    {a.displayName}
                  </TableCell>
                  <TableCell className="text-xs text-primary">
                    {a.pricePerCampaign} ckUSDC
                  </TableCell>
                  <TableCell>{getStatusLabel(a.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {!("approved" in a.status) && (
                        <Button
                          data-ocid="admin.ambassador.approve_button"
                          size="sm"
                          className="bg-emerald-500/80 text-white text-[10px] h-6 px-2"
                          onClick={() => handleApprove(a.principalId)}
                        >
                          Approve
                        </Button>
                      )}
                      {!("suspended" in a.status) && (
                        <Button
                          data-ocid="admin.ambassador.suspend_button"
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 text-[10px] h-6 px-2"
                          onClick={() => handleSuspend(a.principalId)}
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Separator className="border-border/50" />

      <div>
        <h3 className="font-display font-bold text-base text-foreground mb-3">
          Disputed Contracts (
          {Array.isArray(disputedContracts) ? disputedContracts.length : 0})
        </h3>
        {loadingDisputed ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {(
              disputedContracts as Array<{
                id: string;
                campaignTitle: string;
                disputeReason: string;
                daoVotes: Array<unknown>;
              }>
            ).map((c, idx) => (
              <div
                key={c.id}
                data-ocid={`admin.disputes.item.${idx + 1}`}
                className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2"
              >
                <p className="text-sm font-semibold text-foreground">
                  {c.campaignTitle}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/70">
                  {c.id}
                </p>
                {c.disputeReason && (
                  <p className="text-xs text-red-300/80">{c.disputeReason}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Votes: {c.daoVotes.length}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">
                Resolve Contract (Admin)
              </p>
              <Input
                data-ocid="admin.disputes.contract_id_input"
                value={resolveContractId}
                onChange={(e) => setResolveContractId(e.target.value)}
                placeholder="Contract ID"
                className="bg-background border-border text-xs font-mono"
              />
              <Textarea
                data-ocid="admin.disputes.resolution_textarea"
                value={resolveText}
                onChange={(e) => setResolveText(e.target.value)}
                placeholder="Resolution notes..."
                className="bg-background border-border text-xs resize-none"
                rows={3}
              />
              <Button
                data-ocid="admin.disputes.resolve_button"
                size="sm"
                onClick={handleResolve}
                disabled={resolving}
                className="bg-primary text-primary-foreground"
              >
                {resolving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : null}
                Resolve Contract
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionsTab() {
  const actor = useAdminActorContext();
  const queryClient = useQueryClient();

  const {
    data: submissions,
    isLoading,
    isError,
    refetch,
  } = useQuery<PendingSubmission[]>({
    queryKey: ["pending-submissions"],
    queryFn: async () => actor.getPendingSubmissions(ADMIN_SECRET),
    enabled: !!actor,
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (submissionId: bigint) => {
      await actor.approvePendingSubmissionWithSecret(
        ADMIN_SECRET,
        submissionId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["backend-registry-entries"] });
      toast.success("Submission approved and added to registry!");
    },
    onError: (err) => {
      toast.error(
        `Approve failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (submissionId: bigint) => {
      await actor.rejectPendingSubmissionWithSecret(ADMIN_SECRET, submissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
      toast.success("Submission rejected.");
    },
    onError: (err) => {
      toast.error(
        `Reject failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  const pendingCount =
    submissions?.filter((s) => s.status === "pending").length ?? 0;

  if (isLoading) {
    return (
      <div
        data-ocid="admin.submissions.loading_state"
        className="space-y-2 py-4"
      >
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-ocid="admin.submissions.error_state"
        className="py-8 text-center"
      >
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          Failed to load submissions
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-border text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div
        data-ocid="admin.submissions.empty_state"
        className="py-12 text-center"
      >
        <InboxIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-mono text-muted-foreground">
          No submissions yet
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Paid project listings will appear here for review
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border bg-secondary text-xs">
          <span className="font-mono text-muted-foreground">Total:</span>
          <span className="font-bold text-foreground">
            {submissions.length}
          </span>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-amber-400/30 bg-amber-400/8 text-xs">
            <span className="font-mono text-amber-400/70">Pending:</span>
            <span className="font-bold text-amber-400">{pendingCount}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div
        data-ocid="admin.submissions.table"
        className="rounded-lg border border-border overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide h-8">
                Project
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide h-8 hidden md:table-cell">
                Ecosystem
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide h-8 hidden sm:table-cell">
                Submitter
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide h-8 hidden lg:table-cell">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide h-8">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide h-8 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((sub, idx) => {
              const isPending = sub.status === "pending";
              const isApproved = sub.status === "approved";
              const submitterStr = sub.submitter.toString();
              const shortSubmitter = `${submitterStr.slice(0, 5)}…${submitterStr.slice(-3)}`;
              const submittedDate = new Date(
                Number(sub.submittedAt / 1_000_000n),
              ).toLocaleDateString();

              return (
                <TableRow
                  key={sub.id.toString()}
                  data-ocid={`admin.submission.row.${idx + 1}`}
                  className={[
                    "border-border text-xs transition-colors",
                    isApproved ? "bg-emerald-400/5" : "",
                    sub.status === "rejected"
                      ? "bg-destructive/5 opacity-60"
                      : "",
                  ].join(" ")}
                >
                  <TableCell className="py-2.5">
                    <div>
                      <p className="font-medium text-foreground truncate max-w-[140px]">
                        {sub.entry.name}
                      </p>
                      <a
                        href={sub.entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary/70 hover:text-primary font-mono truncate max-w-[140px] block"
                      >
                        {sub.entry.url.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 hidden md:table-cell">
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 border-border font-mono"
                    >
                      {sub.entry.ecosystem}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 hidden sm:table-cell">
                    <span
                      className="font-mono text-[10px] text-muted-foreground"
                      title={submitterStr}
                    >
                      {shortSubmitter}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 hidden lg:table-cell">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {submittedDate}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      className={[
                        "text-[9px] px-1.5 py-0 h-4 font-mono border",
                        isPending
                          ? "bg-amber-400/10 text-amber-400 border-amber-400/30"
                          : isApproved
                            ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/30"
                            : "bg-destructive/10 text-destructive border-destructive/30",
                      ].join(" ")}
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    {isPending && (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          data-ocid={`admin.submission.approve_button.${idx + 1}`}
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                          onClick={() => approveMutation.mutate(sub.id)}
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending
                          }
                          title="Approve submission"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          data-ocid={`admin.submission.reject_button.${idx + 1}`}
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() => rejectMutation.mutate(sub.id)}
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending
                          }
                          title="Reject submission"
                        >
                          <XCircle className="w-2.5 h-2.5" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {!isPending && (
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        {sub.status}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function AdminDashboardInner({ onLogout }: { onLogout: () => void }) {
  const actor = useAdminActorContext();
  const [activeTab, setActiveTab] = useState("entries");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [healthBannerDismissed, setHealthBannerDismissed] = useState(false);

  const {
    status: healthStatus,
    isChecking: healthChecking,
    lastChecked: healthLastChecked,
    retry: healthRetry,
  } = useCanisterHealth(!!actor);

  const { data: totalBackendEntries } = useQuery({
    queryKey: ["registry-entries-count"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getTotalEntriesCount();
    },
    enabled: !!actor,
  });

  const { data: pendingSubmissions } = useQuery<PendingSubmission[]>({
    queryKey: ["pending-submissions"],
    queryFn: async () => actor.getPendingSubmissions(ADMIN_SECRET),
    enabled: !!actor,
    staleTime: 30_000,
  });

  const pendingCount =
    pendingSubmissions?.filter((s) => s.status === "pending").length ?? 0;

  const handleBulkExport = () => {
    const exportData = allEntries.map((entry) => ({
      id: 0,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      ecosystem: entry.ecosystem,
      categories: entry.tags,
      tier: entry.tier,
      logoUrl: "",
      createdAt: Date.now(),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bonsai-registry-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportData.length} entries as JSON`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-primary/30 bg-card sticky top-0 z-40">
        {/* Admin indicator strip */}
        <div
          className="h-0.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.60 0.235 27) 0%, oklch(0.65 0.20 50) 50%, oklch(0.60 0.235 27) 100%)",
          }}
        />
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: Logo + title */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              data-ocid="admin.back_link"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back to Registry</span>
            </a>

            <Separator orientation="vertical" className="h-5 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded border border-primary/40 overflow-hidden flex-shrink-0">
                <img
                  src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm text-foreground">
                    <span className="text-primary">Bonsai</span> Registry
                  </span>
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/20 text-primary border border-primary/30 font-mono">
                    ADMIN
                  </Badge>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground/60">
                  Management Console
                </p>
              </div>
            </div>
          </div>

          {/* Right: Stats + actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stats pills */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-secondary text-xs">
                <Database className="w-3 h-3 text-primary" />
                <span className="font-mono text-muted-foreground">
                  <span className="text-foreground font-bold">
                    {totalBackendEntries !== undefined
                      ? totalBackendEntries.toString()
                      : "—"}
                  </span>{" "}
                  backend
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-secondary text-xs">
                <TreePine className="w-3 h-3 text-primary" />
                <span className="font-mono text-muted-foreground">
                  <span className="text-foreground font-bold">
                    {ecosystemGroups.length}
                  </span>{" "}
                  ecosystems
                </span>
              </div>
              {/* Canister health */}
              <CanisterHealthBadge
                status={healthStatus}
                isChecking={healthChecking}
                lastChecked={healthLastChecked}
                onRetry={healthRetry}
              />
            </div>

            {/* Bulk actions */}
            <Button
              data-ocid="admin.bulk_export_button"
              variant="outline"
              size="sm"
              className="hidden sm:flex border-border text-muted-foreground hover:text-foreground gap-1.5 text-xs"
              onClick={handleBulkExport}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button
              data-ocid="admin.bulk_import_button"
              variant="outline"
              size="sm"
              className="hidden sm:flex border-primary/30 text-primary hover:bg-primary/10 gap-1.5 text-xs"
              onClick={() => setBulkImportOpen(true)}
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </Button>

            {/* Admin badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded border border-primary/20 bg-primary/5">
              <ShieldCheck className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="font-mono text-[9px] text-muted-foreground">
                Admin
              </span>
            </div>

            <Button
              data-ocid="admin.logout_button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
              onClick={onLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Mobile stats */}
        <div className="md:hidden flex gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border bg-secondary text-xs flex-1 justify-center">
            <Database className="w-3 h-3 text-primary" />
            <span className="font-mono">
              <span className="text-foreground font-bold">
                {totalBackendEntries !== undefined
                  ? totalBackendEntries.toString()
                  : "—"}
              </span>{" "}
              backend entries
            </span>
          </div>
        </div>

        {/* Mobile bulk actions */}
        <div className="sm:hidden flex gap-2 mb-4">
          <Button
            data-ocid="admin.bulk_export_button"
            variant="outline"
            size="sm"
            className="flex-1 border-border text-muted-foreground text-xs gap-1.5"
            onClick={handleBulkExport}
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
          <Button
            data-ocid="admin.bulk_import_button"
            variant="outline"
            size="sm"
            className="flex-1 border-primary/30 text-primary text-xs gap-1.5"
            onClick={() => setBulkImportOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import
          </Button>
        </div>

        {/* Canister health banner — shown when not online */}
        {!healthBannerDismissed &&
          (healthStatus === "starting" || healthStatus === "offline") && (
            <div
              data-ocid="admin.canister_health.banner"
              className={[
                "mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
                healthStatus === "starting"
                  ? "border-amber-400/30 bg-amber-400/8 text-amber-300"
                  : "border-destructive/30 bg-destructive/8 text-destructive",
              ].join(" ")}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">
                  {healthStatus === "starting"
                    ? "Canister is starting up"
                    : "Canister appears to be offline"}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {healthStatus === "starting"
                    ? "The backend is recovering after a recent deployment. Write operations (import, edit, delete) may return an error. Wait 30-60 seconds, then retry."
                    : "The backend could not be reached. Save/import operations will fail until it recovers. Click retry to re-check."}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    data-ocid="admin.canister_health.retry_button"
                    onClick={healthRetry}
                    disabled={healthChecking}
                    className="text-[11px] font-medium underline underline-offset-2 disabled:opacity-50"
                  >
                    {healthChecking ? "Checking..." : "Re-check now"}
                  </button>
                  <button
                    type="button"
                    data-ocid="admin.canister_health.dismiss_button"
                    onClick={() => setHealthBannerDismissed(true)}
                    className="text-[11px] opacity-60 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Listing Fee + Banner Price + Treasury */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ListingFeeCard />
          <BannerPriceCard />
          <TreasuryCard />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-secondary border border-border h-9">
            <TabsTrigger
              data-ocid="admin.entries_tab"
              value="entries"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <Database className="w-3.5 h-3.5" />
              Entries
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.ecosystems_tab"
              value="ecosystems"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Ecosystems
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.submissions_tab"
              value="submissions"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7 relative"
            >
              <InboxIcon className="w-3.5 h-3.5" />
              Submissions
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0 h-4 text-[9px] font-mono bg-amber-400 text-black rounded-full flex items-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.analytics_tab"
              value="analytics"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.banners_tab"
              value="banners"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Banners
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.emaillist_tab"
              value="emaillist"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <Mail className="w-3.5 h-3.5" />
              Email List
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.airdrop_tab"
              value="airdrop"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <Star className="w-3.5 h-3.5" />
              Airdrop
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.ambassadors_tab"
              value="ambassadors"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Ambassadors
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.community_tab"
              value="community"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <Users className="w-3.5 h-3.5" />
              Community
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.flagged_tab"
              value="flagged"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs gap-1.5 h-7"
            >
              <Flag className="w-3.5 h-3.5" />
              Flagged
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries">
            <EntryTable />
          </TabsContent>

          <TabsContent value="ecosystems">
            <EcosystemManager />
          </TabsContent>

          <TabsContent value="submissions">
            <SubmissionsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="banners">
            <BannerAdsTab />
          </TabsContent>

          <TabsContent value="emaillist">
            <EmailListTab />
          </TabsContent>
          <TabsContent value="airdrop">
            <AirdropTab />
          </TabsContent>
          <TabsContent value="ambassadors">
            <AdminAmbassadorsTab />
          </TabsContent>
          <TabsContent value="community">
            <CommunitySubmissionsTab />
          </TabsContent>
          <TabsContent value="flagged">
            <FlaggedCommentsTab />
          </TabsContent>
        </Tabs>
      </div>

      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />
    </div>
  );
}
