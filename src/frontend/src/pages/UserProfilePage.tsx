/**
 * UserProfilePage — Web3 identity profile page.
 *
 * Routes: #profile (own profile), #profile/:principal (public profile)
 *
 * Features:
 * - Avatar, display name, bio, wallet principal chip
 * - Edit mode for own profile
 * - NFT Showcase (ICRC-7 collections)
 * - Pin NFTs to profile
 * - Submitted projects history
 */
import type { ExtendedUserProfile } from "@/backend.d";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createActorWithConfig } from "@/config";
import { useIcrc7Nfts } from "@/hooks/useIcrc7Nfts";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useOisyWallet } from "@/hooks/useOisyWallet";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  ExternalLink,
  ImageOff,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Save,
  Wallet,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

// Known ICP NFT collections (ICRC-7 compatible)
const KNOWN_COLLECTIONS = [
  {
    id: "qmglu-oaaaa-aaaah-adqvq-cai",
    name: "Bioniq",
  },
  {
    id: "6wih6-siaaa-aaaah-qczva-cai",
    name: "Origyn",
  },
];

interface UserProfilePageProps {
  /** Principal in URL (null = own profile) */
  targetPrincipal: string | null;
  onBack: () => void;
}

// ─── Identicon (CSS-based) ──────────────────────────────────────────────────
function Identicon({
  principal,
  size = 64,
}: {
  principal: string;
  size?: number;
}) {
  // Generate deterministic colors from principal string
  let hash = 0;
  for (let i = 0; i < principal.length; i++) {
    hash = ((hash << 5) - hash + principal.charCodeAt(i)) | 0;
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 120) % 360;
  const h3 = (h1 + 240) % 360;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(
          oklch(0.60 0.20 ${h1}) 0deg 120deg,
          oklch(0.55 0.18 ${h2}) 120deg 240deg,
          oklch(0.50 0.22 ${h3}) 240deg 360deg
        )`,
        flexShrink: 0,
      }}
      aria-hidden
    />
  );
}

// ─── NFT Card ───────────────────────────────────────────────────────────────
function NftCard({
  tokenId,
  name,
  imageUrl,
  collectionId,
  isPinned,
  onPinToggle,
  isOwner,
}: {
  tokenId: bigint;
  name: string;
  imageUrl: string | null;
  collectionId: string;
  isPinned: boolean;
  onPinToggle: (tokenId: bigint, collectionId: string) => void;
  isOwner: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={[
        "relative group rounded-lg border overflow-hidden transition-all duration-200",
        isPinned
          ? "border-primary/50 bg-primary/5 shadow-[0_0_12px_oklch(0.60_0.235_27/20%)]"
          : "border-border bg-card hover:border-primary/30 hover:bg-card/80",
      ].join(" ")}
    >
      {/* Image */}
      <div className="aspect-square bg-secondary/50 flex items-center justify-center overflow-hidden">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40 p-4">
            <ImageOff className="w-8 h-8" />
            <span className="text-[10px] font-mono text-center leading-tight">
              No image
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p
          className="text-xs font-medium text-foreground truncate"
          title={name}
        >
          {name}
        </p>
        <p className="text-[10px] text-muted-foreground font-mono">
          #{tokenId.toString()}
        </p>
      </div>

      {/* Pin button (owner only) */}
      {isOwner && (
        <button
          type="button"
          onClick={() => onPinToggle(tokenId, collectionId)}
          className={[
            "absolute top-1.5 right-1.5 p-1 rounded transition-all duration-150",
            isPinned
              ? "bg-primary/20 text-primary opacity-100"
              : "bg-background/70 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary",
          ].join(" ")}
          title={isPinned ? "Unpin from profile" : "Pin to profile"}
          aria-label={
            isPinned ? "Unpin NFT from profile" : "Pin NFT to profile"
          }
        >
          {isPinned ? (
            <PinOff className="w-3 h-3" />
          ) : (
            <Pin className="w-3 h-3" />
          )}
        </button>
      )}

      {/* Pinned badge */}
      {isPinned && (
        <div className="absolute top-1.5 left-1.5">
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/80 text-primary-foreground text-[9px] font-mono">
            <Pin className="w-2 h-2" />
            Pinned
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Collection Section ──────────────────────────────────────────────────────
function CollectionSection({
  collectionId,
  collectionName,
  ownerPrincipal,
  pinnedNfts,
  onPinToggle,
  isOwner,
  onRemove,
}: {
  collectionId: string;
  collectionName: string;
  ownerPrincipal: string;
  pinnedNfts: Array<{ tokenId: bigint; collectionId: string }>;
  onPinToggle: (tokenId: bigint, collectionId: string) => void;
  isOwner: boolean;
  onRemove?: () => void;
}) {
  const {
    data: nfts,
    isLoading,
    isError,
  } = useIcrc7Nfts(collectionId, ownerPrincipal);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-display font-semibold text-foreground">
            {collectionName}
          </h4>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-display font-semibold text-foreground">
            {collectionName}
          </h4>
          {onRemove && isOwner && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove collection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/60 font-mono py-2">
          Could not load NFTs from this collection (may not be accessible on
          this network).
        </p>
      </div>
    );
  }

  if (!nfts || nfts.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="text-sm font-display font-semibold text-foreground">
            {collectionName}
          </h4>
          {onRemove && isOwner && (
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Remove collection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p
          data-ocid="profile.nfts.empty_state"
          className="text-xs text-muted-foreground/60 font-mono py-2"
        >
          No NFTs found in this collection for your wallet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-display font-semibold text-foreground">
            {collectionName}
          </h4>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
            {nfts.length}
          </span>
        </div>
        {onRemove && isOwner && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove collection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {nfts.map((nft) => (
          <NftCard
            key={nft.tokenId.toString()}
            tokenId={nft.tokenId}
            name={nft.name}
            imageUrl={nft.imageUrl}
            collectionId={collectionId}
            isPinned={pinnedNfts.some(
              (p) =>
                p.tokenId === nft.tokenId && p.collectionId === collectionId,
            )}
            onPinToggle={onPinToggle}
            isOwner={isOwner}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function UserProfilePage({
  targetPrincipal,
  onBack,
}: UserProfilePageProps) {
  const { identity } = useInternetIdentity();
  const oisy = useOisyWallet();
  const queryClient = useQueryClient();

  const selfPrincipal = identity?.getPrincipal().toString() ?? null;
  const isOwnProfile = !targetPrincipal || targetPrincipal === selfPrincipal;
  const viewPrincipal = targetPrincipal ?? selfPrincipal;

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    displayName: string;
    bio: string;
    avatarUrl: string;
    walletPrincipal: string;
  }>({ displayName: "", bio: "", avatarUrl: "", walletPrincipal: "" });

  // Custom collections
  const [customCollections, setCustomCollections] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [newCollectionInput, setNewCollectionInput] = useState("");
  const [addCollectionError, setAddCollectionError] = useState("");

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } =
    useQuery<ExtendedUserProfile | null>({
      queryKey: ["user-profile", viewPrincipal],
      queryFn: async () => {
        if (!viewPrincipal) return null;
        if (isOwnProfile && identity) {
          const actor = await createActorWithConfig({
            agentOptions: { identity },
          });
          return actor.getCallerUserProfile();
        }
        if (targetPrincipal) {
          const actor = await createActorWithConfig();
          return actor.getPublicUserProfile(
            Principal.fromText(targetPrincipal),
          );
        }
        return null;
      },
      enabled: !!viewPrincipal,
      staleTime: 30_000,
    });

  // ── Save profile mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (
      newProfile: Omit<ExtendedUserProfile, "submittedEntries">,
    ) => {
      if (!identity) throw new Error("Not authenticated");
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      await actor.saveCallerUserProfile({
        ...newProfile,
        submittedEntries: profile?.submittedEntries ?? [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile", viewPrincipal],
      });
      setIsEditing(false);
      toast.success("Profile saved!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    },
  });

  // ── Pin NFT mutation ───────────────────────────────────────────────────────
  const pinMutation = useMutation({
    mutationFn: async (
      pinnedNfts: Array<{ tokenId: bigint; collectionId: string }>,
    ) => {
      if (!identity) throw new Error("Not authenticated");
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      await actor.saveCallerUserProfile({
        displayName: profile?.displayName ?? "",
        bio: profile?.bio ?? "",
        avatarUrl: profile?.avatarUrl,
        walletPrincipal: profile?.walletPrincipal,
        pinnedNfts,
        submittedEntries: profile?.submittedEntries ?? [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile", viewPrincipal],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update pinned NFTs",
      );
    },
  });

  const handleStartEdit = () => {
    setEditForm({
      displayName: profile?.displayName ?? "",
      bio: profile?.bio ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      walletPrincipal: profile?.walletPrincipal?.toString() ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    let walletPpal: Principal | undefined = undefined;
    if (editForm.walletPrincipal.trim()) {
      try {
        walletPpal = Principal.fromText(editForm.walletPrincipal.trim());
      } catch {
        toast.error("Invalid wallet principal format");
        return;
      }
    }

    saveMutation.mutate({
      displayName: editForm.displayName.trim(),
      bio: editForm.bio.trim(),
      avatarUrl: editForm.avatarUrl.trim() || undefined,
      walletPrincipal: walletPpal,
      pinnedNfts: profile?.pinnedNfts ?? [],
    });
  };

  const handleLinkOisyWallet = () => {
    if (!oisy.connected || !oisy.principal) {
      toast.error(
        "Connect your OISY wallet first using the button in the header.",
      );
      return;
    }
    setEditForm((f) => ({ ...f, walletPrincipal: oisy.principal! }));
    toast.success(
      "OISY wallet principal linked! Click Save to persist this change.",
    );
  };

  const handlePinToggle = (tokenId: bigint, collectionId: string) => {
    if (!profile) return;
    const current = profile.pinnedNfts ?? [];
    const isPinned = current.some(
      (p) => p.tokenId === tokenId && p.collectionId === collectionId,
    );
    const updated = isPinned
      ? current.filter(
          (p) => !(p.tokenId === tokenId && p.collectionId === collectionId),
        )
      : [...current, { tokenId, collectionId }];

    pinMutation.mutate(updated);
  };

  const handleAddCollection = () => {
    setAddCollectionError("");
    const id = newCollectionInput.trim();
    if (!id) return;

    // Basic canister ID validation
    if (
      !/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/.test(id)
    ) {
      setAddCollectionError(
        "Invalid canister ID format (e.g. xxxxx-xxxxx-xxxxx-xxxxx-xxx)",
      );
      return;
    }

    if (
      customCollections.some((c) => c.id === id) ||
      KNOWN_COLLECTIONS.some((c) => c.id === id)
    ) {
      setAddCollectionError("This collection is already added.");
      return;
    }

    setCustomCollections((prev) => [
      ...prev,
      { id, name: `${id.slice(0, 5)}…${id.slice(-3)}` },
    ]);
    setNewCollectionInput("");
  };

  const allCollections = [...KNOWN_COLLECTIONS, ...customCollections];

  // ── Loading state ──────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="flex gap-4 mb-8">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not signed in for own profile ──────────────────────────────────────────
  if (isOwnProfile && !identity) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Registry
          </button>
          <div
            data-ocid="profile.auth_required.card"
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="font-display font-bold text-2xl text-foreground mb-2">
              Sign In Required
            </h2>
            <p className="text-muted-foreground">
              Sign in with Internet Identity to view and edit your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.displayName ||
    (viewPrincipal
      ? `${viewPrincipal.slice(0, 5)}…${viewPrincipal.slice(-3)}`
      : "Anonymous");

  return (
    <div className="min-h-screen bg-background">
      {/* Background atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.25 0.12 27 / 40%) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          type="button"
          data-ocid="profile.back_button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Registry
        </button>

        {/* ── Profile header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 shadow-[0_0_20px_oklch(0.60_0.235_27/20%)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="border-2 border-primary/30 rounded-full shadow-[0_0_20px_oklch(0.60_0.235_27/20%)]">
                  <Identicon principal={viewPrincipal ?? "anon"} size={80} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground leading-tight">
                    {displayName}
                  </h1>
                  {viewPrincipal && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5 break-all">
                      {viewPrincipal}
                    </p>
                  )}
                </div>
                {isOwnProfile && identity && !isEditing && (
                  <Button
                    data-ocid="profile.edit_button"
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 text-xs flex-shrink-0"
                    onClick={handleStartEdit}
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Wallet chip */}
              {profile?.walletPrincipal && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-amber-400/80 bg-amber-400/8 border border-amber-400/20 px-2 py-1 rounded-md inline-flex max-w-fit">
                  <Wallet className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">
                    {profile.walletPrincipal.toString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Edit form ── */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-mono text-[9px] text-primary/60 uppercase tracking-widest">
                  Edit Profile
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cancel editing"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Display Name</Label>
                  <Input
                    data-ocid="profile.display_name_input"
                    value={editForm.displayName}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        displayName: e.target.value,
                      }))
                    }
                    placeholder="Your name..."
                    className="bg-secondary border-border text-sm h-8"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-mono">Avatar URL</Label>
                  <Input
                    data-ocid="profile.avatar_url_input"
                    value={editForm.avatarUrl}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        avatarUrl: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/avatar.png"
                    className="bg-secondary border-border text-sm h-8"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono">Bio</Label>
                <Textarea
                  data-ocid="profile.bio_textarea"
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  placeholder="Tell the Web3 community about yourself..."
                  className="bg-secondary border-border text-sm resize-none min-h-[70px]"
                  maxLength={200}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {editForm.bio.length}/200
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono">
                  Linked Wallet Principal
                </Label>
                <div className="flex gap-2">
                  <Input
                    data-ocid="profile.wallet_principal_input"
                    value={editForm.walletPrincipal}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        walletPrincipal: e.target.value,
                      }))
                    }
                    placeholder="Paste principal or link OISY wallet..."
                    className="bg-secondary border-border text-sm h-8 font-mono text-xs flex-1"
                  />
                  {oisy.connected && oisy.principal && (
                    <Button
                      data-ocid="profile.link_oisy_button"
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 text-xs gap-1 h-8 flex-shrink-0"
                      onClick={handleLinkOisyWallet}
                    >
                      <Wallet className="w-3 h-3" />
                      Link OISY
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  data-ocid="profile.cancel_edit_button"
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  data-ocid="profile.save_button"
                  size="sm"
                  className="bg-primary text-primary-foreground font-display font-bold text-xs gap-1.5"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Profile
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── NFT Showcase ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              NFT Showcase
              <span className="text-[9px] font-mono text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded uppercase tracking-wide">
                ICRC-7
              </span>
            </h2>
          </div>

          {/* Pinned NFTs grid (shown to everyone) */}
          {profile?.pinnedNfts && profile.pinnedNfts.length > 0 && (
            <div className="mb-5">
              <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest mb-3">
                Pinned NFTs
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {profile.pinnedNfts.map((pinned) => (
                  <div
                    key={`${pinned.collectionId}-${pinned.tokenId}`}
                    className="rounded-lg border border-primary/30 bg-primary/5 p-2 flex flex-col items-center gap-1"
                  >
                    <Pin className="w-4 h-4 text-primary" />
                    <p className="text-[10px] font-mono text-muted-foreground text-center truncate w-full">
                      #{pinned.tokenId.toString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 truncate w-full text-center">
                      {pinned.collectionId.slice(0, 5)}…
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full NFT collections (owner only) */}
          {isOwnProfile && viewPrincipal && (
            <div className="space-y-6">
              {allCollections.map((col) => (
                <CollectionSection
                  key={col.id}
                  collectionId={col.id}
                  collectionName={col.name}
                  ownerPrincipal={viewPrincipal}
                  pinnedNfts={profile?.pinnedNfts ?? []}
                  onPinToggle={handlePinToggle}
                  isOwner={isOwnProfile}
                  onRemove={
                    customCollections.some((c) => c.id === col.id)
                      ? () =>
                          setCustomCollections((prev) =>
                            prev.filter((c) => c.id !== col.id),
                          )
                      : undefined
                  }
                />
              ))}

              {/* Add collection */}
              <div className="rounded-lg border border-dashed border-border/60 p-4">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                  Add ICRC-7 Collection
                </p>
                <div className="flex gap-2">
                  <Input
                    data-ocid="profile.add_collection_input"
                    value={newCollectionInput}
                    onChange={(e) => {
                      setNewCollectionInput(e.target.value);
                      setAddCollectionError("");
                    }}
                    placeholder="Paste canister ID (e.g. xxxxx-xxxxx-xxxxx-xxxxx-xxx)"
                    className="bg-secondary border-border text-sm font-mono flex-1 h-8 text-xs"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddCollection()
                    }
                  />
                  <Button
                    data-ocid="profile.add_collection_button"
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10 text-xs gap-1 h-8 flex-shrink-0"
                    onClick={handleAddCollection}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
                {addCollectionError && (
                  <p
                    data-ocid="profile.add_collection_error"
                    className="text-[11px] text-destructive mt-1.5 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {addCollectionError}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  Any ICRC-7 compatible NFT canister on the Internet Computer.
                </p>
              </div>
            </div>
          )}

          {/* Public view — no NFT data loaded */}
          {!isOwnProfile &&
            (!profile?.pinnedNfts || profile.pinnedNfts.length === 0) && (
              <p
                data-ocid="profile.nfts.empty_state"
                className="text-sm text-muted-foreground/60 py-4 font-mono"
              >
                No pinned NFTs
              </p>
            )}
        </motion.section>

        {/* ── Submitted Projects ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="font-display font-bold text-lg text-foreground mb-4">
            Submitted Projects
          </h2>

          {!profile?.submittedEntries ||
          profile.submittedEntries.length === 0 ? (
            <div
              data-ocid="profile.submissions.empty_state"
              className="text-center py-8 text-muted-foreground/60"
            >
              <div className="text-3xl mb-2">🌱</div>
              <p className="text-sm font-mono">No submissions yet</p>
              {isOwnProfile && (
                <p className="text-xs mt-1 text-muted-foreground/40">
                  Use &ldquo;List Your Project&rdquo; to submit your first
                  project
                </p>
              )}
            </div>
          ) : (
            <div data-ocid="profile.submissions.list" className="space-y-2">
              {profile.submittedEntries.map((id, idx) => (
                <div
                  key={id.toString()}
                  data-ocid={`profile.submission.item.${idx + 1}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-foreground">
                      Entry #{id.toString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    View
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
