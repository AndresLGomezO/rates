import { useEffect, useMemo, useState } from 'react';
import type {
  CreateFinancialAccountInput,
  RevolvingCreditSubtype,
} from '@rates/firebase-client';

import {
  estimateMinimumPayment,
  calculatePayoff,
  calculateUtilization,
} from '../utils/creditMath';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/formatters';

const CREDIT_SUBTYPE_LABELS: Record<RevolvingCreditSubtype, string> = {
  credit_card: 'Credit Card',
  store_card: 'Store Card',
  line_of_credit: 'Line of Credit',
  overdraft: 'Overdraft',
  other: 'Other',
};

const CREDIT_SUBTYPE_ICONS: Record<RevolvingCreditSubtype, string> = {
  credit_card: '💳',
  store_card: '🏪',
  line_of_credit: '💰',
  overdraft: '🏦',
  other: '📋',
};

type CreditWizardStep =
  | 'subtype'
  | 'basics'
  | 'balance'
  | 'details'
  | 'payment'
  | 'optional'
  | 'review';

interface RevolvingCreditFlowProps {
  onBack: () => void;
  onComplete: (data: Omit<CreateFinancialAccountInput, 'userId'>) => void;
  initialData?: Partial<CreateFinancialAccountInput>;
}

export function RevolvingCreditFlow({
  onBack,
  onComplete,
  initialData,
}: RevolvingCreditFlowProps) {
  const [step, setStep] = useState<CreditWizardStep>('subtype');

  // --- State ---
  // Phase 1: Identification
  const [subtype, setSubtype] = useState<RevolvingCreditSubtype | null>(null);
  const [nickname, setNickname] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

  // Phase 2: Balance
  const [currentBalance, setCurrentBalance] = useState('');
  const [hasNoBalance, setHasNoBalance] = useState(false);

  // Phase 3 & 4: Interest & Limit
  const [apr, setApr] = useState('');
  const [isAprUnknown, setIsAprUnknown] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [isLimitUnknown, setIsLimitUnknown] = useState(false);
  const [minimumPayment, setMinimumPayment] = useState('');
  const [isMinPaymentUnknown, setIsMinPaymentUnknown] = useState(false);

  // Phase 5 & 6: Payment Schedule & Plan
  const [nextDueDate, setNextDueDate] = useState('');
  const [isDueDateUnknown, setIsDueDateUnknown] = useState(false);
  const [paymentStrategy, setPaymentStrategy] = useState<
    'full' | 'fixed_amount' | 'minimum'
  >('minimum');
  const [plannedPaymentAmount, setPlannedPaymentAmount] = useState('');

  // Phase 7: Optional
  const [cashApr, setCashApr] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  // --- Derived State ---
  useEffect(() => {
    if (initialData) {
      if (
        initialData.accountType === 'revolving_credit' ||
        'creditSubtype' in initialData
      ) {
        const data = initialData as { creditSubtype?: RevolvingCreditSubtype };
        if (data.creditSubtype) setSubtype(data.creditSubtype);
      }
      if (initialData.accountName) setNickname(initialData.accountName);
      if (initialData.currency)
        setCurrency(initialData.currency as 'COP' | 'USD');
    }
  }, [initialData]);

  // Auto-estimate minimum payment logic
  useEffect(() => {
    // Only estimate if user hasn't typed anything yet or explicitly asks for it?
    // For now, let's just show a hint or autofill if empty when balance changes?
    // Actually, let's do it on blur or via a button, or just compute it for display.
    // Schema says: "We'll use: $[125] (you can adjust anytime)"
    if (currentBalance && !minimumPayment && !hasNoBalance) {
      const bal = parseFloat(currentBalance);
      const estimated = estimateMinimumPayment(bal);
      if (estimated > 0) {
        setMinimumPayment(estimated.toFixed(2));
      }
    }
  }, [currentBalance, hasNoBalance, minimumPayment]);

  // Payoff Projection
  const payoffProjection = useMemo(() => {
    const bal = parseFloat(currentBalance);
    const rate = parseFloat(apr);
    let payment = 0;

    if (paymentStrategy === 'full') payment = bal;
    else if (paymentStrategy === 'minimum')
      payment = parseFloat(minimumPayment);
    else payment = parseFloat(plannedPaymentAmount);

    if (
      bal > 0 &&
      rate >= 0 &&
      payment > 0 &&
      !Number.isNaN(bal) &&
      !Number.isNaN(rate) &&
      !Number.isNaN(payment)
    ) {
      return calculatePayoff(bal, rate, payment);
    }
    return null;
  }, [
    currentBalance,
    apr,
    paymentStrategy,
    minimumPayment,
    plannedPaymentAmount,
  ]);

  const utilization = useMemo(() => {
    const bal = parseFloat(currentBalance);
    const limit = parseFloat(creditLimit);
    if (bal >= 0 && limit > 0) {
      return calculateUtilization(bal, limit);
    }
    return null;
  }, [currentBalance, creditLimit]);

  // --- Navigation & Validation ---
  const handleNext = () => {
    if (step === 'subtype') setStep('basics');
    else if (step === 'basics') setStep('balance');
    else if (step === 'balance') {
      if (hasNoBalance) {
        // Skip directly to Payment step (Due Date), tracking logic stays simple
        // But actually we might still want details like Limit/APR if they plan to use it?
        // Schema: "Skip to Phase 5: Payment Schedule" (which is 'payment' step here)
        // But Phase 5 needs Due Date.
        // Let's go to details anyway? No, Schema says skip.
        // But if we skip APR/Limit, utilization will be 0/unknown.
        // Let's stick to schema: Skip to Phase 5.
        setStep('payment');
      } else {
        setStep('details');
      }
    } else if (step === 'details') setStep('payment');
    else if (step === 'payment') setStep('optional');
    else if (step === 'optional') setStep('review');
  };

  const handleBackStep = () => {
    if (step === 'subtype') onBack();
    else if (step === 'basics') setStep('subtype');
    else if (step === 'balance') setStep('basics');
    else if (step === 'details') setStep('balance');
    else if (step === 'payment') {
      if (hasNoBalance) setStep('balance');
      else setStep('details');
    } else if (step === 'optional') setStep('payment');
    else if (step === 'review') setStep('optional');
  };

  const handleFinish = () => {
    if (!subtype) return;

    const finalBalance = hasNoBalance ? 0 : parseFloat(currentBalance) || 0;
    const finalApr = isAprUnknown ? 24.99 : parseFloat(apr) || 0;
    const finalLimit = isLimitUnknown
      ? undefined
      : parseFloat(creditLimit) || undefined;

    // Use estimated if missing/unknown? No, safeguard.

    // Construct Payload
    const payload: Omit<CreateFinancialAccountInput, 'userId'> = {
      accountType: 'revolving_credit',
      creditSubtype: subtype,
      accountName: nickname,
      accountDescription: notes || `${CREDIT_SUBTYPE_LABELS[subtype]} Account`,
      accountNumber: accountNumber || crypto.randomUUID(),
      currency,
      status: 'active',
      purchaseApr: finalApr,
      cashApr: cashApr ? parseFloat(cashApr) : undefined,

      creditLimit: finalLimit
        ? {
            amount: finalLimit,
            currency,
          }
        : undefined,

      currentBalance: {
        amount: finalBalance,
        currency,
      },

      currentMinimumPayment:
        parseFloat(minimumPayment) > 0
          ? {
              amount: parseFloat(minimumPayment),
              currency,
            }
          : undefined,

      userPlannedPayment:
        paymentStrategy === 'fixed_amount' &&
        parseFloat(plannedPaymentAmount) > 0
          ? {
              amount: parseFloat(plannedPaymentAmount),
              currency,
            }
          : undefined,

      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
      paymentLog: [],
    } as unknown as Omit<CreateFinancialAccountInput, 'userId'>;

    onComplete(payload);
  };

  // Validation Flags
  const canContinueSubtype = !!subtype;
  const canContinueBasics = nickname.trim().length > 0;
  const canContinueBalance =
    hasNoBalance || (!!currentBalance && parseFloat(currentBalance) >= 0);
  const canContinueDetails =
    (isAprUnknown || !!apr) && (isMinPaymentUnknown || !!minimumPayment); // Limit is optional
  const canContinuePayment = isDueDateUnknown || !!nextDueDate;

  const stepsList: CreditWizardStep[] = [
    'subtype',
    'basics',
    'balance',
    'details',
    'payment',
    'optional',
    'review',
  ];
  const currentStepIndex = stepsList.indexOf(step);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={stepsList.length}
        label={step.replace('_', ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'subtype' && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-xl font-bold">
              What type of account is this?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                Object.keys(CREDIT_SUBTYPE_LABELS) as RevolvingCreditSubtype[]
              ).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSubtype(key)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    subtype === key
                      ? 'border-primary-500 bg-primary-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl">{CREDIT_SUBTYPE_ICONS[key]}</span>
                  <span className="text-sm font-semibold">
                    {CREDIT_SUBTYPE_LABELS[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'basics' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Give this account a nickname
              </label>
              <input
                type="text"
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Chase Sapphire, Home Depot Card"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                Currency
              </label>
              <Select
                id="currency"
                value={currency}
                onChange={(v) => setCurrency(v as 'COP' | 'USD')}
                options={[
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                  { value: 'USD', label: 'USD (US Dollar)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'balance' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Current Balance</h2>
            {!hasNoBalance && (
              <div className="animate-fadeIn">
                <label className="mb-2 block text-sm font-medium text-white/80">
                  What's your current balance?
                </label>
                <CurrencyInput
                  value={currentBalance}
                  onChange={setCurrentBalance}
                  placeholder="$0.00"
                  className="w-full border-b border-white/30 bg-transparent py-2 text-3xl placeholder-white/10 focus:border-primary-500 focus:outline-none"
                />
                <p className="mt-2 text-sm text-white/60">
                  Include any pending charges if possible.
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
              <input
                type="checkbox"
                checked={hasNoBalance}
                onChange={(e) => {
                  setHasNoBalance(e.target.checked);
                  if (e.target.checked) setCurrentBalance('');
                }}
                className="h-5 w-5 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
              />
              <div>
                <span className="block font-medium">
                  I currently have no balance
                </span>
                <span className="text-sm text-white/60">
                  I pay in full every month
                </span>
              </div>
            </label>
          </div>
        )}

        {step === 'details' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Interest & Details</h2>

            {/* APR */}
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Interest Rate (APR)
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    disabled={isAprUnknown}
                    placeholder="24.99"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAprUnknown}
                    onChange={(e) => {
                      setIsAprUnknown(e.target.checked);
                      if (e.target.checked) setApr('24.99'); // Default avg
                    }}
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-sm">Use average (24%)</span>
                </label>
              </div>
            </div>

            {/* Credit Limit & Utilization */}
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Credit Limit (Optional)
              </label>
              <CurrencyInput
                value={creditLimit}
                onChange={setCreditLimit}
                placeholder="$0.00"
                disabled={isLimitUnknown}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
              />
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isLimitUnknown}
                  onChange={(e) => {
                    setIsLimitUnknown(e.target.checked);
                    if (e.target.checked) setCreditLimit('');
                  }}
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <span className="text-sm text-white/60">
                  I don't know / No limit
                </span>
              </label>
              {utilization !== null && (
                <div
                  className={`mt-2 text-sm ${utilization > 30 ? 'text-amber-400' : 'text-emerald-400'}`}
                >
                  Utilization: {utilization.toFixed(1)}%
                  {utilization > 30 ? ' (Try to keep under 30%)' : ' (Great!)'}
                </div>
              )}
            </div>

            {/* Minimum Payment */}
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Minimum Payment
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <CurrencyInput
                    value={minimumPayment}
                    onChange={setMinimumPayment}
                    placeholder="$0.00"
                    disabled={isMinPaymentUnknown}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isMinPaymentUnknown}
                  onChange={(e) => {
                    setIsMinPaymentUnknown(e.target.checked);
                    if (e.target.checked && currentBalance) {
                      const est = estimateMinimumPayment(
                        parseFloat(currentBalance)
                      );
                      setMinimumPayment(est.toFixed(2));
                    }
                  }}
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <span className="text-sm text-white/60">
                  I don't know — estimate it for me
                </span>
              </label>
              <p className="mt-1 text-xs text-white/50">
                We estimated this based on your balance. Adjust if needed.
              </p>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Payment Schedule</h2>

            {/* Due Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                When is your next payment due?
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  disabled={isDueDateUnknown}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
                  min={new Date().toISOString().split('T')[0]}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isDueDateUnknown}
                    onChange={(e) => {
                      setIsDueDateUnknown(e.target.checked);
                      if (e.target.checked) setNextDueDate('');
                    }}
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-white/60">
                    I'm not sure (Set later)
                  </span>
                </label>
              </div>
            </div>

            {/* Payoff Strategy (Only if balance exists) */}
            {!hasNoBalance && (
              <div className="border-t border-white/10 pt-4">
                <label className="mb-3 block text-sm font-medium text-white/80">
                  How do you plan to pay?
                </label>
                <div className="flex flex-col gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-white/5 ${paymentStrategy === 'minimum' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={paymentStrategy === 'minimum'}
                      onChange={() => setPaymentStrategy('minimum')}
                      className="border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                    />
                    <div>
                      <span className="block font-medium">
                        Minimum Payment Only
                      </span>
                      <span className="text-xs text-white/60">
                        Slower payoff, more interest
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-white/5 ${paymentStrategy === 'fixed_amount' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={paymentStrategy === 'fixed_amount'}
                      onChange={() => setPaymentStrategy('fixed_amount')}
                      className="border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                    />
                    <div>
                      <span className="block font-medium">
                        Fixed Monthly Amount
                      </span>
                      <span className="text-xs text-white/60">
                        Pay faster, save interest
                      </span>
                    </div>
                  </label>

                  {paymentStrategy === 'fixed_amount' && (
                    <div className="ml-8 mt-2 animate-fadeIn">
                      <label className="mb-1 block text-xs text-white/60">
                        How much per month?
                      </label>
                      <CurrencyInput
                        value={plannedPaymentAmount}
                        onChange={setPlannedPaymentAmount}
                        placeholder="$0.00"
                        className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-white focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-white/5 ${paymentStrategy === 'full' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10'}`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={paymentStrategy === 'full'}
                      onChange={() => setPaymentStrategy('full')}
                      className="border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                    />
                    <div>
                      <span className="block font-medium">Pay in Full</span>
                      <span className="text-xs text-white/60">
                        Avoid all interest
                      </span>
                    </div>
                  </label>
                </div>

                {/* Projections */}
                {payoffProjection && payoffProjection.months < Infinity && (
                  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="mb-1 text-sm font-semibold text-emerald-400">
                      🚀 Payoff Projection
                    </div>
                    <div className="text-2xl font-bold">
                      {payoffProjection.months} months
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                      Total Interest:{' '}
                      {formatCurrency(payoffProjection.totalInterest, currency)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'optional' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Optional Details</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Account Number (Last 4 digits)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Cash Advance APR
              </label>
              <input
                type="number"
                value={cashApr}
                onChange={(e) => setCashApr(e.target.value)}
                placeholder="29.99"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 0% Interest promo until Dec 2025"
                rows={3}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-indigo-600/10 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-3xl">
                {subtype ? CREDIT_SUBTYPE_ICONS[subtype] : '💳'}
              </div>
              <h2 className="mb-1 text-2xl font-bold text-white">{nickname}</h2>
              <div className="font-medium text-blue-300">
                {CREDIT_SUBTYPE_LABELS[subtype ?? 'credit_card']}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Balance</span>
                <span className="font-mono font-bold">
                  {hasNoBalance
                    ? '$0.00'
                    : formatCurrency(parseFloat(currentBalance), currency)}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Interest Rate</span>
                <span className="font-mono font-bold">
                  {isAprUnknown ? '24.99% (Est)' : `${apr}%`}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Min Payment</span>
                <span className="font-mono font-bold">
                  {hasNoBalance
                    ? '-'
                    : formatCurrency(parseFloat(minimumPayment), currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Next Due</span>
                <span className="font-medium">
                  {isDueDateUnknown ? 'Unknown' : nextDueDate}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleBackStep}
          className="hover:bg-white/16 cursor-pointer rounded-lg border border-neutral-600/40 bg-white/10 px-5 py-3.5 font-[650] text-white transition-all hover:border-neutral-500/50"
        >
          {step === 'subtype' ? 'Cancel' : 'Back'}
        </button>
        <div className="flex-1" />
        {step !== 'review' ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 'subtype' && !canContinueSubtype) ||
              (step === 'basics' && !canContinueBasics) ||
              (step === 'balance' && !canContinueBalance) ||
              (step === 'details' && !canContinueDetails) ||
              (step === 'payment' && !canContinuePayment)
            }
            className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="ds-button-gradient px-5 py-3.5 font-[650] shadow-[0_6px_18px_rgba(30,64,175,0.4)] hover:shadow-[0_10px_24px_rgba(30,64,175,0.5)]"
          >
            Create Account
          </button>
        )}
      </div>
    </div>
  );
}
