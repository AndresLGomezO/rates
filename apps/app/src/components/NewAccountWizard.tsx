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
import './NewAccountWizard.css';

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
      <div className="new-account-wizard">
        <div className="wizard-progress" aria-label="Wizard progress">
          <div className="wizard-steps">
            {['Type', 'Details', 'Review', 'Done'].map((label, idx) => (
              <div
                key={label}
                className={[
                  'wizard-step',
                  idx < progressIndex ? 'done' : '',
                  idx === progressIndex ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="wizard-step-dot" aria-hidden="true" />
                <div className="wizard-step-label">{label}</div>
              </div>
            ))}
          </div>
          <div className="wizard-progress-bar" aria-hidden="true">
            <div
              className="wizard-progress-bar-fill"
              style={{ width: `${(progressIndex / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="wizard-error" role="alert">
            {error}
          </div>
        )}

        {step === 'type' && (
          <div className="wizard-panel">
            <div className="wizard-panel-header">
              <h3>Choose an account type</h3>
              <p>Pick the category that best describes this account.</p>
            </div>

            <div className="type-grid" role="list">
              {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    role="listitem"
                    className={[
                      'type-card',
                      selectedType === type ? 'selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedType(type)}
                  >
                    <div className="type-card-title">
                      {ACCOUNT_TYPE_LABELS[type]}
                    </div>
                    <div className="type-card-help">
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
            className="wizard-panel"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleNext();
            }}
          >
            <div className="wizard-panel-header">
              <h3>Account details</h3>
              <p>Fill in the basics. You can always edit later.</p>
            </div>

            <div className="wizard-form">
              <div className="wizard-row">
                <div className="wizard-field">
                  <label htmlFor="wiz-accountNumber">
                    Account Number <span className="required">*</span>
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
                    className={detailsErrors.accountNumber ? 'error' : ''}
                    autoFocus
                  />
                  {detailsErrors.accountNumber && (
                    <div className="wizard-field-error">
                      {detailsErrors.accountNumber}
                    </div>
                  )}
                </div>

                <div className="wizard-field">
                  <label htmlFor="wiz-status">
                    Status <span className="required">*</span>
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
                  >
                    {ACCOUNT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="wizard-field">
                <label htmlFor="wiz-accountName">
                  Account Name <span className="required">*</span>
                </label>
                <input
                  id="wiz-accountName"
                  type="text"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, accountName: e.target.value }))
                  }
                  placeholder="e.g., Personal Loan - Bank ABC"
                  className={detailsErrors.accountName ? 'error' : ''}
                />
                {detailsErrors.accountName && (
                  <div className="wizard-field-error">
                    {detailsErrors.accountName}
                  </div>
                )}
              </div>

              <div className="wizard-field">
                <label htmlFor="wiz-accountDescription">
                  Description <span className="required">*</span>
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
                  className={detailsErrors.accountDescription ? 'error' : ''}
                />
                {detailsErrors.accountDescription && (
                  <div className="wizard-field-error">
                    {detailsErrors.accountDescription}
                  </div>
                )}
              </div>

              <div className="wizard-row">
                <div className="wizard-field">
                  <label htmlFor="wiz-currency">
                    Currency <span className="required">*</span>
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
                  >
                    <option value="COP">COP (Colombian Peso)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="wizard-field hint">
                  <div className="wizard-hint-title">Tip</div>
                  <div className="wizard-hint-body">
                    Use an easy-to-remember account number. It becomes the
                    unique ID.
                  </div>
                </div>
              </div>

              <div className="wizard-row">
                <div className="wizard-field">
                  <label htmlFor="wiz-totalAmountRemaining">
                    Total Amount Remaining <span className="required">*</span>
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
                    className={
                      detailsErrors.totalAmountRemaining ? 'error' : ''
                    }
                  />
                  {detailsErrors.totalAmountRemaining && (
                    <div className="wizard-field-error">
                      {detailsErrors.totalAmountRemaining}
                    </div>
                  )}
                </div>

                <div className="wizard-field">
                  <label htmlFor="wiz-monthlyPayment">
                    Monthly Payment <span className="required">*</span>
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
                    className={detailsErrors.monthlyPayment ? 'error' : ''}
                  />
                  {detailsErrors.monthlyPayment && (
                    <div className="wizard-field-error">
                      {detailsErrors.monthlyPayment}
                    </div>
                  )}
                </div>
              </div>

              <div className="wizard-row">
                <div className="wizard-field">
                  <label htmlFor="wiz-rate">
                    Interest Rate (%) <span className="required">*</span>
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
                    className={detailsErrors.rate ? 'error' : ''}
                  />
                  {detailsErrors.rate && (
                    <div className="wizard-field-error">
                      {detailsErrors.rate}
                    </div>
                  )}
                </div>

                <div className="wizard-field">
                  <label htmlFor="wiz-nextDueDate">
                    Next Due Date <span className="required">*</span>
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
                    className={detailsErrors.nextDueDate ? 'error' : ''}
                  />
                  {detailsErrors.nextDueDate && (
                    <div className="wizard-field-error">
                      {detailsErrors.nextDueDate}
                    </div>
                  )}
                </div>
              </div>

              <div className="wizard-row">
                <div className="wizard-field">
                  <label htmlFor="wiz-originalAmount">
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
                  />
                </div>

                <div className="wizard-field">
                  <label htmlFor="wiz-startDate">Start Date (Optional)</label>
                  <input
                    id="wiz-startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, startDate: e.target.value }))
                    }
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="wizard-row">
                <div className="wizard-field">
                  <label htmlFor="wiz-numberOfPayments">
                    Number of Payments
                    {selectedType !== 'bill' && (
                      <span className="required">*</span>
                    )}
                    {selectedType === 'bill' && (
                      <span className="wizard-inline-help">
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
                    className={detailsErrors.numberOfPayments ? 'error' : ''}
                    placeholder={
                      selectedType === 'bill'
                        ? 'Leave empty for periodic bills'
                        : 'e.g., 12'
                    }
                  />
                  {detailsErrors.numberOfPayments && (
                    <div className="wizard-field-error">
                      {detailsErrors.numberOfPayments}
                    </div>
                  )}
                  {selectedType === 'bill' && (
                    <div className="wizard-field-note">
                      Leave empty if this is a periodic bill (periods will be
                      generated automatically).
                    </div>
                  )}
                </div>

                <div className="wizard-field hint">
                  <div className="wizard-hint-title">Preview</div>
                  <div className="wizard-hint-body">
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
          <div className="wizard-panel">
            <div className="wizard-panel-header">
              <h3>Review</h3>
              <p>
                Make sure everything looks right before creating the account.
              </p>
            </div>

            <div className="review-grid">
              <div className="review-item">
                <div className="review-label">Type</div>
                <div className="review-value">
                  {ACCOUNT_TYPE_LABELS[selectedType]}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Status</div>
                <div className="review-value">
                  {formData.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Account Number</div>
                <div className="review-value mono">
                  {formData.accountNumber || '—'}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Account Name</div>
                <div className="review-value">
                  {formData.accountName || '—'}
                </div>
              </div>
              <div className="review-item full">
                <div className="review-label">Description</div>
                <div className="review-value">
                  {formData.accountDescription || '—'}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Total Remaining</div>
                <div className="review-value">
                  {formData.totalAmountRemaining
                    ? formatCurrency(
                        parseFloat(formData.totalAmountRemaining),
                        formData.currency
                      )
                    : '—'}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Monthly Payment</div>
                <div className="review-value">
                  {formData.monthlyPayment
                    ? formatCurrency(
                        parseFloat(formData.monthlyPayment),
                        formData.currency
                      )
                    : '—'}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Rate</div>
                <div className="review-value">
                  {formData.rate ? `${formData.rate}%` : '—'}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label">Next Due Date</div>
                <div className="review-value">
                  {formData.nextDueDate || getDefaultDueDate()}
                </div>
              </div>
              <div className="review-item">
                <div className="review-label"># Payments</div>
                <div className="review-value">
                  {formData.numberOfPayments || '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="wizard-panel">
            <div className="wizard-success">
              <div className="wizard-success-icon">✓</div>
              <div className="wizard-success-title">
                Account Created Successfully!
              </div>
              <div className="wizard-success-subtitle">
                Your{' '}
                {selectedType
                  ? ACCOUNT_TYPE_LABELS[selectedType].toLowerCase()
                  : 'account'}{' '}
                has been created and is ready to use.
                {createdAccountId && (
                  <div className="wizard-success-account-id">
                    Account ID: {createdAccountId}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="wizard-footer">
          {step === 'success' ? (
            <>
              <button
                type="button"
                className="wizard-btn secondary"
                onClick={handleClose}
                disabled={saving}
              >
                Close
              </button>
              <div className="wizard-footer-spacer" />
              {createdAccountId && (
                <button
                  type="button"
                  className="wizard-btn primary"
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
                className="wizard-btn secondary"
                onClick={step === 'type' ? handleClose : handleBack}
                disabled={saving}
              >
                {step === 'type' ? 'Cancel' : 'Back'}
              </button>

              <div className="wizard-footer-spacer" />

              {step === 'type' && (
                <button
                  type="button"
                  className="wizard-btn primary"
                  onClick={handleNext}
                  disabled={!canContinueFromType}
                >
                  Continue
                </button>
              )}

              {step === 'details' && (
                <button
                  type="submit"
                  className="wizard-btn primary"
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
                  className="wizard-btn primary"
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
