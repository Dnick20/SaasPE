'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBulkImportMailboxes } from '@/lib/hooks/useMailboxes';

interface BulkCSVUploadProps {
  onComplete: () => void;
}

interface ParsedAccount {
  email: string;
  firstName?: string;
  lastName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  provider?: 'GMAIL' | 'OUTLOOK' | 'SMTP';
}

export function BulkCSVUpload({ onComplete }: BulkCSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<ParsedAccount[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const bulkImport = useBulkImportMailboxes();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const csvFile = acceptedFiles[0];
      setFile(csvFile);
      parseCSV(csvFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  const parseCSV = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim());

        if (lines.length < 2) {
          setErrors(['CSV file must have at least a header row and one data row']);
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

        // Required column: email
        if (!headers.includes('email')) {
          setErrors(['CSV must contain an "email" column']);
          return;
        }

        // Parse accounts
        const parsedAccounts: ParsedAccount[] = [];
        const newErrors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim());
          const account: any = {};

          headers.forEach((header, index) => {
            account[header] = values[index];
          });

          // Validate email
          if (!account.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
            newErrors.push(`Row ${i + 1}: Invalid email address`);
            continue;
          }

          // Detect provider from email domain
          let provider: 'GMAIL' | 'OUTLOOK' | 'SMTP' = 'SMTP';
          if (account.email.endsWith('@gmail.com')) {
            provider = 'GMAIL';
          } else if (
            account.email.includes('@outlook.') ||
            account.email.includes('@hotmail.') ||
            account.email.includes('@live.')
          ) {
            provider = 'OUTLOOK';
          }

          parsedAccounts.push({
            email: account.email,
            firstName: account.firstname || account.first_name,
            lastName: account.lastname || account.last_name,
            smtpHost: account.smtp_host || account.smtphost,
            smtpPort: account.smtp_port ? parseInt(account.smtp_port) : undefined,
            smtpUsername: account.smtp_username || account.smtpusername,
            smtpPassword: account.smtp_password || account.smtppassword,
            provider,
          });
        }

        setAccounts(parsedAccounts);
        setErrors(newErrors);

        if (parsedAccounts.length === 0) {
          setErrors(['No valid accounts found in CSV file']);
        }
      } catch (error) {
        setErrors(['Failed to parse CSV file. Please check the format.']);
      }
    };

    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (accounts.length === 0) {
      toast.error('No valid accounts to upload');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      // Import mailboxes API
      const { mailboxesApi } = await import('@/lib/api/mailboxes');

      // Prepare payload
      const payload = {
        mailboxes: accounts.map(account => ({
          email: account.email,
          provider: account.provider || 'SMTP',
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
          smtpUsername: account.smtpUsername,
          smtpPassword: account.smtpPassword,
        })),
      };

      // Simulate progress (actual API call doesn't provide progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const result = await bulkImport.mutateAsync(payload);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.data.failed > 0) {
        toast.warning(
          `Imported ${result.data.imported} accounts, ${result.data.failed} failed`
        );
      } else {
        toast.success(`Successfully imported ${result.data.imported} email accounts`);
      }

      onComplete();
    } catch (error) {
      toast.error('Failed to import email accounts');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAccounts([]);
    setErrors([]);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Import Email Accounts from CSV
        </h2>
        <p className="text-gray-600 text-lg">
          Upload a CSV file to import multiple email accounts at once
        </p>
      </div>

      {/* CSV Template */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-semibold text-blue-900 mb-2">CSV Format</h3>
        <p className="text-sm text-blue-800 mb-3">
          Your CSV file should have the following columns (email is required):
        </p>
        <div className="bg-white rounded border border-blue-200 p-3 font-mono text-xs overflow-x-auto">
          <div className="text-gray-600 mb-1">email,first_name,last_name,smtp_host,smtp_port,smtp_username,smtp_password</div>
          <div className="text-gray-800">john@gmail.com,John,Doe,smtp.gmail.com,587,john@gmail.com,app_password_here</div>
        </div>
        <Button
          variant="link"
          size="sm"
          className="mt-2 p-0 h-auto text-blue-600"
          onClick={() => {
            // Download template
            const template = 'email,first_name,last_name,smtp_host,smtp_port,smtp_username,smtp_password\n';
            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'email-accounts-template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download CSV template
        </Button>
      </div>

      {/* File Upload Area */}
      {!file && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg text-blue-600 font-medium">Drop your CSV file here</p>
          ) : (
            <>
              <p className="text-lg text-gray-700 font-medium mb-2">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
              <Button type="button" variant="outline">
                Select CSV File
              </Button>
            </>
          )}
        </div>
      )}

      {/* File Preview */}
      {file && !isProcessing && (
        <div className="border border-gray-200 rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Parsing Results */}
          {accounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Found {accounts.length} valid account{accounts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Account Preview */}
              <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.slice(0, 5).map((account, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="py-2 pr-4">{account.email}</td>
                        <td className="py-2 pr-4">
                          {account.firstName} {account.lastName}
                        </td>
                        <td className="py-2">{account.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {accounts.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    ... and {accounts.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  {errors.length} error{errors.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <div className="bg-red-50 rounded p-3 max-h-32 overflow-y-auto">
                <ul className="text-sm text-red-800 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {accounts.length > 0 && (
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Choose Different File
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                className="flex-1"
                disabled={isProcessing}
              >
                Import {accounts.length} Account{accounts.length !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="border border-gray-200 rounded-lg p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="font-medium text-gray-900 mb-2">
            Importing email accounts...
          </p>
          <div className="max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {Math.round(uploadProgress)}% complete
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
