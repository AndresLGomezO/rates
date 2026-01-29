/**
 * Bill Calculation Utilities
 *
 * Helper functions for bill-related calculations including
 * due date generation for recurring bills.
 */

import type { BillAccount } from './financial-accounts.js';
import type { Timestamp } from 'firebase/firestore';

/**
 * Generate the next N due dates for a recurring bill
 *
 * @param bill - BillAccount with isRecurring = true
 * @param count - Number of future occurrences to generate
 * @returns Array of future due dates (excluding past dates)
 */
export function generateBillDueDates(
  bill: BillAccount,
  count: number
): (Timestamp | Date)[] {
  if (!bill.isRecurring || !bill.paymentFrequency) {
    return [];
  }

  const dueDates: Date[] = [];
  const startDate =
    bill.nextDueDate instanceof Date
      ? new Date(bill.nextDueDate)
      : bill.nextDueDate.toDate();

  const currentDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    dueDates.push(new Date(currentDate));

    // Increment date based on frequency
    switch (bill.paymentFrequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'quarterly':
        currentDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'semi_annually':
        currentDate.setMonth(currentDate.getMonth() + 6);
        break;
      case 'annually':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }

    // Stop if we've reached the end date
    if (bill.endDate) {
      const endDate =
        bill.endDate instanceof Date ? bill.endDate : bill.endDate.toDate();
      if (currentDate > endDate) {
        break;
      }
    }
  }

  return dueDates;
}
