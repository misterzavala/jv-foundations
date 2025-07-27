
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

interface Receipt {
  id: string;
  type: string;
  dealNumber: string;
  description: string;
  addressCode: string;
  amount: number;
}

interface Summary {
  totalAmount: number;
  commission: number;
  fees: number;
  discounts: number;
  netProfit: number;
}

interface Seller {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface Partner {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

interface DealInformationProps {
  seller: Seller;
  partner: Partner;
  receipts: Receipt[];
  summary: Summary;
}

const getTypeColor = (type: string) => {
  const colors = {
    inspection: 'bg-blue-100 text-blue-800',
    commission: 'bg-green-100 text-green-800',
    fee: 'bg-orange-100 text-orange-800',
    closing: 'bg-purple-100 text-purple-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colors[type as keyof typeof colors] || colors.default;
};

export function DealInformation({ seller, partner, receipts, summary }: DealInformationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getSummaryColor = (amount: number, isPositive?: boolean) => {
    if (amount === 0) return 'text-muted-foreground';
    if (isPositive) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors px-4 py-6 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Deal Information</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(summary.netProfit)} Net
                </Badge>
                <ChevronDown 
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6 md:space-y-8 px-4 py-6 md:px-6">
            {/* Seller and Partner Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seller Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Seller Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm text-foreground">{seller.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm text-foreground">{seller.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm text-foreground">{seller.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm text-foreground">{seller.address}</p>
                  </div>
                </div>
              </div>

              {/* Partner Business Info */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Partner Business Info</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                    <p className="text-sm text-foreground">{partner.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                    <p className="text-sm text-foreground">{partner.contact}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm text-foreground">{partner.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm text-foreground">{partner.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm text-foreground">{partner.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipts Section */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Receipts</h3>
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge className={getTypeColor(receipt.type)}>
                        {receipt.type}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">{receipt.dealNumber}</p>
                        <p className="text-sm text-muted-foreground">{receipt.description}</p>
                        <p className="text-xs text-muted-foreground">{receipt.addressCode}</p>
                      </div>
                    </div>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(receipt.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Section */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Deal Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-6">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-foreground">
                    {formatCurrency(summary.totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-xl md:text-2xl font-bold ${getSummaryColor(summary.commission, true)}`}>
                    {formatCurrency(summary.commission)}
                  </div>
                  <div className="text-sm text-muted-foreground">Commission</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-xl md:text-2xl font-bold ${getSummaryColor(summary.fees)}`}>
                    {formatCurrency(summary.fees)}
                  </div>
                  <div className="text-sm text-muted-foreground">Fees</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-xl md:text-2xl font-bold ${getSummaryColor(summary.discounts)}`}>
                    -{formatCurrency(summary.discounts)}
                  </div>
                  <div className="text-sm text-muted-foreground">Discounts</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-primary">
                    {formatCurrency(summary.netProfit)}
                  </div>
                  <div className="text-sm text-muted-foreground">Net Profit</div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
