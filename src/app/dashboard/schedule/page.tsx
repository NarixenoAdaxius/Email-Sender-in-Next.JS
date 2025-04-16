"use client";

import { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
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
  DialogFooter,
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Mock data for scheduled emails
const MOCK_SCHEDULED_EMAILS = [
  { 
    id: '1', 
    subject: 'Weekly Newsletter', 
    recipientCount: 120,
    scheduledDate: '2023-11-25T09:00:00',
    status: 'scheduled',
    template: 'Weekly Newsletter',
    recurrence: 'weekly'
  },
  { 
    id: '2', 
    subject: 'Black Friday Sale', 
    recipientCount: 500,
    scheduledDate: '2023-11-24T08:00:00',
    status: 'scheduled',
    template: 'Promotional Email',
    recurrence: 'once'
  },
  { 
    id: '3', 
    subject: 'Monthly Product Update', 
    recipientCount: 300,
    scheduledDate: '2023-12-01T10:30:00',
    status: 'scheduled',
    template: 'Product Update',
    recurrence: 'monthly'
  },
  { 
    id: '4', 
    subject: 'Happy Holidays', 
    recipientCount: 450,
    scheduledDate: '2023-12-24T12:00:00',
    status: 'scheduled',
    template: 'Holiday Email',
    recurrence: 'once'
  }
];

// Function to get badge variant based on recurrence
const getRecurrenceBadge = (recurrence: string) => {
  switch (recurrence) {
    case 'daily':
      return <Badge className="bg-blue-500">Daily</Badge>;
    case 'weekly':
      return <Badge className="bg-purple-500">Weekly</Badge>;
    case 'monthly':
      return <Badge className="bg-indigo-500">Monthly</Badge>;
    case 'once':
    default:
      return <Badge className="bg-gray-500">One-time</Badge>;
  }
};

// Format date for display
const formatScheduledDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, 'MMM d, yyyy h:mm a');
};

export default function EmailSchedulePage() {
  const { toast } = useToast();
  const [scheduledEmails, setScheduledEmails] = useState(MOCK_SCHEDULED_EMAILS);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({
    subject: '',
    recipientGroup: '',
    scheduledDate: '',
    scheduledTime: '',
    template: '',
    recurrence: 'once'
  });

  const handleAddScheduledEmail = () => {
    // Validate form
    if (!newEmail.subject || !newEmail.recipientGroup || !newEmail.scheduledDate || 
        !newEmail.scheduledTime || !newEmail.template) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    // Create combined date and time string
    const dateTimeString = `${newEmail.scheduledDate}T${newEmail.scheduledTime}:00`;
    
    // Create new scheduled email
    const scheduledEmail = {
      id: (scheduledEmails.length + 1).toString(),
      subject: newEmail.subject,
      recipientCount: Math.floor(Math.random() * 500) + 50, // Simulate recipient count
      scheduledDate: dateTimeString,
      status: 'scheduled',
      template: newEmail.template,
      recurrence: newEmail.recurrence
    };

    // Add to list
    setScheduledEmails([...scheduledEmails, scheduledEmail]);
    
    // Reset form and close dialog
    setNewEmail({
      subject: '',
      recipientGroup: '',
      scheduledDate: '',
      scheduledTime: '',
      template: '',
      recurrence: 'once'
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Email scheduled successfully"
    });
  };

  const handleDeleteScheduledEmail = (id: string) => {
    setScheduledEmails(scheduledEmails.filter(email => email.id !== id));
    
    toast({
      title: "Success",
      description: "Scheduled email removed"
    });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Email Scheduling</h1>
          <p className="text-muted-foreground mt-2">
            Schedule emails to be sent at the perfect time for your audience
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Email
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Schedule an Email</DialogTitle>
              <DialogDescription>
                Set up an email to be sent at a specific time and date
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">
                  Subject
                </Label>
                <Input
                  id="subject"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                  className="col-span-3"
                  placeholder="Email subject"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recipient-group" className="text-right">
                  Recipients
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={newEmail.recipientGroup} 
                    onValueChange={(value) => setNewEmail({ ...newEmail, recipientGroup: value })}
                  >
                    <SelectTrigger id="recipient-group">
                      <SelectValue placeholder="Select recipient group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts</SelectItem>
                      <SelectItem value="newsletter">Newsletter Subscribers</SelectItem>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="prospects">Prospects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template" className="text-right">
                  Template
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={newEmail.template} 
                    onValueChange={(value) => setNewEmail({ ...newEmail, template: value })}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select email template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Welcome Email">Welcome Email</SelectItem>
                      <SelectItem value="Weekly Newsletter">Weekly Newsletter</SelectItem>
                      <SelectItem value="Monthly Newsletter">Monthly Newsletter</SelectItem>
                      <SelectItem value="Promotional Email">Promotional Email</SelectItem>
                      <SelectItem value="Product Update">Product Update</SelectItem>
                      <SelectItem value="Holiday Email">Holiday Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <div className="relative">
                    <CalendarIcon className="h-4 w-4 absolute top-3 left-3 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      value={newEmail.scheduledDate}
                      onChange={(e) => setNewEmail({ ...newEmail, scheduledDate: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">
                  Time
                </Label>
                <div className="col-span-3">
                  <div className="relative">
                    <Clock className="h-4 w-4 absolute top-3 left-3 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      value={newEmail.scheduledTime}
                      onChange={(e) => setNewEmail({ ...newEmail, scheduledTime: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="recurrence" className="text-right">
                  Recurrence
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={newEmail.recurrence} 
                    onValueChange={(value) => setNewEmail({ ...newEmail, recurrence: value })}
                  >
                    <SelectTrigger id="recurrence">
                      <SelectValue placeholder="Select recurrence pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddScheduledEmail}>
                Schedule Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Calendar View Placeholder */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            <h2 className="text-lg font-medium">Upcoming Scheduled Emails</h2>
          </div>
          <div className="bg-gray-50 border rounded-md p-4 text-center text-muted-foreground">
            Calendar view for scheduled emails will be implemented in a future update.
          </div>
        </CardContent>
      </Card>
      
      {/* Scheduled Emails Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email Subject</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduledEmails.length > 0 ? (
                scheduledEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">{email.subject}</TableCell>
                    <TableCell>{email.recipientCount} contacts</TableCell>
                    <TableCell>{formatScheduledDate(email.scheduledDate)}</TableCell>
                    <TableCell>{email.template}</TableCell>
                    <TableCell>{getRecurrenceBadge(email.recurrence)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteScheduledEmail(email.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No scheduled emails. Click "Schedule Email" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 