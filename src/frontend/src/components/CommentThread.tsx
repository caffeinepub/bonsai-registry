import type { CommunityComment } from "@/backend.d";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function relativeTime(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface CommentItemProps {
  comment: CommunityComment;
  depth?: number;
  replies: CommunityComment[];
  identity: any;
  onReplySubmit: (parentId: bigint, text: string) => Promise<void>;
  onFlag: (commentId: bigint) => Promise<void>;
  flaggedIds: Set<string>;
}

function CommentItem({
  comment,
  depth = 0,
  replies,
  identity,
  onReplySubmit,
  onFlag,
  flaggedIds,
}: CommentItemProps) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const isFlagged = flaggedIds.has(comment.id.toString());

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await onReplySubmit(comment.id, replyText.trim());
      setReplyText("");
      setShowReply(false);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleFlag = async () => {
    if (!identity) {
      toast.error("Sign in to flag comments.");
      return;
    }
    setFlagging(true);
    try {
      await onFlag(comment.id);
    } finally {
      setFlagging(false);
    }
  };

  if (comment.deleted) {
    return (
      <div className={`pl-${depth > 0 ? 4 : 0} pt-2`}>
        <p className="text-[11px] text-muted-foreground/40 italic">[deleted]</p>
        {replies.map((r) => (
          <CommentItem
            key={r.id.toString()}
            comment={r}
            depth={depth + 1}
            replies={[]}
            identity={identity}
            onReplySubmit={onReplySubmit}
            onFlag={onFlag}
            flaggedIds={flaggedIds}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border/30 pl-3" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold text-primary/80">
            {comment.authorName || "Anonymous"}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {relativeTime(comment.createdAt)}
          </span>
          {comment.flagCount > 0n && (
            <span className="text-[9px] text-amber-400/70 font-mono">
              ⚑ {comment.flagCount.toString()}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          {comment.text}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {identity && depth === 0 && (
            <button
              type="button"
              onClick={() => setShowReply((v) => !v)}
              className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
            >
              Reply
            </button>
          )}
          <button
            type="button"
            onClick={handleFlag}
            disabled={isFlagged || flagging}
            data-ocid="comment.flag.button"
            className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-amber-400 transition-colors disabled:opacity-40"
          >
            {flagging ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Flag className="w-3 h-3" />
            )}
            {isFlagged ? "Flagged" : "Flag"}
          </button>
        </div>

        {showReply && (
          <div className="mt-2 flex flex-col gap-1.5">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="text-xs resize-none h-16"
              data-ocid="comment.reply.textarea"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-6 text-[11px] px-3"
                onClick={handleReply}
                disabled={submittingReply || !replyText.trim()}
                data-ocid="comment.reply.submit_button"
              >
                {submittingReply ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Reply"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] px-3"
                onClick={() => {
                  setShowReply(false);
                  setReplyText("");
                }}
                data-ocid="comment.reply.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {replies.map((r) => (
        <CommentItem
          key={r.id.toString()}
          comment={r}
          depth={depth + 1}
          replies={[]}
          identity={identity}
          onReplySubmit={onReplySubmit}
          onFlag={onFlag}
          flaggedIds={flaggedIds}
        />
      ))}
    </div>
  );
}

interface CommentThreadProps {
  entryId: bigint;
}

export function CommentThread({ entryId }: CommentThreadProps) {
  const { actor } = useActor();
  const { identity, login } = useInternetIdentity();
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);

  const loadComments = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = await (actor as any).getComments(entryId);
      setComments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [actor, entryId]);

  useEffect(() => {
    if (expanded && !loadedRef.current) {
      loadedRef.current = true;
      loadComments();
    }
  }, [expanded, loadComments]);

  const handleAddComment = async () => {
    if (!identity) {
      toast.error("Sign in with Internet Identity to comment.");
      return;
    }
    if (!newComment.trim() || !actor) return;
    setSubmitting(true);
    try {
      await (actor as any).addComment(entryId, newComment.trim());
      setNewComment("");
      await loadComments();
      toast.success("Comment posted!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: bigint, text: string) => {
    if (!identity || !actor) {
      toast.error("Sign in to reply.");
      return;
    }
    try {
      await (actor as any).replyToComment(parentId, text);
      await loadComments();
      toast.success("Reply posted!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to post reply.");
    }
  };

  const handleFlag = async (commentId: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).flagComment(commentId);
      setFlaggedIds((prev) => new Set([...prev, commentId.toString()]));
      toast.success("Comment flagged for review.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to flag comment.");
    }
  };

  // Build thread structure: top-level + replies
  const topLevel = comments.filter(
    (c) => !c.parentId || c.parentId.length === 0,
  );
  const replies = (parentId: bigint) =>
    comments.filter(
      (c) => c.parentId && c.parentId.length > 0 && c.parentId[0] === parentId,
    );

  const visibleCount = comments.filter((c) => !c.deleted).length;

  return (
    <div
      className="mt-1 pt-1.5 border-t border-border/30"
      onClick={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        data-ocid="comment.toggle.button"
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors w-full"
      >
        <MessageSquare className="w-3 h-3" />
        <span>
          {visibleCount > 0
            ? `${visibleCount} comment${visibleCount !== 1 ? "s" : ""}`
            : "Discussion"}
        </span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 ml-auto" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1" data-ocid="comment.panel">
          {loading && (
            <div
              data-ocid="comment.loading_state"
              className="flex items-center gap-2 py-2"
            >
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                Loading comments...
              </span>
            </div>
          )}

          {!loading && comments.length === 0 && (
            <p
              data-ocid="comment.empty_state"
              className="text-[11px] text-muted-foreground/50 py-1"
            >
              No comments yet. Be the first!
            </p>
          )}

          {!loading &&
            topLevel.map((c) => (
              <CommentItem
                key={c.id.toString()}
                comment={c}
                replies={replies(c.id)}
                identity={identity}
                onReplySubmit={handleReplySubmit}
                onFlag={handleFlag}
                flaggedIds={flaggedIds}
              />
            ))}

          {/* Add comment form */}
          <div className="mt-2 pt-2 border-t border-border/30">
            {!identity ? (
              <button
                type="button"
                onClick={login}
                className="text-[11px] text-primary hover:underline"
              >
                Sign in to comment
              </button>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="text-xs resize-none h-16"
                  data-ocid="comment.new.textarea"
                />
                <Button
                  size="sm"
                  className="h-6 text-[11px] px-3 self-end"
                  onClick={handleAddComment}
                  disabled={submitting || !newComment.trim()}
                  data-ocid="comment.new.submit_button"
                >
                  {submitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Post"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
