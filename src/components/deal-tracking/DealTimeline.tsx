
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, RefreshCw, Clock } from "lucide-react";

interface TimelineEvent {
  id: string;
  message: string;
  timestamp: string;
  type: 'system' | 'contact' | 'user';
  hasResendButton?: boolean;
}

interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}

interface DealTimelineProps {
  timeline: TimelineDay[];
}

export function DealTimeline({ timeline }: DealTimelineProps) {
  const [newComment, setNewComment] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePostComment = () => {
    if (newComment.trim()) {
      console.log('Posting comment:', newComment);
      // TODO: Submit to API
      setNewComment('');
    }
  };

  const handleResend = (eventId: string) => {
    console.log('Resending event:', eventId);
    // TODO: Trigger resend action
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Clock className="h-4 w-4" />;
      case 'contact':
        return <MessageCircle className="h-4 w-4" />;
      case 'user':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventDotColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-500';
      case 'contact':
        return 'bg-green-500';
      case 'user':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Comment Input */}
        <div className="mb-6 p-4 border border-border rounded-lg space-y-3">
          <Textarea
            placeholder="Add a comment or update..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>Supports markdown formatting</span>
            </div>
            <Button 
              onClick={handlePostComment}
              disabled={!newComment.trim()}
              size="sm"
            >
              Post
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {timeline.map((day, dayIndex) => (
            <div key={day.date}>
              {/* Date Header */}
              <div className="flex items-center space-x-3 mb-4">
                <Badge variant="outline" className="text-xs">
                  {formatDate(day.date)}
                </Badge>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Events */}
              <div className="space-y-4 ml-4">
                {day.events.map((event, eventIndex) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    {/* Event Dot */}
                    <div className={`w-8 h-8 rounded-full ${getEventDotColor(event.type)} flex items-center justify-center text-white flex-shrink-0 mt-1`}>
                      {getEventIcon(event.type)}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">{event.message}</p>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {event.timestamp}
                          </span>
                          {event.hasResendButton && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(event.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Resend
                            </Button>
                          )}
                        </div>
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
