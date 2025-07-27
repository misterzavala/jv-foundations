
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface Customer {
  name: string;
  email: string;
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
}

interface DealSidebarProps {
  customer: Customer;
  dealId: string;
}

export function DealSidebar({ customer, dealId }: DealSidebarProps) {
  return (
    <div className="lg:w-80 lg:bg-muted/30 lg:border-l lg:border-border lg:p-6 p-3 md:p-6 lg:space-y-6 space-y-4 pb-12">
      {/* Mobile: Cards stack full-width below content */}
      {/* Desktop: Fixed-width sidebar on the right */}
      
      {/* Customer Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-sm text-foreground break-words">{customer.name}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm text-foreground break-words">{customer.email}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Shipping Address</label>
            <p className="text-sm text-foreground break-words">{customer.shippingAddress}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Billing Address</label>
            <p className="text-sm text-foreground break-words">{customer.billingAddress}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
            <p className="text-sm text-foreground break-words">{customer.paymentMethod}</p>
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Get Help Here</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Placeholder Video/Embed Area */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Button variant="outline" className="w-full text-sm">
              Contact Support
            </Button>
            <Button variant="outline" className="w-full text-sm">
              View Documentation
            </Button>
            <Button variant="outline" className="w-full text-sm">
              Schedule Call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
