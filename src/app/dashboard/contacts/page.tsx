"use client";

import { useState, useEffect } from 'react';
import { PlusIcon, SearchIcon, DownloadIcon, UploadIcon, TrashIcon, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data for contacts
const MOCK_CONTACTS = [
  { id: '1', name: 'John Doe', email: 'john@example.com', company: 'Acme Inc', tags: ['customer', 'newsletter'] },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', company: 'XYZ Corp', tags: ['prospect'] },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', company: 'ABC Ltd', tags: ['customer'] },
  { id: '4', name: 'Sarah Williams', email: 'sarah@example.com', company: 'Tech Solutions', tags: ['newsletter'] },
  { id: '5', name: 'Mike Brown', email: 'mike@example.com', company: 'Global Services', tags: ['customer', 'prospect'] },
];

export default function ContactsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newContact, setNewContact] = useState({ name: '', email: '', company: '', tags: '' });
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<null | { id: string, name: string, email: string, company: string, tags: string }>(null);

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    const tagsArray = newContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    const contact = {
      id: (contacts.length + 1).toString(),
      name: newContact.name,
      email: newContact.email,
      company: newContact.company,
      tags: tagsArray
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: '', email: '', company: '', tags: '' });
    setIsAddContactOpen(false);
    
    toast({
      title: "Success",
      description: "Contact added successfully"
    });
  };

  const handleEditContact = () => {
    if (!editingContact) return;
    
    if (!editingContact.name || !editingContact.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    const tagsArray = editingContact.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    setContacts(contacts.map(contact => 
      contact.id === editingContact.id 
        ? { ...contact, name: editingContact.name, email: editingContact.email, company: editingContact.company, tags: tagsArray }
        : contact
    ));
    
    setEditingContact(null);
    
    toast({
      title: "Success",
      description: "Contact updated successfully"
    });
  };

  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
    
    toast({
      title: "Success",
      description: "Contact deleted successfully"
    });
  };

  const exportContacts = () => {
    const jsonString = JSON.stringify(contacts, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.json';
    a.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Contacts exported successfully"
    });
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Contact Lists</h1>
          <p className="text-muted-foreground mt-2">
            Manage your contacts and recipient lists
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportContacts}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your list
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="company" className="text-right">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={newContact.company}
                    onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right">
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    value={newContact.tags}
                    onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                    className="col-span-3"
                    placeholder="customer, prospect, newsletter (comma separated)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>Cancel</Button>
                <Button onClick={handleAddContact}>Add Contact</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts by name, email, company or tag..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.company}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setEditingContact({
                                id: contact.id,
                                name: contact.name,
                                email: contact.email,
                                company: contact.company,
                                tags: contact.tags.join(', ')
                              })}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Contact</DialogTitle>
                              <DialogDescription>
                                Update contact information
                              </DialogDescription>
                            </DialogHeader>
                            {editingContact && (
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-name" className="text-right">
                                    Name
                                  </Label>
                                  <Input
                                    id="edit-name"
                                    value={editingContact.name}
                                    onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-email" className="text-right">
                                    Email
                                  </Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={editingContact.email}
                                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-company" className="text-right">
                                    Company
                                  </Label>
                                  <Input
                                    id="edit-company"
                                    value={editingContact.company}
                                    onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
                                    className="col-span-3"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="edit-tags" className="text-right">
                                    Tags
                                  </Label>
                                  <Input
                                    id="edit-tags"
                                    value={editingContact.tags}
                                    onChange={(e) => setEditingContact({ ...editingContact, tags: e.target.value })}
                                    className="col-span-3"
                                    placeholder="customer, prospect, newsletter (comma separated)"
                                  />
                                </div>
                              </div>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
                              <Button onClick={handleEditContact}>Update Contact</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No contacts found. Add your first contact or try a different search.
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