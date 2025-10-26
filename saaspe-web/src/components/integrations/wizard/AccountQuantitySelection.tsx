'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, FileSpreadsheet } from 'lucide-react';

export type AccountQuantity = 'single' | 'bulk';

interface AccountQuantitySelectionProps {
  onSelect: (quantity: AccountQuantity) => void;
  onBack?: () => void;
}

export function AccountQuantitySelection({ onSelect, onBack }: AccountQuantitySelectionProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">How many accounts do you want to add?</CardTitle>
          <CardDescription>
            Choose whether to connect a single email account or upload multiple accounts at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Single Account Option */}
            <button
              onClick={() => onSelect('single')}
              className="group relative flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="mb-4 p-4 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Add Single Account</h3>
              <p className="text-sm text-gray-600 text-center">
                Connect one email account by entering your credentials manually
              </p>
            </button>

            {/* Bulk Upload Option */}
            <button
              onClick={() => onSelect('bulk')}
              className="group relative flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <div className="mb-4 p-4 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Multiple Accounts</h3>
              <p className="text-sm text-gray-600 text-center">
                Bulk import multiple email accounts via CSV file
              </p>
              <span className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Recommended for agencies
              </span>
            </button>
          </div>

          {/* Back Button */}
          {onBack && (
            <div className="flex justify-start pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
              >
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
