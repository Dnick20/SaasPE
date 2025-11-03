'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Zap, Users, TrendingUp } from 'lucide-react';

interface UpgradeInterstitialModalProps {
  onClose: (action: 'upgrade' | 'later') => void;
}

export function UpgradeInterstitialModal({ onClose }: UpgradeInterstitialModalProps) {
  return (
    <Dialog open={true} onOpenChange={() => onClose('later')}>
      <DialogContent className="max-w-4xl">
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Unlock the Full Power of SaasPE
            </h2>
            <p className="text-gray-600 text-lg">
              Upgrade to Professional or higher for advanced email features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
            {/* Professional Plan */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Professional</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">$300</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Up to 10 email accounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Email warmup included</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Bulk CSV import</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">125,000 tokens/month</span>
                </li>
              </ul>
            </div>

            {/* Advanced Plan */}
            <div className="border-2 border-blue-500 rounded-xl p-6 relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  POPULAR
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Advanced</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">$1,200</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Up to 50 email accounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Advanced warmup controls</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Bulk CSV import</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">500,000 tokens/month</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">$3,000</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Unlimited email accounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">White-glove warmup service</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Bulk CSV import</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">2,000,000 tokens/month</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onClose('later')}
              className="px-8"
            >
              Maybe later
            </Button>
            <Button
              size="lg"
              onClick={() => onClose('upgrade')}
              className="px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              View Plans & Upgrade
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            You can continue with the free tier, but some features like bulk CSV import will be limited
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
