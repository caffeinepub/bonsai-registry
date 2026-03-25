import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type BannerAd,
  type BannerMediaType,
  type BannerStatus,
  addBannerAdSubmission,
  deleteBannerAd,
  detectMediaType,
  loadBannerAds,
  saveBannerAds,
  updateBannerAdStatus,
} from "@/data/monetizationData";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  ExternalLink,
  Film,
  Image,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ADMIN_SECRET = "#WakeUp4";

function statusBadge(status: BannerStatus) {
  if (status === "active")
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
        Active
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
        Pending
      </Badge>
    );
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
      Rejected
    </Badge>
  );
}

function mediaTypeIcon(type: BannerMediaType) {
  if (type === "mp4") return <Film className="w-3.5 h-3.5 text-blue-400" />;
  return <Image className="w-3.5 h-3.5 text-muted-foreground" />;
}

function MediaThumb({ ad }: { ad: BannerAd }) {
  if (!ad.mediaUrl || ad.mediaType === "text") {
    return (
      <div className="w-20 h-10 rounded border border-border bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-mono">
        TEXT
      </div>
    );
  }
  if (ad.mediaType === "mp4") {
    return (
      <div className="w-20 h-10 rounded border border-border bg-blue-500/10 flex items-center justify-center gap-1 text-[9px] text-blue-400 font-mono">
        <Film className="w-3 h-3" /> MP4
      </div>
    );
  }
  return (
    <img
      src={ad.mediaUrl}
      alt={ad.projectName}
      className="w-20 h-10 rounded border border-border object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

interface EditForm {
  mediaUrl: string;
  description: string;
  startDate: string;
  endDate: string;
  status: BannerStatus;
}

interface AddForm {
  projectName: string;
  url: string;
  description: string;
  mediaUrl: string;
  durationDays: string;
  priceIcp: string;
  paymentMemo: string;
  status: BannerStatus;
}

export function BannerAdsTab() {
  const actor = useAdminActorContext();
  const [ads, setAds] = useState<BannerAd[]>(() => loadBannerAds());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({
    projectName: "",
    url: "",
    description: "",
    mediaUrl: "",
    durationDays: "30",
    priceIcp: "15",
    paymentMemo: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  const refresh = () => setAds(loadBannerAds());

  // Load from canister on mount
  useEffect(() => {
    let cancelled = false;
    actor
      .getBannerAdsJson()
      .then((json) => {
        if (json && !cancelled) {
          try {
            const loaded = JSON.parse(json) as BannerAd[];
            if (loaded.length > 0) {
              saveBannerAds(loaded);
              setAds(loaded);
            }
          } catch {
            /* ignore parse error */
          }
        }
      })
      .catch(() => {
        /* already using localStorage */
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const syncToCanister = async (allAds: BannerAd[]) => {
    try {
      await actor.saveBannerAdsWithSecret(ADMIN_SECRET, JSON.stringify(allAds));
    } catch (err) {
      console.warn("Failed to sync banner ads to canister:", err);
    }
  };

  const totalCount = ads.length;
  const pendingCount = ads.filter((a) => a.status === "pending").length;
  const activeCount = ads.filter((a) => a.status === "active").length;

  const handleApprove = (id: string) => {
    const ad = ads.find((a) => a.id === id);
    if (!ad) return;
    const now = Date.now();
    updateBannerAdStatus(id, "active", {
      startDate: now,
      endDate: now + ad.durationDays * 86400000,
    });
    toast.success("Banner ad approved and is now live!");
    refresh();
    syncToCanister(loadBannerAds());
  };

  const handleReject = (id: string) => {
    updateBannerAdStatus(id, "rejected");
    toast.success("Banner ad rejected.");
    refresh();
    syncToCanister(loadBannerAds());
  };

  const handleDeactivate = (id: string) => {
    updateBannerAdStatus(id, "rejected");
    toast.success("Banner ad deactivated.");
    refresh();
    syncToCanister(loadBannerAds());
  };

  const handleDelete = (id: string) => {
    deleteBannerAd(id);
    toast.success("Banner ad deleted.");
    refresh();
    syncToCanister(loadBannerAds());
  };

  const startEdit = (ad: BannerAd) => {
    setEditingId(ad.id);
    setEditForm({
      mediaUrl: ad.mediaUrl,
      description: ad.description,
      startDate: ad.startDate
        ? new Date(ad.startDate).toISOString().slice(0, 10)
        : "",
      endDate: ad.endDate
        ? new Date(ad.endDate).toISOString().slice(0, 10)
        : "",
      status: ad.status,
    });
  };

  const saveEdit = () => {
    if (!editForm || !editingId) return;
    setSaving(true);
    const allAds = loadBannerAds();
    const idx = allAds.findIndex((a) => a.id === editingId);
    if (idx !== -1) {
      allAds[idx] = {
        ...allAds[idx],
        mediaUrl: editForm.mediaUrl,
        mediaType: detectMediaType(editForm.mediaUrl),
        description: editForm.description,
        status: editForm.status,
        startDate: editForm.startDate
          ? new Date(editForm.startDate).getTime()
          : allAds[idx].startDate,
        endDate: editForm.endDate
          ? new Date(editForm.endDate).getTime()
          : allAds[idx].endDate,
      };
      saveBannerAds(allAds);
      syncToCanister(allAds);
    }
    setTimeout(() => {
      setSaving(false);
      setEditingId(null);
      setEditForm(null);
      refresh();
      toast.success("Banner ad updated!");
    }, 400);
  };

  const handleAdd = () => {
    if (!addForm.projectName.trim() || !addForm.url.trim()) {
      toast.error("Project name and URL are required");
      return;
    }
    setSaving(true);
    const durationDays = Number.parseInt(addForm.durationDays) || 30;
    const priceIcp = Number.parseFloat(addForm.priceIcp) || 0;
    const now = Date.now();
    const allAds = loadBannerAds();
    const newAd: BannerAd = {
      id: `banner_${now}_${Math.random().toString(36).slice(2, 8)}`,
      projectName: addForm.projectName,
      url: addForm.url,
      description: addForm.description,
      mediaUrl: addForm.mediaUrl,
      mediaType: detectMediaType(addForm.mediaUrl),
      durationDays,
      priceIcp,
      paymentMemo: addForm.paymentMemo,
      submitterNote: "",
      status: addForm.status,
      createdAt: now,
      startDate: addForm.status === "active" ? now : 0,
      endDate: addForm.status === "active" ? now + durationDays * 86400000 : 0,
    };
    allAds.push(newAd);
    saveBannerAds(allAds);
    syncToCanister(allAds);
    setTimeout(() => {
      setSaving(false);
      setShowAddForm(false);
      setAddForm({
        projectName: "",
        url: "",
        description: "",
        mediaUrl: "",
        durationDays: "30",
        priceIcp: "15",
        paymentMemo: "",
        status: "active",
      });
      refresh();
      toast.success("Banner ad added!");
    }, 400);
  };

  return (
    <div className="space-y-5" data-ocid="banner_ads.panel">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: totalCount },
          {
            label: "Pending",
            value: pendingCount,
            highlight: pendingCount > 0 ? "amber" : undefined,
          },
          {
            label: "Active",
            value: activeCount,
            highlight: activeCount > 0 ? "green" : undefined,
          },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={cn(
              "rounded-lg border p-3 text-center",
              highlight === "amber"
                ? "border-amber-400/30 bg-amber-500/5"
                : highlight === "green"
                  ? "border-green-400/30 bg-green-500/5"
                  : "border-border bg-card",
            )}
          >
            <p
              className={cn(
                "text-2xl font-bold font-mono",
                highlight === "amber"
                  ? "text-amber-400"
                  : highlight === "green"
                    ? "text-green-400"
                    : "text-foreground",
              )}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Add Banner button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          All Banner Ads
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm((v) => !v)}
          className="gap-1.5 text-xs"
          data-ocid="banner_ads.open_modal_button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Banner
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          className="rounded-lg border border-border bg-card p-4 space-y-3"
          data-ocid="banner_ads.panel"
        >
          <h4 className="text-sm font-semibold text-foreground">
            New Banner Ad
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project Name *</Label>
              <Input
                value={addForm.projectName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, projectName: e.target.value }))
                }
                placeholder="My Project"
                className="h-8 text-xs"
                data-ocid="banner_ads.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Project URL *</Label>
              <Input
                value={addForm.url}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://..."
                className="h-8 text-xs"
                data-ocid="banner_ads.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Media URL (MP4/GIF/PNG/JPEG)</Label>
              <Input
                value={addForm.mediaUrl}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, mediaUrl: e.target.value }))
                }
                placeholder="https://cdn.example.com/banner.mp4"
                className="h-8 text-xs"
                data-ocid="banner_ads.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration (days)</Label>
              <Input
                type="number"
                value={addForm.durationDays}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, durationDays: e.target.value }))
                }
                className="h-8 text-xs"
                data-ocid="banner_ads.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price Paid (ICP)</Label>
              <Input
                type="number"
                value={addForm.priceIcp}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, priceIcp: e.target.value }))
                }
                className="h-8 text-xs"
                data-ocid="banner_ads.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={addForm.status}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    status: e.target.value as BannerStatus,
                  }))
                }
                className="w-full h-8 text-xs px-2 rounded-md border border-input bg-background text-foreground"
                data-ocid="banner_ads.select"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={addForm.description}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Short description..."
              rows={2}
              className="text-xs"
              data-ocid="banner_ads.textarea"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Memo</Label>
            <Input
              value={addForm.paymentMemo}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, paymentMemo: e.target.value }))
              }
              placeholder="Transaction memo or hash"
              className="h-8 text-xs"
              data-ocid="banner_ads.input"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving}
              className="text-xs gap-1.5"
              data-ocid="banner_ads.save_button"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(false)}
              className="text-xs"
              data-ocid="banner_ads.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Ads List */}
      <div className="space-y-2">
        {ads.length === 0 && (
          <div
            className="text-center py-10 text-muted-foreground text-sm"
            data-ocid="banner_ads.empty_state"
          >
            No banner ads yet. Add one or wait for customer submissions.
          </div>
        )}
        {ads.map((ad, idx) => (
          <div
            key={ad.id}
            data-ocid={`banner_ads.item.${idx + 1}`}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            {editingId === ad.id && editForm ? (
              /* Edit form */
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground">
                  Edit: {ad.projectName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Media URL</Label>
                    <Input
                      value={editForm.mediaUrl}
                      onChange={(e) =>
                        setEditForm(
                          (f) => f && { ...f, mediaUrl: e.target.value },
                        )
                      }
                      className="h-8 text-xs"
                      data-ocid="banner_ads.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm(
                          (f) =>
                            f && {
                              ...f,
                              status: e.target.value as BannerStatus,
                            },
                        )
                      }
                      className="w-full h-8 text-xs px-2 rounded-md border border-input bg-background text-foreground"
                      data-ocid="banner_ads.select"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) =>
                        setEditForm(
                          (f) => f && { ...f, startDate: e.target.value },
                        )
                      }
                      className="h-8 text-xs"
                      data-ocid="banner_ads.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) =>
                        setEditForm(
                          (f) => f && { ...f, endDate: e.target.value },
                        )
                      }
                      className="h-8 text-xs"
                      data-ocid="banner_ads.input"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm(
                        (f) => f && { ...f, description: e.target.value },
                      )
                    }
                    rows={2}
                    className="text-xs"
                    data-ocid="banner_ads.textarea"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveEdit}
                    disabled={saving}
                    className="text-xs gap-1.5"
                    data-ocid="banner_ads.save_button"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    className="text-xs"
                    data-ocid="banner_ads.cancel_button"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal row */
              <div className="p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <MediaThumb ad={ad} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {ad.projectName}
                    </span>
                    {statusBadge(ad.status)}
                    {ad.mediaType !== "text" && mediaTypeIcon(ad.mediaType)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={ad.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 truncate"
                    >
                      {ad.url} <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {ad.durationDays}d · {ad.priceIcp} ICP
                    </span>
                    {ad.status === "active" && ad.endDate > 0 && (
                      <span className="text-[10px] font-mono text-green-400">
                        Expires {new Date(ad.endDate).toLocaleDateString()}
                      </span>
                    )}
                    {ad.status === "pending" && ad.paymentMemo && (
                      <span
                        className="text-[10px] font-mono text-amber-400/80 truncate max-w-32"
                        title={ad.paymentMemo}
                      >
                        Memo: {ad.paymentMemo.slice(0, 16)}…
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {ad.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(ad.id)}
                        className="h-7 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10 gap-1"
                        data-ocid={`banner_ads.confirm_button.${idx + 1}`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(ad.id)}
                        className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
                        data-ocid={`banner_ads.delete_button.${idx + 1}`}
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </>
                  )}
                  {ad.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(ad.id)}
                      className="h-7 text-xs gap-1"
                      data-ocid={`banner_ads.secondary_button.${idx + 1}`}
                    >
                      <XCircle className="w-3 h-3" /> Deactivate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(ad)}
                    className="h-7 text-xs gap-1"
                    data-ocid={`banner_ads.edit_button.${idx + 1}`}
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(ad.id)}
                    className="h-7 text-xs text-red-400 hover:text-red-300 gap-1"
                    data-ocid={`banner_ads.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
