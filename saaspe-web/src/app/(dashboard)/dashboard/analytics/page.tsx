'use client';


export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, DollarSign, Users, FileText, Mail, Loader2, Download, Target, Award, Clock } from 'lucide-react';
import { useAnalyticsMetrics, useAiCosts, useProposalWinRate, useProposalPipeline, useTimeToClose } from '@/lib/hooks/useAnalytics';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date().toISOString();
    const startDate = new Date();

    switch (dateRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        return { startDate: undefined, endDate: undefined };
    }

    return { startDate: startDate.toISOString(), endDate };
  };

  const { startDate, endDate } = getDateRange();
  const { data: metrics, isLoading, error } = useAnalyticsMetrics(startDate, endDate);
  const { data: aiCosts, isLoading: _costsLoading } = useAiCosts(startDate, endDate);
  const { data: winRate, isLoading: winRateLoading } = useProposalWinRate(startDate, endDate);
  const { data: pipeline, isLoading: pipelineLoading } = useProposalPipeline();
  const { data: timeToClose, isLoading: timeToCloseLoading } = useTimeToClose();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error loading analytics data</p>
      </div>
    );
  }

  // Prepare chart data
  const timeSeriesData = metrics.timeSeriesData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clients: item.clients,
    proposals: item.proposals,
    campaigns: item.campaigns,
  }));

  const aiCostBreakdown = aiCosts?.breakdown || metrics.aiCostsBreakdown;
  const pieData = [
    { name: 'Proposals', value: aiCostBreakdown.proposals },
    { name: 'Transcriptions', value: aiCostBreakdown.transcriptions },
    { name: 'Key Moments', value: aiCostBreakdown.keyMoments },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">
            Track your agency performance and AI costs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={dateRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('7d')}
          >
            7 days
          </Button>
          <Button
            variant={dateRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('30d')}
          >
            30 days
          </Button>
          <Button
            variant={dateRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('90d')}
          >
            90 days
          </Button>
          <Button
            variant={dateRange === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('all')}
          >
            All time
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Proposals</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProposals}</div>
            <p className="text-xs text-gray-500 mt-1">Generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCampaigns}</div>
            <p className="text-xs text-gray-500 mt-1">Sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">Average</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <defs>
                <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProposals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCampaigns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="clients"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorClients)"
                name="Clients"
              />
              <Area
                type="monotone"
                dataKey="proposals"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorProposals)"
                name="Proposals"
              />
              <Area
                type="monotone"
                dataKey="campaigns"
                stroke="#F59E0B"
                fillOpacity={1}
                fill="url(#colorCampaigns)"
                name="Campaigns"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win Rate Analytics Section */}
      {!winRateLoading && winRate && (
        <>
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Proposal Performance</h2>
          </div>

          {/* Win Rate Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{winRate.rates.winRate}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {winRate.overview.totalWon} of {winRate.overview.totalSent} proposals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Sign Rate</CardTitle>
                <Award className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{winRate.rates.signRate}%</div>
                <p className="text-xs text-gray-500 mt-1">
                  {winRate.overview.totalSigned} signed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{winRate.overview.pending}</div>
                <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
              </CardContent>
            </Card>

            {!timeToCloseLoading && timeToClose && timeToClose.totalClosed > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg. Time to Close</CardTitle>
                  <Clock className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{timeToClose.averageDaysToClose} days</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Median: {timeToClose.medianDaysToClose} days
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Win Rate Time Series & Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate Over Time */}
            {winRate.timeSeries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Win Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={winRate.timeSeries}>
                      <defs>
                        <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip
                        formatter={(value: any) => {
                          if (typeof value === 'number') return `${value.toFixed(1)}%`;
                          if (typeof value === 'string') return `${value}%`;
                          return String(value);
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="winRate"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#colorWinRate)"
                        name="Win Rate (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Proposal Pipeline Funnel */}
            {!pipelineLoading && pipeline && (
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pipeline.stages.map((stage, index) => (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium text-gray-700">{stage.stage}</span>
                          <span className="text-gray-600">
                            {stage.count} ({stage.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${stage.percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Total Proposals: <span className="font-bold">{pipeline.total}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* AI Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              AI Cost Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Total AI Costs</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(metrics.totalAiCosts)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700">Proposals</span>
                  </div>
                  <span className="font-medium">{formatCurrency(aiCostBreakdown.proposals)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-700">Transcriptions</span>
                  </div>
                  <span className="font-medium">{formatCurrency(aiCostBreakdown.transcriptions)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-700">Key Moments</span>
                  </div>
                  <span className="font-medium">{formatCurrency(aiCostBreakdown.keyMoments)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Average cost per proposal: {formatCurrency(metrics.totalProposals > 0 ? aiCostBreakdown.proposals / metrics.totalProposals : 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Cost Breakdown Pie Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cost Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) =>
                      `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Download your analytics data for further analysis
          </p>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
