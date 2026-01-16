/**
 * Type definitions for AccountDetail component
 */

import type React from 'react';
import type { CurrencyCode } from '@rates/firebase-client';

/**
 * Chart data point for balance reduction and payment timeline
 */
export interface ChartDataPoint {
  period: number;
  date: string;
  due: number;
  paid: number;
  capital: number;
  interest: number;
  balance: number;
  status: string;
}

/**
 * Payment history entry with formatted date
 */
export interface PaymentHistoryEntry {
  date: Date;
  dateStr: string;
  amount: number;
  currency: CurrencyCode;
  notes?: string;
}

/**
 * Cumulative payment data point
 */
export interface CumulativePaymentDataPoint {
  date: string;
  amount: number;
  cumulative: number;
}

/**
 * Interest vs Capital breakdown data
 */
export interface InterestCapitalDataPoint {
  name: 'Capital' | 'Interest';
  value: number;
  color: string;
}

/**
 * Pie chart label props
 */
export interface PieLabelProps {
  name: string;
  percent: number;
}

/**
 * Account metrics calculated from account and periods
 */
export interface AccountMetrics {
  totalPaid: number;
  totalInterestPaid: number;
  totalCapitalPaid: number;
  paidPeriods: number;
  totalPeriods: number;
  progressPercentage: number;
}

/**
 * Recharts component props type
 * Used for dynamically imported recharts components
 */
export type RechartsComponentProps = Record<string, unknown>;

/**
 * Recharts component type
 */
export type RechartsComponent = React.ComponentType<RechartsComponentProps>;

/**
 * Recharts module type containing all chart components
 */
export interface RechartsModule {
  LineChart: RechartsComponent;
  Line: RechartsComponent;
  AreaChart: RechartsComponent;
  Area: RechartsComponent;
  BarChart: RechartsComponent;
  Bar: RechartsComponent;
  XAxis: RechartsComponent;
  YAxis: RechartsComponent;
  CartesianGrid: RechartsComponent;
  Tooltip: RechartsComponent;
  Legend: RechartsComponent;
  ResponsiveContainer: RechartsComponent;
  PieChart: RechartsComponent;
  Pie: RechartsComponent;
  Cell: RechartsComponent;
}
