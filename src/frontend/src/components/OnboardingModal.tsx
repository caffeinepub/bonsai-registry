import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { recordEvent } from "@/utils/analytics";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "bonsai_onboarded";
const INTERESTS_KEY = "bonsai_interests";

const ECOSYSTEMS = [
  { id: "icp", label: "Internet Computer (ICP)" },
  { id: "hedera", label: "Hedera / HBAR" },
  { id: "bitcoin", label: "Bitcoin" },
  { id: "ethereum", label: "Ethereum" },
  { id: "solana", label: "Solana" },
  { id: "avalanche", label: "Avalanche" },
  { id: "polygon", label: "Polygon" },
];

const TOTAL_STEPS = 3;

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  // Show only on first visit
  useEffect(() => {
    const alreadyOnboarded = localStorage.getItem(STORAGE_KEY);
    if (!alreadyOnboarded) {
      setOpen(true);
      recordEvent("onboarding_started", "step_1");
    }
  }, []);

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(selected));
    recordEvent("onboarding_completed", `interests:${selected.join(",")}`);
    setOpen(false);
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    recordEvent("onboarding_skipped", `step:${step}`);
    setOpen(false);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      const next = step + 1;
      setStep(next);
      recordEvent("onboarding_started", `step_${next}`);
    } else {
      complete();
    }
  };

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) skip();
      }}
    >
      <DialogContent
        data-ocid="onboarding.dialog"
        className="sm:max-w-lg p-0 overflow-hidden border border-primary/30 bg-card gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Visually hidden accessible title */}
        <DialogTitle className="sr-only">
          Welcome to Bonsai Registry
        </DialogTitle>

        {/* Progress bar */}
        <div className="h-1 bg-secondary w-full">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "33%" }}
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="p-7 sm:p-8"
          >
            {step === 1 && <StepWelcome />}
            {step === 2 && (
              <StepInterests selected={selected} onToggle={toggleInterest} />
            )}
            {step === 3 && <StepAllSet />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-7 sm:px-8 pb-7 sm:pb-8 flex items-center justify-between gap-4">
          {/* Skip */}
          <button
            type="button"
            data-ocid="onboarding.cancel_button"
            onClick={skip}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-3">
            {/* Step dots — use step number as stable key */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((dotStep) => (
                <div
                  key={dotStep}
                  className={`rounded-full transition-all duration-300 ${
                    dotStep === step
                      ? "w-4 h-1.5 bg-primary"
                      : dotStep < step
                        ? "w-1.5 h-1.5 bg-primary/50"
                        : "w-1.5 h-1.5 bg-secondary"
                  }`}
                />
              ))}
            </div>

            {/* Back */}
            {step > 1 && (
              <Button
                data-ocid="onboarding.secondary_button"
                variant="outline"
                size="sm"
                className="text-xs border-border text-muted-foreground"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}

            {/* Next / Get Started */}
            <Button
              data-ocid="onboarding.primary_button"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold text-xs min-w-[100px]"
              onClick={handleNext}
            >
              {step === TOTAL_STEPS ? "Get Started" : "Next →"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="space-y-4">
      {/* Logo + headline */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg border border-primary/40 overflow-hidden flex-shrink-0">
          <img
            src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
            alt="Bonsai Registry"
            className="w-full h-full object-cover"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.style.display = "none";
              const p = t.parentElement!;
              p.textContent = "🌿";
              p.className += " flex items-center justify-center text-2xl";
            }}
          />
        </div>
        <div>
          <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
            Welcome to
          </p>
          <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight">
            <span className="text-primary">Bonsai</span> Registry
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The premiere curated directory of{" "}
          <strong className="text-foreground">600+ Web3 projects</strong> across{" "}
          <strong className="text-foreground">34+ ecosystems</strong> — from
          Internet Computer and Hedera to Bitcoin, Ethereum, Solana, and beyond.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our mission: bridge the global Web3 community to the open web, making
          decentralized projects discoverable by anyone, anywhere.
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "600+", sub: "Projects" },
            { label: "34+", sub: "Ecosystems" },
            { label: "Live", sub: "Community Ratings" },
          ].map((s) => (
            <div
              key={s.sub}
              className="border border-primary/20 bg-primary/5 rounded-md px-2 py-2.5 text-center"
            >
              <div className="font-display font-extrabold text-base text-primary leading-none">
                {s.label}
              </div>
              <div className="font-mono text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StepInterestsProps {
  selected: string[];
  onToggle: (id: string) => void;
}

function StepInterests({ selected, onToggle }: StepInterestsProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest mb-1">
          Step 2 of 3
        </p>
        <h2 className="font-display font-extrabold text-xl text-foreground leading-tight">
          Your Favorite Ecosystems
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Select the chains you care about most. We'll highlight them when you
          browse the registry.
        </p>
      </div>

      <div
        data-ocid="onboarding.panel"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        {ECOSYSTEMS.map((eco) => {
          const isChecked = selected.includes(eco.id);
          const checkboxId = `onboarding-eco-${eco.id}`;
          return (
            <label
              key={eco.id}
              htmlFor={checkboxId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-all duration-150 ${
                isChecked
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:bg-secondary/70"
              }`}
            >
              <Checkbox
                id={checkboxId}
                data-ocid="onboarding.checkbox"
                checked={isChecked}
                onCheckedChange={() => onToggle(eco.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm font-medium">{eco.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StepAllSet() {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-3xl">
          🌿
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
          Step 3 of 3
        </p>
        <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight">
          You're All Set!
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Start exploring. Sign in with Internet Identity to rate your favorite
          projects and help the community discover the best of Web3.
        </p>
      </div>

      <div className="grid gap-2.5 max-w-xs mx-auto pt-1">
        <div className="flex items-start gap-2.5 text-left px-3 py-2.5 rounded-md border border-border bg-secondary/40">
          <span className="text-amber-400 text-base leading-none mt-0.5">
            ★
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Rate Projects
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sign in with Internet Identity to vote on any project
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 text-left px-3 py-2.5 rounded-md border border-border bg-secondary/40">
          <span className="text-primary text-base leading-none mt-0.5">♥</span>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Support the Project
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tip the Bonsai team to help expand the registry
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
