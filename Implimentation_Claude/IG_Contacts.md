# Contact Management Implementation Guide

This guide contains the complete implementation for a modal-based contact management system with full CRUD operations.

## Core Data Types

```typescript
// AI NOTE: This is the core contact data structure - adapt field names to match your existing database schema
export interface Contact {
  client_name: string;
  contact_type: string;  // "Primary" | "Authorized" | "Provider"
  contact_name: string;
  phone: string;
  email: string;
  fax: string | null;
  physical_address: string;
  mailing_address: string | null;
}
```

## Main Entry Point Component

```typescript
// AI NOTE: This is the trigger component that goes on your dashboard
// It's just a button that opens the modal - integrate this wherever you need contact access
const ContactTrigger = () => {
  const [isContactsOpen, setIsContactsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsContactsOpen(true)}
      >
        View All Contacts
      </Button>

      {/* AI NOTE: Dialog component from shadcn/ui - provides modal functionality */}
      <Dialog open={isContactsOpen} onOpenChange={setIsContactsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Contacts</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <ContactsTable contacts={mockContacts} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

## Main Contacts Table Component

```typescript
// AI NOTE: This is the main component that handles all contact operations
// It manages its own state but you could lift this up to a context or global state
const ContactsTable = ({ contacts: initialContacts }: { contacts: Contact[] }) => {
  // AI NOTE: Local state management - consider using your app's state management solution
  const [contacts, setContacts] = useState(initialContacts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // AI NOTE: Form state with default values - adjust defaults to your business logic
  const [formData, setFormData] = useState<Partial<Contact>>({
    client_name: "Bumgardner Architects (ABC)", // Default client - make this dynamic
    contact_type: "Primary",
    contact_name: "",
    phone: "",
    email: "",
    fax: "",
    physical_address: "",
    mailing_address: ""
  });

  // AI NOTE: Save handler for both create and update operations
  const handleSave = () => {
    if (editingContact) {
      // Update existing contact
      setContacts(contacts.map(c => 
        c.contact_name === editingContact.contact_name ? { ...formData as Contact } : c
      ));
      showSuccess("Contact updated successfully");
    } else {
      // Create new contact
      const newContact: Contact = {
        ...formData as Contact,
        fax: formData.fax || null,
        mailing_address: formData.mailing_address || null
      };
      setContacts([...contacts, newContact]);
      showSuccess("Contact added successfully");
    }
    setIsDialogOpen(false);
    resetForm();
  };

  // AI NOTE: Delete handler - add confirmation dialog if needed
  const handleDelete = (contactName: string) => {
    setContacts(contacts.filter(c => c.contact_name !== contactName));
    showSuccess("Contact deleted successfully");
  };

  // AI NOTE: Form reset utility
  const resetForm = () => {
    setFormData({
      client_name: "Bumgardner Architects (ABC)",
      contact_type: "Primary",
      contact_name: "",
      phone: "",
      email: "",
      fax: "",
      physical_address: "",
      mailing_address: ""
    });
    setEditingContact(null);
  };

  // AI NOTE: Edit mode initializer
  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData(contact);
    setIsDialogOpen(true);
  };

  return (
    <div>
      {/* AI NOTE: Header with description and add button */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600">Clean table view with modal editing</p>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus size={16} /> Add Contact
        </Button>
      </div>

      {/* AI NOTE: Main table structure using shadcn/ui Table components */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.contact_name}>
                <TableCell className="font-medium">{contact.contact_name}</TableCell>
                <TableCell>
                  {/* AI NOTE: Type badge with conditional styling */}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    contact.contact_type === "Primary" ? "bg-blue-100 text-blue-700" :
                    contact.contact_type === "Authorized" ? "bg-green-100 text-green-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    {contact.contact_type}
                  </span>
                </TableCell>
                <TableCell>
                  {/* AI NOTE: Contact info with icons from lucide-react */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={12} />
                      {contact.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={12} />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {/* AI NOTE: Address display with conditional mailing address */}
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={12} className="mt-0.5" />
                    <div>
                      <p>{contact.physical_address}</p>
                      {contact.mailing_address && (
                        <p className="text-gray-500 text-xs mt-1">{contact.mailing_address}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {/* AI NOTE: Action buttons for edit and delete */}
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(contact)}>
                      <Edit size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(contact.contact_name)}>
                      <Trash size={14} className="text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* AI NOTE: Add/Edit Dialog - reused for both operations */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
          </DialogHeader>
          {/* AI NOTE: Form grid layout - responsive 2 column */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Name *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Type</Label>
              {/* AI NOTE: Native select for simplicity - could use Select component from shadcn */}
              <select
                className="w-full border rounded-md px-3 py-2"
                value={formData.contact_type}
                onChange={(e) => setFormData({ ...formData, contact_type: e.target.value })}
              >
                <option value="Primary">Primary</option>
                <option value="Authorized">Authorized</option>
                <option value="Provider">Provider</option>
              </select>
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Fax</Label>
              <Input
                value={formData.fax || ""}
                onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
              />
            </div>
            {/* AI NOTE: Full width fields for addresses */}
            <div className="col-span-2">
              <Label>Physical Address</Label>
              <Input
                value={formData.physical_address}
                onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Mailing Address</Label>
              <Input
                value={formData.mailing_address || ""}
                onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingContact ? "Update" : "Add"} Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

## Toast Notification Utility

```typescript
// AI NOTE: Simple toast utility using sonner - adapt to your notification system
// These functions provide consistent success/error messaging throughout the app
export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
```

## Required Dependencies

```typescript
// AI NOTE: These are the external dependencies used
// - @radix-ui/react-dialog (via shadcn/ui)
// - lucide-react (for icons)
// - sonner (for toast notifications)
// - shadcn/ui components: Button, Dialog, Table, Input, Label
```

## Integration Notes for AI Assistant

1. **State Management**: This implementation uses local state. Consider integrating with your app's state management (Redux, Zustand, Context API, etc.)

2. **Data Persistence**: Add API calls in `handleSave` and `handleDelete` to persist changes to your backend

3. **Validation**: Add form validation before saving (required fields are marked with *)

4. **Unique Keys**: Currently using `contact_name` as key - switch to proper IDs from your database

5. **Error Handling**: Add try-catch blocks around save/delete operations when connecting to API

6. **Loading States**: Add loading indicators during API operations

7. **Confirmation Dialogs**: Consider adding confirmation before delete operations

8. **Search/Filter**: Easy to add by filtering the contacts array before mapping

9. **Responsive Design**: The table might need horizontal scrolling on mobile - consider a card view for small screens

10. **Accessibility**: The modal and form inputs are already accessible via shadcn/ui components

## Styling Notes

- Uses Tailwind CSS for all styling
- Color coding for contact types (blue=Primary, green=Authorized, purple=Provider)
- Hover states on interactive elements
- Responsive grid layout in the form
- Clean table design with proper spacing

## Example Integration

```typescript
// AI NOTE: Example of how to integrate into an existing dashboard
const Dashboard = () => {
  return (
    <div className="dashboard-layout">
      {/* Your existing dashboard content */}
      
      {/* Add the contact trigger button wherever needed */}
      <ContactTrigger />
    </div>
  );
};