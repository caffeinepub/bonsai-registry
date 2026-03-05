import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clearAnalytics, getAnalyticsSummary } from "@/utils/analytics";
import { ChevronDown, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EVENT_TYPE_LABELS: Record<string, string> = {
  page_view: "Page View",
  search: "Search Query",
  ecosystem_view: "Ecosystem Opened",
  link_click: "Link Clicked",
  onboarding_started: "Onboarding Started",
  onboarding_completed: "Onboarding Completed",
  onboarding_skipped: "Onboarding Skipped",
  tip_modal_open: "Tip Modal Opened",
  tip_copy: "Tip Address Copied",
};

export function AnalyticsTab() {
  const [summary, setSummary] = useState(() => getAnalyticsSummary());

  const refresh = () => {
    setSummary(getAnalyticsSummary());
    toast.success("Analytics refreshed");
  };

  const handleClear = () => {
    clearAnalytics();
    setSummary(getAnalyticsSummary());
    toast.success("Analytics data cleared");
  };

  const eventTypes = Object.entries(summary.byType).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div data-ocid="admin.analytics_tab" className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">
            Anonymous Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All data is stored locally in this browser. No personal information
            is collected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="admin.secondary_button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-border text-muted-foreground"
            onClick={refresh}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-ocid="admin.delete_button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              data-ocid="admin.dialog"
              className="border border-destructive/30 bg-card"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">
                  Clear all analytics data?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all locally-stored analytics
                  events from this browser. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  data-ocid="admin.cancel_button"
                  className="border-border text-muted-foreground"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid="admin.confirm_button"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleClear}
                >
                  Clear Analytics
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Total Events"
          value={summary.totalEvents.toLocaleString()}
          sub="across all event types"
        />
        <StatCard
          label="Event Types"
          value={eventTypes.length.toString()}
          sub="distinct interaction categories"
        />
        <StatCard
          label="Top Event"
          value={
            eventTypes[0]?.[0]
              ? (EVENT_TYPE_LABELS[eventTypes[0][0]] ?? eventTypes[0][0])
              : "—"
          }
          sub={
            eventTypes[0]?.[1]
              ? `${eventTypes[0][1].toLocaleString()} occurrences`
              : "no data yet"
          }
        />
      </div>

      {/* Breakdown table */}
      {eventTypes.length === 0 ? (
        <div
          data-ocid="admin.analytics.empty_state"
          className="flex flex-col items-center justify-center py-14 text-center border border-border rounded-lg bg-secondary/20"
        >
          <div className="text-4xl mb-3 opacity-40">📊</div>
          <p className="font-display font-semibold text-foreground/70 text-sm">
            No analytics data yet
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Events will appear here as users interact with the registry.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-sm text-foreground">
            Events Breakdown
          </h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table data-ocid="admin.analytics.table">
              <TableHeader>
                <TableRow className="border-border bg-secondary/60">
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Event Type
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">
                    Count
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">
                    % of Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventTypes.map(([type, count], i) => (
                  <TableRow
                    key={type}
                    data-ocid={`admin.analytics.row.${i + 1}`}
                    className="border-border hover:bg-secondary/40"
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[9px] border-primary/20 text-primary bg-primary/5"
                        >
                          {type}
                        </Badge>
                        <span className="text-muted-foreground text-xs hidden sm:inline">
                          {EVENT_TYPE_LABELS[type] ?? ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground tabular-nums">
                      {count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground text-xs tabular-nums">
                      {summary.totalEvents > 0
                        ? ((count / summary.totalEvents) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Top payloads per type */}
          <h3 className="font-display font-bold text-sm text-foreground pt-2">
            Top Payloads by Type
          </h3>
          <div className="space-y-2">
            {eventTypes.map(([type]) => {
              const payloads = summary.topPayloads[type];
              if (!payloads || payloads.length === 0) return null;
              return (
                <PayloadSection
                  key={type}
                  type={type}
                  label={EVENT_TYPE_LABELS[type] ?? type}
                  payloads={payloads}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border border-border bg-secondary/40 rounded-lg p-4">
      <p className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="font-display font-extrabold text-2xl text-primary leading-none truncate">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function PayloadSection({
  type,
  label,
  payloads,
}: {
  type: string;
  label: string;
  payloads: { payload: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        data-ocid="admin.analytics.toggle"
        className="flex items-center justify-between w-full px-3 py-2.5 border border-border rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-[9px] border-primary/20 text-primary bg-primary/5"
          >
            {type}
          </Badge>
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            ({payloads.length} payloads)
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 border border-border border-t-0 rounded-b-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-secondary/40">
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Payload
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">
                  Count
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payloads.map(({ payload, count }) => (
                <TableRow
                  key={payload || "(empty)"}
                  className="border-border hover:bg-secondary/30"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-[300px] truncate">
                    {payload || "(empty)"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground tabular-nums">
                    {count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
