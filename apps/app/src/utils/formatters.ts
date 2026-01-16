/**
 * Shared formatting utilities
 */

import type {
  CurrencyCode,
  PaymentPeriodStatus,
  AccountStatus,
} from '@rates/firebase-client';
import type { Timestamp } from 'firebase/firestore';

/**
 * Format a number as currency based on currency code
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert Firestore Timestamp or Date to Date
 */
export function toDate(date: Date | Timestamp): Date {
  return date instanceof Date ? date : date.toDate();
}

/**
 * Format a date to a readable string
 */
export function formatDate(
  date: Date | Timestamp,
  options?: {
    month?: 'short' | 'long' | 'numeric';
    day?: 'numeric';
    year?: 'numeric';
  }
): string {
  const dateObj = toDate(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: options?.month ?? 'long',
    day: options?.day ?? 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Format a date to a short string (e.g., "Jan 2024")
 */
export function formatDateShort(date: Date | Timestamp): string {
  const dateObj = toDate(date);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get color for payment period status
 */
export function getPaymentStatusColor(status: PaymentPeriodStatus): string {
  switch (status) {
    case 'paid':
      return '#4caf50';
    case 'partial':
      return '#ff9800';
    case 'overdue':
      return '#f44336';
    case 'pending':
      return '#9e9e9e';
    default:
      return '#9e9e9e';
  }
}

/**
 * Get color for account status
 */
export function getAccountStatusColor(status: AccountStatus): string {
  switch (status) {
    case 'active':
      return '#4caf50';
    case 'paid_off':
      return '#2196f3';
    case 'closed':
      return '#757575';
    case 'defaulted':
      return '#f44336';
    case 'on_hold':
      return '#ff9800';
    default:
      return '#757575';
  }
}

/**
 * Format account status for display
 */
export function formatAccountStatus(status: AccountStatus): string {
  return status.replace('_', ' ').toUpperCase();
}
