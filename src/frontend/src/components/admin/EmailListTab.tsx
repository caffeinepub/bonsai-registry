import type { EmailSubscriber } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Mail, Users } from "lucide-react";

const ADMIN_SECRET = "#WakeUp4";

function formatDate(ts: bigint): string {
  try {
    return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(ts);
  }
}

export function EmailListTab() {
  const actor = useAdminActorContext();

  const {
    data: subscribers,
    isLoading,
    isError,
  } = useQuery<EmailSubscriber[]>({
    queryKey: ["email-subscribers"],
    queryFn: () => actor.getAllSubscribersWithSecret(ADMIN_SECRET),
    enabled: !!actor,
    staleTime: 30_000,
  });

  const handleExportCSV = () => {
    if (!subscribers || subscribers.length === 0) return;
    const header = "Email,Principal ID,Date Joined,Source";
    const rows = subscribers.map((s) => {
      const email = `"${s.email.replace(/"/g, '""')}"`;
      const principal = s.principalId ? `"${s.principalId}"` : "";
      const date = formatDate(s.subscribedAt);
      const source = `"${(s.source ?? "").replace(/"/g, '""')}"`;
      return `${email},${principal},${date},${source}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bonsai-email-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-ocid="admin.email_list.panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-base text-foreground">
            Email Subscribers
          </h3>
          {subscribers && (
            <Badge variant="secondary" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {subscribers.length} total
            </Badge>
          )}
        </div>
        <Button
          data-ocid="admin.email_list.export_csv_button"
          size="sm"
          variant="outline"
          onClick={handleExportCSV}
          disabled={!subscribers || subscribers.length === 0}
          className="text-xs gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV is formatted for Shopify newsletter import. Export and upload to
        your Shopify customer list.
      </p>

      {isLoading && (
        <div className="space-y-2" data-ocid="admin.email_list.loading_state">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div
          data-ocid="admin.email_list.error_state"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Failed to load email subscribers.
        </div>
      )}

      {!isLoading && !isError && subscribers?.length === 0 && (
        <div
          data-ocid="admin.email_list.empty_state"
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <Mail className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No subscribers yet</p>
          <p className="text-xs mt-1">
            Subscribers will appear here after signing up on the main page.
          </p>
        </div>
      )}

      {!isLoading && !isError && subscribers && subscribers.length > 0 && (
        <div
          className="rounded-lg border border-border overflow-hidden"
          data-ocid="admin.email_list.table"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-xs font-semibold">Email</TableHead>
                <TableHead className="text-xs font-semibold">
                  Principal ID
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Date Joined
                </TableHead>
                <TableHead className="text-xs font-semibold">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((sub, idx) => (
                <TableRow
                  key={sub.email}
                  data-ocid={`admin.email_list.row.${idx + 1}`}
                  className="text-xs hover:bg-muted/40"
                >
                  <TableCell className="font-mono">{sub.email}</TableCell>
                  <TableCell className="font-mono text-muted-foreground max-w-[160px] truncate">
                    {sub.principalId ?? <span className="opacity-40">—</span>}
                  </TableCell>
                  <TableCell>{formatDate(sub.subscribedAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sub.source ?? "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
