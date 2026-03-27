/**
 * UserProfilePage — Enhanced Web3 identity profile page.
 *
 * Routes: #profile (own profile), #profile/:principal (public profile)
 *
 * Features:
 * 1. Identity & Presence — username, banner, social links, 300-char bio
 * 2. Web3 Identity — wallet address chips (ETH/BTC/HBAR/SOL), OISY badge
 * 3. Registry Activity — contribution score, bookmarks, rated entries
 * 4. Community Standing — badges, reputation score, join date
 * 5. Discovery — public profile URL share, ecosystem affinity tags
 * 6. NFT Showcase (ICRC-7) — unchanged from prior version
 */
import type { ExtendedUserProfile } from "@/backend.d";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createActorWithConfig } from "@/config";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useOisyWallet } from "@/hooks/useOisyWallet";
import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bookmark,
  BookmarkX,
  Calendar,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Github,
  Globe,
  Loader2,
  Lock,
  LogIn,
  MessageCircle,
  Plus,
  Save,
  Send,
  Share2,
  Star,
  Trophy,
  Twitter,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface UserProfilePageProps {
  /** Principal in URL (null = own profile) */
  targetPrincipal: string | null;
  onBack: () => void;
  onLogin?: () => void;
}

// ─── Identicon ────────────────────────────────────────────────────────────────
function Identicon({
  principal,
  size = 64,
}: { principal: string; size?: number }) {
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

// ─── Achievement badge definitions ────────────────────────────────────────────
const BADGE_DEFINITIONS = [
  {
    id: "early-adopter",
    label: "Early Adopter",
    icon: "⚡",
    color: "amber",
    desc: "Joined the Bonsai Ecosystem early",
    check: (p: ExtendedUserProfile) => {
      const ms = Number(p.joinedAt ?? 0n) / 1_000_000;
      return ms > 0 && ms < new Date("2026-01-01").getTime();
    },
  },
  {
    id: "first-rating",
    label: "First Vote",
    icon: "⭐",
    color: "yellow",
    desc: "Rate your first project",
    check: (p: ExtendedUserProfile) => (p.ratedEntries?.length ?? 0) >= 1,
    unlockHint: "Rate any project in the registry",
  },
  {
    id: "power-voter",
    label: "Power Voter",
    icon: "🗳️",
    color: "violet",
    desc: "Rate 10+ projects",
    check: (p: ExtendedUserProfile) => (p.ratedEntries?.length ?? 0) >= 10,
    unlockHint: "Rate 10 projects",
  },
  {
    id: "community-voice",
    label: "Community Voice",
    icon: "📣",
    color: "blue",
    desc: "Rate 25+ projects",
    check: (p: ExtendedUserProfile) => (p.ratedEntries?.length ?? 0) >= 25,
    unlockHint: "Rate 25 projects",
  },
  {
    id: "contributor",
    label: "Contributor",
    icon: "🌱",
    color: "green",
    desc: "Submit your first registry entry",
    check: (p: ExtendedUserProfile) => (p.submittedEntries?.length ?? 0) >= 1,
    unlockHint: "Submit a project to the registry",
  },
  {
    id: "bonsai-builder",
    label: "Bonsai Builder",
    icon: "🌿",
    color: "emerald",
    desc: "Submit 3+ registry entries",
    check: (p: ExtendedUserProfile) => (p.submittedEntries?.length ?? 0) >= 3,
    unlockHint: "Submit 3 projects",
  },
  {
    id: "web3-connected",
    label: "Web3 Connected",
    icon: "🔗",
    color: "cyan",
    desc: "Add a wallet address to your profile",
    check: (p: ExtendedUserProfile) =>
      !!(
        p.walletAddresses?.eth ||
        p.walletAddresses?.btc ||
        p.walletAddresses?.sol ||
        p.walletAddresses?.hbar
      ),
    unlockHint: "Add a wallet address in your profile",
  },
  {
    id: "oisy-pioneer",
    label: "OISY Pioneer",
    icon: "🏅",
    color: "orange",
    desc: "Connect your OISY wallet principal",
    check: (p: ExtendedUserProfile) => !!p.oisyPrincipal?.[0],
    unlockHint: "Link your OISY Principal ID",
  },
];

// ─── Badge pill ───────────────────────────────────────────────────────────────
function BadgePill({ badge }: { badge: string }) {
  const styles: Record<string, string> = {
    "early-adopter":
      "bg-amber-400/15 text-amber-300 border border-amber-400/30",
    "top-contributor":
      "bg-violet-400/15 text-violet-300 border border-violet-400/30",
    "verified-builder":
      "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30",
    "first-rating":
      "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30",
    "power-voter":
      "bg-violet-400/15 text-violet-300 border border-violet-400/30",
    "community-voice": "bg-blue-400/15 text-blue-300 border border-blue-400/30",
    contributor: "bg-green-400/15 text-green-300 border border-green-400/30",
    "bonsai-builder":
      "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30",
    "web3-connected": "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30",
    "oisy-pioneer":
      "bg-orange-400/15 text-orange-300 border border-orange-400/30",
  };
  const icons: Record<string, React.ReactNode> = {
    "early-adopter": <Zap className="w-3 h-3" />,
    "top-contributor": <Award className="w-3 h-3" />,
    "verified-builder": <CheckCircle2 className="w-3 h-3" />,
    "first-rating": <Star className="w-3 h-3" />,
    "power-voter": <Star className="w-3 h-3" />,
    "community-voice": <Star className="w-3 h-3" />,
    contributor: <CheckCircle2 className="w-3 h-3" />,
    "bonsai-builder": <CheckCircle2 className="w-3 h-3" />,
    "web3-connected": <Wallet className="w-3 h-3" />,
    "oisy-pioneer": <Award className="w-3 h-3" />,
  };
  const labels: Record<string, string> = {
    "early-adopter": "Early Adopter",
    "top-contributor": "Top Contributor",
    "verified-builder": "Verified Builder",
    "first-rating": "First Vote",
    "power-voter": "Power Voter",
    "community-voice": "Community Voice",
    contributor: "Contributor",
    "bonsai-builder": "Bonsai Builder",
    "web3-connected": "Web3 Connected",
    "oisy-pioneer": "OISY Pioneer",
  };
  const style =
    styles[badge] ?? "bg-secondary text-muted-foreground border border-border";
  const icon = icons[badge] ?? <Star className="w-3 h-3" />;
  const label = labels[badge] ?? badge;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wide ${style}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ─── Wallet address chip ───────────────────────────────────────────────────────
function WalletChip({
  chain,
  address,
}: {
  chain: string;
  address: string;
}) {
  const [copied, setCopied] = useState(false);
  const cfg: Record<string, { color: string; dot: string; short: number }> = {
    ETH: {
      color: "text-blue-300 bg-blue-400/10 border-blue-400/25",
      dot: "bg-blue-400",
      short: 6,
    },
    BTC: {
      color: "text-orange-300 bg-orange-400/10 border-orange-400/25",
      dot: "bg-orange-400",
      short: 6,
    },
    HBAR: {
      color: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
      dot: "bg-cyan-400",
      short: 7,
    },
    SOL: {
      color: "text-purple-300 bg-purple-400/10 border-purple-400/25",
      dot: "bg-purple-500",
      short: 6,
    },
  };
  const c = cfg[chain] ?? {
    color: "text-muted-foreground bg-secondary border-border",
    dot: "bg-muted-foreground",
    short: 6,
  };
  const shortened = `${address.slice(0, c.short)}…${address.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all hover:opacity-80 ${c.color}`}
      title={`Copy ${chain} address: ${address}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      <span className="font-semibold">{chain}</span>
      <span className="opacity-70">{shortened}</span>
      {copied ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-lg border border-border bg-card">
      <div className="text-primary/70">{icon}</div>
      <span className="text-lg font-display font-bold text-foreground leading-none">
        {value}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─── Social link row ──────────────────────────────────────────────────────────
function SocialLinks({ links }: { links: ExtendedUserProfile["socialLinks"] }) {
  const items = [
    {
      key: "twitter",
      icon: <Twitter className="w-4 h-4" />,
      href: (v: string) => `https://twitter.com/${v.replace("@", "")}`,
      label: "Twitter/X",
    },
    {
      key: "github",
      icon: <Github className="w-4 h-4" />,
      href: (v: string) => `https://github.com/${v.replace("@", "")}`,
      label: "GitHub",
    },
    {
      key: "discord",
      icon: <MessageCircle className="w-4 h-4" />,
      href: (v: string) =>
        v.startsWith("http") ? v : `https://discord.gg/${v}`,
      label: "Discord",
    },
    {
      key: "telegram",
      icon: <Send className="w-4 h-4" />,
      href: (v: string) =>
        v.startsWith("http") ? v : `https://t.me/${v.replace("@", "")}`,
      label: "Telegram",
    },
    {
      key: "website",
      icon: <Globe className="w-4 h-4" />,
      href: (v: string) => (v.startsWith("http") ? v : `https://${v}`),
      label: "Website",
    },
  ] as const;

  const visible = items.filter((item) => {
    const val = links[item.key as keyof typeof links];
    return val && val.trim() !== "";
  });

  if (visible.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {visible.map((item) => {
        const val = links[item.key as keyof typeof links]!;
        return (
          <a
            key={item.key}
            href={item.href(val)}
            target="_blank"
            rel="noopener noreferrer"
            title={item.label}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-secondary text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            aria-label={item.label}
          >
            {item.icon}
          </a>
        );
      })}
    </div>
  );
}

// ─── Format join date ─────────────────────────────────────────────────────────
function formatJoinDate(ns: bigint | number | undefined): string {
  if (!ns) return "";
  const ms = Number(ns) / 1_000_000;
  if (ms < 1_000_000) return ""; // clearly unset
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Edit form state ──────────────────────────────────────────────────────────
interface EditFormState {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  walletPrincipal: string;
  // Social
  twitter: string;
  github: string;
  discord: string;
  telegram: string;
  website: string;
  // Web3 wallets
  eth: string;
  btc: string;
  hbar: string;
  sol: string;
  oisyPrincipal: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UserProfilePage({
  targetPrincipal,
  onBack,
  onLogin,
}: UserProfilePageProps) {
  const { identity } = useInternetIdentity();
  const oisy = useOisyWallet();
  const queryClient = useQueryClient();

  const selfPrincipal = identity?.getPrincipal().toString() ?? null;
  const isOwnProfile = !targetPrincipal || targetPrincipal === selfPrincipal;
  const viewPrincipal = targetPrincipal ?? selfPrincipal;

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    displayName: "",
    username: "",
    bio: "",
    avatarUrl: "",
    bannerUrl: "",
    walletPrincipal: "",
    twitter: "",
    github: "",
    discord: "",
    telegram: "",
    website: "",
    eth: "",
    btc: "",
    hbar: "",
    sol: "",
    oisyPrincipal: "",
  });

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

  // ── Fetch bookmarks (own profile only) ────────────────────────────────────
  const { data: bookmarkIds, isLoading: bookmarksLoading } = useQuery<bigint[]>(
    {
      queryKey: ["bookmarks", viewPrincipal],
      queryFn: async () => {
        if (!identity) return [];
        const actor = await createActorWithConfig({
          agentOptions: { identity },
        });
        return actor.getAllBookmarkedEntries();
      },
      enabled: !!identity && isOwnProfile,
      staleTime: 30_000,
    },
  );

  // ── Remove bookmark mutation ───────────────────────────────────────────────
  const unbookmarkMutation = useMutation({
    mutationFn: async (entryId: bigint) => {
      if (!identity) throw new Error("Not authenticated");
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      await actor.unbookmarkEntry(entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", viewPrincipal] });
      toast.success("Bookmark removed");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to remove bookmark",
      ),
  });

  // ── Save profile mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (newProfile: ExtendedUserProfile) => {
      if (!identity) throw new Error("Not authenticated");
      const actor = await createActorWithConfig({ agentOptions: { identity } });
      await actor.saveCallerUserProfile(newProfile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile", viewPrincipal],
      });
      setIsEditing(false);
      toast.success("Profile saved!");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      ),
  });

  const handleStartEdit = () => {
    setEditForm({
      displayName: profile?.displayName ?? "",
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      bannerUrl: profile?.bannerUrl ?? "",
      walletPrincipal: "",
      twitter: profile?.socialLinks?.twitter ?? "",
      github: profile?.socialLinks?.github ?? "",
      discord: profile?.socialLinks?.discord ?? "",
      telegram: profile?.socialLinks?.telegram ?? "",
      website: profile?.socialLinks?.website ?? "",
      eth: profile?.walletAddresses?.eth ?? "",
      btc: profile?.walletAddresses?.btc ?? "",
      hbar: profile?.walletAddresses?.hbar ?? "",
      sol: profile?.walletAddresses?.sol ?? "",
      oisyPrincipal: profile?.oisyPrincipal?.[0] ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Validate username
    if (editForm.username && !/^[a-zA-Z0-9_]{1,30}$/.test(editForm.username)) {
      toast.error(
        "Username must be 1-30 characters: letters, numbers, underscores only.",
      );
      return;
    }

    saveMutation.mutate({
      displayName: editForm.displayName.trim(),
      username: editForm.username.trim(),
      bio: editForm.bio.trim(),
      avatarUrl: editForm.avatarUrl.trim() || undefined,
      bannerUrl: editForm.bannerUrl.trim() || undefined,
      socialLinks: {
        twitter: editForm.twitter.trim() || undefined,
        github: editForm.github.trim() || undefined,
        discord: editForm.discord.trim() || undefined,
        telegram: editForm.telegram.trim() || undefined,
        website: editForm.website.trim() || undefined,
      },
      walletAddresses: {
        eth: editForm.eth.trim() || undefined,
        btc: editForm.btc.trim() || undefined,
        hbar: editForm.hbar.trim() || undefined,
        sol: editForm.sol.trim() || undefined,
      },
      oisyPrincipal: editForm.oisyPrincipal.trim()
        ? [editForm.oisyPrincipal.trim()]
        : [],
      pinnedNfts: profile?.pinnedNfts ?? [],
      submittedEntries: profile?.submittedEntries ?? [],
      ratedEntries: profile?.ratedEntries ?? [],
      bookmarks: profile?.bookmarks ?? [],
      joinedAt: profile?.joinedAt ?? 0n,
      badges: profile?.badges ?? [],
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
    toast.success("OISY wallet principal linked! Click Save to persist.");
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/#profile/${viewPrincipal}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Profile link copied!"));
  };

  // Contribution score
  const ratedCount = profile?.ratedEntries?.length ?? 0;
  const submittedCount = profile?.submittedEntries?.length ?? 0;
  const contributionScore = ratedCount * 1 + submittedCount * 5;

  // Ecosystem affinities (from onboarding localStorage) — only for own profile
  const ecosystemAffinities: string[] = (() => {
    if (!isOwnProfile) return [];
    try {
      const raw = localStorage.getItem("onboarding_interests");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  // OISY badge — check if connected principal matches stored wallet principal
  const oisyBadgeVisible = oisy.connected && oisy.principal != null;

  // Join date
  const joinDateLabel = profile?.joinedAt
    ? formatJoinDate(profile.joinedAt)
    : "";

  // ── Loading state ────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-48 w-full rounded-xl mb-0" />
          <div className="flex gap-4 mb-8 mt-[-40px] px-6">
            <Skeleton className="w-24 h-24 rounded-full flex-shrink-0 border-4 border-background" />
            <div className="space-y-2 flex-1 pt-12">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (isOwnProfile && !identity) {
    return (
      <div className="min-h-screen bg-background">
        {/* Subtle atmospheric background */}
        <div
          className="fixed inset-0 pointer-events-none opacity-15"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.25 0.12 27 / 40%) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Registry
          </button>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            data-ocid="profile.auth_required.card"
            className="max-w-md mx-auto"
          >
            <div className="rounded-2xl border border-primary/25 bg-card/80 backdrop-blur-sm p-8 text-center shadow-[0_0_40px_oklch(0.60_0.235_27/8%)]">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-5">
                🌿
              </div>

              <h2 className="font-display font-bold text-2xl text-foreground mb-2">
                Your Web3 Profile
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Sign in with Internet Identity to access your profile, rate
                projects, and showcase your Web3 identity.
              </p>

              {/* Feature highlights */}
              <div className="space-y-2 mb-7 text-left">
                {[
                  { icon: "★", label: "Rate & rank Web3 projects" },
                  { icon: "♥", label: "Bookmark your favorites" },
                  { icon: "◈", label: "Showcase your NFTs & wallet" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-secondary/50 border border-border/50"
                  >
                    <span className="text-primary text-sm w-4 text-center flex-shrink-0">
                      {f.icon}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sign in button */}
              <Button
                data-ocid="profile.signin_button"
                onClick={onLogin}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold gap-2 h-11 text-sm"
              >
                <LogIn className="w-4 h-4" aria-hidden />
                Sign In with Internet Identity
              </Button>

              <p className="mt-3 text-[11px] text-muted-foreground/60">
                Decentralized authentication — no password required
              </p>
            </div>
          </motion.div>
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
      {/* Atmospheric background */}
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
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Registry
        </button>

        {/* ── BANNER + AVATAR + HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
          data-ocid="profile.banner.section"
        >
          {/* Banner */}
          <div className="relative h-44 rounded-xl overflow-hidden border border-border">
            {profile?.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg,
                    oklch(0.11 0 0) 0%,
                    oklch(0.15 0.04 27) 50%,
                    oklch(0.11 0 0) 100%)`,
                }}
              >
                {/* Decorative grid */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 29px, oklch(0.60 0.235 27 / 6%) 29px, oklch(0.60 0.235 27 / 6%) 30px),
                      repeating-linear-gradient(90deg, transparent, transparent 29px, oklch(0.60 0.235 27 / 6%) 29px, oklch(0.60 0.235 27 / 6%) 30px)`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl opacity-10">🌿</span>
                </div>
              </div>
            )}
          </div>

          {/* Avatar + name row — overlaps banner bottom */}
          <div className="relative z-10 flex items-end justify-between gap-4 mt-[-40px] px-4 sm:px-5">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-background shadow-[0_0_20px_oklch(0.60_0.235_27/20%)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="border-4 border-background rounded-full shadow-[0_0_20px_oklch(0.60_0.235_27/20%)]">
                  <Identicon principal={viewPrincipal ?? "anon"} size={80} />
                </div>
              )}
              {/* OISY badge on avatar */}
              {oisyBadgeVisible && isOwnProfile && (
                <div
                  className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-0.5 border-2 border-background"
                  title="OISY Wallet Connected"
                >
                  <Wallet className="w-3 h-3 text-black" />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pb-1">
              {!isOwnProfile && (
                <Button
                  data-ocid="profile.share_button"
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground hover:text-primary hover:border-primary/40 text-xs gap-1.5 h-8"
                  onClick={handleShareProfile}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>
              )}
              {isOwnProfile && (
                <a
                  data-ocid="profile.x_share_button"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    "I'm building my Web3 identity on @BonsaiRegistry — the most comprehensive Web3 directory across 35+ ecosystems. Join me and get $BONSAI 🌿 https://odin.fun/token/26j2?ref=bonsai #BONSAI #Web3 #ICP",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 h-8 rounded border border-sky-400/30 bg-sky-400/8 text-sky-400 text-xs font-mono hover:bg-sky-400/15 transition-all"
                >
                  <Twitter className="w-3 h-3" />
                  Share on X
                </a>
              )}
              {isOwnProfile && identity && !isEditing && (
                <Button
                  data-ocid="profile.edit_button"
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 text-xs h-8"
                  onClick={handleStartEdit}
                >
                  <Edit3 className="w-3 h-3" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Name + username + metadata */}
          <div className="mt-3 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-foreground leading-tight">
                {displayName}
              </h1>
            </div>
            {profile?.username && (
              <p className="text-sm font-mono text-muted-foreground mt-0.5">
                @{profile.username}
              </p>
            )}
            {viewPrincipal && (
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5 break-all">
                {viewPrincipal}
              </p>
            )}

            {/* Join date */}
            {joinDateLabel && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground font-mono">
                <Calendar className="w-3 h-3" />
                Member since {joinDateLabel}
              </div>
            )}

            {/* Badges */}
            {profile?.badges && profile.badges.length > 0 && (
              <div
                data-ocid="profile.badges.section"
                className="flex flex-wrap gap-1.5 mt-2"
              >
                {profile.badges.map((badge) => (
                  <BadgePill key={badge} badge={badge} />
                ))}
                {/* OISY badge as special badge */}
                {oisyBadgeVisible && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wide bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    <Wallet className="w-3 h-3" />
                    OISY Connected
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {profile?.socialLinks && (
              <SocialLinks links={profile.socialLinks} />
            )}

            {/* Web3 wallet chips */}
            {profile?.walletAddresses && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.walletAddresses.eth && (
                  <WalletChip
                    chain="ETH"
                    address={profile.walletAddresses.eth}
                  />
                )}
                {profile.walletAddresses.btc && (
                  <WalletChip
                    chain="BTC"
                    address={profile.walletAddresses.btc}
                  />
                )}
                {profile.walletAddresses.hbar && (
                  <WalletChip
                    chain="HBAR"
                    address={profile.walletAddresses.hbar}
                  />
                )}
                {profile.walletAddresses.sol && (
                  <WalletChip
                    chain="SOL"
                    address={profile.walletAddresses.sol}
                  />
                )}
              </div>
            )}

            {/* Ecosystem affinities (own profile only) */}
            {isOwnProfile && ecosystemAffinities.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-1.5">
                  Interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ecosystemAffinities.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border border-primary/20 bg-primary/8 text-primary/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Activity stats ── */}
        <motion.section
          data-ocid="profile.activity.section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-8"
        >
          <div className="grid grid-cols-3 gap-2">
            <StatChip
              icon={<Zap className="w-4 h-4" />}
              label="Score"
              value={contributionScore}
            />
            <StatChip
              icon={<Star className="w-4 h-4" />}
              label="Ratings"
              value={ratedCount}
            />
            <StatChip
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Submitted"
              value={submittedCount}
            />
          </div>
        </motion.section>

        {/* ── Achievements ── */}
        {profile &&
          (() => {
            const achieved = BADGE_DEFINITIONS.map((b) => ({
              ...b,
              earned: b.check(profile),
            }));
            const earnedCount = achieved.filter((b) => b.earned).length;
            return (
              <motion.section
                data-ocid="profile.achievements.section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="mb-8"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h3 className="font-display font-bold text-sm text-foreground">
                    Achievements
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground/60 ml-1">
                    {earnedCount}/{achieved.length} earned
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {achieved.map((b) => (
                    <div
                      key={b.id}
                      className={`relative rounded-lg border p-3 text-center transition-all ${
                        b.earned
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/40 bg-secondary/20 opacity-50"
                      }`}
                    >
                      <div className="text-2xl mb-1">
                        {b.earned ? (
                          b.icon
                        ) : (
                          <Lock className="w-5 h-5 mx-auto text-muted-foreground/40" />
                        )}
                      </div>
                      <p
                        className={`text-[10px] font-semibold font-mono uppercase tracking-wide leading-tight ${b.earned ? "text-foreground" : "text-muted-foreground/50"}`}
                      >
                        {b.label}
                      </p>
                      <p
                        className={`text-[9px] mt-0.5 leading-tight ${b.earned ? "text-muted-foreground/70" : "text-muted-foreground/40"}`}
                      >
                        {b.earned ? b.desc : (b.unlockHint ?? b.desc)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            );
          })()}

        {/* ── Edit form (tabbed) ── */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              key="edit-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
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

                <Tabs defaultValue="identity">
                  <TabsList className="mb-4 w-full bg-secondary/50">
                    <TabsTrigger
                      data-ocid="profile.edit.identity_tab"
                      value="identity"
                      className="flex-1 text-xs"
                    >
                      Identity
                    </TabsTrigger>
                    <TabsTrigger
                      data-ocid="profile.edit.social_tab"
                      value="social"
                      className="flex-1 text-xs"
                    >
                      Social
                    </TabsTrigger>
                    <TabsTrigger
                      data-ocid="profile.edit.web3_tab"
                      value="web3"
                      className="flex-1 text-xs"
                    >
                      Web3
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Identity */}
                  <TabsContent value="identity" className="space-y-4 mt-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-mono">
                          Display Name
                        </Label>
                        <Input
                          data-ocid="profile.display_name.input"
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
                        <Label className="text-xs font-mono">Username</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            @
                          </span>
                          <Input
                            data-ocid="profile.username.input"
                            value={editForm.username}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                username: e.target.value.replace(
                                  /[^a-zA-Z0-9_]/g,
                                  "",
                                ),
                              }))
                            }
                            placeholder="handle"
                            className="bg-secondary border-border text-sm h-8 pl-6 font-mono"
                            maxLength={30}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground/60">
                          Letters, numbers, underscores only
                        </p>
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
                        className="bg-secondary border-border text-sm resize-none min-h-[80px]"
                        maxLength={300}
                      />
                      <p className="text-[10px] text-muted-foreground text-right">
                        {editForm.bio.length}/300
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
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
                      <div className="space-y-1.5">
                        <Label className="text-xs font-mono">Banner URL</Label>
                        <Input
                          data-ocid="profile.banner_url.input"
                          value={editForm.bannerUrl}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              bannerUrl: e.target.value,
                            }))
                          }
                          placeholder="https://example.com/banner.jpg"
                          className="bg-secondary border-border text-sm h-8"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Social */}
                  <TabsContent value="social" className="space-y-3 mt-0">
                    {[
                      {
                        key: "twitter",
                        icon: <Twitter className="w-3.5 h-3.5" />,
                        label: "Twitter/X",
                        placeholder: "@handle or username",
                        ocid: "profile.social.twitter_input",
                      },
                      {
                        key: "github",
                        icon: <Github className="w-3.5 h-3.5" />,
                        label: "GitHub",
                        placeholder: "username",
                        ocid: "profile.social.github_input",
                      },
                      {
                        key: "discord",
                        icon: <MessageCircle className="w-3.5 h-3.5" />,
                        label: "Discord",
                        placeholder: "handle or server invite",
                        ocid: "profile.social.discord_input",
                      },
                      {
                        key: "telegram",
                        icon: <Send className="w-3.5 h-3.5" />,
                        label: "Telegram",
                        placeholder: "@username",
                        ocid: "profile.social.telegram_input",
                      },
                      {
                        key: "website",
                        icon: <Globe className="w-3.5 h-3.5" />,
                        label: "Website",
                        placeholder: "https://yoursite.com",
                        ocid: "profile.social.website_input",
                      },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1.5">
                        <Label className="text-xs font-mono flex items-center gap-1.5 text-muted-foreground">
                          {item.icon} {item.label}
                        </Label>
                        <Input
                          data-ocid={item.ocid}
                          value={editForm[item.key as keyof EditFormState]}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              [item.key]: e.target.value,
                            }))
                          }
                          placeholder={item.placeholder}
                          className="bg-secondary border-border text-sm h-8"
                        />
                      </div>
                    ))}
                  </TabsContent>

                  {/* Tab 3: Web3 */}
                  <TabsContent value="web3" className="space-y-3 mt-0">
                    {/* OISY Principal ID */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-mono text-amber-300">
                        OISY Principal ID
                        <a
                          href="https://oisy.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary hover:underline text-[10px]"
                        >
                          (Get OISY Wallet)
                        </a>
                      </Label>
                      <Input
                        data-ocid="profile.web3.oisy_input"
                        value={editForm.oisyPrincipal}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            oisyPrincipal: e.target.value,
                          }))
                        }
                        placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                        className="bg-secondary border-amber-400/30 text-sm h-8 font-mono text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground/60">
                        Required for NFT airdrops including the Bonsai Approved
                        badge
                      </p>
                    </div>

                    {/* OISY link */}
                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-amber-400" />
                          <div>
                            <p className="text-xs font-semibold text-amber-300">
                              OISY Wallet
                            </p>
                            <p className="text-[10px] text-muted-foreground/70">
                              {oisy.connected && oisy.principal
                                ? `Connected: ${oisy.principal.slice(0, 8)}…`
                                : "Not connected"}
                            </p>
                          </div>
                        </div>
                        {oisy.connected && oisy.principal && (
                          <Button
                            data-ocid="profile.link_oisy_button"
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 text-xs gap-1 h-7 flex-shrink-0"
                            onClick={handleLinkOisyWallet}
                          >
                            Link OISY
                          </Button>
                        )}
                      </div>
                    </div>

                    {[
                      {
                        key: "eth",
                        label: "ETH Address",
                        placeholder: "0x...",
                        color: "text-blue-300",
                        ocid: "profile.web3.eth_input",
                      },
                      {
                        key: "btc",
                        label: "BTC Address",
                        placeholder: "bc1q... or 1... or 3...",
                        color: "text-orange-300",
                        ocid: "profile.web3.btc_input",
                      },
                      {
                        key: "hbar",
                        label: "HBAR Account ID",
                        placeholder: "0.0.12345",
                        color: "text-cyan-300",
                        ocid: "profile.web3.hbar_input",
                      },
                      {
                        key: "sol",
                        label: "SOL Address",
                        placeholder: "Base58 address",
                        color: "text-purple-300",
                        ocid: "profile.web3.sol_input",
                      },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1.5">
                        <Label className={`text-xs font-mono ${item.color}`}>
                          {item.label}
                        </Label>
                        <Input
                          data-ocid={item.ocid}
                          value={editForm[item.key as keyof EditFormState]}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              [item.key]: e.target.value,
                            }))
                          }
                          placeholder={item.placeholder}
                          className="bg-secondary border-border text-sm h-8 font-mono text-xs"
                        />
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>

                <Separator className="my-4 border-border/50" />

                <div className="flex gap-2">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── uBin Hosting Recommendation (own profile only) ── */}
        {isOwnProfile && identity && (
          <div className="mb-6 rounded-xl border border-teal-500/25 bg-gradient-to-r from-teal-500/8 to-emerald-500/8 p-4 flex flex-col sm:flex-row gap-4 items-start">
            <img
              src="/assets/uploads/ubin-d6c3fd63-019d1e5c-34c8-71f8-8ed3-3fa9858a0e8b-1.png"
              alt="uBin logo"
              className="w-12 h-12 rounded-lg object-contain border border-teal-500/20 bg-background/60 p-1 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm text-teal-300 mb-1 flex items-center gap-2">
                Host Your Media On-Chain with uBin
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  100% On-Chain
                </span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                uBin is a 100% on-chain cloud hosting service built on ICP by
                Daniel McCoy. Upload your profile images, banners, and media
                files with true decentralization. No centralized servers, no
                censorship, fully on-chain storage.
              </p>
              <a
                href="https://h3cjw-syaaa-aaaam-qbbia-cai.ic0.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 hover:text-teal-200 text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open uBin
              </a>
            </div>
          </div>
        )}

        {/* ── Rated Entries (own profile only) ── */}
        {isOwnProfile &&
          profile?.ratedEntries &&
          profile.ratedEntries.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mb-8"
            >
              <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                Your Ratings
              </h2>
              <div className="space-y-2">
                {profile.ratedEntries.map((r, idx) => (
                  <div
                    key={r.entryId.toString()}
                    data-ocid={`profile.rated.item.${idx + 1}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                  >
                    <span className="font-mono text-xs text-foreground">
                      Entry #{r.entryId.toString()}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${star <= Number(r.rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

        {/* ── Bookmarks (own profile only) ── */}
        {isOwnProfile && (
          <motion.section
            data-ocid="profile.bookmarks.section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              Bookmarks
              {bookmarkIds && bookmarkIds.length > 0 && (
                <span className="text-xs font-mono text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">
                  {bookmarkIds.length}
                </span>
              )}
            </h2>

            {bookmarksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-md" />
                ))}
              </div>
            ) : !bookmarkIds || bookmarkIds.length === 0 ? (
              <div
                data-ocid="profile.bookmarks.empty_state"
                className="text-center py-8 text-muted-foreground/60"
              >
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-mono">No bookmarks yet</p>
                <p className="text-xs mt-1 text-muted-foreground/40">
                  Bookmark registry entries to save them here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarkIds.map((id, idx) => (
                  <div
                    key={id.toString()}
                    data-ocid={`profile.bookmark.item.${idx + 1}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-primary/60 flex-shrink-0" />
                      <span className="font-mono text-xs text-foreground">
                        Entry #{id.toString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-ocid={`profile.bookmark.delete_button.${idx + 1}`}
                      onClick={() => unbookmarkMutation.mutate(id)}
                      disabled={unbookmarkMutation.isPending}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      aria-label="Remove bookmark"
                    >
                      {unbookmarkMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookmarkX className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* ── Submitted Projects ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
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
