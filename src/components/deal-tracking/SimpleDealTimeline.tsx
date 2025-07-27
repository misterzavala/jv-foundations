
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, Send } from "lucide-react";

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

interface SimpleDealTimelineProps {
  timeline: TimelineDay[];
}

const getEventTitle = (message: string, type: string) => {
  // Extract or create meaningful titles from messages
  if (type === 'system') {
    if (message.includes('created')) return 'Deal Created';
    if (message.includes('identified')) return 'Property Identified';
    return 'System Update';
  }
  if (type === 'contact') {
    if (message.includes('Initial contact')) return 'Initial Contact Made';
    return 'Contact Event';
  }
  if (type === 'milestone') return 'Milestone Reached';
  if (type === 'note') return 'Note Added';
  
  // Fallback: use first few words as title
  const words = message.split(' ');
  return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
};

const getEventSubtitle = (message: string, type: string) => {
  // Return the full message as subtitle, or a shortened version
  if (type === 'system' && message.includes('created')) {
    return 'Deal submitted to system';
  }
  if (type === 'contact' && message.includes('Initial contact')) {
    return 'First outreach completed';
  }
  return message;
};

export function SimpleDealTimeline({ timeline }: SimpleDealTimelineProps) {
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
      <CardHeader className="px-4 py-6 md:px-6">
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
            <span className="hidden sm:inline">Add Comment</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 px-4 py-6 md:px-6">
        {/* Add Comment Section */}
        {isAddingComment && (
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
            <Textarea
              placeholder="Add a comment about this deal..."
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
                <span>Add Comment</span>
              </Button>
            </div>
          </div>
        )}

        {/* Timeline Events */}
        <div className="space-y-6">
          {timeline.map((day) => (
            <div key={day.date}>
              {/* Date Header */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="text-sm font-medium text-muted-foreground">
                  {formatDate(day.date)}
                </div>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Events for this day */}
              <div className="relative ml-2 md:ml-4">
                {/* Vertical line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border"></div>
                
                <div className="space-y-6">
                  {day.events.map((event, index) => (
                    <div key={event.id} className="relative flex items-start">
                      {/* Timeline dot */}
                      <div className="absolute left-0 w-4 h-4 bg-primary rounded-full border-2 border-background z-10"></div>
                      
                      {/* Event content */}
                      <div className="ml-6 md:ml-8 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground">
                              {getEventTitle(event.message, event.type)}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1 break-words">
                              {getEventSubtitle(event.message, event.type)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {event.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
