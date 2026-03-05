import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminActor } from "@/hooks/useAdminActor";
import {
  AlertCircle,
  KeyRound,
  Loader2,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import { useRef, useState } from "react";
import { AdminDashboard } from "./AdminDashboard";

export function AdminPage() {
  const { actor, isFetching, authenticate, logout, isAuthenticated } =
    useAdminActor();

  const [tokenInput, setTokenInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    const token = tokenInput.trim();
    if (!token) {
      setError("Please enter the admin password.");
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      await authenticate(token);
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Still auto-authenticating from stored session
  if (isFetching && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2
            data-ocid="admin.loading_state"
            className="w-8 h-8 animate-spin text-primary"
          />
          <p className="font-mono text-xs uppercase tracking-widest">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated — show admin dashboard
  if (isAuthenticated && actor) {
    return <AdminDashboard actor={actor} onLogout={logout} />;
  }

  // Login screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, oklch(0.25 0.12 27 / 30%) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="border border-primary/30 rounded-lg p-8 bg-card shadow-glow-red-sm">
          <div className="flex flex-col items-center text-center gap-5">
            {/* Logo */}
            <div className="relative">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/40 bg-secondary flex items-center justify-center">
                <img
                  src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
                  alt="Bonsai Registry"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const parent = img.parentElement!;
                    if (!parent.querySelector(".fallback-icon")) {
                      const span = document.createElement("span");
                      span.className = "fallback-icon text-2xl";
                      span.textContent = "🌿";
                      parent.appendChild(span);
                    }
                  }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <ShieldAlert className="w-3 h-3 text-primary-foreground" />
              </span>
            </div>

            <div>
              <p className="font-mono text-[10px] text-primary/70 uppercase tracking-widest mb-1">
                Admin Access Required
              </p>
              <h1 className="font-display font-extrabold text-2xl text-foreground">
                <span className="text-primary">Bonsai</span> Registry
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Management Console
              </p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter the admin password to access the management panel.
            </p>

            {/* Error message */}
            {error && (
              <div
                data-ocid="admin.error_state"
                className="w-full flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-left"
              >
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Token input */}
            <div className="w-full space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  data-ocid="admin.token_input"
                  ref={inputRef}
                  type="password"
                  placeholder="Enter admin password..."
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  className="pl-9 bg-secondary border-border font-mono text-sm"
                  autoFocus
                />
              </div>

              <Button
                data-ocid="admin.login_button"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold tracking-tight"
                onClick={handleLogin}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Access Admin Panel
                  </>
                )}
              </Button>
            </div>

            <a
              href="/"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to Registry
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
