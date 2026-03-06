import type { CanisterHealthStatus } from "@/hooks/useCanisterHealth";
import { RefreshCw } from "lucide-react";

interface CanisterHealthBadgeProps {
  status: CanisterHealthStatus;
  isChecking: boolean;
  lastChecked: Date | null;
  onRetry: () => void;
}

const statusConfig: Record<
  CanisterHealthStatus,
  {
    label: string;
    dotClass: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
  }
> = {
  unknown: {
    label: "Checking...",
    dotClass: "bg-muted-foreground/40 animate-pulse",
    textClass: "text-muted-foreground",
    borderClass: "border-border",
    bgClass: "bg-secondary",
  },
  online: {
    label: "Canister Online",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-400/30",
    bgClass: "bg-emerald-400/8",
  },
  starting: {
    label: "Canister Starting",
    dotClass: "bg-amber-400 animate-pulse",
    textClass: "text-amber-400",
    borderClass: "border-amber-400/30",
    bgClass: "bg-amber-400/8",
  },
  offline: {
    label: "Canister Offline",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
    bgClass: "bg-destructive/8",
  },
};

export function CanisterHealthBadge({
  status,
  isChecking,
  lastChecked,
  onRetry,
}: CanisterHealthBadgeProps) {
  const cfg = statusConfig[status];
  const timeStr = lastChecked
    ? lastChecked.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <button
      type="button"
      data-ocid="admin.canister_health.toggle"
      onClick={onRetry}
      title={
        timeStr
          ? `Last checked: ${timeStr}. Click to re-check.`
          : "Click to check canister health"
      }
      className={[
        "flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors cursor-pointer hover:opacity-80",
        cfg.borderClass,
        cfg.bgClass,
      ].join(" ")}
    >
      {isChecking ? (
        <RefreshCw
          data-ocid="admin.canister_health.loading_state"
          className="w-2.5 h-2.5 text-muted-foreground animate-spin"
        />
      ) : (
        <span
          className={["w-2 h-2 rounded-full flex-shrink-0", cfg.dotClass].join(
            " ",
          )}
        />
      )}
      <span className={["font-mono hidden lg:inline", cfg.textClass].join(" ")}>
        {cfg.label}
      </span>
      {/* Mobile: dot only, no label */}
    </button>
  );
}
