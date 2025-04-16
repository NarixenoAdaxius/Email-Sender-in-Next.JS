"use client";

import { useState, useEffect } from 'react';
import { SearchIcon, RefreshCw, FileIcon, EyeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

// Mock data for email history
const MOCK_EMAILS = [
  { 
    id: '1', 
    subject: 'Welcome to Our Service', 
    recipient: 'john@example.com',
    sentDate: '2023-11-15T09:30:00',
    status: 'delivered',
    template: 'Welcome Email',
    opens: 3,
    clicks: 1
  },
  { 
    id: '2', 
    subject: 'Your Monthly Newsletter', 
    recipient: 'jane@example.com',
    sentDate: '2023-11-10T14:45:00',
    status: 'delivered',
    template: 'Monthly Newsletter',
    opens: 5,
    clicks: 2
  },
  { 
    id: '3', 
    subject: 'Important Account Update', 
    recipient: 'bob@example.com',
    sentDate: '2023-11-05T11:20:00',
    status: 'bounced',
    template: 'Account Update',
    opens: 0,
    clicks: 0
  },
  { 
    id: '4', 
    subject: 'Your Order Confirmation', 
    recipient: 'sarah@example.com',
    sentDate: '2023-11-01T16:15:00',
    status: 'delivered',
    template: 'Order Confirmation',
    opens: 2,
    clicks: 1
  },
  { 
    id: '5', 
    subject: 'Upcoming Maintenance Notification', 
    recipient: 'mike@example.com',
    sentDate: '2023-10-25T08:00:00',
    status: 'pending',
    template: 'Service Notification',
    opens: 0,
    clicks: 0
  },
];

// Function to get badge variant based on status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'delivered':
      return <Badge className="bg-green-500">Delivered</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500">Pending</Badge>;
    case 'bounced':
      return <Badge className="bg-red-500">Bounced</Badge>;
    default:
      return <Badge className="bg-gray-500">{status}</Badge>;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export default function EmailHistoryPage() {
  const { toast } = useToast();
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<null | typeof MOCK_EMAILS[0]>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Apply filters
  const filteredEmails = emails.filter(email => {
    // Status filter
    if (statusFilter !== 'all' && email.status !== statusFilter) {
      return false;
    }
    
    // Search query
    if (searchQuery && !email.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !email.recipient.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !email.template.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const refreshEmailHistory = () => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setEmails(MOCK_EMAILS);
      setIsLoading(false);
      toast({
        title: "Refreshed",
        description: "Email history has been refreshed"
      });
    }, 1000);
  };

  const viewEmailDetails = (email: typeof MOCK_EMAILS[0]) => {
    setSelectedEmail(email);
    setIsDetailsOpen(true);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Email History</h1>
          <p className="text-muted-foreground mt-2">
            View and track your sent emails
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshEmailHistory}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2 relative">
              <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject, recipient, or template..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Emails Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">{email.subject}</TableCell>
                    <TableCell>{email.recipient}</TableCell>
                    <TableCell>{formatDate(email.sentDate)}</TableCell>
                    <TableCell>{email.template}</TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Opens: {email.opens}</span>
                        <span className="text-xs text-muted-foreground">Clicks: {email.clicks}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => viewEmailDetails(email)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No emails found. Try a different search or filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Email Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          {selectedEmail && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmail.subject}</DialogTitle>
                <DialogDescription>
                  Sent to {selectedEmail.recipient} on {formatDate(selectedEmail.sentDate)}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Template</h3>
                    <div className="mt-1 font-medium">{selectedEmail.template}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Opens</h3>
                    <div className="mt-1 font-medium">{selectedEmail.opens}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Clicks</h3>
                    <div className="mt-1 font-medium">{selectedEmail.clicks}</div>
                  </div>
                </div>
                
                <div className="rounded-md border p-4 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Email Content Preview</h3>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md min-h-[200px]">
                    <div className="border-b pb-2 mb-4">
                      <div className="font-medium">Subject: {selectedEmail.subject}</div>
                      <div className="text-sm text-muted-foreground">To: {selectedEmail.recipient}</div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p>This is a preview of the email content.</p>
                      <p>In a real implementation, the actual email content would be displayed here.</p>
                      <p>Template used: {selectedEmail.template}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 