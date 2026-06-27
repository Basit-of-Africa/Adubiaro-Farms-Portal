import React, { useState } from 'react';
import { MessageSquare, CornerDownRight, Trash2, Send, X, Shield, Star, UserCheck } from 'lucide-react';
import { User, FarmUpdateComment } from '../types';

interface CommentsSectionProps {
  updateId: string;
  comments?: FarmUpdateComment[];
  currentUser: User;
  token: string;
  onCommentAdded: () => void;
}

export default function CommentsSection({
  updateId,
  comments = [],
  currentUser,
  token,
  onCommentAdded
}: CommentsSectionProps) {
  const [rootCommentText, setRootCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group comments by parentId
  const rootComments = comments.filter(c => !c.parentId);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {} as Record<string, FarmUpdateComment[]>);

  // Sort comments by date ascending to keep reading order natural
  const sortComments = (list: FarmUpdateComment[]) => {
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const handlePostComment = async (content: string, parentId: string | null = null) => {
    if (!content.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/updates/${updateId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          parentId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      // Success
      if (parentId) {
        setReplyText('');
        setReplyingToId(null);
      } else {
        setRootCommentText('');
      }
      onCommentAdded();
    } catch (err: any) {
      setError(err.message || 'Error posting comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment and all its replies?')) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/updates/${updateId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete comment');
      }

      onCommentAdded();
    } catch (err: any) {
      setError(err.message || 'Error deleting comment');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render role badge
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200 rounded">
            <Shield className="h-2 w-2" /> Admin
          </span>
        );
      case 'farm_manager':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
            <UserCheck className="h-2 w-2" /> Manager
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
            <Star className="h-2 w-2" /> Investor
          </span>
        );
    }
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  };

  // Render a comment node and its children recursively
  const CommentNode = ({ comment, depth = 0 }: { comment: FarmUpdateComment; depth: number; key?: any }) => {
    const childReplies = repliesByParent[comment.id] ? sortComments(repliesByParent[comment.id]) : [];
    const isReplying = replyingToId === comment.id;
    const canDelete = comment.userId === currentUser.id || currentUser.role === 'admin';

    // Limit visible visual depth/padding-left to avoid excessive shrinking
    const maxIndentDepth = 3;
    const paddingLeftClass = depth > 0 ? (depth <= maxIndentDepth ? 'pl-4 md:pl-6 border-l border-gray-100 mt-2.5 ml-2 md:ml-3' : 'pl-2 mt-2.5') : '';

    return (
      <div className={`group/comment ${paddingLeftClass}`} id={`comment-node-${comment.id}`}>
        <div className="bg-gray-50/50 hover:bg-gray-50 p-3 rounded-xl border border-gray-100 transition-colors duration-150">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-[#1B4332] text-white text-[10px] font-mono font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                {getInitials(comment.userName)}
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                <span className="text-[11px] font-bold text-gray-800">{comment.userName}</span>
                <div className="flex items-center gap-1.5">
                  {renderRoleBadge(comment.userRole)}
                  <span className="text-[9px] text-gray-400 font-mono">
                    {new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteComment(comment.id)}
                className="opacity-0 group-hover/comment:opacity-100 text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                title="Delete comment thread"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-700 mt-1.5 font-sans whitespace-pre-wrap leading-relaxed pl-1">
            {comment.content}
          </p>

          <div className="flex items-center gap-3 mt-2 pl-1 text-[10px] font-mono font-bold text-[#1B4332]/70">
            <button
              type="button"
              onClick={() => {
                if (isReplying) {
                  setReplyingToId(null);
                  setReplyText('');
                } else {
                  setReplyingToId(comment.id);
                  setReplyText('');
                }
              }}
              className="flex items-center gap-1 hover:text-[#1B4332] hover:underline transition cursor-pointer"
            >
              <CornerDownRight className="h-3 w-3 shrink-0" />
              <span>{isReplying ? 'Cancel' : 'Reply'}</span>
            </button>
          </div>
        </div>

        {/* Nested Reply Input Box */}
        {isReplying && (
          <div className="pl-4 md:pl-6 border-l border-[#2D6A4F]/20 mt-2.5 ml-2 md:ml-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePostComment(replyText, comment.id);
              }}
              className="flex items-end gap-2 bg-[#FBF9F4]/40 border border-[#2D6A4F]/20 p-2 rounded-xl"
            >
              <div className="flex-1">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.userName}...`}
                  rows={2}
                  className="w-full text-xs bg-white border border-gray-150 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#1B4332] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment(replyText, comment.id);
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="submit"
                  disabled={loading || !replyText.trim()}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white p-2 rounded-lg transition cursor-pointer disabled:opacity-40 shadow-sm"
                  title="Send reply"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyingToId(null);
                    setReplyText('');
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-lg transition cursor-pointer"
                  title="Cancel reply"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recursively Render Replies */}
        {childReplies.length > 0 && (
          <div className="space-y-1">
            {childReplies.map((reply) => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 pt-3.5 border-t border-gray-50 space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-500 uppercase tracking-wider pl-1">
        <MessageSquare className="h-3.5 w-3.5 text-[#1B4332]/70 shrink-0" />
        <span>Operations Chronicle Discussion ({comments.length})</span>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px] font-mono">
          {error}
        </div>
      )}

      {/* Comment Thread */}
      {comments.length === 0 ? (
        <p className="text-[10px] text-gray-400 font-mono italic pl-1">
          No discussion chronicles logged for this update yet. Be the first to inquire or discuss!
        </p>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {sortComments(rootComments).map((comment) => (
            <CommentNode key={comment.id} comment={comment} depth={0} />
          ))}
        </div>
      )}

      {/* Root level comment Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePostComment(rootCommentText, null);
        }}
        className="flex items-end gap-2 bg-gray-50/50 border border-gray-100 p-2 rounded-xl"
      >
        <div className="flex-1">
          <textarea
            value={rootCommentText}
            onChange={(e) => setRootCommentText(e.target.value)}
            placeholder="Type comment or operational question here..."
            rows={2}
            className="w-full text-xs bg-white border border-gray-150 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#1B4332] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostComment(rootCommentText, null);
              }
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !rootCommentText.trim()}
          className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white p-2.5 rounded-lg transition cursor-pointer disabled:opacity-40 shrink-0 flex items-center justify-center shadow-sm"
          title="Send comment"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
