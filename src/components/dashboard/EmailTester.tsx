"use client";

import { useState } from 'react';
import { toast } from 'react-toastify';

export default function EmailTester() {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<any>(null);

  const handleCheckEnv = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/debug/env');
      
      if (!response.ok) {
        throw new Error(`Failed to check environment: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEnvInfo(data);
      
      if (!data.isSmtpConfigured) {
        setError('SMTP is not fully configured. Please check your environment variables.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to check environment');
      toast.error(error.message || 'Failed to check environment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      // First check environment
      await handleCheckEnv();
      
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
        }),
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast.success('Test email sent successfully!');
      } else {
        const errorMessage = data.error || response.statusText || 'Unknown error';
        toast.error(`Failed to send test email: ${errorMessage}`);
        setError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send test email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Email Diagnostic Tool</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Test Email Address
        </label>
        <div className="flex space-x-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2"
            placeholder="Enter your email for testing"
          />
          <button
            onClick={handleTestEmail}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Test Email'}
          </button>
          <button
            onClick={handleCheckEnv}
            disabled={isLoading}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Check Env
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded text-red-700">
          <h3 className="font-semibold mb-1">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {envInfo && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded">
          <h3 className="font-semibold mb-2">Environment Info:</h3>
          <div className="text-sm">
            <p className="mb-2">
              <span className="font-semibold">SMTP Status:</span> 
              <span className={envInfo.isSmtpConfigured ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                {envInfo.isSmtpConfigured ? "Configured" : "Not Configured"}
              </span>
            </p>
          </div>
          <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
            {JSON.stringify(envInfo, null, 2)}
          </pre>
        </div>
      )}

      {result && (
        <div className="p-4 bg-gray-50 border border-gray-300 rounded">
          <h3 className="font-semibold mb-2">Result:</h3>
          <div className="text-sm mb-2">
            <p className={result.success ? "text-green-600" : "text-red-600"}>
              {result.message}
            </p>
          </div>
          <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Note:</strong> This tool sends a test email using your configured SMTP settings.</p>
        <p>Make sure your .env or .env.local file has the proper SMTP configuration:</p>
        <ul className="list-disc pl-5 mt-1">
          <li>SMTP_HOST (e.g., smtp.gmail.com)</li>
          <li>SMTP_PORT (e.g., 587)</li>
          <li>SMTP_USER (your email address)</li>
          <li>SMTP_PASSWORD (your email password or app password)</li>
        </ul>
      </div>
    </div>
  );
} 