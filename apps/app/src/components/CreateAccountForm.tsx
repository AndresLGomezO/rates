import { useState, useEffect, type FormEvent } from 'react';
import type {
  AccountType,
  AccountStatus,
  CreateFinancialAccountInput,
  FinancialAccount,
  PaymentFrequency,
} from '@rates/firebase-client';
import {
  isInstallmentLoan,
  isRevolvingCredit,
  isBill,
} from '@rates/firebase-client';
import { Select } from './Select';

interface CreateAccountFormProps {
  accountType: AccountType;
  onSubmit: (
    account: Omit<CreateFinancialAccountInput, 'userId'>
  ) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: FinancialAccount;
  mode?: 'create' | 'edit';
}

const ACCOUNT_STATUSES: AccountStatus[] = [
  'active',
  'paid_off',
  'closed',
  'defaulted',
  'on_hold',
];

const FREQUENCIES: PaymentFrequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semi_annually',
  'annually',
];

export function CreateAccountForm({
  accountType,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
  mode = 'create',
}: CreateAccountFormProps) {
  const formatDateForInput = (
    date: Date | { toDate: () => Date } | undefined
  ): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    return d.toISOString().split('T')[0];
  };

  // Helper to safely get field values from discriminated union
  const getInitialValue = () => {
    if (!initialData) {
      return {
        accountNumber: '',
        accountName: '',
        accountDescription: '',
        status: 'active' as AccountStatus,
        totalAmountRemaining: '',
        paymentAmount: '',
        paymentFrequency: 'monthly' as PaymentFrequency,
        rate: '',
        nextDueDate: '',
        currency: 'COP' as 'COP' | 'USD',
        originalAmount: '',
        startDate: '',
        numberOfPayments: '',
      };
    }

    // Extract type-specific fields based on account type
    let totalAmountRemaining = '';
    let paymentAmount = '';
    let rate = '';
    let nextDueDate = '';
    let currency: 'COP' | 'USD' = 'COP';
    let originalAmount = '';
    let startDate = '';
    let numberOfPayments = '';
    let paymentFrequency: PaymentFrequency = 'monthly';

    if (isInstallmentLoan(initialData)) {
      totalAmountRemaining =
        initialData.currentPrincipal?.amount.toString() ?? '';
      paymentAmount = initialData.scheduledPayment?.amount.toString() ?? '';
      rate = initialData.annualInterestRate?.toString() ?? '';
      nextDueDate = formatDateForInput(initialData.nextDueDate);
      currency = (initialData.currentPrincipal?.currency ??
        initialData.currency) as 'COP' | 'USD';
      originalAmount = initialData.originalPrincipal?.amount.toString() ?? '';
      startDate = formatDateForInput(initialData.contractStartDate);
      numberOfPayments = initialData.termInPayments?.toString() ?? '';
      paymentFrequency = initialData.paymentFrequency ?? 'monthly';
    } else if (isRevolvingCredit(initialData)) {
      totalAmountRemaining = initialData.currentBalance.amount.toString();
      paymentAmount =
        initialData.userPlannedPayment?.amount.toString() ??
        initialData.currentMinimumPayment?.amount.toString() ??
        '';
      rate = initialData.purchaseApr?.toString() ?? '';
      nextDueDate = formatDateForInput(initialData.nextDueDate);
      currency = initialData.currentBalance.currency as 'COP' | 'USD';
    } else if (isBill(initialData)) {
      paymentAmount = initialData.recurringAmount?.amount.toString() ?? '';
      nextDueDate = formatDateForInput(initialData.nextDueDate);
      currency = (initialData.recurringAmount?.currency ??
        initialData.currency) as 'COP' | 'USD';
      paymentFrequency = initialData.paymentFrequency ?? 'monthly';
    }

    return {
      accountNumber: initialData.accountNumber ?? '',
      accountName: initialData.accountName,
      accountDescription: initialData.accountDescription ?? '',
      status: initialData.status,
      totalAmountRemaining,
      paymentAmount,
      paymentFrequency,
      rate,
      nextDueDate,
      currency,
      originalAmount,
      startDate,
      numberOfPayments,
    };
  };

  const [formData, setFormData] = useState(getInitialValue());

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData(getInitialValue());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, mode]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }

    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }

    if (!formData.accountDescription.trim()) {
      newErrors.accountDescription = 'Account description is required';
    }

    if (
      !formData.totalAmountRemaining ||
      parseFloat(formData.totalAmountRemaining) <= 0
    ) {
      newErrors.totalAmountRemaining =
        'Valid total amount remaining is required';
    }

    if (!formData.paymentAmount || parseFloat(formData.paymentAmount) <= 0) {
      newErrors.paymentAmount = 'Valid payment amount is required';
    }

    if (!formData.paymentFrequency) {
      newErrors.paymentFrequency = 'Payment frequency is required';
    }

    if (
      !formData.rate ||
      parseFloat(formData.rate) < 0 ||
      parseFloat(formData.rate) > 100
    ) {
      newErrors.rate = 'Valid interest rate (0-100%) is required';
    }

    if (!formData.nextDueDate) {
      newErrors.nextDueDate = 'Next due date is required';
    }

    // Validate numberOfPayments
    // For bills: optional (can be empty for periodic bills)
    // For loans and other account types: required
    if (accountType === 'bill') {
      // For bills, numberOfPayments is optional
      // If provided, it must be valid
      if (formData.numberOfPayments) {
        const numPayments = parseInt(formData.numberOfPayments);
        if (isNaN(numPayments) || numPayments <= 0) {
          newErrors.numberOfPayments =
            'Number of payments must be greater than 0';
        }
      }
    } else {
      // For loans and other account types, numberOfPayments is required
      if (
        !formData.numberOfPayments ||
        parseInt(formData.numberOfPayments) <= 0
      ) {
        newErrors.numberOfPayments =
          'Number of payments is required (must be greater than 0)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate() || isSubmitting) {
      return;
    }

    // Build type-specific payload
    const basePayload = {
      accountNumber: formData.accountNumber.trim(),
      accountName: formData.accountName.trim(),
      accountDescription: formData.accountDescription.trim(),
      status: formData.status,
      currency: formData.currency,
      paymentLog: [],
    };

    let account: Omit<CreateFinancialAccountInput, 'userId'>;

    switch (accountType) {
      case 'installment_loan':
        account = {
          ...basePayload,
          accountType: 'installment_loan' as const,
          loanSubtype: 'personal_loan' as const,
          annualInterestRate: parseFloat(formData.rate),
          paymentFrequency: formData.paymentFrequency,
          currentPrincipal: {
            amount: parseFloat(formData.totalAmountRemaining),
            currency: formData.currency,
          },
          scheduledPayment: formData.paymentAmount
            ? {
                amount: parseFloat(formData.paymentAmount),
                currency: formData.currency,
              }
            : undefined,
          originalPrincipal: formData.originalAmount
            ? {
                amount: parseFloat(formData.originalAmount),
                currency: formData.currency,
              }
            : undefined,
          contractStartDate: formData.startDate
            ? new Date(formData.startDate)
            : new Date(),
          termInPayments: formData.numberOfPayments
            ? parseInt(formData.numberOfPayments, 10)
            : undefined,
          nextDueDate: formData.nextDueDate
            ? new Date(formData.nextDueDate)
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
        break;

      case 'revolving_credit':
        account = {
          ...basePayload,
          accountType: 'revolving_credit' as const,
          creditSubtype: 'credit_card' as const,
          currentBalance: {
            amount: parseFloat(formData.totalAmountRemaining),
            currency: formData.currency,
          },
          purchaseApr: parseFloat(formData.rate),
          userPlannedPayment: formData.paymentAmount
            ? {
                amount: parseFloat(formData.paymentAmount),
                currency: formData.currency,
              }
            : undefined,
          nextDueDate: formData.nextDueDate
            ? new Date(formData.nextDueDate)
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
        break;

      case 'bill':
        account = {
          ...basePayload,
          accountType: 'bill' as const,
          billSubtype: 'utility' as const,
          isRecurring: true,
          isAmountVariable: false,
          nextDueDate: new Date(formData.nextDueDate),
          recurringAmount: formData.paymentAmount
            ? {
                amount: parseFloat(formData.paymentAmount),
                currency: formData.currency,
              }
            : undefined,
          paymentFrequency: formData.paymentFrequency,
          endDate: formData.numberOfPayments
            ? (() => {
                const start = new Date(formData.nextDueDate);
                const months = parseInt(formData.numberOfPayments, 10);
                const end = new Date(start);
                end.setMonth(end.getMonth() + months);
                return end;
              })()
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
        break;

      case 'other':
        account = {
          ...basePayload,
          accountType: 'other' as const,
          nextRelevantDate: formData.nextDueDate
            ? new Date(formData.nextDueDate)
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
        break;

      default: {
        const _exhaustive: never = accountType;
        throw new Error(`Unknown account type: ${_exhaustive}`);
      }
    }

    void onSubmit(account);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Set default next due date to 30 days from now
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="accountNumber"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Account Number <span className="text-danger-500">*</span>
          </label>
          <input
            id="accountNumber"
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
              errors.accountNumber
                ? 'border-danger-500 bg-danger-500/10'
                : 'border-white/20'
            }`}
            placeholder="e.g., ACC-0001"
            disabled={mode === 'edit'}
          />
          {errors.accountNumber && (
            <span className="mt-1 text-sm font-medium text-danger-500">
              {errors.accountNumber}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="status"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Status <span className="text-danger-500">*</span>
          </label>
          <Select
            id="status"
            value={formData.status}
            onChange={(v) => handleChange('status', v as AccountStatus)}
            options={ACCOUNT_STATUSES.map((s) => ({
              value: s,
              label: s.replace('_', ' ').toUpperCase(),
            }))}
            disabled={isSubmitting}
            aria-label="Account status"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="accountName"
          className="text-sm font-semibold uppercase tracking-wide text-white/90"
        >
          Account Name <span className="text-danger-500">*</span>
        </label>
        <input
          id="accountName"
          type="text"
          value={formData.accountName}
          onChange={(e) => handleChange('accountName', e.target.value)}
          className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
            errors.accountName
              ? 'border-danger-500 bg-danger-500/10'
              : 'border-white/20'
          }`}
          placeholder="e.g., Personal Loan - Bank ABC"
        />
        {errors.accountName && (
          <span className="mt-1 text-sm font-medium text-danger-500">
            {errors.accountName}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="accountDescription"
          className="text-sm font-semibold uppercase tracking-wide text-white/90"
        >
          Description <span className="text-danger-500">*</span>
        </label>
        <textarea
          id="accountDescription"
          value={formData.accountDescription}
          onChange={(e) => handleChange('accountDescription', e.target.value)}
          className={`font-inherit min-h-[80px] resize-y rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
            errors.accountDescription
              ? 'border-danger-500 bg-danger-500/10'
              : 'border-white/20'
          }`}
          placeholder="e.g., Personal loan for home improvement"
          rows={3}
        />
        {errors.accountDescription && (
          <span className="mt-1 text-sm font-medium text-danger-500">
            {errors.accountDescription}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="currency"
          className="text-sm font-semibold uppercase tracking-wide text-white/90"
        >
          Currency <span className="text-danger-500">*</span>
        </label>
        <Select
          id="currency"
          value={formData.currency}
          onChange={(v) => handleChange('currency', v)}
          options={[
            { value: 'COP', label: 'COP (Colombian Peso)' },
            { value: 'USD', label: 'USD (US Dollar)' },
          ]}
          disabled={isSubmitting}
          aria-label="Currency"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="totalAmountRemaining"
          className="text-sm font-semibold uppercase tracking-wide text-white/90"
        >
          Total Amount Remaining <span className="text-danger-500">*</span>
        </label>
        <input
          id="totalAmountRemaining"
          type="number"
          step="0.01"
          min="0"
          value={formData.totalAmountRemaining}
          onChange={(e) => handleChange('totalAmountRemaining', e.target.value)}
          className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
            errors.totalAmountRemaining
              ? 'border-danger-500 bg-danger-500/10'
              : 'border-white/20'
          }`}
          placeholder="0.00"
        />
        {errors.totalAmountRemaining && (
          <span className="mt-1 text-sm font-medium text-danger-500">
            {errors.totalAmountRemaining}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="paymentAmount"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Payment Amount <span className="text-danger-500">*</span>
          </label>
          <input
            id="paymentAmount"
            type="number"
            step="0.01"
            min="0"
            value={formData.paymentAmount}
            onChange={(e) => handleChange('paymentAmount', e.target.value)}
            className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
              errors.paymentAmount
                ? 'border-danger-500 bg-danger-500/10'
                : 'border-white/20'
            }`}
            placeholder="0.00"
          />
          {errors.paymentAmount && (
            <span className="mt-1 text-sm font-medium text-danger-500">
              {errors.paymentAmount}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="paymentFrequency"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Frequency <span className="text-danger-500">*</span>
          </label>
          <Select
            id="paymentFrequency"
            value={formData.paymentFrequency}
            onChange={(v) => handleChange('paymentFrequency', v)}
            options={FREQUENCIES.map((f) => ({
              value: f,
              label: f
                .replace('_', ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase()),
            }))}
            disabled={isSubmitting}
            aria-label="Payment Frequency"
          />
          {errors.paymentFrequency && (
            <span className="mt-1 text-sm font-medium text-danger-500">
              {errors.paymentFrequency}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="rate"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Interest Rate (%) <span className="text-danger-500">*</span>
          </label>
          <input
            id="rate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
              errors.rate
                ? 'border-danger-500 bg-danger-500/10'
                : 'border-white/20'
            }`}
            placeholder="0.0"
          />
          {errors.rate && (
            <span className="mt-1 text-sm font-medium text-danger-500">
              {errors.rate}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="nextDueDate"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Next Due Date <span className="text-danger-500">*</span>
          </label>
          <input
            id="nextDueDate"
            type="date"
            value={formData.nextDueDate || getDefaultDueDate()}
            onChange={(e) => handleChange('nextDueDate', e.target.value)}
            className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
              errors.nextDueDate
                ? 'border-danger-500 bg-danger-500/10'
                : 'border-white/20'
            }`}
            min={new Date().toISOString().split('T')[0]}
          />
          {errors.nextDueDate && (
            <span className="mt-1 text-sm font-medium text-danger-500">
              {errors.nextDueDate}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="originalAmount"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Original Amount (Optional)
          </label>
          <input
            id="originalAmount"
            type="number"
            step="0.01"
            min="0"
            value={formData.originalAmount}
            onChange={(e) => handleChange('originalAmount', e.target.value)}
            className="font-inherit rounded-lg border border-white/20 bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none"
            placeholder="0.00"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="startDate"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Start Date (Optional)
          </label>
          <input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="font-inherit rounded-lg border border-white/20 bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="numberOfPayments"
            className="text-sm font-semibold uppercase tracking-wide text-white/90"
          >
            Number of Payments
            {accountType !== 'bill' && (
              <span className="text-danger-500">*</span>
            )}
            {accountType === 'bill' && (
              <span className="ml-2 text-sm font-normal text-white/60">
                (Optional for periodic bills)
              </span>
            )}
          </label>
          <input
            id="numberOfPayments"
            type="number"
            step="1"
            min="1"
            value={formData.numberOfPayments}
            onChange={(e) => handleChange('numberOfPayments', e.target.value)}
            className={`font-inherit rounded-lg border bg-white/10 px-4 py-3.5 text-base text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1)] focus:outline-none ${
              errors.numberOfPayments
                ? 'border-danger-500 bg-danger-500/10'
                : 'border-white/20'
            }`}
            placeholder={
              accountType === 'bill'
                ? 'Leave empty for periodic bills'
                : 'e.g., 12'
            }
          />
          {errors.numberOfPayments && (
            <span className="mt-1 text-sm font-medium text-danger-500">
              {errors.numberOfPayments}
            </span>
          )}
          {accountType === 'bill' && (
            <small className="mt-1 block text-sm text-white/60">
              Leave empty if this is a periodic bill (will generate periods
              automatically)
            </small>
          )}
        </div>
        <div className="invisible flex flex-col gap-2">
          {/* Empty div to maintain form-row layout */}
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse justify-end gap-4 border-t border-white/10 pt-6 md:flex-row">
        <button
          type="button"
          className="w-full cursor-pointer rounded-lg border border-none border-white/20 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ds-button-gradient w-full border-none px-8 py-3.5 text-base md:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? mode === 'edit'
              ? 'Updating...'
              : 'Creating...'
            : mode === 'edit'
              ? 'Update Account'
              : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
