import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActor } from "@/hooks/useActor";
import type { Identity } from "@dfinity/agent";
import { Loader2, Mail, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EmailSignupWidgetProps {
  identity: Identity | null | undefined;
}

export function EmailSignupWidget({ identity }: EmailSignupWidgetProps) {
  const { actor } = useActor();
  const [email, setEmail] = useState("");
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
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend yet. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      await actor.subscribeEmail(trimmed, "main_page");
      if (identity) {
        try {
          await actor.linkEmailToPrincipal(trimmed);
        } catch {
          // non-fatal — email already subscribed
        }
      }
      toast.success("You're subscribed! 🌿", {
        description: "We'll keep you updated on the Bonsai Ecosystem.",
      });
      setEmail("");
      // Refresh count
      actor
        .getSubscriberCount()
        .then((c) => setSubscriberCount(Number(c)))
        .catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already")) {
        toast.info("You're already subscribed! 🌿");
      } else {
        toast.error("Subscription failed. Please try again.");
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
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-base text-foreground">
              Stay in the Loop
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get Bonsai Ecosystem updates delivered to your inbox.{" "}
            {subscriberCount !== null && (
              <span className="inline-flex items-center gap-1 text-primary/80 font-semibold">
                <Users className="w-3 h-3" />
                Join {subscriberCount.toLocaleString()} subscriber
                {subscriberCount !== 1 ? "s" : ""}.
              </span>
            )}
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2 items-center">
          <Input
            data-ocid="email_signup.input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="bg-background border-border text-sm w-full sm:w-64"
            disabled={submitting}
          />
          <Button
            data-ocid="email_signup.submit_button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold whitespace-nowrap shrink-0"
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
  );
}
