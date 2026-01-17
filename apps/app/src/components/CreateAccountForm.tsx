import { useState, useEffect, type FormEvent } from 'react';
import type {
  AccountType,
  AccountStatus,
  CreateFinancialAccountInput,
  FinancialAccount,
} from '@rates/firebase-client';
import './CreateAccountForm.css';

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

  const [formData, setFormData] = useState({
    accountNumber: initialData?.accountNumber ?? '',
    accountName: initialData?.accountName ?? '',
    accountDescription: initialData?.accountDescription ?? '',
    status: initialData?.status ?? 'active',
    totalAmountRemaining:
      initialData?.totalAmountRemaining.amount.toString() ?? '',
    monthlyPayment: initialData?.monthlyPayment.amount.toString() ?? '',
    rate: initialData?.rate.toString() ?? '',
    nextDueDate: formatDateForInput(initialData?.nextDueDate) ?? '',
    currency: (initialData?.totalAmountRemaining.currency ?? 'COP') as
      | 'COP'
      | 'USD',
    originalAmount: initialData?.originalAmount?.amount.toString() ?? '',
    startDate: formatDateForInput(initialData?.startDate) ?? '',
    numberOfPayments: initialData?.numberOfPayments?.toString() ?? '',
  });

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        accountNumber: initialData.accountNumber,
        accountName: initialData.accountName,
        accountDescription: initialData.accountDescription,
        status: initialData.status,
        totalAmountRemaining:
          initialData.totalAmountRemaining.amount.toString(),
        monthlyPayment: initialData.monthlyPayment.amount.toString(),
        rate: initialData.rate.toString(),
        nextDueDate: formatDateForInput(initialData.nextDueDate),
        currency: initialData.totalAmountRemaining.currency as 'COP' | 'USD',
        originalAmount: initialData.originalAmount?.amount.toString() ?? '',
        startDate: formatDateForInput(initialData.startDate),
        numberOfPayments: initialData.numberOfPayments?.toString() ?? '',
      });
    }
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

    if (!formData.monthlyPayment || parseFloat(formData.monthlyPayment) <= 0) {
      newErrors.monthlyPayment = 'Valid monthly payment is required';
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

    const account: Omit<CreateFinancialAccountInput, 'userId'> = {
      accountNumber: formData.accountNumber.trim(),
      accountName: formData.accountName.trim(),
      accountDescription: formData.accountDescription.trim(),
      accountType,
      status: formData.status,
      totalAmountRemaining: {
        amount: parseFloat(formData.totalAmountRemaining),
        currency: formData.currency,
      },
      monthlyPayment: {
        amount: parseFloat(formData.monthlyPayment),
        currency: formData.currency,
      },
      rate: parseFloat(formData.rate),
      nextDueDate: new Date(formData.nextDueDate),
      ...(formData.originalAmount && {
        originalAmount: {
          amount: parseFloat(formData.originalAmount),
          currency: formData.currency,
        },
      }),
      ...(formData.startDate && {
        startDate: new Date(formData.startDate),
      }),
      ...(formData.numberOfPayments.trim() &&
        (() => {
          const numPayments = parseInt(formData.numberOfPayments.trim(), 10);
          if (!isNaN(numPayments) && numPayments > 0) {
            return { numberOfPayments: numPayments };
          }
          return {};
        })()),
    };

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
    <form onSubmit={handleSubmit} className="create-account-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="accountNumber">
            Account Number <span className="required">*</span>
          </label>
          <input
            id="accountNumber"
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleChange('accountNumber', e.target.value)}
            className={errors.accountNumber ? 'error' : ''}
            placeholder="e.g., ACC-0001"
            disabled={mode === 'edit'}
          />
          {errors.accountNumber && (
            <span className="error-message">{errors.accountNumber}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="status">
            Status <span className="required">*</span>
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) =>
              handleChange('status', e.target.value as AccountStatus)
            }
          >
            {ACCOUNT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="accountName">
          Account Name <span className="required">*</span>
        </label>
        <input
          id="accountName"
          type="text"
          value={formData.accountName}
          onChange={(e) => handleChange('accountName', e.target.value)}
          className={errors.accountName ? 'error' : ''}
          placeholder="e.g., Personal Loan - Bank ABC"
        />
        {errors.accountName && (
          <span className="error-message">{errors.accountName}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="accountDescription">
          Description <span className="required">*</span>
        </label>
        <textarea
          id="accountDescription"
          value={formData.accountDescription}
          onChange={(e) => handleChange('accountDescription', e.target.value)}
          className={errors.accountDescription ? 'error' : ''}
          placeholder="e.g., Personal loan for home improvement"
          rows={3}
        />
        {errors.accountDescription && (
          <span className="error-message">{errors.accountDescription}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="currency">
          Currency <span className="required">*</span>
        </label>
        <select
          id="currency"
          value={formData.currency}
          onChange={(e) => handleChange('currency', e.target.value)}
        >
          <option value="COP">COP (Colombian Peso)</option>
          <option value="USD">USD (US Dollar)</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="totalAmountRemaining">
            Total Amount Remaining <span className="required">*</span>
          </label>
          <input
            id="totalAmountRemaining"
            type="number"
            step="0.01"
            min="0"
            value={formData.totalAmountRemaining}
            onChange={(e) =>
              handleChange('totalAmountRemaining', e.target.value)
            }
            className={errors.totalAmountRemaining ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.totalAmountRemaining && (
            <span className="error-message">{errors.totalAmountRemaining}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="monthlyPayment">
            Monthly Payment <span className="required">*</span>
          </label>
          <input
            id="monthlyPayment"
            type="number"
            step="0.01"
            min="0"
            value={formData.monthlyPayment}
            onChange={(e) => handleChange('monthlyPayment', e.target.value)}
            className={errors.monthlyPayment ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.monthlyPayment && (
            <span className="error-message">{errors.monthlyPayment}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="rate">
            Interest Rate (%) <span className="required">*</span>
          </label>
          <input
            id="rate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            className={errors.rate ? 'error' : ''}
            placeholder="0.0"
          />
          {errors.rate && <span className="error-message">{errors.rate}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="nextDueDate">
            Next Due Date <span className="required">*</span>
          </label>
          <input
            id="nextDueDate"
            type="date"
            value={formData.nextDueDate || getDefaultDueDate()}
            onChange={(e) => handleChange('nextDueDate', e.target.value)}
            className={errors.nextDueDate ? 'error' : ''}
            min={new Date().toISOString().split('T')[0]}
          />
          {errors.nextDueDate && (
            <span className="error-message">{errors.nextDueDate}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="originalAmount">Original Amount (Optional)</label>
          <input
            id="originalAmount"
            type="number"
            step="0.01"
            min="0"
            value={formData.originalAmount}
            onChange={(e) => handleChange('originalAmount', e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="form-group">
          <label htmlFor="startDate">Start Date (Optional)</label>
          <input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="numberOfPayments">
            Number of Payments
            {accountType !== 'bill' && <span className="required">*</span>}
            {accountType === 'bill' && (
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  marginLeft: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
              >
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
            className={errors.numberOfPayments ? 'error' : ''}
            placeholder={
              accountType === 'bill'
                ? 'Leave empty for periodic bills'
                : 'e.g., 12'
            }
          />
          {errors.numberOfPayments && (
            <span className="error-message">{errors.numberOfPayments}</span>
          )}
          {accountType === 'bill' && (
            <small
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: '0.25rem',
                display: 'block',
              }}
            >
              Leave empty if this is a periodic bill (will generate periods
              automatically)
            </small>
          )}
        </div>
        <div className="form-group" style={{ visibility: 'hidden' }}>
          {/* Empty div to maintain form-row layout */}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn-submit" disabled={isSubmitting}>
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
