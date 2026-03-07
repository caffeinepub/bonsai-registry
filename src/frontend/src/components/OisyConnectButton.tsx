import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOisyWallet } from "@/hooks/useOisyWallet";
import { ChevronDown, Loader2, LogOut, User, Wallet } from "lucide-react";
import { toast } from "sonner";

interface OisyConnectButtonProps {
  onViewProfile?: () => void;
}

export function OisyConnectButton({ onViewProfile }: OisyConnectButtonProps) {
  const { connected, principal, isConnecting, connect, disconnect, error } =
    useOisyWallet();

  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}…${principal.slice(-3)}`
    : null;

  if (isConnecting) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-400/30 bg-amber-400/8 text-amber-400/60 text-[10px] font-mono uppercase cursor-wait"
        aria-label="Connecting to OISY wallet"
      >
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        <span className="hidden sm:inline">Connecting…</span>
      </button>
    );
  }

  if (connected && principal) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-ocid="header.oisy_wallet.button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-400/40 bg-amber-400/10 text-amber-400 text-[10px] font-mono uppercase hover:bg-amber-400/20 hover:border-amber-400/60 transition-all duration-150 shadow-[0_0_8px_oklch(0.82_0.15_85/20%)]"
            aria-label="OISY wallet connected"
          >
            <Wallet className="w-3 h-3" aria-hidden />
            <span className="hidden sm:inline" title={principal ?? ""}>
              {shortPrincipal}
            </span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44 bg-popover border-border text-xs"
          data-ocid="header.oisy_wallet.dropdown_menu"
        >
          <div className="px-2 py-1.5 border-b border-border mb-1">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
              OISY Wallet
            </p>
            <p
              className="text-[10px] text-amber-400 font-mono mt-0.5 truncate"
              title={principal}
            >
              {shortPrincipal}
            </p>
          </div>
          {onViewProfile && (
            <DropdownMenuItem
              data-ocid="header.oisy_wallet.view_profile_button"
              className="text-xs gap-2 cursor-pointer"
              onClick={onViewProfile}
            >
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              View My Profile
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            data-ocid="header.oisy_wallet.disconnect_button"
            className="text-xs gap-2 text-destructive hover:text-destructive cursor-pointer"
            onClick={disconnect}
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        data-ocid="header.oisy_connect_button"
        onClick={() =>
          connect((principal) => {
            const short = `${principal.slice(0, 5)}…${principal.slice(-3)}`;
            toast.success("OISY Wallet connected", {
              description: `Connected as ${short}`,
              duration: 4000,
            });
          })
        }
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-400/30 bg-amber-400/6 text-amber-400/80 text-[10px] font-mono uppercase hover:bg-amber-400/15 hover:border-amber-400/55 hover:text-amber-400 transition-all duration-150 hover:shadow-[0_0_8px_oklch(0.82_0.15_85/25%)]"
        aria-label="Connect OISY Wallet"
      >
        <Wallet className="w-3 h-3" aria-hidden />
        <span className="hidden sm:inline">OISY Wallet</span>
      </button>
      {error && (
        <p className="text-[9px] text-destructive font-mono max-w-[140px] text-right leading-tight">
          {error.length > 40 ? `${error.slice(0, 40)}…` : error}
        </p>
      )}
    </div>
  );
}
