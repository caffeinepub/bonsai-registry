import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type BannerAd, loadBannerAds } from "@/data/monetizationData";
import { Download, ExternalLink, Film, Image } from "lucide-react";
import { useState } from "react";

const LAUNCHPAD_URL = "https://tnyst-jqaaa-aaaau-afpfq-cai.icp0.io/#/dashboard";

function statusColor(status: BannerAd["status"]) {
  if (status === "active")
    return "bg-green-500/20 text-green-400 border-green-500/30";
  if (status === "pending")
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function exportCsv(ads: BannerAd[]) {
  const headers = [
    "ID",
    "Project",
    "URL",
    "Duration(days)",
    "ICP Paid",
    "Status",
    "Created",
    "Start",
    "End",
    "PaymentMemo",
  ];
  const rows = ads.map((a) => [
    a.id,
    `"${a.projectName}"`,
    a.url,
    a.durationDays,
    a.priceIcp,
    a.status,
    new Date(a.createdAt).toISOString(),
    a.startDate ? new Date(a.startDate).toISOString() : "",
    a.endDate ? new Date(a.endDate).toISOString() : "",
    `"${a.paymentMemo}"`,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bonsai-banner-ads-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BannerLogPage() {
  const [ads] = useState<BannerAd[]>(() => loadBannerAds());

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Banner Ad Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Transparent record of all featured placement transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={LAUNCHPAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              data-ocid="banner_log.link"
            >
              ICP Launchpad Dashboard <ExternalLink className="w-3 h-3" />
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportCsv(ads)}
              className="text-xs gap-1.5"
              data-ocid="banner_log.button"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {ads.length === 0 ? (
          <div
            className="text-center py-20 text-muted-foreground"
            data-ocid="banner_log.empty_state"
          >
            No banner ad transactions yet.
          </div>
        ) : (
          <div
            className="rounded-lg border border-border overflow-hidden"
            data-ocid="banner_log.table"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Preview</TableHead>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs">Duration</TableHead>
                  <TableHead className="text-xs">ICP Paid</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Active Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad, idx) => (
                  <TableRow key={ad.id} data-ocid={`banner_log.row.${idx + 1}`}>
                    <TableCell>
                      {ad.mediaUrl && ad.mediaType !== "text" ? (
                        ad.mediaType === "mp4" ? (
                          <div className="w-16 h-8 rounded border border-border bg-blue-500/10 flex items-center justify-center text-[9px] text-blue-400 gap-1">
                            <Film className="w-3 h-3" /> MP4
                          </div>
                        ) : (
                          <img
                            src={ad.mediaUrl}
                            alt={ad.projectName}
                            className="w-16 h-8 rounded border border-border object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )
                      ) : (
                        <div className="w-16 h-8 rounded border border-border bg-muted flex items-center justify-center text-[9px] text-muted-foreground">
                          <Image className="w-3 h-3" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {ad.projectName}
                        </span>
                        <a
                          href={ad.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 truncate max-w-32"
                        >
                          {ad.url} <ExternalLink className="w-2 h-2" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ad.durationDays}d
                    </TableCell>
                    <TableCell className="text-xs font-mono text-amber-400">
                      {ad.priceIcp} ICP
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColor(ad.status)} text-[10px]`}
                      >
                        {ad.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-mono">
                      {new Date(ad.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-mono">
                      {ad.startDate && ad.endDate ? (
                        <span>
                          {new Date(ad.startDate).toLocaleDateString()} →{" "}
                          {new Date(ad.endDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
