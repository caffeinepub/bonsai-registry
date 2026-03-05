import type { BonsaiRegistryEntry } from "@/backend.d";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAdminActorContext } from "@/hooks/useAdminActorContext";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteEntryDialogProps {
  entry: BonsaiRegistryEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteEntryDialog({
  entry,
  onClose,
  onSuccess,
}: DeleteEntryDialogProps) {
  const actor = useAdminActorContext();

  const ADMIN_SECRET = "#WakeUp4";

  const mutation = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.removeRegistryEntryWithSecret(ADMIN_SECRET, id);
    },
    onSuccess: () => {
      toast.success("Entry deleted successfully");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  return (
    <AlertDialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <AlertDialogTitle className="font-display font-bold text-foreground">
              Delete Entry
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{entry?.name}</strong>? This
            action cannot be undone and the entry will be permanently removed
            from the backend registry.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mutation.isError && (
          <div className="px-1 py-2 text-xs text-destructive bg-destructive/10 rounded border border-destructive/20">
            {mutation.error?.message ?? "Failed to delete entry"}
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <Button
            data-ocid="admin.delete_dialog.cancel_button"
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            data-ocid="admin.delete_dialog.confirm_button"
            variant="destructive"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            onClick={() => entry && mutation.mutate(entry.id)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Entry
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
