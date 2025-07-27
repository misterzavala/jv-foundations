
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Send, Phone, Mail, FileText, CheckCircle } from "lucide-react";

interface TimelineEvent {
  id: string;
  message: string;
  timestamp: string;
  type: 'system' | 'contact' | 'note' | 'milestone';
  hasResendButton?: boolean;
}

interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}

interface EnhancedDealTimelineProps {
  timeline: TimelineDay[];
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'contact':
      return <Phone className="h-4 w-4" />;
    case 'note':
      return <MessageSquare className="h-4 w-4" />;
    case 'milestone':
      return <CheckCircle className="h-4 w-4" />;
    case 'system':
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'contact':
      return 'bg-blue-500';
    case 'note':
      return 'bg-green-500';
    case 'milestone':
      return 'bg-purple-500';
    case 'system':
    default:
      return 'bg-gray-500';
  }
};

export function EnhancedDealTimeline({ timeline }: EnhancedDealTimelineProps) {
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  const handleAddComment = () => {
    if (newComment.trim()) {
      console.log('Adding comment:', newComment);
      // TODO: Add comment to timeline
      setNewComment("");
      setIsAddingComment(false);
    }
  };

  const handleResend = (eventId: string) => {
    console.log('Resending event:', eventId);
    // TODO: Implement resend functionality
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Deal Timeline</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingComment(!isAddingComment)}
            className="flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add Note</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Add Comment Section */}
        {isAddingComment && (
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
            <Textarea
              placeholder="Add a note about this deal..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingComment(false);
                  setNewComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="flex items-center space-x-1"
              >
                <Send className="h-3 w-3" />
                <span>Add Note</span>
              </Button>
            </div>
          </div>
        )}

        {/* Timeline Events */}
        <div className="space-y-6">
          {timeline.map((day, dayIndex) => (
            <div key={day.date} className="relative">
              {/* Date Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {formatDate(day.date)}
                </div>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Events for this day */}
              <div className="space-y-4 pl-4">
                {day.events.map((event, eventIndex) => (
                  <div key={event.id} className="relative flex items-start space-x-4">
                    {/* Timeline line */}
                    {(dayIndex !== timeline.length - 1 || eventIndex !== day.events.length - 1) && (
                      <div className="absolute left-6 top-8 w-px h-full bg-border"></div>
                    )}

                    {/* Event icon */}
                    <div className={`relative z-10 w-12 h-12 rounded-full ${getEventColor(event.type)} flex items-center justify-center text-white shadow-sm`}>
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {event.timestamp}
                            </span>
                          </div>
                          {event.hasResendButton && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(event.id)}
                              className="flex items-center space-x-1"
                            >
                              <Mail className="h-3 w-3" />
                              <span>Resend</span>
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-foreground">
                          {event.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
