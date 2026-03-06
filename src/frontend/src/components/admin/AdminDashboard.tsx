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
import { allEntries, ecosystemGroups } from "@/data/registryData";
import {
  AdminActorProvider,
  useAdminActorContext,
} from "@/hooks/useAdminActorContext";
import { useCanisterHealth } from "@/hooks/useCanisterHealth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  Coins,
  Database,
  Download,
  InboxIcon,
  LayoutGrid,
  Loader2,
  LogOut,
  Save,
  ShieldCheck,
  TreePine,
  Upload,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnalyticsTab } from "./AnalyticsTab";
import { BulkImportModal } from "./BulkImportModal";
import { CanisterHealthBadge } from "./CanisterHealthBadge";
import { EcosystemManager } from "./EcosystemManager";
import { EntryTable } from "./EntryTable";

const ADMIN_SECRET = "#WakeUp4";

function e8sToIcp(e8s: bigint): string {
  const icp = Number(e8s) / 1e8;
  return icp.toFixed(4).replace(/\.?0+$/, "");
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

// ── Submissions Tab ───────────────────────────────────────────────────────────
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

        {/* Listing Fee Settings */}
        <div className="mb-6">
          <ListingFeeCard />
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
        </Tabs>
      </div>

      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />
    </div>
  );
}
