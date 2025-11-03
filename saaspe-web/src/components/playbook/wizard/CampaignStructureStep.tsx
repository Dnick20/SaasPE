'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

interface CampaignStructureStepProps {
  data: {
    campaignCount: number;
    structure: {
      phases?: string[];
      touchpoints?: number;
      cadence?: string;
    };
    campaignStrategy: {
      channels?: string[];
      touchpoints?: number;
      cadence?: Record<string, number>;
    };
  };
  onChange: (data: any) => void;
}

export function CampaignStructureStep({ data, onChange }: CampaignStructureStepProps) {
  const channelOptions = ['Email', 'LinkedIn', 'Phone', 'SMS'];

  const toggleChannel = (channel: string) => {
    const channels = data.campaignStrategy?.channels || [];
    if (channels.includes(channel)) {
      onChange({
        ...data,
        campaignStrategy: {
          ...data.campaignStrategy,
          channels: channels.filter((c) => c !== channel),
        },
      });
    } else {
      onChange({
        ...data,
        campaignStrategy: {
          ...data.campaignStrategy,
          channels: [...channels, channel],
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Campaign Structure</h2>
        <p className="text-gray-500 mt-1">
          Define how your outreach campaigns will be structured
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label htmlFor="campaignCount" className="text-base font-semibold">
              Number of Campaigns
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              How many campaigns do you want to create with this playbook?
            </p>
            <Input
              id="campaignCount"
              type="number"
              min="1"
              value={data.campaignCount}
              onChange={(e) =>
                onChange({ ...data, campaignCount: parseInt(e.target.value) || 1 })
              }
              className="max-w-xs"
            />
          </div>

          <div>
            <Label className="text-base font-semibold">Communication Channels</Label>
            <p className="text-sm text-gray-500 mb-3">Select the channels you'll use</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {channelOptions.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  className={`
                    px-4 py-3 rounded-md border-2 text-sm font-medium transition-all
                    ${
                      data.campaignStrategy?.channels?.includes(channel)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="touchpoints" className="text-base font-semibold">
              Total Touchpoints
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              How many times will you reach out to each prospect?
            </p>
            <div className="space-y-3">
              <Slider
                id="touchpoints"
                min={1}
                max={15}
                step={1}
                value={[data.structure?.touchpoints || 7]}
                onValueChange={(value) =>
                  onChange({
                    ...data,
                    structure: {
                      ...data.structure,
                      touchpoints: value[0],
                    },
                    campaignStrategy: {
                      ...data.campaignStrategy,
                      touchpoints: value[0],
                    },
                  })
                }
                className="max-w-md"
              />
              <div className="text-2xl font-bold text-blue-600">
                {data.structure?.touchpoints || 7} touchpoints
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="cadence" className="text-base font-semibold">
              Campaign Cadence
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              Describe the timing and sequence of your outreach
            </p>
            <Input
              id="cadence"
              value={data.structure?.cadence || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  structure: {
                    ...data.structure,
                    cadence: e.target.value,
                  },
                })
              }
              placeholder="e.g., Day 1, Day 3, Day 7, Day 14..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Campaign Summary</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• {data.campaignCount} campaign(s) will be created</li>
              <li>
                • Using {data.campaignStrategy?.channels?.length || 0} channel(s):{' '}
                {data.campaignStrategy?.channels?.join(', ') || 'None selected'}
              </li>
              <li>• {data.structure?.touchpoints || 7} touchpoints per prospect</li>
              {data.structure?.cadence && <li>• Cadence: {data.structure.cadence}</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
