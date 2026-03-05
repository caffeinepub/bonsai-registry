import type { backendInterface } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allEntries, ecosystemGroups } from "@/data/registryData";
import {
  AdminActorProvider,
  useAdminActorContext,
} from "@/hooks/useAdminActorContext";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Database,
  Download,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  TreePine,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BulkImportModal } from "./BulkImportModal";
import { EcosystemManager } from "./EcosystemManager";
import { EntryTable } from "./EntryTable";

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

function AdminDashboardInner({ onLogout }: { onLogout: () => void }) {
  const actor = useAdminActorContext();
  const [activeTab, setActiveTab] = useState("entries");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const { data: totalBackendEntries } = useQuery({
    queryKey: ["registry-entries-count"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getTotalEntriesCount();
    },
    enabled: !!actor,
  });

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
          </TabsList>

          <TabsContent value="entries">
            <EntryTable />
          </TabsContent>

          <TabsContent value="ecosystems">
            <EcosystemManager />
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
