import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function useOutlookIntegration() {
  const searchParams = useSearchParams();
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState<string | null>(null);
  const [outlookLoading, setOutlookLoading] = useState(false);

  useEffect(() => {
    fetchOutlookStatus();
  }, []);

  useEffect(() => {
    // Check for OAuth callback status
    const connected = searchParams.get('outlook_connected');
    const error = searchParams.get('outlook_error');

    if (connected === 'true') {
      alert('Successfully connected to Outlook Calendar!');
      fetchOutlookStatus();
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
    } else if (error) {
      alert(`Failed to connect to Outlook: ${error}`);
      // Clear URL params
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  const fetchOutlookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status');
      if (response.ok) {
        const data = await response.json();
        setOutlookConnected(data.connected);
        setOutlookEmail(data.email);
      }
    } catch (error) {
      console.error('Error fetching Outlook status:', error);
    }
  };

  const handleConnectOutlook = async () => {
    window.location.href = '/api/outlook/connect';
  };

  const handleDisconnectOutlook = async () => {
    if (!confirm('Are you sure you want to disconnect your Outlook calendar?')) {
      return;
    }

    setOutlookLoading(true);
    try {
      const response = await fetch('/api/outlook/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setOutlookConnected(false);
        setOutlookEmail(null);
        alert('Successfully disconnected from Outlook Calendar');
      } else {
        alert('Failed to disconnect from Outlook');
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
      alert('An error occurred while disconnecting');
    } finally {
      setOutlookLoading(false);
    }
  };

  return {
    outlookConnected,
    outlookEmail,
    outlookLoading,
    handleConnectOutlook,
    handleDisconnectOutlook
  };
}
