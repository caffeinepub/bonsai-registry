import { recordEvent } from "@/utils/analytics";
import { Heart } from "lucide-react";

interface TipButtonProps {
  onClick: () => void;
}

export function TipButton({ onClick }: TipButtonProps) {
  const handleClick = () => {
    recordEvent("tip_modal_open", "floating_button");
    onClick();
  };

  return (
    <button
      type="button"
      data-ocid="tip.open_modal_button"
      onClick={handleClick}
      aria-label="Support the Bonsai Project"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full border border-primary/40 bg-card/80 backdrop-blur-sm text-sm font-display font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-glow-red-sm transition-all duration-200 group"
    >
      <Heart className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors fill-primary group-hover:fill-primary-foreground" />
      <span className="hidden sm:inline text-xs">Support</span>
    </button>
  );
}
