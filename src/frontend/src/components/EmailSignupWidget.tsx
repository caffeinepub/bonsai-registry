import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActor } from "@/hooks/useActor";
import type { Identity } from "@dfinity/agent";
import { CheckCircle2, Loader2, Mail, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EmailSignupWidgetProps {
  identity: Identity | null | undefined;
}

function isValidPrincipal(s: string): boolean {
  return s.trim().length >= 10 && s.includes("-");
}

export function EmailSignupWidget({ identity }: EmailSignupWidgetProps) {
  const { actor } = useActor();
  const [email, setEmail] = useState("");
  const [oisyPrincipal, setOisyPrincipal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!actor) return;
    actor
      .getSubscriberCount()
      .then((count) => {
        setSubscriberCount(Number(count));
      })
      .catch(() => {});
  }, [actor]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOisy = oisyPrincipal.trim();

    if (!trimmedOisy) {
      toast.error("Please enter your OISY Wallet Principal ID.");
      return;
    }
    if (!isValidPrincipal(trimmedOisy)) {
      toast.error(
        "Please enter a valid OISY Principal ID (e.g. xxxxx-xxxxx-...-xxx).",
      );
      return;
    }
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend yet. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      // subscribeEmail(email, oisyPrincipal, source)
      await actor.subscribeEmail(trimmedEmail, trimmedOisy, "main_page");
      if (identity) {
        try {
          await actor.linkEmailToPrincipal(trimmedEmail);
        } catch {
          // non-fatal
        }
      }
      toast.success("You're subscribed! 🌿", {
        description: "You're eligible for the Bonsai Approved NFT airdrop.",
      });
      setEmail("");
      setOisyPrincipal("");
      actor
        .getSubscriberCount()
        .then((c) => setSubscriberCount(Number(c)))
        .catch(() => {});
    } catch (err: unknown) {
      console.error("[EmailSignupWidget] subscribeEmail error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already")) {
        toast.info("You're already subscribed! 🌿");
      } else if (msg.toLowerCase().includes("invalid")) {
        toast.error(
          "Invalid email or Principal ID. Please check and try again.",
        );
      } else {
        toast.error(
          "Subscription failed. Please check your details and try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-ocid="email_signup.panel"
      className="relative overflow-hidden rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card px-5 py-4"
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-base text-foreground">
            Stay in the Loop
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Get Bonsai Ecosystem updates delivered to your inbox.{" "}
          {subscriberCount !== null && (
            <span className="inline-flex items-center gap-1 text-primary/80 font-semibold">
              <Users className="w-3 h-3" />
              Join {subscriberCount.toLocaleString()} subscriber
              {subscriberCount !== 1 ? "s" : ""}.
            </span>
          )}
        </p>

        {/* Airdrop eligibility notice */}
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <p className="text-[11px] text-emerald-300">
            <strong>Eligible for Bonsai Approved NFT airdrop</strong> — Your
            OISY Principal ID is required to receive future NFT airdrops
            including the Bonsai Approved badge.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-2">
            <div className="space-y-1">
              <label
                htmlFor="oisy-principal"
                className="text-[10px] font-mono text-amber-400/80 uppercase tracking-wider"
              >
                OISY Wallet Principal ID{" "}
                <a
                  href="https://oisy.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  (Get OISY Wallet)
                </a>
              </label>
              <Input
                id="oisy-principal"
                data-ocid="email_signup.oisy_input"
                type="text"
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                value={oisyPrincipal}
                onChange={(e) => setOisyPrincipal(e.target.value)}
                className="bg-background border-amber-400/30 focus-visible:border-amber-400/60 text-sm w-full font-mono text-xs"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="signup-email"
                className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider"
              >
                Email Address
              </label>
              <Input
                id="signup-email"
                data-ocid="email_signup.input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className="bg-background border-border text-sm w-full"
                disabled={submitting}
              />
            </div>
          </div>
          <div className="flex sm:flex-col justify-end sm:justify-end">
            <Button
              data-ocid="email_signup.submit_button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold whitespace-nowrap sm:mt-auto"
              size="sm"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Subscribe"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
