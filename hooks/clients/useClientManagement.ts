import { useState } from 'react';

interface Client {
  id: number;
  businessName: string;
  businessAddress: string;
  website: string;
  primaryContact: string;
  email: string;
  phone: string;
  avatar: string;
  avatarUrl?: string;
  projects?: any[];
}

interface ClientFormData {
  businessName: string;
  businessAddress: string;
  website: string;
  primaryContact: string;
  email: string;
  phone: string;
  avatarUrl: string;
}

export function useClientManagement(clients: Client[], setClients: (clients: Client[]) => void) {
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    businessName: '',
    businessAddress: '',
    website: '',
    primaryContact: '',
    email: '',
    phone: '',
    avatarUrl: ''
  });

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length === 0) return '';

    let formatted = '';
    let digits = phoneNumber;

    if (phoneNumber.length > 10) {
      const countryCode = phoneNumber.substring(0, phoneNumber.length - 10);
      digits = phoneNumber.substring(phoneNumber.length - 10);
      formatted = `+${countryCode} `;
    }

    if (digits.length <= 3) {
      formatted += `(${digits}`;
    } else if (digits.length <= 6) {
      formatted += `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      formatted += `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }

    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        businessName: client.businessName,
        businessAddress: client.businessAddress,
        website: client.website,
        primaryContact: client.primaryContact,
        email: client.email,
        phone: client.phone,
        avatarUrl: client.avatarUrl || ''
      });
      setEditingClient(clientId);
      setShowModal(true);
    }
  };

  const handleAddNew = () => {
    setFormData({
      businessName: '',
      businessAddress: '',
      website: '',
      primaryContact: '',
      email: '',
      phone: '',
      avatarUrl: ''
    });
    setEditingClient(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingClient) {
        const response = await fetch(`/api/clients/${editingClient}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to update client');

        const updatedClient = await response.json();
        setClients(clients.map(client =>
          client.id === editingClient ? updatedClient : client
        ));
      } else {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to create client');

        const newClient = await response.json();
        setClients([...clients, newClient]);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleDelete = async () => {
    if (!editingClient) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/clients/${editingClient}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      setClients(clients.filter(client => client.id !== editingClient));
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  return {
    showModal,
    setShowModal,
    editingClient,
    formData,
    setFormData,
    handlePhoneChange,
    handleImageUpload,
    handleEdit,
    handleAddNew,
    handleSave,
    handleDelete
  };
}
