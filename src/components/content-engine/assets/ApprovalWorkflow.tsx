/**
 * Approval Workflow Component
 * Manages approval requests and responses for assets
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check,
  X,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Send,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetCommentsService, type ApprovalRequest } from '@/services/asset-comments-service';
import { useAuth } from '@/hooks/useAuth';

interface ApprovalWorkflowProps {
  assetId: string;
  className?: string;
}

export function ApprovalWorkflow({ assetId, className }: ApprovalWorkflowProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState({
    approvalType: 'content_review' as ApprovalRequest['approval_type'],
    requestedFrom: '',
    priority: 'medium' as ApprovalRequest['priority'],
    deadline: '',
    notes: '',
  });
  
  const [responseForm, setResponseForm] = useState({
    approvalId: '',
    decision: 'approved' as 'approved' | 'rejected',
    notes: '',
  });

  const { profile, isStaff } = useAuth();
  const queryClient = useQueryClient();

  // Fetch approval requests for this asset
  const { data: approvals, isLoading } = useQuery({
    queryKey: ['asset-approvals', assetId],
    queryFn: () => assetCommentsService.getApprovalRequests(assetId),
  });

  // Fetch pending approvals for current user
  const { data: myPendingApprovals } = useQuery({
    queryKey: ['my-pending-approvals', profile?.id],
    queryFn: () => profile?.id ? assetCommentsService.getPendingApprovals(profile.id) : [],
    enabled: !!profile?.id,
  });

  // Request approval mutation
  const requestApprovalMutation = useMutation({
    mutationFn: () => assetCommentsService.requestApproval(
      assetId,
      requestForm.requestedFrom,
      requestForm.approvalType,
      requestForm.priority,
      requestForm.deadline || undefined,
      requestForm.notes || undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-approvals', assetId]);
      queryClient.invalidateQueries(['asset-comment-stats', assetId]);
      setShowRequestDialog(false);
      resetRequestForm();
    },
  });

  // Respond to approval mutation
  const respondApprovalMutation = useMutation({
    mutationFn: () => assetCommentsService.respondToApproval(
      responseForm.approvalId,
      responseForm.decision,
      responseForm.notes || undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries(['asset-approvals', assetId]);
      queryClient.invalidateQueries(['my-pending-approvals', profile?.id]);
      queryClient.invalidateQueries(['asset-comment-stats', assetId]);
      resetResponseForm();
    },
  });

  const resetRequestForm = () => {
    setRequestForm({
      approvalType: 'content_review',
      requestedFrom: '',
      priority: 'medium',
      deadline: '',
      notes: '',
    });
  };

  const resetResponseForm = () => {
    setResponseForm({
      approvalId: '',
      decision: 'approved',
      notes: '',
    });
  };

  const handleRequestApproval = () => {
    if (!requestForm.requestedFrom) return;
    requestApprovalMutation.mutate();
  };

  const handleRespondToApproval = () => {
    if (!responseForm.approvalId) return;
    respondApprovalMutation.mutate();
  };

  const getStatusColor = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: ApprovalRequest['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  // Filter approvals that the current user can respond to
  const myApprovals = approvals?.filter(approval => 
    approval.requested_from === profile?.id && approval.status === 'pending'
  ) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading approvals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* My Pending Approvals (if any) */}
      {myApprovals.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {myApprovals.length} pending approval{myApprovals.length > 1 ? 's' : ''} for this asset.
          </AlertDescription>
        </Alert>
      )}

      {/* Request Approval Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Approval Workflow</h3>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Request Approval
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Approval</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Approval Type</label>
                <Select 
                  value={requestForm.approvalType} 
                  onValueChange={(value: ApprovalRequest['approval_type']) => 
                    setRequestForm(prev => ({ ...prev, approvalType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content_review">Content Review</SelectItem>
                    <SelectItem value="final_approval">Final Approval</SelectItem>
                    <SelectItem value="legal_review">Legal Review</SelectItem>
                    <SelectItem value="brand_review">Brand Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Request From (User ID)</label>
                <input
                  type="text"
                  value={requestForm.requestedFrom}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, requestedFrom: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Enter user ID to request approval from"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select 
                  value={requestForm.priority} 
                  onValueChange={(value: ApprovalRequest['priority']) => 
                    setRequestForm(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Deadline (Optional)</label>
                <input
                  type="datetime-local"
                  value={requestForm.deadline}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional context or requirements..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleRequestApproval}
                  disabled={!requestForm.requestedFrom || requestApprovalMutation.isLoading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {requestApprovalMutation.isLoading ? 'Sending...' : 'Send Request'}
                </Button>
                <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Approval Requests List */}
      <div className="space-y-3">
        {approvals && approvals.length > 0 ? (
          approvals.map((approval) => {
            const canRespond = approval.requested_from === profile?.id && approval.status === 'pending';
            const isRequester = approval.requested_by === profile?.id;
            
            return (
              <Card key={approval.id} className={cn(
                'transition-colors',
                canRespond && 'ring-2 ring-blue-200',
                isOverdue(approval.deadline) && approval.status === 'pending' && 'bg-red-50'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(approval.status)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {approval.approval_type.replace('_', ' ').toUpperCase()}
                          </span>
                          <Badge className={getStatusColor(approval.status)}>
                            {approval.status}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(approval.priority)}>
                            {approval.priority}
                          </Badge>
                        </div>
                        {approval.notes && (
                          <p className="text-sm text-muted-foreground">{approval.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-right">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(approval.created_at)}
                      </div>
                      {approval.deadline && (
                        <div className={cn(
                          'flex items-center gap-1 mt-1',
                          isOverdue(approval.deadline) && 'text-red-600'
                        )}>
                          <Clock className="h-3 w-3" />
                          Due: {formatDateTime(approval.deadline)}
                        </div>
                      )}
                    </div>
                  </div>

                  {approval.decision_notes && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Decision Notes:</div>
                      <p className="text-sm">{approval.decision_notes}</p>
                      {approval.decided_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Decided: {formatDateTime(approval.decided_at)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Response Actions */}
                  {canRespond && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      <div className="text-sm font-medium">Respond to this approval request:</div>
                      <Textarea
                        value={responseForm.approvalId === approval.id ? responseForm.notes : ''}
                        onChange={(e) => setResponseForm(prev => ({ 
                          ...prev, 
                          approvalId: approval.id,
                          notes: e.target.value 
                        }))}
                        placeholder="Add decision notes (optional)..."
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setResponseForm(prev => ({ 
                              ...prev, 
                              approvalId: approval.id,
                              decision: 'approved'
                            }));
                            handleRespondToApproval();
                          }}
                          disabled={respondApprovalMutation.isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setResponseForm(prev => ({ 
                              ...prev, 
                              approvalId: approval.id,
                              decision: 'rejected'
                            }));
                            handleRespondToApproval();
                          }}
                          disabled={respondApprovalMutation.isLoading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No approval requests yet.</p>
                <p className="text-sm">Request approval to start the review process.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}