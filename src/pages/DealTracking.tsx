
import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatusStepper } from "@/components/deal-tracking/StatusStepper";
import { DealInformation } from "@/components/deal-tracking/DealInformation";
import { SimpleDealTimeline } from "@/components/deal-tracking/SimpleDealTimeline";
import { DealSidebar } from "@/components/deal-tracking/DealSidebar";

// Mock data - in real app this would come from API/context
const mockDealData = {
  id: "D001",
  createdAt: "2024-01-15T10:30:00Z",
  sellerAddress: "123 Main St, Austin, TX 78701",
  sellerName: "John Smith",
  description: "Beautiful downtown property with great potential",
  status: 2, // Lead Contacted
  seller: {
    name: "John Smith",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    address: "123 Main St, Austin, TX 78701"
  },
  partner: {
    name: "Sarah Johnson Real Estate",
    contact: "Sarah Johnson",
    phone: "(555) 987-6543",
    email: "sarah@sjrealestate.com",
    address: "456 Business Ave, Austin, TX 78702"
  },
  receipts: [
    {
      id: "R001",
      type: "inspection",
      dealNumber: "D001-01",
      description: "Property inspection fee",
      addressCode: "123 Main",
      amount: 500
    },
    {
      id: "R002", 
      type: "commission",
      dealNumber: "D001-02",
      description: "Agent commission",
      addressCode: "123 Main",
      amount: 12500
    }
  ],
  summary: {
    totalAmount: 25000,
    commission: 2500,
    fees: 750,
    discounts: 0,
    netProfit: 21750
  },
  customer: {
    name: "John Smith",
    email: "john.smith@email.com",
    shippingAddress: "123 Main St, Austin, TX 78701",
    billingAddress: "123 Main St, Austin, TX 78701",
    paymentMethod: "Credit Card **** 1234"
  },
  timeline: [
    {
      date: "2024-01-15",
      events: [
        {
          id: "1",
          message: "Deal created and submitted to system",
          timestamp: "10:30 AM",
          type: "system" as const
        },
        {
          id: "2",
          message: "Initial contact made with seller",
          timestamp: "2:15 PM",
          type: "contact" as const,
          hasResendButton: true
        }
      ]
    },
    {
      date: "2024-01-14",
      events: [
        {
          id: "3",
          message: "Property listing identified",
          timestamp: "4:45 PM",
          type: "system" as const
        }
      ]
    }
  ]
};

export default function DealTracking() {
  const handleDownloadReport = () => {
    console.log('Downloading report for deal:', mockDealData.id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          dealInfo={{
            sellerAddress: mockDealData.sellerAddress,
            sellerName: mockDealData.sellerName,
            description: mockDealData.description,
            createdAt: mockDealData.createdAt
          }}
          onDownloadReport={handleDownloadReport}
        />
        
        {/* Mobile-first responsive layout */}
        <div className="flex-1 lg:flex">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="p-3 md:p-6 space-y-4 md:space-y-6">
              {/* Status Stepper */}
              <StatusStepper currentStep={mockDealData.status} />

              {/* Deal Information - Consolidated Section */}
              <DealInformation
                seller={mockDealData.seller}
                partner={mockDealData.partner}
                receipts={mockDealData.receipts}
                summary={mockDealData.summary}
              />

              {/* Simplified Timeline */}
              <SimpleDealTimeline timeline={mockDealData.timeline} />
            </div>
          </div>

          {/* Right Sidebar - Mobile stacks below, Desktop sidebar */}
          <DealSidebar 
            customer={mockDealData.customer} 
            dealId={mockDealData.id}
          />
        </div>
      </div>
    </div>
  );
}
