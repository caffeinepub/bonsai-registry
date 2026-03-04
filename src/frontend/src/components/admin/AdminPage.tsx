import { Button } from "@/components/ui/button";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogIn, ShieldAlert, TreePine } from "lucide-react";
import { AdminDashboard } from "./AdminDashboard";

export function AdminPage() {
  const { login, clear, isLoggingIn, identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  const {
    data: isAdmin,
    isLoading: adminCheckLoading,
    isError: adminCheckError,
  } = useQuery({
    queryKey: ["is-admin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: false,
  });

  const isLoading = !!identity && (actorFetching || adminCheckLoading);

  // Not logged in
  if (!identity && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        {/* Admin-specific background pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 50% 0%, oklch(0.25 0.12 27 / 30%) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 w-full max-w-md">
          {/* Admin border treatment */}
          <div className="border border-primary/30 rounded-lg p-8 bg-card shadow-glow-red-sm">
            <div className="flex flex-col items-center text-center gap-5">
              {/* Logo */}
              <div className="relative">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/40 bg-secondary">
                  <img
                    src="https://cdn.shopify.com/s/files/1/0709/4953/5993/files/logo2_a05c26b6-7472-4a3e-b8bc-48dcb6ca4683.png"
                    alt="Bonsai Registry"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
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
                Sign in with your Internet Identity to access the admin panel.
                Only authorized admins can manage the registry.
              </p>

              <Button
                data-ocid="admin.login_button"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold tracking-tight"
                onClick={login}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In with Internet Identity
                  </>
                )}
              </Button>

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

  // Loading states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="font-mono text-xs uppercase tracking-widest">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  // Admin check error
  if (adminCheckError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div
          data-ocid="admin.error_state"
          className="border border-destructive/30 rounded-lg p-8 bg-card max-w-md w-full text-center"
        >
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Access Check Failed
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Could not verify your admin status. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-border"
            >
              Retry
            </Button>
            <Button
              data-ocid="admin.logout_button"
              variant="ghost"
              onClick={clear}
              className="text-muted-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not admin
  if (identity && isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div
          data-ocid="admin.error_state"
          className="border border-destructive/30 rounded-lg p-8 bg-card max-w-md w-full text-center"
        >
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl text-foreground mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            Your identity does not have admin privileges.
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/60 mb-5 break-all">
            {identity.getPrincipal().toString()}
          </p>
          <Button
            data-ocid="admin.logout_button"
            variant="outline"
            onClick={clear}
            className="border-border"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // Authenticated admin
  if (identity && isAdmin) {
    return (
      <AdminDashboard
        principal={identity.getPrincipal().toString()}
        onLogout={clear}
      />
    );
  }

  // Timed out or waiting for admin check result — show login screen as safe fallback
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
            <div className="relative">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/40 bg-secondary flex items-center justify-center">
                <TreePine className="w-8 h-8 text-primary" />
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
              Sign in with your Internet Identity to access the admin panel.
              Only authorized admins can manage the registry.
            </p>
            <Button
              data-ocid="admin.login_button"
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-bold tracking-tight"
              onClick={login}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In with Internet Identity
                </>
              )}
            </Button>
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
