import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AccountStatus,
  AccountType,
  CreateFinancialAccountInput,
} from '@rates/firebase-client';
import { createFinancialAccount } from '../services/financialAccounts';
import { Modal } from './Modal';
import { formatCurrency } from '../utils/formatters';

type WizardStep = 'type' | 'details' | 'review' | 'success';

interface NewAccountWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (accountId: string, accountType: AccountType) => void;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  loan: 'Loan',
  credit_card: 'Credit Card',
  bill: 'Bill',
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  auto_loan: 'Auto Loan',
  other: 'Other',
};

const ACCOUNT_TYPE_HELP: Record<AccountType, string> = {
  loan: 'Fixed-term loans with interest and scheduled payments.',
  credit_card: 'Revolving credit balances with monthly minimum payments.',
  bill: 'Recurring bills (optionally without a fixed number of payments).',
  mortgage: 'Long-term home loan with amortized payments.',
  personal_loan: 'Personal borrowing with a defined repayment schedule.',
  auto_loan: 'Vehicle financing with fixed monthly installments.',
  other: 'Anything that doesn’t fit the categories above.',
};

const ACCOUNT_STATUSES: AccountStatus[] = [
  'active',
  'paid_off',
  'closed',
  'defaulted',
  'on_hold',
];

function buildTitle(step: WizardStep, type: AccountType | null) {
  if (step === 'success') return 'Account created';
  if (step === 'type') return 'Create a new account';
  const typeLabel = type ? ACCOUNT_TYPE_LABELS[type] : 'Account';
  if (step === 'details') return `Details for your ${typeLabel}`;
  return `Review your ${typeLabel}`;
}

export function NewAccountWizard({
  isOpen,
  onClose,
  onCreated,
}: NewAccountWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('type');
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    accountDescription: '',
    status: 'active' as AccountStatus,
    totalAmountRemaining: '',
    monthlyPayment: '',
    rate: '',
    nextDueDate: '',
    currency: 'COP' as 'COP' | 'USD',
    originalAmount: '',
    startDate: '',
    numberOfPayments: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    // Reset wizard each time it opens for a predictable UX.
    setStep('type');
    setSelectedType(null);
    setSaving(false);
    setError(null);
    setCreatedAccountId(null);
    setFormData({
      accountNumber: '',
      accountName: '',
      accountDescription: '',
      status: 'active',
      totalAmountRemaining: '',
      monthlyPayment: '',
      rate: '',
      nextDueDate: '',
      currency: 'COP',
      originalAmount: '',
      startDate: '',
      numberOfPayments: '',
    });
  }, [isOpen]);

  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const detailsErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!selectedType) return errs;

    if (!formData.accountNumber.trim())
      errs.accountNumber = 'Account number is required';
    if (!formData.accountName.trim())
      errs.accountName = 'Account name is required';
    if (!formData.accountDescription.trim())
      errs.accountDescription = 'Account description is required';

    if (
      !formData.totalAmountRemaining ||
      parseFloat(formData.totalAmountRemaining) <= 0
    ) {
      errs.totalAmountRemaining = 'Valid total amount remaining is required';
    }

    if (!formData.monthlyPayment || parseFloat(formData.monthlyPayment) <= 0) {
      errs.monthlyPayment = 'Valid monthly payment is required';
    }

    const rate = parseFloat(formData.rate);
    if (!formData.rate || Number.isNaN(rate) || rate < 0 || rate > 100) {
      errs.rate = 'Valid interest rate (0-100%) is required';
    }

    if (!formData.nextDueDate) errs.nextDueDate = 'Next due date is required';

    if (selectedType === 'bill') {
      if (formData.numberOfPayments) {
        const numPayments = parseInt(formData.numberOfPayments, 10);
        if (Number.isNaN(numPayments) || numPayments <= 0) {
          errs.numberOfPayments = 'Number of payments must be greater than 0';
        }
      }
    } else {
      const numPayments = parseInt(formData.numberOfPayments, 10);
      if (
        !formData.numberOfPayments ||
        Number.isNaN(numPayments) ||
        numPayments <= 0
      ) {
        errs.numberOfPayments =
          'Number of payments is required (must be greater than 0)';
      }
    }

    return errs;
  }, [formData, selectedType]);

  const canContinueFromType = !!selectedType;
  const canContinueFromDetails = selectedType
    ? Object.keys(detailsErrors).length === 0
    : false;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleNext = () => {
    setError(null);
    if (step === 'type' && canContinueFromType) setStep('details');
    else if (step === 'details' && canContinueFromDetails) setStep('review');
  };

  const handleBack = () => {
    setError(null);
    if (step === 'review') setStep('details');
    else if (step === 'details') setStep('type');
  };

  const buildAccountPayload = (): Omit<
    CreateFinancialAccountInput,
    'userId'
  > => {
    if (!selectedType) {
      throw new Error('Please select an account type');
    }

    return {
      accountNumber: formData.accountNumber.trim(),
      accountName: formData.accountName.trim(),
      accountDescription: formData.accountDescription.trim(),
      accountType: selectedType,
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
      nextDueDate: new Date(formData.nextDueDate || getDefaultDueDate()),
      paymentLog: [],
      ...(formData.originalAmount && {
        originalAmount: {
          amount: parseFloat(formData.originalAmount),
          currency: formData.currency,
        },
      }),
      ...(formData.startDate && { startDate: new Date(formData.startDate) }),
      ...(formData.numberOfPayments.trim() &&
        (() => {
          const n = parseInt(formData.numberOfPayments.trim(), 10);
          if (!Number.isNaN(n) && n > 0) return { numberOfPayments: n };
          return {};
        })()),
    };
  };

  const handleCreate = async () => {
    if (!canContinueFromDetails || !selectedType || saving) return;

    try {
      setSaving(true);
      setError(null);
      const payload = buildAccountPayload();
      const accountId = await createFinancialAccount(payload);
      setCreatedAccountId(accountId);
      setStep('success');
      onCreated?.(accountId, selectedType);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const progressIndex =
    step === 'type' ? 0 : step === 'details' ? 1 : step === 'review' ? 2 : 3;

  const primaryCurrencyPreview = formData.currency;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={buildTitle(step, selectedType)}
    >
      <div className="flex flex-col gap-5 text-white">
        <div
          className="bg-white/8 rounded-lg border border-neutral-700/30 px-4 pb-3.5 pt-4 backdrop-blur-[14px]"
          aria-label="Wizard progress"
        >
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {['Type', 'Details', 'Review', 'Done'].map((label, idx) => (
              <div
                key={label}
                className={`flex flex-1 items-center gap-2 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sm:gap-2.5 ${
                  idx < progressIndex || idx === progressIndex
                    ? 'opacity-100'
                    : 'opacity-65'
                }`}
              >
                <div
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    idx === progressIndex
                      ? 'border-neutral-500/50 bg-gradient-to-br from-[#1e40af] to-[#334155] shadow-[0_0_0_6px_rgba(30,64,175,0.18)]'
                      : idx < progressIndex
                        ? 'border-[rgba(46,204,113,0.95)] bg-[rgba(46,204,113,0.9)]'
                        : 'border-neutral-600/40 bg-white/25'
                  }`}
                  aria-hidden="true"
                />
                <div className="whitespace-nowrap text-xs font-[650] -tracking-[0.2px] sm:text-sm">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div
            className="bg-white/8 mt-3 h-2 overflow-hidden rounded-full border border-neutral-700/25"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1e40af] to-[#334155] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ width: `${(progressIndex / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div
            className="rounded-lg border border-danger-500/35 bg-danger-500/15 px-4 py-3.5 text-[0.95rem] text-[#ffb3b3]"
            role="alert"
          >
            {error}
          </div>
        )}

        {step === 'type' && (
          <div>
            <div className="mb-4">
              <h3 className="m-0 mb-1 text-xl -tracking-[0.3px]">
                Choose an account type
              </h3>
              <p className="m-0 text-[0.95rem] opacity-75">
                Pick the category that best describes this account.
              </p>
            </div>

            <div
              className="mt-4 grid grid-cols-2 gap-3.5 md-sm:grid-cols-1"
              role="list"
            >
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    role="listitem"
                    className={`cursor-pointer rounded-lg border p-4 text-left text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      selectedType === type
                        ? 'bg-primary-500/18 border-primary-500/75 shadow-[0_10px_26px_rgba(30,64,175,0.2)]'
                        : 'bg-white/8 border-neutral-700/30 backdrop-blur-[14px] hover:-translate-y-0.5 hover:border-neutral-600/40 hover:bg-white/10 hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    }`}
                    onClick={() => setSelectedType(type)}
                  >
                    <div className="text-lg font-[750] -tracking-[0.3px]">
                      {ACCOUNT_TYPE_LABELS[type]}
                    </div>
                    <div className="mt-1.5 text-[0.92rem] leading-[1.35] opacity-75">
                      {ACCOUNT_TYPE_HELP[type]}
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {step === 'details' && (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleNext();
            }}
          >
            <div className="mb-4">
              <h3 className="m-0 mb-1 text-xl -tracking-[0.3px]">
                Account details
              </h3>
              <p className="m-0 text-[0.95rem] opacity-75">
                Fill in the basics. You can always edit later.
              </p>
            </div>

            <div className="gap-3.75 mt-4 flex flex-col">
              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-accountNumber"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Account Number <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="wiz-accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        accountNumber: e.target.value,
                      }))
                    }
                    placeholder="e.g., ACC-0001"
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      detailsErrors.accountNumber
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                    autoFocus
                  />
                  {detailsErrors.accountNumber && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {detailsErrors.accountNumber}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-status"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Status <span className="text-danger-500">*</span>
                  </label>
                  <select
                    id="wiz-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        status: e.target.value as AccountStatus,
                      }))
                    }
                    className="box-border w-full rounded-lg border border-neutral-600/40 bg-black/20 px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]"
                  >
                    {ACCOUNT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="wiz-accountName"
                  className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                >
                  Account Name <span className="text-danger-500">*</span>
                </label>
                <input
                  id="wiz-accountName"
                  type="text"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, accountName: e.target.value }))
                  }
                  placeholder="e.g., Personal Loan - Bank ABC"
                  className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-200 ease-in-out ${
                    detailsErrors.accountName
                      ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                      : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(102,126,234,0.18)]'
                  }`}
                />
                {detailsErrors.accountName && (
                  <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                    {detailsErrors.accountName}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="wiz-accountDescription"
                  className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                >
                  Description <span className="text-danger-500">*</span>
                </label>
                <textarea
                  id="wiz-accountDescription"
                  value={formData.accountDescription}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      accountDescription: e.target.value,
                    }))
                  }
                  placeholder="e.g., Personal loan for home improvement"
                  rows={3}
                  className={`box-border w-full resize-y rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-200 ease-in-out ${
                    detailsErrors.accountDescription
                      ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                      : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(102,126,234,0.18)]'
                  }`}
                />
                {detailsErrors.accountDescription && (
                  <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                    {detailsErrors.accountDescription}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-currency"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Currency <span className="text-danger-500">*</span>
                  </label>
                  <select
                    id="wiz-currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        currency: e.target.value as 'COP' | 'USD',
                      }))
                    }
                    className="box-border w-full rounded-lg border border-neutral-600/40 bg-black/20 px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]"
                  >
                    <option value="COP">COP (Colombian Peso)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="bg-white/6 rounded-lg border border-neutral-700/30 px-3.5 py-3.5">
                  <div className="mb-1 font-[750] -tracking-[0.3px]">Tip</div>
                  <div className="text-[0.92rem] leading-[1.35] opacity-80">
                    Use an easy-to-remember account number. It becomes the
                    unique ID.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-totalAmountRemaining"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Total Amount Remaining{' '}
                    <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="wiz-totalAmountRemaining"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalAmountRemaining}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        totalAmountRemaining: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      detailsErrors.totalAmountRemaining
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {detailsErrors.totalAmountRemaining && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {detailsErrors.totalAmountRemaining}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-monthlyPayment"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Monthly Payment <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="wiz-monthlyPayment"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyPayment}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        monthlyPayment: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      detailsErrors.monthlyPayment
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {detailsErrors.monthlyPayment && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {detailsErrors.monthlyPayment}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-rate"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Interest Rate (%) <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="wiz-rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.rate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, rate: e.target.value }))
                    }
                    placeholder="0.0"
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      detailsErrors.rate
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {detailsErrors.rate && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {detailsErrors.rate}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-nextDueDate"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Next Due Date <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="wiz-nextDueDate"
                    type="date"
                    value={formData.nextDueDate || getDefaultDueDate()}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        nextDueDate: e.target.value,
                      }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      detailsErrors.nextDueDate
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {detailsErrors.nextDueDate && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {detailsErrors.nextDueDate}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-originalAmount"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Original Amount (Optional)
                  </label>
                  <input
                    id="wiz-originalAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.originalAmount}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        originalAmount: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="box-border w-full rounded-lg border border-neutral-600/40 bg-black/20 px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-startDate"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Start Date (Optional)
                  </label>
                  <input
                    id="wiz-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, startDate: e.target.value }))
                    }
                    max={new Date().toISOString().split('T')[0]}
                    className="box-border w-full rounded-lg border border-neutral-600/40 bg-black/20 px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-numberOfPayments"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Number of Payments
                    {selectedType !== 'bill' && (
                      <span className="text-danger-500">*</span>
                    )}
                    {selectedType === 'bill' && (
                      <span className="ml-2 text-sm font-medium opacity-70">
                        (Optional for periodic bills)
                      </span>
                    )}
                  </label>
                  <input
                    id="wiz-numberOfPayments"
                    type="number"
                    step="1"
                    min="1"
                    value={formData.numberOfPayments}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        numberOfPayments: e.target.value,
                      }))
                    }
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      detailsErrors.numberOfPayments
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                    placeholder={
                      selectedType === 'bill'
                        ? 'Leave empty for periodic bills'
                        : 'e.g., 12'
                    }
                  />
                  {detailsErrors.numberOfPayments && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {detailsErrors.numberOfPayments}
                    </div>
                  )}
                  {selectedType === 'bill' && (
                    <div className="mt-1.5 text-[0.86rem] leading-[1.3] opacity-70">
                      Leave empty if this is a periodic bill (periods will be
                      generated automatically).
                    </div>
                  )}
                </div>

                <div className="bg-white/6 rounded-lg border border-neutral-700/30 px-3.5 py-3.5">
                  <div className="mb-1 font-[750] -tracking-[0.3px]">
                    Preview
                  </div>
                  <div className="text-[0.92rem] leading-[1.35] opacity-80">
                    {formData.totalAmountRemaining
                      ? formatCurrency(
                          parseFloat(formData.totalAmountRemaining || '0'),
                          primaryCurrencyPreview
                        )
                      : 'Enter an amount to see a formatted preview.'}
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {step === 'review' && selectedType && (
          <div>
            <div className="mb-4">
              <h3 className="m-0 mb-1 text-xl -tracking-[0.3px]">Review</h3>
              <p className="m-0 text-[0.95rem] opacity-75">
                Make sure everything looks right before creating the account.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Type</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {ACCOUNT_TYPE_LABELS[selectedType]}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Status</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Account Number</div>
                <div className="font-mono font-[650] -tracking-[0.2px]">
                  {formData.accountNumber || '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Account Name</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.accountName || '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 col-span-2 rounded-lg border border-neutral-700/30 px-4 md-sm:col-span-1">
                <div className="mb-1 text-xs opacity-70">Description</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.accountDescription || '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Total Remaining</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.totalAmountRemaining
                    ? formatCurrency(
                        parseFloat(formData.totalAmountRemaining),
                        formData.currency
                      )
                    : '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Monthly Payment</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.monthlyPayment
                    ? formatCurrency(
                        parseFloat(formData.monthlyPayment),
                        formData.currency
                      )
                    : '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Rate</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.rate ? `${formData.rate}%` : '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Next Due Date</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.nextDueDate || getDefaultDueDate()}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70"># Payments</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.numberOfPayments || '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div>
            <div className="bg-success-css/12 border-success-css/28 mt-1 flex flex-col items-center gap-3 rounded-[18px] border px-6 py-8 text-center">
              <div className="flex h-16 w-16 animate-success-pulse items-center justify-center rounded-full border-2 border-success-css/50 bg-gradient-to-br from-[rgba(46,204,113,0.9)] to-[rgba(39,174,96,0.9)] text-2xl font-bold text-white shadow-[0_8px_24px_rgba(46,204,113,0.3)]">
                ✓
              </div>
              <div className="m-0 text-[1.4rem] font-extrabold -tracking-[0.3px]">
                Account Created Successfully!
              </div>
              <div className="m-0 max-w-[480px] text-[0.95rem] leading-relaxed opacity-85">
                Your{' '}
                {selectedType
                  ? ACCOUNT_TYPE_LABELS[selectedType].toLowerCase()
                  : 'account'}{' '}
                has been created and is ready to use.
                {createdAccountId && (
                  <div className="mt-3 rounded-lg border border-neutral-700/30 bg-black/20 px-3 py-2 font-mono text-xs opacity-90">
                    Account ID: {createdAccountId}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-neutral-700/30 pt-4">
          {step === 'success' ? (
            <>
              <button
                type="button"
                className="hover:bg-white/16 cursor-pointer rounded-lg border border-neutral-600/40 bg-white/10 px-5 py-3.5 font-[650] text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-neutral-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleClose}
                disabled={saving}
              >
                Close
              </button>
              <div className="flex-1" />
              {createdAccountId && (
                <button
                  type="button"
                  className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
                  onClick={() => {
                    handleClose();
                    void navigate(`/account/${createdAccountId}`);
                  }}
                  disabled={saving}
                >
                  View Account
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="hover:bg-white/16 cursor-pointer rounded-lg border border-neutral-600/40 bg-white/10 px-5 py-3.5 font-[650] text-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-neutral-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={step === 'type' ? handleClose : handleBack}
                disabled={saving}
              >
                {step === 'type' ? 'Cancel' : 'Back'}
              </button>

              <div className="flex-1" />

              {step === 'type' && (
                <button
                  type="button"
                  className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
                  onClick={handleNext}
                  disabled={!canContinueFromType}
                >
                  Continue
                </button>
              )}

              {step === 'details' && (
                <button
                  type="submit"
                  className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
                  onClick={handleNext}
                  disabled={!canContinueFromDetails}
                  title={
                    !canContinueFromDetails
                      ? 'Please complete required fields'
                      : undefined
                  }
                >
                  Review
                </button>
              )}

              {step === 'review' && (
                <button
                  type="button"
                  className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
                  onClick={() => void handleCreate()}
                  disabled={saving}
                >
                  {saving ? 'Creating…' : 'Create account'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
