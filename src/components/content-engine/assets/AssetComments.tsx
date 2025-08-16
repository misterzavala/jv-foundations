/**
 * Asset Comments Component
 * Handles threaded comments, approvals, and collaboration
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare,
  Reply,
  Check,
  X,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetCommentsService, type AssetComment, type ApprovalRequest } from '@/services/asset-comments-service';
import { useAuth } from '@/hooks/useAuth';

interface AssetCommentsProps {
  assetId: string;
  className?: string;
}

export function AssetComments({ assetId, className }: AssetCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<AssetComment['comment_type']>('general');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['asset-comments', assetId],
    queryFn: () => assetCommentsService.getAssetComments(assetId),
  });

  // Fetch approval requests
  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['asset-approvals', assetId],
    queryFn: () => assetCommentsService.getApprovalRequests(assetId),
  });

  // Fetch comment statistics
  const { data: stats } = useQuery({
    queryKey: ['asset-comment-stats', assetId],
    queryFn: () => assetCommentsService.getCommentStatistics(assetId),
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: {
      text: string;
      type: AssetComment['comment_type'];
      parentId?: string;
    }) => assetCommentsService.addComment(assetId, data.text, data.type, data.parentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-comments', assetId]);
      queryClient.invalidateQueries(['asset-comment-stats', assetId]);
      setNewComment('');
      setReplyingTo(null);
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: (data: { commentId: string; text: string }) =>
      assetCommentsService.updateComment(data.commentId, data.text),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-comments', assetId]);
      setEditingComment(null);
      setEditText('');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => assetCommentsService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-comments', assetId]);
      queryClient.invalidateQueries(['asset-comment-stats', assetId]);
    },
  });

  // Resolve comment mutation
  const resolveCommentMutation = useMutation({
    mutationFn: (commentId: string) => assetCommentsService.resolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-comments', assetId]);
      queryClient.invalidateQueries(['asset-comment-stats', assetId]);
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      text: newComment.trim(),
      type: commentType,
      parentId: replyingTo || undefined,
    });
  };

  const handleUpdateComment = (commentId: string) => {
    if (!editText.trim()) return;

    updateCommentMutation.mutate({
      commentId,
      text: editText.trim(),
    });
  };

  const startEditing = (comment: AssetComment) => {
    setEditingComment(comment.id);
    setEditText(comment.comment_text);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditText('');
  };

  const getCommentTypeColor = (type: AssetComment['comment_type']) => {
    switch (type) {
      case 'approval_request':
        return 'bg-blue-100 text-blue-800';
      case 'approval_response':
        return 'bg-green-100 text-green-800';
      case 'revision_request':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStatusColor = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderComment = (comment: AssetComment, depth: number = 0) => {
    const isEditing = editingComment === comment.id;
    const canEdit = comment.user_id === profile?.id;
    const maxDepth = 3;

    return (
      <div key={comment.id} className={cn('space-y-2', depth > 0 && 'ml-8 border-l-2 border-muted pl-4')}>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {comment.user_profile?.full_name?.[0] || comment.user_profile?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-medium">
                  {comment.user_profile?.full_name || comment.user_profile?.email || 'User'}
                </span>
                <Badge variant="outline" className={cn('ml-2 text-xs', getCommentTypeColor(comment.comment_type))}>
                  {comment.comment_type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTime(comment.created_at)}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap mb-3">{comment.comment_text}</p>
              
              <div className="flex items-center gap-2">
                {depth < maxDepth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(comment.id)}
                    className="h-6 text-xs"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
                
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(comment)}
                      className="h-6 text-xs"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="h-6 text-xs text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
                
                {comment.comment_type !== 'general' && comment.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveCommentMutation.mutate(comment.id)}
                    className="h-6 text-xs text-green-600"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="ml-8 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitComment}>
                Reply
              </Button>
              <Button variant="outline" size="sm" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (commentsLoading || approvalsLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Comments</span>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold">{stats.total_comments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Unresolved</span>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-lg font-semibold">{stats.unresolved_comments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pending Approvals</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-lg font-semibold">{stats.pending_approvals}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Revisions</span>
                <Edit className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-lg font-semibold">{stats.revision_requests}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Requests */}
      {approvals && approvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Approval Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={getApprovalStatusColor(approval.status)}>
                      {approval.status}
                    </Badge>
                    <span className="text-sm font-medium">{approval.approval_type.replace('_', ' ')}</span>
                    <Badge variant="outline" className="text-xs">
                      {approval.priority}
                    </Badge>
                  </div>
                  {approval.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{approval.notes}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {formatTime(approval.created_at)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Comments & Collaboration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Comment Form */}
          {!replyingTo && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Select value={commentType} onValueChange={(value: AssetComment['comment_type']) => setCommentType(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="approval_request">Approval Request</SelectItem>
                    <SelectItem value="revision_request">Revision Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[100px]"
              />
              
              <Button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addCommentMutation.isLoading}
              >
                {addCommentMutation.isLoading ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments && comments.length > 0 ? (
              comments.map(comment => renderComment(comment))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No comments yet. Start the conversation!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}