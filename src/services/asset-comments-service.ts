/**
 * Asset Comments and Approval Service
 * Handles commenting, approval workflows, and collaboration features
 */

import { supabase } from '@/integrations/supabase/client';
import { eventSourceService } from './event-sourcing';

export interface AssetComment {
  id: string;
  asset_id: string;
  user_id: string;
  parent_comment_id?: string;
  comment_text: string;
  comment_type: 'general' | 'approval_request' | 'approval_response' | 'revision_request';
  status: 'active' | 'resolved' | 'deleted';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    email: string;
    role: string;
  };
  replies?: AssetComment[];
}

export interface ApprovalRequest {
  id: string;
  asset_id: string;
  requested_by: string;
  requested_from: string;
  approval_type: 'content_review' | 'final_approval' | 'legal_review' | 'brand_review';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  notes?: string;
  decision_notes?: string;
  decided_at?: string;
  created_at: string;
  updated_at: string;
}

class AssetCommentsService {
  /**
   * Get comments for an asset
   */
  async getAssetComments(assetId: string): Promise<AssetComment[]> {
    try {
      const { data, error } = await supabase
        .from('asset_comments')
        .select(`
          id,
          asset_id,
          user_id,
          parent_comment_id,
          comment_text,
          comment_type,
          status,
          metadata,
          created_at,
          updated_at,
          user_profile:user_profiles(full_name, email, role)
        `)
        .eq('asset_id', assetId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into threaded structure
      const comments = data || [];
      const commentsMap = new Map<string, AssetComment>();
      const rootComments: AssetComment[] = [];

      // First pass: create map of all comments
      comments.forEach(comment => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize into threads
      comments.forEach(comment => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentsMap.get(comment.id)!);
          }
        } else {
          rootComments.push(commentsMap.get(comment.id)!);
        }
      });

      await eventSourceService.logEvent(
        'asset_comments',
        assetId,
        'comments.fetched',
        { comments_count: rootComments.length },
        'info'
      );

      return rootComments;
    } catch (error) {
      console.error('Error fetching asset comments:', error);
      throw error;
    }
  }

  /**
   * Add a comment to an asset
   */
  async addComment(
    assetId: string,
    commentText: string,
    commentType: AssetComment['comment_type'] = 'general',
    parentCommentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<AssetComment> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('asset_comments')
        .insert({
          asset_id: assetId,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          comment_text: commentText,
          comment_type: commentType,
          metadata,
        })
        .select(`
          id,
          asset_id,
          user_id,
          parent_comment_id,
          comment_text,
          comment_type,
          status,
          metadata,
          created_at,
          updated_at,
          user_profile:user_profiles(full_name, email, role)
        `)
        .single();

      if (error) throw error;

      await eventSourceService.logEvent(
        'asset_comments',
        assetId,
        'comment.added',
        {
          comment_id: data.id,
          comment_type: commentType,
          has_parent: !!parentCommentId,
          user_id: user.id,
        },
        'info'
      );

      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    commentText: string,
    metadata: Record<string, any> = {}
  ): Promise<AssetComment> {
    try {
      const { data, error } = await supabase
        .from('asset_comments')
        .update({
          comment_text: commentText,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select(`
          id,
          asset_id,
          user_id,
          parent_comment_id,
          comment_text,
          comment_type,
          status,
          metadata,
          created_at,
          updated_at,
          user_profile:user_profiles(full_name, email, role)
        `)
        .single();

      if (error) throw error;

      await eventSourceService.logEvent(
        'asset_comments',
        data.asset_id,
        'comment.updated',
        { comment_id: commentId },
        'info'
      );

      return data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('asset_comments')
        .update({ status: 'deleted' })
        .eq('id', commentId)
        .select('asset_id')
        .single();

      if (error) throw error;

      await eventSourceService.logEvent(
        'asset_comments',
        data.asset_id,
        'comment.deleted',
        { comment_id: commentId },
        'info'
      );
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Resolve a comment thread
   */
  async resolveComment(commentId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('asset_comments')
        .update({ status: 'resolved' })
        .eq('id', commentId)
        .select('asset_id')
        .single();

      if (error) throw error;

      await eventSourceService.logEvent(
        'asset_comments',
        data.asset_id,
        'comment.resolved',
        { comment_id: commentId },
        'info'
      );
    } catch (error) {
      console.error('Error resolving comment:', error);
      throw error;
    }
  }

  /**
   * Request approval for an asset
   */
  async requestApproval(
    assetId: string,
    requestedFrom: string,
    approvalType: ApprovalRequest['approval_type'],
    priority: ApprovalRequest['priority'] = 'medium',
    deadline?: string,
    notes?: string
  ): Promise<ApprovalRequest> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          asset_id: assetId,
          requested_by: user.id,
          requested_from: requestedFrom,
          approval_type: approvalType,
          priority,
          deadline,
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Also add a comment about the approval request
      await this.addComment(
        assetId,
        `Approval request created: ${approvalType}${notes ? ` - ${notes}` : ''}`,
        'approval_request',
        undefined,
        {
          approval_request_id: data.id,
          approval_type: approvalType,
          priority,
        }
      );

      await eventSourceService.logEvent(
        'approval_requests',
        assetId,
        'approval.requested',
        {
          approval_id: data.id,
          approval_type: approvalType,
          priority,
          requested_from: requestedFrom,
        },
        'info'
      );

      return data;
    } catch (error) {
      console.error('Error requesting approval:', error);
      throw error;
    }
  }

  /**
   * Respond to an approval request
   */
  async respondToApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    decisionNotes?: string
  ): Promise<ApprovalRequest> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('approval_requests')
        .update({
          status: decision,
          decision_notes: decisionNotes,
          decided_at: new Date().toISOString(),
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;

      // Add a comment about the approval decision
      await this.addComment(
        data.asset_id,
        `Approval ${decision}: ${data.approval_type}${decisionNotes ? ` - ${decisionNotes}` : ''}`,
        'approval_response',
        undefined,
        {
          approval_request_id: approvalId,
          decision,
          approval_type: data.approval_type,
        }
      );

      await eventSourceService.logEvent(
        'approval_requests',
        data.asset_id,
        `approval.${decision}`,
        {
          approval_id: approvalId,
          approval_type: data.approval_type,
          decision_notes: decisionNotes,
        },
        decision === 'approved' ? 'info' : 'warning'
      );

      return data;
    } catch (error) {
      console.error('Error responding to approval:', error);
      throw error;
    }
  }

  /**
   * Get approval requests for an asset
   */
  async getApprovalRequests(assetId: string): Promise<ApprovalRequest[]> {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      throw error;
    }
  }

  /**
   * Get pending approval requests for a user
   */
  async getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          asset:assets(id, title, content_type, status)
        `)
        .eq('requested_from', userId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }

  /**
   * Request revisions for an asset
   */
  async requestRevisions(
    assetId: string,
    revisionNotes: string,
    assignTo?: string
  ): Promise<AssetComment> {
    try {
      const comment = await this.addComment(
        assetId,
        revisionNotes,
        'revision_request',
        undefined,
        {
          requires_revision: true,
          assigned_to: assignTo,
        }
      );

      // Update asset status to indicate revisions needed
      await supabase
        .from('assets')
        .update({ status: 'draft' })
        .eq('id', assetId);

      await eventSourceService.logEvent(
        'asset_comments',
        assetId,
        'revisions.requested',
        {
          comment_id: comment.id,
          assigned_to: assignTo,
        },
        'info'
      );

      return comment;
    } catch (error) {
      console.error('Error requesting revisions:', error);
      throw error;
    }
  }

  /**
   * Get comment statistics for an asset
   */
  async getCommentStatistics(assetId: string): Promise<{
    total_comments: number;
    unresolved_comments: number;
    pending_approvals: number;
    revision_requests: number;
  }> {
    try {
      const [commentsData, approvalsData] = await Promise.all([
        supabase
          .from('asset_comments')
          .select('comment_type, status')
          .eq('asset_id', assetId),
        supabase
          .from('approval_requests')
          .select('status')
          .eq('asset_id', assetId)
      ]);

      const comments = commentsData.data || [];
      const approvals = approvalsData.data || [];

      return {
        total_comments: comments.filter(c => c.status === 'active').length,
        unresolved_comments: comments.filter(c => c.status === 'active' && c.comment_type !== 'general').length,
        pending_approvals: approvals.filter(a => a.status === 'pending').length,
        revision_requests: comments.filter(c => c.comment_type === 'revision_request' && c.status === 'active').length,
      };
    } catch (error) {
      console.error('Error fetching comment statistics:', error);
      return {
        total_comments: 0,
        unresolved_comments: 0,
        pending_approvals: 0,
        revision_requests: 0,
      };
    }
  }
}

export const assetCommentsService = new AssetCommentsService();