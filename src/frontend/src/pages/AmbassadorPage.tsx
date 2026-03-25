/**
 * AmbassadorPage — Bonsai Ambassador / Creator Commerce layer.
 * Routes: #ambassador
 */
import type {
  AmbassadorMediaItem,
  AmbassadorProfile,
  CreatorContract,
} from "@/backend.d";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  LogIn,
  MessageSquare,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// biome-ignore lint/suspicious/noExplicitAny: extended backend interface
type ExtendedActor = any;
import { useState } from "react";
import { toast } from "sonner";

const PLATFORM_TERMS = `Bonsai Ambassador Platform Terms & Conditions

1. FAMILY-SAFE CONTENT: All content created under the Ambassador Program must be appropriate for audiences of all ages. No adult content, graphic violence, hate speech, or illegal content is permitted.

2. RESPECTFUL COMMUNITY: Ambassadors agree to treat all community members, clients, and Bonsai Registry staff with respect and professionalism.

3. HONEST REPRESENTATION: Ambassadors agree to accurately represent their services, capabilities, and affiliations. Misleading clients is a violation of these terms.

4. DAO GOVERNANCE: All disputed contracts are subject to review and resolution by the Bonsai DAO. Ambassadors agree to abide by DAO decisions in all contested matters.

5. PAYMENT IN ckUSDC: All campaign payments are processed in ckUSDC. Ambassadors set their own prices.

6. TRANSPARENCY: Contract terms and service agreements are stored on-chain and may be reviewed by the DAO to investigate violations.

7. PLATFORM PROTECTION: This platform exists to protect influencers and creators from predatory behavior. Ambassadors agree not to engage in predatory practices toward clients.

8. ACCOUNT INTEGRITY: One account per principal. Attempts to circumvent suspensions through new accounts are not permitted.

Violations of these terms may result in suspension from the Ambassador Program.`;

function getStatusBadge(status: AmbassadorProfile["status"]) {
  if ("approved" in status)
    return (
      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        Approved
      </Badge>
    );
  if ("suspended" in status)
    return (
      <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
        Suspended
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30">
      Pending Approval
    </Badge>
  );
}

function getContractStatusBadge(status: CreatorContract["status"]) {
  if ("active" in status)
    return (
      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
        Active
      </Badge>
    );
  if ("completed" in status)
    return (
      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
        Completed
      </Badge>
    );
  if ("disputed" in status)
    return (
      <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
        Disputed
      </Badge>
    );
  if ("resolved" in status)
    return (
      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
        Resolved
      </Badge>
    );
  if ("pending_agreement" in status)
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
        Awaiting Agreement
      </Badge>
    );
  return (
    <Badge className="bg-secondary text-muted-foreground border-border">
      Draft
    </Badge>
  );
}

function MediaItem({ item }: { item: AmbassadorMediaItem }) {
  const isVideo = item.mediaType === "mp4";
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-secondary/50">
      {isVideo ? (
        <video
          src={item.url}
          controls
          className="w-full aspect-video object-cover"
        >
          <track kind="captions" />
        </video>
      ) : (
        <img
          src={item.url}
          alt={item.caption}
          className="w-full aspect-video object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0.3";
          }}
        />
      )}
      {item.caption && (
        <p className="text-[11px] text-muted-foreground px-2 py-1.5">
          {item.caption}
        </p>
      )}
    </div>
  );
}

// ── Multi-step Registration Form ──────────────────────────────────────────────
interface RegFormState {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  tags: string;
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  website: string;
  pricePerCampaign: string;
  customTerms: string;
  mediaItems: Array<{ url: string; mediaType: string; caption: string }>;
}

const EMPTY_FORM: RegFormState = {
  displayName: "",
  bio: "",
  avatarUrl: "",
  bannerUrl: "",
  tags: "",
  twitter: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  website: "",
  pricePerCampaign: "",
  customTerms: "",
  mediaItems: [],
};

function RegistrationForm({ onSuccess }: { onSuccess: () => void }) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [step, setStep] = useState(1);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [form, setForm] = useState<RegFormState>(EMPTY_FORM);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaType, setNewMediaType] = useState("jpeg");
  const [newMediaCaption, setNewMediaCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof RegFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addMedia = () => {
    if (!newMediaUrl.trim()) return;
    if (form.mediaItems.length >= 8) {
      toast.error("Maximum 8 media items allowed.");
      return;
    }
    setForm((f) => ({
      ...f,
      mediaItems: [
        ...f.mediaItems,
        {
          url: newMediaUrl.trim(),
          mediaType: newMediaType,
          caption: newMediaCaption.trim(),
        },
      ],
    }));
    setNewMediaUrl("");
    setNewMediaCaption("");
  };

  const removeMedia = (idx: number) =>
    setForm((f) => ({
      ...f,
      mediaItems: f.mediaItems.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async () => {
    if (!actor || !identity) return;
    const principalId = identity.getPrincipal().toString();
    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const profile: AmbassadorProfile = {
      principalId,
      displayName: form.displayName.trim(),
      bio: form.bio.trim(),
      avatarUrl: form.avatarUrl.trim(),
      bannerUrl: form.bannerUrl.trim(),
      socialLinks: {
        twitter: form.twitter.trim() ? [form.twitter.trim()] : [],
        instagram: form.instagram.trim() ? [form.instagram.trim()] : [],
        youtube: form.youtube.trim() ? [form.youtube.trim()] : [],
        tiktok: form.tiktok.trim() ? [form.tiktok.trim()] : [],
        website: form.website.trim() ? [form.website.trim()] : [],
      },
      mediaItems: form.mediaItems,
      customTerms: form.customTerms.trim(),
      pricePerCampaign: Number(form.pricePerCampaign) || 0,
      currency: "ckUSDC",
      joinedAt: BigInt(Date.now()) * 1_000_000n,
      status: { pending: null },
      tags: tagsArray,
      agreedToPlatformTerms: true,
    };

    setSubmitting(true);
    try {
      await (actor as ExtendedActor).registerAmbassador(profile);
      toast.success("Application submitted!", {
        description: "Your ambassador profile is pending admin approval.",
      });
      onSuccess();
    } catch (err) {
      toast.error(
        `Registration failed. ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalSteps = 5;

  return (
    <div
      data-ocid="ambassador.registration.panel"
      className="max-w-2xl mx-auto"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((stepNum) => (
          <div
            key={`step-bar-${stepNum}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              stepNum <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-4">
        Step {step} of {totalSteps}
      </p>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="font-display font-bold text-xl text-foreground">
              Platform Terms Agreement
            </h2>
            <p className="text-sm text-muted-foreground">
              Please read and agree to the Bonsai Ambassador Platform Terms
              before proceeding.
            </p>
            <ScrollArea className="h-56 rounded-lg border border-border bg-secondary/40 p-4">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {PLATFORM_TERMS}
              </pre>
            </ScrollArea>
            <div className="flex items-start gap-3">
              <Checkbox
                data-ocid="ambassador.terms.checkbox"
                id="agree-terms"
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(!!v)}
              />
              <label
                htmlFor="agree-terms"
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                I agree to the Bonsai Ambassador Platform Terms and confirm all
                content I create will be family-safe.
              </label>
            </div>
            <Button
              data-ocid="ambassador.terms.next_button"
              onClick={() => setStep(2)}
              disabled={!agreedTerms}
              className="bg-primary text-primary-foreground font-semibold w-full"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="font-display font-bold text-xl text-foreground">
              Profile Setup
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">
                  Display Name *
                </Label>
                <Input
                  data-ocid="ambassador.profile.name_input"
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                  placeholder="Your creator name"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">
                  Bio (300 chars max)
                </Label>
                <Textarea
                  data-ocid="ambassador.profile.bio_input"
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value.slice(0, 300))}
                  placeholder="Tell the community about your creative work..."
                  className="bg-secondary border-border text-sm resize-none"
                  rows={4}
                />
                <p className="text-[10px] text-muted-foreground/60 text-right">
                  {form.bio.length}/300
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">
                    Avatar URL
                  </Label>
                  <Input
                    data-ocid="ambassador.profile.avatar_input"
                    value={form.avatarUrl}
                    onChange={(e) => update("avatarUrl", e.target.value)}
                    placeholder="https://..."
                    className="bg-secondary border-border text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">
                    Banner URL
                  </Label>
                  <Input
                    data-ocid="ambassador.profile.banner_input"
                    value={form.bannerUrl}
                    onChange={(e) => update("bannerUrl", e.target.value)}
                    placeholder="https://..."
                    className="bg-secondary border-border text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">
                  Tags (comma-separated)
                </Label>
                <Input
                  data-ocid="ambassador.profile.tags_input"
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  placeholder="content creator, ICP, gaming, art"
                  className="bg-secondary border-border"
                />
              </div>
              <Separator className="border-border/50" />
              <p className="text-xs font-semibold text-foreground">
                Social Links
              </p>
              {[
                {
                  key: "twitter",
                  label: "Twitter/X",
                  placeholder: "@username",
                },
                {
                  key: "instagram",
                  label: "Instagram",
                  placeholder: "@username",
                },
                {
                  key: "youtube",
                  label: "YouTube",
                  placeholder: "Channel URL",
                },
                { key: "tiktok", label: "TikTok", placeholder: "@username" },
                {
                  key: "website",
                  label: "Website",
                  placeholder: "https://...",
                },
              ].map((f) => (
                <div key={`social-field-${f.key}`} className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">
                    {f.label}
                  </Label>
                  <Input
                    data-ocid={`ambassador.social.${f.key}_input`}
                    value={form[f.key as keyof RegFormState] as string}
                    onChange={(e) =>
                      update(f.key as keyof RegFormState, e.target.value)
                    }
                    placeholder={f.placeholder}
                    className="bg-secondary border-border text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-border"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                data-ocid="ambassador.profile.next_button"
                onClick={() => {
                  if (!form.displayName.trim()) {
                    toast.error("Display name is required.");
                    return;
                  }
                  setStep(3);
                }}
                className="bg-primary text-primary-foreground font-semibold flex-1"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="font-display font-bold text-xl text-foreground">
              Your Terms & Pricing
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">
                  Price per Campaign (ckUSDC) *
                </Label>
                <Input
                  data-ocid="ambassador.pricing.price_input"
                  type="number"
                  min="0"
                  value={form.pricePerCampaign}
                  onChange={(e) => update("pricePerCampaign", e.target.value)}
                  placeholder="e.g. 250"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-mono text-muted-foreground">
                  Your Custom Terms & Conditions
                </Label>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 mb-2">
                  <p className="text-[11px] text-muted-foreground/80">
                    Your terms will be shown to clients before they can hire
                    you. Keep them clear and professional. These terms are
                    stored on-chain for DAO transparency.
                  </p>
                </div>
                <Textarea
                  data-ocid="ambassador.pricing.terms_input"
                  value={form.customTerms}
                  onChange={(e) => update("customTerms", e.target.value)}
                  placeholder="Enter your custom terms and conditions that clients must agree to before hiring you..."
                  className="bg-secondary border-border text-sm resize-none"
                  rows={8}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-border"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                data-ocid="ambassador.pricing.next_button"
                onClick={() => {
                  if (
                    !form.pricePerCampaign ||
                    Number(form.pricePerCampaign) < 0
                  ) {
                    toast.error("Please set your campaign price.");
                    return;
                  }
                  setStep(4);
                }}
                className="bg-primary text-primary-foreground font-semibold flex-1"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="font-display font-bold text-xl text-foreground">
              Media Showcase
            </h2>
            <p className="text-sm text-muted-foreground">
              Add up to 8 media items to showcase your creative work. Supports
              MP4 video, JPEG, PNG, and GIF.
            </p>
            <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-mono text-muted-foreground">
                    Media URL
                  </Label>
                  <Input
                    data-ocid="ambassador.media.url_input"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-background border-border text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">
                    Type
                  </Label>
                  <select
                    value={newMediaType}
                    onChange={(e) => setNewMediaType(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background text-foreground text-xs px-3"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="gif">GIF</option>
                    <option value="mp4">MP4</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-mono text-muted-foreground">
                    Caption
                  </Label>
                  <Input
                    data-ocid="ambassador.media.caption_input"
                    value={newMediaCaption}
                    onChange={(e) => setNewMediaCaption(e.target.value)}
                    placeholder="Caption..."
                    className="bg-background border-border text-xs"
                  />
                </div>
              </div>
              <Button
                data-ocid="ambassador.media.add_button"
                type="button"
                size="sm"
                variant="outline"
                onClick={addMedia}
                disabled={!newMediaUrl.trim() || form.mediaItems.length >= 8}
                className="border-primary/40 text-primary"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Media
              </Button>
            </div>
            {form.mediaItems.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {form.mediaItems.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className="relative rounded-lg overflow-hidden border border-border bg-secondary/50"
                  >
                    <MediaItem item={item} />
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="border-border"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                data-ocid="ambassador.media.next_button"
                onClick={() => setStep(5)}
                className="bg-primary text-primary-foreground font-semibold flex-1"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="font-display font-bold text-xl text-foreground">
              Confirm & Submit
            </h2>
            <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold text-foreground">
                  {form.displayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold text-primary">
                  {form.pricePerCampaign} ckUSDC / campaign
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Media items</span>
                <span className="text-foreground">
                  {form.mediaItems.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tags</span>
                <span className="text-foreground">{form.tags || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custom terms</span>
                <span className="text-foreground">
                  {form.customTerms ? "✓ Provided" : "—"}
                </span>
              </div>
            </div>
            <div className="rounded-md border border-amber-500/25 bg-amber-500/8 p-3">
              <p className="text-xs text-amber-300">
                Your application will be reviewed by the Bonsai team before
                going live. You will appear as Pending until approved.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(4)}
                className="border-border"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                data-ocid="ambassador.registration.submit_button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary text-primary-foreground font-semibold flex-1"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Hire Ambassador Dialog ────────────────────────────────────────────────────
function HireDialog({
  ambassador,
  onClose,
}: {
  ambassador: AmbassadorProfile;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!actor) return;
    if (!agreedToTerms) {
      toast.error("You must agree to the influencer's terms.");
      return;
    }
    if (!campaignTitle.trim()) {
      toast.error("Campaign title is required.");
      return;
    }
    setSubmitting(true);
    try {
      await (actor as ExtendedActor).createContract(
        ambassador.principalId,
        campaignTitle.trim(),
        description.trim(),
        deliverables.trim(),
        ambassador.pricePerCampaign,
      );
      toast.success("Contract created!", {
        description: "The influencer will review your campaign.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-contracts"] });
      onClose();
    } catch (err) {
      toast.error(
        `Failed to create contract. ${err instanceof Error ? err.message : ""}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-lg text-foreground">
          Hire {ambassador.displayName}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-xs">
          Price:{" "}
          <strong className="text-primary">
            {ambassador.pricePerCampaign} ckUSDC
          </strong>{" "}
          per campaign
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {ambassador.customTerms && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Influencer's Terms & Conditions
            </p>
            <ScrollArea className="h-40 rounded border border-border bg-secondary/40 p-3">
              <pre className="text-[11px] text-muted-foreground/80 whitespace-pre-wrap font-mono">
                {ambassador.customTerms}
              </pre>
            </ScrollArea>
            <div className="flex items-start gap-2">
              <Checkbox
                data-ocid="hire.terms.checkbox"
                id="hire-agree"
                checked={agreedToTerms}
                onCheckedChange={(v) => setAgreedToTerms(!!v)}
              />
              <label
                htmlFor="hire-agree"
                className="text-xs text-foreground cursor-pointer leading-relaxed"
              >
                I have read and agree to these terms
              </label>
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs font-mono text-muted-foreground">
            Campaign Title *
          </Label>
          <Input
            data-ocid="hire.campaign_title.input"
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            placeholder="e.g. Product Launch Promo"
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-mono text-muted-foreground">
            Campaign Description
          </Label>
          <Textarea
            data-ocid="hire.description.textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your campaign goals..."
            className="bg-secondary border-border text-sm resize-none"
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-mono text-muted-foreground">
            Deliverables
          </Label>
          <Textarea
            data-ocid="hire.deliverables.textarea"
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
            placeholder="List what you expect to receive..."
            className="bg-secondary border-border text-sm resize-none"
            rows={3}
          />
        </div>
        <Button
          data-ocid="hire.submit_button"
          onClick={handleCreate}
          disabled={
            submitting || (!ambassador.customTerms ? false : !agreedToTerms)
          }
          className="bg-primary text-primary-foreground font-semibold w-full"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Create Contract ({ambassador.pricePerCampaign} ckUSDC)
        </Button>
      </div>
    </DialogContent>
  );
}

// ── Ambassador Card ───────────────────────────────────────────────────────────
function AmbassadorCard({
  ambassador,
  onSelect,
}: {
  ambassador: AmbassadorProfile;
  onSelect: (a: AmbassadorProfile) => void;
}) {
  return (
    <Card
      data-ocid="ambassador.directory.card"
      className="bg-card border-border cursor-pointer hover:border-primary/50 transition-all hover:shadow-[0_0_12px_oklch(0.60_0.235_27/12%)] group"
      onClick={() => onSelect(ambassador)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0">
            {ambassador.avatarUrl ? (
              <img
                src={ambassador.avatarUrl}
                alt={ambassador.displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-bold text-sm text-foreground truncate">
                {ambassador.displayName}
              </p>
              <span className="text-primary text-xs font-semibold whitespace-nowrap">
                {ambassador.pricePerCampaign} ckUSDC
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {ambassador.bio}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {ambassador.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-secondary border border-border text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Ambassador Detail View ────────────────────────────────────────────────────
function AmbassadorDetail({
  ambassador,
  onBack,
  isLoggedIn,
}: {
  ambassador: AmbassadorProfile;
  onBack: () => void;
  isLoggedIn: boolean;
}) {
  const [hireOpen, setHireOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Banner */}
      {ambassador.bannerUrl && (
        <div className="w-full h-32 rounded-xl overflow-hidden border border-border">
          <img
            src={ambassador.bannerUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0">
          {ambassador.avatarUrl ? (
            <img
              src={ambassador.avatarUrl}
              alt={ambassador.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-2xl text-foreground">
            {ambassador.displayName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{ambassador.bio}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {ambassador.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary/80"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-lg font-bold text-primary">
              {ambassador.pricePerCampaign} ckUSDC
            </span>
            <span className="text-xs text-muted-foreground">per campaign</span>
            {isLoggedIn && (
              <Button
                data-ocid="ambassador.hire.open_modal_button"
                size="sm"
                onClick={() => setHireOpen(true)}
                className="bg-primary text-primary-foreground font-semibold"
              >
                Hire {ambassador.displayName}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Social links */}
      {(ambassador.socialLinks.twitter[0] ||
        ambassador.socialLinks.instagram[0] ||
        ambassador.socialLinks.youtube[0] ||
        ambassador.socialLinks.tiktok[0] ||
        ambassador.socialLinks.website[0]) && (
        <div className="flex flex-wrap gap-2">
          {ambassador.socialLinks.twitter[0] && (
            <a
              href={`https://twitter.com/${ambassador.socialLinks.twitter[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Twitter
            </a>
          )}
          {ambassador.socialLinks.instagram[0] && (
            <a
              href={`https://instagram.com/${ambassador.socialLinks.instagram[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Instagram
            </a>
          )}
          {ambassador.socialLinks.youtube[0] && (
            <a
              href={ambassador.socialLinks.youtube[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              YouTube
            </a>
          )}
          {ambassador.socialLinks.tiktok[0] && (
            <a
              href={`https://tiktok.com/@${ambassador.socialLinks.tiktok[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              TikTok
            </a>
          )}
          {ambassador.socialLinks.website[0] && (
            <a
              href={ambassador.socialLinks.website[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Website
            </a>
          )}
        </div>
      )}

      {/* Media showcase */}
      {ambassador.mediaItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            Media Showcase
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ambassador.mediaItems.map((item, idx) => (
              <MediaItem key={`media-${idx}-${item.url}`} item={item} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={hireOpen} onOpenChange={setHireOpen}>
        <HireDialog
          ambassador={ambassador}
          onClose={() => setHireOpen(false)}
        />
      </Dialog>
    </div>
  );
}

// ── Contracts Panel ───────────────────────────────────────────────────────────
function ContractsPanel({ principalId }: { principalId: string }) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const { data: ambassadorContracts = [], isLoading: loadingAmbassador } =
    useQuery<CreatorContract[]>({
      queryKey: ["contracts-ambassador", principalId],
      queryFn: async () => {
        if (!actor) return [];
        return (actor as ExtendedActor).getContractsByAmbassador(principalId);
      },
      enabled: !!actor && !!principalId,
    });

  const { data: clientContracts = [], isLoading: loadingClient } = useQuery<
    CreatorContract[]
  >({
    queryKey: ["contracts-client", principalId],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as ExtendedActor).getContractsByClient(principalId);
    },
    enabled: !!actor && !!principalId,
  });

  const allContracts = [...ambassadorContracts, ...clientContracts];
  const isLoading = loadingAmbassador || loadingClient;

  const [disputeContractId, setDisputeContractId] = useState<string | null>(
    null,
  );
  const [disputeReason, setDisputeReason] = useState("");
  const [voteComment, setVoteComment] = useState<Record<string, string>>({});

  const markComplete = async (contractId: string) => {
    if (!actor) return;
    try {
      await (actor as ExtendedActor).markContractComplete(contractId);
      toast.success("Contract marked as complete!");
      queryClient.invalidateQueries({ queryKey: ["contracts-ambassador"] });
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : ""}`);
    }
  };

  const submitDispute = async (contractId: string) => {
    if (!actor || !disputeReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    try {
      await (actor as ExtendedActor).disputeContract(
        contractId,
        disputeReason.trim(),
      );
      toast.success("Dispute submitted.");
      setDisputeContractId(null);
      setDisputeReason("");
      queryClient.invalidateQueries({
        queryKey: ["contracts-ambassador", "contracts-client"],
      });
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : ""}`);
    }
  };

  const castVote = async (
    contractId: string,
    vote: CreatorContract["daoVotes"][0]["vote"],
  ) => {
    if (!actor) return;
    const comment = voteComment[contractId] ?? "";
    try {
      await (actor as ExtendedActor).voteOnContract(contractId, vote, comment);
      toast.success("Vote cast!");
      queryClient.invalidateQueries({
        queryKey: [
          "contracts-ambassador",
          "contracts-client",
          "public-contracts",
        ],
      });
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : ""}`);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );

  if (allContracts.length === 0) {
    return (
      <div data-ocid="contracts.empty_state" className="text-center py-12">
        <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No contracts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allContracts.map((contract, idx) => (
        <Card
          key={contract.id}
          data-ocid={`contracts.item.${idx + 1}`}
          className="bg-card border-border"
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {contract.campaignTitle}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {contract.id.slice(0, 12)}…
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getContractStatusBadge(contract.status)}
                <span className="text-primary text-sm font-bold">
                  {contract.priceInCkUSDC} ckUSDC
                </span>
              </div>
            </div>
            {contract.description && (
              <p className="text-xs text-muted-foreground">
                {contract.description}
              </p>
            )}
            {contract.deliverables && (
              <p className="text-[11px] text-muted-foreground/70">
                <strong>Deliverables:</strong> {contract.deliverables}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {"active" in contract.status &&
                contract.influencerPrincipal === principalId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 text-xs"
                    onClick={() => markComplete(contract.id)}
                  >
                    Mark Complete
                  </Button>
                )}
              {("active" in contract.status ||
                "pending_agreement" in contract.status) &&
                disputeContractId !== contract.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-400 text-xs"
                    onClick={() => setDisputeContractId(contract.id)}
                  >
                    Dispute
                  </Button>
                )}
            </div>

            {disputeContractId === contract.id && (
              <div className="space-y-2">
                <Textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe the reason for the dispute..."
                  className="bg-secondary border-border text-xs resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-red-500/80 text-white text-xs"
                    onClick={() => submitDispute(contract.id)}
                  >
                    Submit Dispute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-xs"
                    onClick={() => setDisputeContractId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* DAO Votes on disputed contracts */}
            {("disputed" in contract.status ||
              "resolved" in contract.status) && (
              <div className="border-t border-border/50 pt-3 space-y-2">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  DAO Votes ({contract.daoVotes.length})
                </p>
                {contract.daoVotes.map((vote) => (
                  <div
                    key={`${vote.voter}-${Number(vote.timestamp)}`}
                    className="text-[10px] text-muted-foreground bg-secondary/50 rounded p-2"
                  >
                    <span className="font-mono text-primary/80">
                      {vote.voter.slice(0, 8)}…
                    </span>
                    :{" "}
                    {"approve_influencer" in vote.vote
                      ? "✓ Influencer"
                      : "approve_client" in vote.vote
                        ? "✓ Client"
                        : "Dismiss"}
                    {vote.comment && (
                      <span className="ml-2 italic">{vote.comment}</span>
                    )}
                  </div>
                ))}
                {"disputed" in contract.status && (
                  <div className="space-y-1.5">
                    <Input
                      value={voteComment[contract.id] ?? ""}
                      onChange={(e) =>
                        setVoteComment((p) => ({
                          ...p,
                          [contract.id]: e.target.value,
                        }))
                      }
                      placeholder="Add a comment (optional)"
                      className="bg-secondary border-border text-xs h-7"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-500/80 text-white text-xs"
                        onClick={() =>
                          castVote(contract.id, { approve_influencer: null })
                        }
                      >
                        Approve Influencer
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-500/80 text-white text-xs"
                        onClick={() =>
                          castVote(contract.id, { approve_client: null })
                        }
                      >
                        Approve Client
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-xs"
                        onClick={() => castVote(contract.id, { dismiss: null })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── DAO Transparency Feed ────────────────────────────────────────────────────
function DaoFeed() {
  const { actor } = useActor();
  const { data: disputed = [], isLoading } = useQuery<CreatorContract[]>({
    queryKey: ["public-contracts"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as ExtendedActor).getAllPublicContracts();
    },
    enabled: !!actor,
  });

  const shown = disputed.filter(
    (c) => "disputed" in c.status || "resolved" in c.status,
  );

  return (
    <div data-ocid="dao.panel" className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg text-foreground">
          DAO Transparency Feed
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        All disputed and resolved contracts are visible here for community
        accountability. Logged-in users can cast votes.
      </p>
      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
      {!isLoading && shown.length === 0 && (
        <div data-ocid="dao.empty_state" className="text-center py-8">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No disputes to display. All contracts are in good standing.
          </p>
        </div>
      )}
      {shown.map((contract, idx) => (
        <Card
          key={contract.id}
          data-ocid={`dao.item.${idx + 1}`}
          className="bg-card border-border"
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {contract.campaignTitle}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/60">
                  {contract.id}
                </p>
              </div>
              {getContractStatusBadge(contract.status)}
            </div>
            {contract.disputeReason && (
              <p className="text-xs text-red-300/80 bg-red-500/8 rounded p-2">
                <strong>Dispute reason:</strong> {contract.disputeReason}
              </p>
            )}
            <div className="text-[11px] text-muted-foreground">
              <span>Votes: {contract.daoVotes.length}</span>
              <span className="mx-2">·</span>
              <span className="text-emerald-400">
                {
                  contract.daoVotes.filter(
                    (v) => "approve_influencer" in v.vote,
                  ).length
                }{" "}
                influencer
              </span>
              <span className="mx-2">·</span>
              <span className="text-blue-400">
                {
                  contract.daoVotes.filter((v) => "approve_client" in v.vote)
                    .length
                }{" "}
                client
              </span>
              <span className="mx-2">·</span>
              <span className="text-muted-foreground/60">
                {contract.daoVotes.filter((v) => "dismiss" in v.vote).length}{" "}
                dismiss
              </span>
            </div>
            {contract.resolvedBy && (
              <p className="text-[10px] text-purple-300/80">
                <strong>Resolved by:</strong> {contract.resolvedBy}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
interface AmbassadorPageProps {
  onBack?: () => void;
}

export function AmbassadorPage({ onBack }: AmbassadorPageProps) {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const principalId = identity?.getPrincipal().toString() ?? null;

  const [selectedAmbassador, setSelectedAmbassador] =
    useState<AmbassadorProfile | null>(null);
  const [registered, setRegistered] = useState(false);

  const { data: approvedAmbassadors = [], isLoading: loadingAmbassadors } =
    useQuery<AmbassadorProfile[]>({
      queryKey: ["approved-ambassadors"],
      queryFn: async () => {
        if (!actor) return [];
        return (actor as ExtendedActor).getApprovedAmbassadors();
      },
      enabled: !!actor,
    });

  const { data: myAmbassadorProfile, isLoading: loadingMyProfile } =
    useQuery<AmbassadorProfile | null>({
      queryKey: ["my-ambassador-profile", principalId],
      queryFn: async () => {
        if (!actor || !principalId) return null;
        return (actor as ExtendedActor).getAmbassadorProfile(principalId);
      },
      enabled: !!actor && !!principalId,
    });

  const isAmbassador = !!myAmbassadorProfile;
  const showRegistrationForm = !!identity && !isAmbassador && !registered;
  const showDashboard = !!identity && (isAmbassador || registered);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/8 via-background to-background">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative">
          <div className="flex items-center gap-3 mb-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="font-mono text-[10px] text-primary/70 uppercase tracking-widest">
              Bonsai Registry
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-foreground mb-2">
            <span className="text-primary">Ambassador</span> Program
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mb-4">
            For creators, influencers, and community builders. Join the Bonsai
            Ambassador Program to get amplified through the Registry ecosystem,
            connect with Web3 projects, and earn ckUSDC for your creative work.
            Family-safe. DAO-governed. Creator-first.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary/80">
              <ShieldCheck className="w-3.5 h-3.5" />
              DAO-Protected Contracts
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400/80">
              <Award className="w-3.5 h-3.5" />
              Family-Safe Platform
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400/80">
              <Star className="w-3.5 h-3.5" />
              Paid in ckUSDC
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* ── Ambassador Directory (always visible) ── */}
        {!selectedAmbassador && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-xl text-foreground">
                Find Ambassadors
              </h2>
              {loadingAmbassadors && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {!loadingAmbassadors && approvedAmbassadors.length === 0 ? (
              <div
                data-ocid="ambassador.directory.empty_state"
                className="text-center py-10 rounded-xl border border-border bg-secondary/20"
              >
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No approved ambassadors yet. Be the first to apply!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {approvedAmbassadors.map((a) => (
                  <AmbassadorCard
                    key={a.principalId}
                    ambassador={a}
                    onSelect={setSelectedAmbassador}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Ambassador Detail View ── */}
        {selectedAmbassador && (
          <AmbassadorDetail
            ambassador={selectedAmbassador}
            onBack={() => setSelectedAmbassador(null)}
            isLoggedIn={!!identity}
          />
        )}

        {/* ── Auth Gate ── */}
        {!identity && (
          <section className="text-center py-10 rounded-xl border border-border bg-secondary/20">
            <LogIn className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-foreground mb-2">
              Join the Ambassador Program
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in with Internet Identity to apply as an ambassador or hire
              creators for your project.
            </p>
            <Button
              data-ocid="ambassador.signin_button"
              onClick={login}
              disabled={isLoggingIn}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Sign In with Internet Identity
            </Button>
          </section>
        )}

        {/* ── Dashboard (if ambassador) ── */}
        {showDashboard && !selectedAmbassador && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-xl text-foreground">
                Your Ambassador Dashboard
              </h2>
            </div>
            {loadingMyProfile ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : myAmbassadorProfile ? (
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0">
                      {myAmbassadorProfile.avatarUrl ? (
                        <img
                          src={myAmbassadorProfile.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-base text-foreground">
                          {myAmbassadorProfile.displayName}
                        </p>
                        {getStatusBadge(myAmbassadorProfile.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {myAmbassadorProfile.bio.slice(0, 80)}
                        {myAmbassadorProfile.bio.length > 80 ? "..." : ""}
                      </p>
                      <p className="text-sm font-bold text-primary mt-1">
                        {myAmbassadorProfile.pricePerCampaign} ckUSDC / campaign
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {"pending" in myAmbassadorProfile.status && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">
                        Application Pending
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your ambassador profile is awaiting admin review. You'll
                        be notified when approved.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Your Contracts
                  </h3>
                  {principalId && <ContractsPanel principalId={principalId} />}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-emerald-300 font-semibold">
                  Application submitted!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your profile is pending admin approval.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Registration Form ── */}
        {showRegistrationForm && !selectedAmbassador && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-xl text-foreground">
                Apply as an Ambassador
              </h2>
            </div>
            <RegistrationForm
              onSuccess={() => {
                setRegistered(true);
                queryClient.invalidateQueries({
                  queryKey: ["my-ambassador-profile"],
                });
              }}
            />
          </section>
        )}

        {/* ── DAO Feed ── */}
        <Separator className="border-border/40" />
        <DaoFeed />
      </div>
    </div>
  );
}
