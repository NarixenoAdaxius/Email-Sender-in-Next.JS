"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, Mail, Users, Clock, BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Stats {
  totalEmailsSent: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  emailsPerTemplate: { templateName: string; count: number }[];
  deliveryStatus: { status: string; count: number }[];
  emailsOverTime: { date: string; count: number }[];
}

// Define the types for PieChart label
interface PieChartLabelProps {
  name: string;
  percent: number;
}

// Define type for tooltip formatter
type TooltipFormatterType = (value: number) => [number, string];

const COLORS = ['#4a6cf7', '#6983fa', '#8aa0fc', '#aabcfd', '#cad8ff'];
const STATUS_COLORS = {
  delivered: '#10b981',
  opened: '#4a6cf7',
  clicked: '#8b5cf6',
  bounced: '#f43f5e',
  failed: '#ef4444',
  pending: '#f59e0b',
};

const EmailStatistics: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalEmailsSent: 0,
    totalRecipients: 0,
    averageOpenRate: 0,
    averageClickRate: 0,
    emailsPerTemplate: [],
    deliveryStatus: [],
    emailsOverTime: [],
  });
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/email-statistics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      setStats(data.stats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Error loading statistics',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Email Activity</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '7days' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '30days' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === '90days' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeRange === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Emails Sent</p>
              <h3 className="text-2xl font-bold">{stats.totalEmailsSent.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-md">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Recipients</p>
              <h3 className="text-2xl font-bold">{stats.totalRecipients.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-green-100 rounded-md">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Average Open Rate</p>
              <h3 className="text-2xl font-bold">{formatPercentage(stats.averageOpenRate)}</h3>
            </div>
            <div className="p-2 bg-purple-100 rounded-md">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Average Click Rate</p>
              <h3 className="text-2xl font-bold">{formatPercentage(stats.averageClickRate)}</h3>
            </div>
            <div className="p-2 bg-indigo-100 rounded-md">
              <Clock className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emails Over Time Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Emails Sent Over Time</h3>
            <BarChartIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                width={500}
                height={300}
                data={stats.emailsOverTime}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 25,
                }}
              >
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#4a6cf7" name="Emails" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Delivery Status Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Email Delivery Status</h3>
            <PieChartIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart width={300} height={300}>
                <Pie
                  data={stats.deliveryStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, percent }: PieChartLabelProps) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  nameKey="status"
                >
                  {stats.deliveryStatus.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip formatter={(value: number): [number, string] => [value, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Emails Per Template Chart */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Emails Sent by Template</h3>
          <BarChartIcon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              width={500}
              height={300}
              data={stats.emailsPerTemplate}
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <XAxis type="number" />
              <YAxis type="category" dataKey="templateName" width={150} tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              <Bar dataKey="count" fill="#4a6cf7" name="Emails Sent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Email History Table - Simplified Version */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Recent Email History</h3>
          <button className="text-sm text-primary hover:underline">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Click Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* We'll use dummy data here as this would typically come from a separate API endpoint */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2023-04-15
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Welcome Email
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  24
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Delivered
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  75%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  45%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2023-04-10
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Monthly Newsletter
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  156
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Delivered
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  68%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  32%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2023-04-05
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Promotional Offer
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  87
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Delivered
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  82%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  57%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmailStatistics; 