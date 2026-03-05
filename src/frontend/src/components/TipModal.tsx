import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TIP_TOKENS } from "@/config/tipConfig";
import { recordEvent } from "@/utils/analytics";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

interface TipModalProps {
  open: boolean;
  onClose: () => void;
}

export function TipModal({ open, onClose }: TipModalProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (address: string, symbol: string, index: number) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(`${symbol}-${index}`);
      recordEvent("tip_copy", symbol);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = address;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedAddress(`${symbol}-${index}`);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  const enabledTokens = TIP_TOKENS.filter((t) => t.enabled);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        data-ocid="tip.modal"
        className="sm:max-w-lg border border-primary/30 bg-card p-0 overflow-hidden"
      >
        {/* Decorative top gradient */}
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.60 0.235 27) 0%, oklch(0.72 0.18 50) 50%, oklch(0.60 0.235 27) 100%)",
          }}
        />

        <div className="p-6 sm:p-7">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center text-xl">
                🌿
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
                  Support
                </p>
                <DialogTitle className="font-display font-extrabold text-xl text-foreground leading-tight">
                  Support the Bonsai Project
                </DialogTitle>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If the Bonsai Registry has been valuable to you, consider tipping
              the team to keep it growing. Every contribution helps us expand
              coverage and improve the experience.
            </p>
          </DialogHeader>

          {/* Token list */}
          <div className="space-y-2.5">
            {enabledTokens.map((token, i) => {
              const copyKey = `${token.symbol}-${i + 1}`;
              const isCopied = copiedAddress === copyKey;
              return (
                <div
                  key={token.symbol}
                  className="group border border-border bg-secondary/40 rounded-lg p-3.5 hover:border-primary/30 hover:bg-secondary/70 transition-all duration-150"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      {/* Token logo */}
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt={token.symbol}
                            width={32}
                            height={32}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = "none";
                              const parent = t.parentElement!;
                              parent.textContent = token.symbol.charAt(0);
                              parent.className +=
                                " font-mono font-bold text-xs text-primary";
                            }}
                          />
                        ) : (
                          <span className="font-mono font-bold text-xs text-primary">
                            {token.symbol.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-bold text-sm text-foreground">
                            {token.token}
                          </span>
                          <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm">
                            {token.symbol}
                          </span>
                        </div>
                        {token.network && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {token.network}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      data-ocid={`tip.copy_button.${i + 1}`}
                      variant="outline"
                      size="sm"
                      className={`flex-shrink-0 gap-1.5 text-xs h-7 transition-all duration-200 ${
                        isCopied
                          ? "border-green-500/50 bg-green-500/10 text-green-400"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                      onClick={() =>
                        handleCopy(token.address, token.symbol, i + 1)
                      }
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Wallet address */}
                  <code className="block w-full font-mono text-[11px] text-muted-foreground bg-background border border-border rounded px-2.5 py-2 break-all leading-relaxed">
                    {token.address}
                  </code>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <ExternalLink className="w-3.5 h-3.5 text-amber-500/70 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-500/80 leading-relaxed">
              Please double-check the address before sending. Blockchain
              transactions are irreversible. The Bonsai team cannot recover
              funds sent to incorrect addresses.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
