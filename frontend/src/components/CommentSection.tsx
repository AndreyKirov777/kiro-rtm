import React, { useState, useEffect } from 'react';
import { Comment } from '../types';
import MockApiClient from '../services/MockApiClient';
import { Button } from './Button';
import Textarea from './Textarea';

interface CommentSectionProps {
  requirementId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ requirementId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [isClarificationRequest, setIsClarificationRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [requirementId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await MockApiClient.getComments(requirementId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;

    try {
      setSubmitting(true);
      await MockApiClient.createComment({
        requirementId,
        parentCommentId: replyToId,
        content: newCommentContent,
        isClarificationRequest,
      });
      setNewCommentContent('');
      setReplyToId(null);
      setIsClarificationRequest(false);
      await loadComments();
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await MockApiClient.updateComment(commentId, { resolved: true });
      await loadComments();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await MockApiClient.deleteComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyToId(commentId);
    setIsClarificationRequest(false);
  };

  const handleCancelReply = () => {
    setReplyToId(null);
    setNewCommentContent('');
    setIsClarificationRequest(false);
  };

  // Organize comments into threads
  const rootComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const replies = getReplies(comment.id);
    const isReplyingTo = replyToId === comment.id;

    return (
      <div
        key={comment.id}
        className={`comment ${isReply ? 'comment-reply' : ''} ${
          comment.resolved ? 'comment-resolved' : ''
        }`}
        style={{
          marginLeft: isReply ? '2rem' : '0',
          marginBottom: '1rem',
          padding: '1rem',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: comment.resolved ? '#f5f5f5' : '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <strong>{comment.authorName}</strong>
            {comment.isClarificationRequest && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.125rem 0.5rem',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '3px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                CLARIFICATION REQUEST
              </span>
            )}
            {comment.resolved && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.125rem 0.5rem',
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  borderRadius: '3px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                RESOLVED
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.875rem', color: '#666' }}>
            {formatDate(comment.createdAt)}
          </span>
        </div>

        <div style={{ marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
          {comment.content}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleReply(comment.id)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              border: 'none',
              background: 'none',
              color: '#007bff',
              cursor: 'pointer',
            }}
          >
            Reply
          </button>
          {!comment.resolved && comment.isClarificationRequest && (
            <button
              onClick={() => handleResolveComment(comment.id)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                border: 'none',
                background: 'none',
                color: '#28a745',
                cursor: 'pointer',
              }}
            >
              Resolve
            </button>
          )}
          <button
            onClick={() => handleDeleteComment(comment.id)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              border: 'none',
              background: 'none',
              color: '#dc3545',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>

        {isReplyingTo && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <form onSubmit={handleSubmitComment}>
              <Textarea
                value={newCommentContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCommentContent(e.target.value)}
                placeholder="Write your reply..."
                rows={3}
                style={{ marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Button type="submit" disabled={submitting || !newCommentContent.trim()}>
                  {submitting ? 'Posting...' : 'Post Reply'}
                </Button>
                <Button type="button" onClick={handleCancelReply} variant="secondary">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {replies.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="comment-section">
      <h3 style={{ marginBottom: '1rem' }}>Comments ({comments.length})</h3>

      {/* New comment form */}
      {!replyToId && (
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <form onSubmit={handleSubmitComment}>
            <Textarea
              value={newCommentContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewCommentContent(e.target.value)}
              placeholder="Add a comment..."
              rows={4}
              style={{ marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={isClarificationRequest}
                  onChange={(e) => setIsClarificationRequest(e.target.checked)}
                />
                <span>Mark as clarification request</span>
              </label>
              <Button type="submit" disabled={submitting || !newCommentContent.trim()}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Comments list */}
      {rootComments.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No comments yet. Be the first to comment!</p>
      ) : (
        <div>
          {rootComments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
};
