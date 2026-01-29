import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AccountStatus,
  AccountType,
  CreateFinancialAccountInput,
  PaymentFrequency,
} from '@rates/firebase-client';
import { createFinancialAccount } from '../services/financialAccounts';
import { Modal } from './Modal';
import { Select } from './Select';
import { formatCurrency } from '../utils/formatters';

type WizardStep =
  | 'type'
  | 'details'
  | 'account'
  | 'financial'
  | 'review'
  | 'success';

interface NewAccountWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (accountId: string, accountType: AccountType) => void;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  installment_loan: 'Installment Loan',
  revolving_credit: 'Revolving Credit',
  bill: 'Bill',
  other: 'Other',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  installment_loan: '💰',
  revolving_credit: '💳',
  bill: '📄',
  other: '📋',
};

const ACCOUNT_TYPE_HELP: Record<AccountType, string> = {
  installment_loan:
    'Fixed-term loans with interest and scheduled payments (mortgages, personal loans, auto loans).',
  revolving_credit:
    'Revolving credit balances with monthly minimum payments (credit cards, lines of credit).',
  bill: 'Recurring bills (optionally without a fixed number of payments).',
  other: 'Anything that does not fit the categories above.',
};

const WIZARD_STEPS = [
  'Type',
  'Details',
  'Account',
  'Financial',
  'Review',
] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function buildTitle(step: WizardStep, type: AccountType | null) {
  if (step === 'success') return 'Account created';
  if (step === 'type') return 'Create a new account';
  const typeLabel = type ? ACCOUNT_TYPE_LABELS[type] : 'Account';
  if (step === 'details') return `Details for your ${typeLabel}`;
  if (step === 'account') return `Account & currency`;
  if (step === 'financial') return `Financial data`;
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
  const [tipOpen, setTipOpen] = useState(false);
  const [totalRemainingTipOpen, setTotalRemainingTipOpen] = useState(false);
  const [numPaymentsTipOpen, setNumPaymentsTipOpen] = useState(false);
  const [detailsAttempted, setDetailsAttempted] = useState(false);
  const [accountAttempted, setAccountAttempted] = useState(false);
  const [financialAttempted, setFinancialAttempted] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const totalRemainingTipRef = useRef<HTMLDivElement>(null);
  const numPaymentsTipRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    accountNumber: '',
    accountNumberAutogenerate: true,
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
  });

  useEffect(() => {
    if (!isOpen) return;
    // Reset wizard each time it opens for a predictable UX.
    setStep('type');
    setSelectedType(null);
    setSaving(false);
    setError(null);
    setTipOpen(false);
    setTotalRemainingTipOpen(false);
    setNumPaymentsTipOpen(false);
    setDetailsAttempted(false);
    setAccountAttempted(false);
    setFinancialAttempted(false);
    setFormData({
      accountNumber: '',
      accountNumberAutogenerate: true,
      accountName: '',
      accountDescription: '',
      status: 'active',
      totalAmountRemaining: '',
      paymentAmount: '',
      paymentFrequency: 'monthly',
      rate: '',
      nextDueDate: '',
      currency: 'COP',
      originalAmount: '',
      startDate: '',
      numberOfPayments: '',
    });
  }, [isOpen]);

  useEffect(() => {
    if (!tipOpen && !totalRemainingTipOpen && !numPaymentsTipOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (tipOpen && tipRef.current && !tipRef.current.contains(target)) {
        setTipOpen(false);
      }
      if (
        totalRemainingTipOpen &&
        totalRemainingTipRef.current &&
        !totalRemainingTipRef.current.contains(target)
      ) {
        setTotalRemainingTipOpen(false);
      }
      if (
        numPaymentsTipOpen &&
        numPaymentsTipRef.current &&
        !numPaymentsTipRef.current.contains(target)
      ) {
        setNumPaymentsTipOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tipOpen, totalRemainingTipOpen, numPaymentsTipOpen]);

  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const detailsErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!formData.accountName.trim())
      errs.accountName = 'Account name is required';
    if (!formData.accountDescription.trim())
      errs.accountDescription = 'Account description is required';
    return errs;
  }, [formData.accountName, formData.accountDescription]);

  const accountErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!formData.accountNumberAutogenerate && !formData.accountNumber.trim()) {
      errs.accountNumber = 'Account number is required';
    }
    return errs;
  }, [formData.accountNumberAutogenerate, formData.accountNumber]);

  const financialErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!selectedType) return errs;

    if (
      !formData.totalAmountRemaining ||
      parseFloat(formData.totalAmountRemaining) <= 0
    ) {
      errs.totalAmountRemaining = 'Valid total remaining is required';
    }

    if (!formData.paymentAmount || parseFloat(formData.paymentAmount) <= 0) {
      errs.paymentAmount = 'Valid payment amount is required';
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
  const canContinueFromDetails = Object.keys(detailsErrors).length === 0;
  const canContinueFromAccount = Object.keys(accountErrors).length === 0;
  const canContinueFromFinancial = selectedType
    ? Object.keys(financialErrors).length === 0
    : false;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleNext = () => {
    setError(null);
    if (step === 'type' && canContinueFromType) setStep('details');
    else if (step === 'details') {
      setDetailsAttempted(true);
      if (canContinueFromDetails) setStep('account');
    } else if (step === 'account') {
      setAccountAttempted(true);
      if (canContinueFromAccount) setStep('financial');
    } else if (step === 'financial') {
      setFinancialAttempted(true);
      if (canContinueFromFinancial) setStep('review');
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'review') setStep('financial');
    else if (step === 'financial') setStep('account');
    else if (step === 'account') setStep('details');
    else if (step === 'details') setStep('type');
  };

  const buildAccountPayload = (): Omit<
    CreateFinancialAccountInput,
    'userId'
  > => {
    if (!selectedType) {
      throw new Error('Please select an account type');
    }

    const accountNumber = formData.accountNumberAutogenerate
      ? crypto.randomUUID()
      : formData.accountNumber.trim();

    const basePayload = {
      accountNumber,
      accountName: formData.accountName.trim(),
      accountDescription: formData.accountDescription.trim(),
      status: formData.status,
      currency: formData.currency,
      paymentLog: [],
    };

    // Build type-specific payload
    switch (selectedType) {
      case 'installment_loan': {
        return {
          ...basePayload,
          accountType: 'installment_loan' as const,
          loanSubtype: 'personal_loan' as const, // Default subtype
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
      }

      case 'revolving_credit': {
        return {
          ...basePayload,
          accountType: 'revolving_credit' as const,
          creditSubtype: 'credit_card' as const, // Default subtype
          currentBalance: {
            amount: parseFloat(formData.totalAmountRemaining),
            currency: formData.currency,
          },
          purchaseApr: parseFloat(formData.rate),
          minimumPayment: formData.paymentAmount
            ? {
                amount: parseFloat(formData.paymentAmount),
                currency: formData.currency,
              }
            : undefined,
          nextDueDate: formData.nextDueDate
            ? new Date(formData.nextDueDate)
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
      }

      case 'bill': {
        const isRecurring = !!formData.paymentFrequency;
        return {
          ...basePayload,
          accountType: 'bill' as const,
          billSubtype: 'utility' as const, // Default subtype
          isRecurring,
          isAmountVariable: false, // Assume fixed amount for now
          nextDueDate: new Date(formData.nextDueDate || getDefaultDueDate()),
          recurringAmount: formData.paymentAmount
            ? {
                amount: parseFloat(formData.paymentAmount),
                currency: formData.currency,
              }
            : undefined,
          paymentFrequency: isRecurring ? formData.paymentFrequency : undefined,
          endDate: formData.numberOfPayments
            ? (() => {
                // Calculate end date based on number of payments
                const start = new Date(
                  formData.nextDueDate || getDefaultDueDate()
                );
                const months = parseInt(formData.numberOfPayments, 10);
                const end = new Date(start);
                end.setMonth(end.getMonth() + months);
                return end;
              })()
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
      }

      case 'other': {
        return {
          ...basePayload,
          accountType: 'other' as const,
          nextRelevantDate: formData.nextDueDate
            ? new Date(formData.nextDueDate)
            : undefined,
        } as Omit<CreateFinancialAccountInput, 'userId'>;
      }

      default: {
        // Exhaustive check
        const _exhaustive: never = selectedType;
        throw new Error(`Unknown account type: ${_exhaustive}`);
      }
    }
  };

  const handleCreate = async () => {
    if (!canContinueFromFinancial || !selectedType || saving) return;

    try {
      setSaving(true);
      setError(null);
      const payload = buildAccountPayload();
      const accountId = await createFinancialAccount(payload);
      void onCreated?.(accountId, selectedType);
      onClose();
      void navigate(`/account/${accountId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const progressIndex =
    step === 'type'
      ? 0
      : step === 'details'
        ? 1
        : step === 'account'
          ? 2
          : step === 'financial'
            ? 3
            : 4; // review | success

  const renderProgressIndicator = () => {
    // Fill to the divider to the right of the active step: step 0→20%, 1→40%, 2→60%, 3→80%, 4→100%
    const percent = ((progressIndex + 1) / 5) * 100;
    return (
      <div
        className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 pb-2 pt-4 sm:px-4 sm:py-2.5"
        aria-label="Wizard progress"
      >
        {/* Progress bar — segment lines at 20,40,60,80% align with the right edge of each step slot */}
        <div
          className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 sm:h-2.5"
          role="progressbar"
          aria-valuenow={progressIndex}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuetext={`Step ${progressIndex + 1} of 5`}
        >
          {/* Segment dividers: 4 lines at 20, 40, 60, 80% — one at the right edge of each step’s column */}
          {[20, 40, 60, 80].map((left) => (
            <div
              key={left}
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-white/15"
              style={{ left: `${left}%` }}
              aria-hidden
            />
          ))}
          <div
            className="relative z-10 h-full rounded-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#334155] shadow-[0_0_10px_rgba(37,99,235,0.35)] transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Step row — 5 equal segments aligned with full bar; completed, current, and upcoming (remaining) */}
        <div className="mt-2 flex w-full gap-0">
          {WIZARD_STEPS.map((label, idx) => {
            const isDone = idx < progressIndex;
            const isCurrent = idx === progressIndex && step !== 'success';
            const isUpcoming = idx > progressIndex;
            return (
              <div
                key={label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {/* Marker — same size for all so remaining aligns with bar */}
                {isDone ? (
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(46,204,113,0.25)] text-[#2ecc71] sm:h-5 sm:w-5">
                    <CheckIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </span>
                ) : isCurrent ? (
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary-500/50 bg-primary-500/20 shadow-[0_0_8px_rgba(30,64,175,0.3)] sm:h-5 sm:w-5">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-300"
                      aria-hidden
                    />
                  </span>
                ) : (
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-white/20 bg-white/[0.04] sm:h-5 sm:w-5"
                    aria-hidden
                  />
                )}
                <span
                  className={`max-w-full truncate px-0.5 text-center text-[10px] -tracking-[0.1px] sm:text-xs ${
                    isUpcoming
                      ? 'text-white/40'
                      : isCurrent
                        ? 'font-semibold text-white'
                        : 'text-white/80'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex items-center gap-3">
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
            form="wiz-details-form"
            className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
            disabled={saving}
            title={
              !canContinueFromDetails
                ? 'Click to see which fields need to be completed'
                : undefined
            }
          >
            Continue
          </button>
        )}

        {step === 'account' && (
          <button
            type="submit"
            form="wiz-account-form"
            className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
            disabled={saving}
            title={
              !canContinueFromAccount
                ? 'Click to see which fields need to be completed'
                : undefined
            }
          >
            Continue
          </button>
        )}

        {step === 'financial' && (
          <button
            type="submit"
            form="wiz-financial-form"
            className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
            disabled={saving}
            title={
              !canContinueFromFinancial
                ? 'Click to see which fields need to be completed'
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
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={buildTitle(step, selectedType)}
      footer={renderFooter()}
      compactHeader
      headerSupplement={renderProgressIndicator()}
    >
      <div className="flex flex-col gap-5 text-white">
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
            <p className="mb-3 text-[0.85rem] opacity-75 sm:mb-4 sm:text-[0.9rem]">
              Pick the category that best describes this account.
            </p>

            <div
              className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5"
              role="list"
            >
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                (type) => {
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="listitem"
                      className={`flex min-h-[72px] cursor-pointer flex-col justify-center rounded-md border p-2.5 pt-0 text-left text-white transition-all duration-200 ease-out active:scale-[0.98] sm:min-h-[80px] sm:p-3 ${
                        isSelected
                          ? 'border-primary-500/80 bg-primary-500/20 shadow-[0_0_0_2px_rgba(59,130,246,0.35),0_4px_14px_rgba(30,64,175,0.3)]'
                          : 'border-neutral-700/40 bg-white/[0.07] backdrop-blur-[10px] hover:border-neutral-600/50 hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                      }`}
                      onClick={() => {
                        setError(null);
                        setSelectedType(type);
                        setStep('details');
                      }}
                    >
                      {/* Row 1: icon (left) + title (right) */}
                      <div className="flex min-h-[44px] items-center gap-2">
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base ring-1 sm:h-10 sm:w-10 sm:text-lg ${
                            isSelected
                              ? 'bg-primary-500/35 shadow-[0_2px_10px_rgba(30,64,175,0.35)] ring-primary-400/40'
                              : 'bg-white/12 shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-white/10'
                          }`}
                          aria-hidden
                        >
                          {ACCOUNT_TYPE_ICONS[type]}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[0.95rem] font-[700] -tracking-[0.2px] sm:text-[1rem]">
                          {ACCOUNT_TYPE_LABELS[type]}
                        </span>
                      </div>
                      {/* Row 2: description */}
                      <p className="mt-1 line-clamp-2 min-h-[2.25em] text-[0.75rem] leading-snug opacity-80 sm:text-[0.8rem]">
                        {ACCOUNT_TYPE_HELP[type]}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {step === 'details' && (
          <form
            id="wiz-details-form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleNext();
            }}
          >
            <p className="mb-3 text-[0.85rem] opacity-75 sm:mb-4 sm:text-[0.9rem]">
              Fill in the basics. You can always edit later.
            </p>

            <div className="gap-3.75 mt-4 flex flex-col">
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
                    detailsAttempted && detailsErrors.accountName
                      ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                      : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(102,126,234,0.18)]'
                  }`}
                  autoFocus
                />
                {detailsAttempted && detailsErrors.accountName && (
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
                    detailsAttempted && detailsErrors.accountDescription
                      ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                      : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(102,126,234,0.18)]'
                  }`}
                />
                {detailsAttempted && detailsErrors.accountDescription && (
                  <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                    {detailsErrors.accountDescription}
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        {step === 'account' && (
          <form
            id="wiz-account-form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleNext();
            }}
          >
            <p className="mb-3 text-[0.85rem] opacity-75 sm:mb-4 sm:text-[0.9rem]">
              Identifier and currency for this account.
            </p>

            <div className="gap-3.75 mt-4 flex flex-col">
              <div className="flex flex-col gap-1.5">
                <div
                  ref={tipRef}
                  className="relative mb-1.5 flex w-full items-center justify-between gap-2"
                  onMouseEnter={() => setTipOpen(true)}
                  onMouseLeave={() => setTipOpen(false)}
                >
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <label
                      htmlFor="wiz-accountNumber"
                      className="text-white/92 text-[0.92rem] font-[650]"
                    >
                      Account Number
                      {!formData.accountNumberAutogenerate && (
                        <span className="text-danger-500"> *</span>
                      )}
                    </label>
                    <button
                      type="button"
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      aria-label="Account number tip"
                      onClick={(e) => {
                        e.preventDefault();
                        setTipOpen((o) => !o);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                    </button>
                  </div>
                  {tipOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 max-w-[260px] rounded-lg border border-neutral-600/40 bg-neutral-900 px-3 py-2.5 text-[0.9rem] leading-relaxed text-white shadow-lg"
                      role="tooltip"
                    >
                      {formData.accountNumberAutogenerate
                        ? 'When autogenerate is on, a unique ID is created on save.'
                        : 'Use an easy-to-remember account number. It becomes the unique ID.'}
                    </div>
                  )}
                  <label className="flex flex-shrink-0 cursor-pointer select-none items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.accountNumberAutogenerate}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          accountNumberAutogenerate: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-2 border-neutral-600/40 bg-black/20 accent-primary-500 transition-colors focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0 focus:ring-offset-transparent"
                      aria-label="Autogenerate account number"
                    />
                    <span className="text-white/92 text-[0.92rem] font-[650]">
                      Autogenerate
                    </span>
                  </label>
                </div>
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
                  disabled={formData.accountNumberAutogenerate}
                  placeholder={
                    formData.accountNumberAutogenerate
                      ? 'Auto-generated on create'
                      : 'e.g., ACC-0001'
                  }
                  className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:cursor-not-allowed disabled:opacity-60 ${
                    accountAttempted && accountErrors.accountNumber
                      ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                      : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                  }`}
                  autoFocus
                />
                {accountAttempted && accountErrors.accountNumber && (
                  <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                    {accountErrors.accountNumber}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="wiz-currency"
                  className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                >
                  Currency <span className="text-danger-500">*</span>
                </label>
                <Select
                  id="wiz-currency"
                  value={formData.currency}
                  onChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      currency: v as 'COP' | 'USD',
                    }))
                  }
                  options={[
                    { value: 'COP', label: 'COP (Colombian Peso)' },
                    { value: 'USD', label: 'USD (US Dollar)' },
                  ]}
                  aria-label="Currency"
                />
              </div>
            </div>
          </form>
        )}

        {step === 'financial' && selectedType && (
          <form
            id="wiz-financial-form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleNext();
            }}
          >
            <p className="mb-3 text-[0.85rem] opacity-75 sm:mb-4 sm:text-[0.9rem]">
              Amounts, rate, and payment schedule.
            </p>

            <div className="gap-3.75 mt-4 flex flex-col">
              <div className="grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <div
                    ref={totalRemainingTipRef}
                    className="relative mb-1.5 flex items-center gap-1.5"
                    onMouseEnter={() => setTotalRemainingTipOpen(true)}
                    onMouseLeave={() => setTotalRemainingTipOpen(false)}
                  >
                    <label
                      htmlFor="wiz-totalAmountRemaining"
                      className="text-white/92 text-[0.92rem] font-[650]"
                    >
                      Total Remaining <span className="text-danger-500">*</span>
                    </label>
                    <button
                      type="button"
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      aria-label="Total remaining tip"
                      onClick={(e) => {
                        e.preventDefault();
                        setTotalRemainingTipOpen((o) => !o);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                    </button>
                    {totalRemainingTipOpen && (
                      <div
                        className="absolute left-0 top-full z-50 mt-1 max-w-[280px] rounded-lg border border-neutral-600/40 bg-neutral-900 px-3 py-2.5 text-[0.9rem] leading-relaxed text-white shadow-lg"
                        role="tooltip"
                      >
                        The current balance or principal still owed on this
                        account. This amount decreases as you make payments and
                        is used for amortization.
                      </div>
                    )}
                  </div>
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
                      financialAttempted && financialErrors.totalAmountRemaining
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                    autoFocus
                  />
                  {financialAttempted &&
                    financialErrors.totalAmountRemaining && (
                      <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                        {financialErrors.totalAmountRemaining}
                      </div>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-paymentAmount"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Payment Amount <span className="text-danger-500">*</span>
                  </label>
                  <input
                    id="wiz-paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.paymentAmount}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        paymentAmount: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className={`box-border w-full rounded-lg border px-3.5 py-3.5 text-white outline-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      financialAttempted && financialErrors.paymentAmount
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {financialAttempted && financialErrors.paymentAmount && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {financialErrors.paymentAmount}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="wiz-paymentFrequency"
                    className="text-white/92 mb-1.5 block text-[0.92rem] font-[650]"
                  >
                    Frequency <span className="text-danger-500">*</span>
                  </label>
                  <Select
                    id="wiz-paymentFrequency"
                    value={formData.paymentFrequency}
                    onChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        paymentFrequency: v as PaymentFrequency,
                      }))
                    }
                    options={[
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'biweekly', label: 'Bi-weekly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'quarterly', label: 'Quarterly' },
                      { value: 'semi_annually', label: 'Semi-Annually' },
                      { value: 'annually', label: 'Annually' },
                    ]}
                    aria-label="Payment Frequency"
                  />
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
                      financialAttempted && financialErrors.rate
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {financialAttempted && financialErrors.rate && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {financialErrors.rate}
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
                      financialAttempted && financialErrors.nextDueDate
                        ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                        : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                    }`}
                  />
                  {financialAttempted && financialErrors.nextDueDate && (
                    <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                      {financialErrors.nextDueDate}
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
                    Original Amount
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
                    Start Date
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

              <div className="flex flex-col gap-1.5">
                <div
                  ref={numPaymentsTipRef}
                  className="relative mb-1.5 flex items-center gap-1.5"
                  onMouseEnter={() => setNumPaymentsTipOpen(true)}
                  onMouseLeave={() => setNumPaymentsTipOpen(false)}
                >
                  <label
                    htmlFor="wiz-numberOfPayments"
                    className="text-white/92 text-[0.92rem] font-[650]"
                  >
                    # Payments
                    {selectedType !== 'bill' && (
                      <span className="text-danger-500">*</span>
                    )}
                  </label>
                  <button
                    type="button"
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    aria-label="# Payments tip"
                    onClick={(e) => {
                      e.preventDefault();
                      setNumPaymentsTipOpen((o) => !o);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </button>
                  {numPaymentsTipOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 max-w-[280px] rounded-lg border border-neutral-600/40 bg-neutral-900 px-3 py-2.5 text-[0.9rem] leading-relaxed text-white shadow-lg"
                      role="tooltip"
                    >
                      Total scheduled payments (e.g., 12 for a one-year loan).
                      For periodic bills, leave empty to generate periods
                      automatically.
                    </div>
                  )}
                </div>
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
                    financialAttempted && financialErrors.numberOfPayments
                      ? 'border-danger-500/75 bg-black/25 shadow-[0_0_0_6px_rgba(255,107,107,0.16)]'
                      : 'border-neutral-600/40 bg-black/20 focus:border-primary-500/75 focus:bg-black/25 focus:shadow-[0_0_0_6px_rgba(30,64,175,0.25)]'
                  }`}
                  placeholder={
                    selectedType === 'bill'
                      ? 'Leave empty for periodic bills'
                      : 'e.g., 12'
                  }
                />
                {financialAttempted && financialErrors.numberOfPayments && (
                  <div className="mt-1.5 text-[0.88rem] text-[#ffb3b3]">
                    {financialErrors.numberOfPayments}
                  </div>
                )}
                {selectedType === 'bill' && (
                  <div className="mt-1.5 text-[0.86rem] leading-[1.3] opacity-70">
                    Leave empty if this is a periodic bill (periods will be
                    generated automatically).
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        {step === 'review' && selectedType && (
          <div>
            <p className="mb-3 text-[0.85rem] opacity-75 sm:mb-4 sm:text-[0.9rem]">
              Make sure everything looks right before creating the account.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3.5 md-sm:grid-cols-1">
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Type</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {ACCOUNT_TYPE_LABELS[selectedType]}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Currency</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.currency === 'COP'
                    ? 'COP (Colombian Peso)'
                    : 'USD (US Dollar)'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Account Number</div>
                <div className="font-mono font-[650] -tracking-[0.2px]">
                  {formData.accountNumberAutogenerate
                    ? '(Auto-generated)'
                    : formData.accountNumber || '—'}
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
                <div className="mb-1 text-xs opacity-70">Payment Amount</div>
                <div className="font-[650] -tracking-[0.2px]">
                  {formData.paymentAmount
                    ? formatCurrency(
                        parseFloat(formData.paymentAmount),
                        formData.currency
                      )
                    : '—'}
                </div>
              </div>
              <div className="bg-white/8 py-3.75 rounded-lg border border-neutral-700/30 px-4">
                <div className="mb-1 text-xs opacity-70">Payment Frequency</div>
                <div className="font-[650] capitalize -tracking-[0.2px]">
                  {formData.paymentFrequency.replace('_', ' ')}
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
      </div>
    </Modal>
  );
}
