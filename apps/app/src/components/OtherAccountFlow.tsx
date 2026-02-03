import { useEffect, useMemo, useState } from 'react';
import type {
  CreateFinancialAccountInput,
  PaymentFrequency,
} from '@rates/firebase-client';

import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/formatters';
import { removeUndefined } from '../utils/data';

type CategoryType =
  | 'money_owed'
  | 'payment_plan'
  | 'legal'
  | 'deposit'
  | 'business'
  | 'other';

const CATEGORY_LABELS: Record<CategoryType, string> = {
  money_owed: 'Money I owe someone',
  payment_plan: 'Payment plan',
  legal: 'Legal obligation',
  deposit: 'Deposit I want to track',
  business: 'Business-related',
  other: 'Something else',
};

const CATEGORY_ICONS: Record<CategoryType, string> = {
  money_owed: '💸',
  payment_plan: '🏥',
  legal: '⚖️',
  deposit: '🔒',
  business: '💼',
  other: '📝',
};

const CATEGORY_DESCRIPTIONS: Record<CategoryType, string> = {
  money_owed: 'Personal loan from family/friend, informal IOU',
  payment_plan: 'Medical bills, dental work, furniture, etc.',
  legal: 'Child support, alimony, court-ordered payment',
  deposit: 'Security deposit, escrow, prepayment',
  business: 'Vendor payment, contractor, business expense',
  other: 'You tell us!',
};

const CATEGORY_NICKNAME_HINTS: Record<CategoryType, string> = {
  money_owed: 'e.g., Loan from Dad, IOU to Sarah',
  payment_plan: 'e.g., Dentist Payment Plan, Wayfair',
  legal: 'e.g., Child Support, Settlement',
  deposit: 'e.g., Apartment Deposit, Car Escrow',
  business: 'e.g., Contractor Payment, Supplier',
  other: 'Whatever makes sense to you!',
};

const CATEGORY_NOTES_HINTS: Record<CategoryType, string> = {
  money_owed: 'No interest, pay back by summer',
  payment_plan: '0% if paid in 12 months',
  legal: 'Case #12345, contact: lawyer name',
  deposit: 'Get back when lease ends Aug 2025',
  business: 'Tax-deductible, Reference #ABC123',
  other: 'Any important details',
};

const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annually: 'Semi-Annually',
  annually: 'Annually',
};

type OtherAccountWizardStep =
  | 'category'
  | 'basics'
  | 'amount'
  | 'dates'
  | 'payment'
  | 'details'
  | 'review';

interface OtherAccountFlowProps {
  onBack: () => void;
  onComplete: (
    data: Omit<CreateFinancialAccountInput, 'userId'>
  ) => void | Promise<void>;
  initialData?: Partial<CreateFinancialAccountInput>;
}

export function OtherAccountFlow({
  onBack,
  onComplete,
  initialData,
}: OtherAccountFlowProps) {
  const [step, setStep] = useState<OtherAccountWizardStep>('category');

  // Phase 1: Category
  const [category, setCategory] = useState<CategoryType | null>(null);

  // Phase 2: Basics
  const [nickname, setNickname] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

  // Phase 3: Amount
  const [hasAmount, setHasAmount] = useState<'yes' | 'varies' | 'no' | null>(
    null
  );
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState<'total' | 'remaining'>('total');

  // Phase 4: Dates
  const [hasDate, setHasDate] = useState<boolean | null>(null);
  const [dateType, setDateType] = useState<
    'due' | 'review' | 'end' | 'reminder' | null
  >(null);
  const [date, setDate] = useState('');
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatFrequency, setRepeatFrequency] =
    useState<PaymentFrequency>('monthly');

  // Phase 5: Payment (conditional)
  const [paymentStructure, setPaymentStructure] = useState<
    'regular' | 'lumpsum' | 'unsure' | null
  >(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>('monthly');

  // Phase 6: Details
  const [notes, setNotes] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Initialize from initialData if provided
  useEffect(() => {
    if (initialData) {
      if (initialData.accountName) setNickname(initialData.accountName);
      if (initialData.currency)
        setCurrency(initialData.currency as 'COP' | 'USD');
    }
  }, [initialData]);

  // --- Validation ---
  const canContinueCategory = !!category;
  const canContinueBasics = nickname.trim().length > 0;
  const canContinueAmount = !!hasAmount;
  const canContinueDates = hasDate === false || (hasDate && !!dateType);
  const canContinuePayment =
    !paymentStructure ||
    paymentStructure === 'lumpsum' ||
    paymentStructure === 'unsure' ||
    (paymentStructure === 'regular' && !!paymentAmount);

  // --- Navigation ---
  const handleNext = () => {
    if (step === 'category') setStep('basics');
    else if (step === 'basics') setStep('amount');
    else if (step === 'amount') setStep('dates');
    else if (step === 'dates') {
      // Skip payment step if no amount
      if (hasAmount === 'yes') {
        setStep('payment');
      } else {
        setStep('details');
      }
    } else if (step === 'payment') setStep('details');
    else if (step === 'details') setStep('review');
  };

  const handleBackStep = () => {
    if (step === 'category') onBack();
    else if (step === 'basics') setStep('category');
    else if (step === 'amount') setStep('basics');
    else if (step === 'dates') setStep('amount');
    else if (step === 'payment') setStep('dates');
    else if (step === 'details') {
      // If we have amount, go back to payment, otherwise skip to dates
      if (hasAmount === 'yes') {
        setStep('payment');
      } else {
        setStep('dates');
      }
    } else if (step === 'review') setStep('details');
  };

  const handleFinish = () => {
    if (!category) return;

    const finalAmount =
      hasAmount === 'yes' && amount ? parseFloat(amount) : undefined;
    const finalDate = hasDate && date ? new Date(date) : undefined;

    const rawPayload: Omit<CreateFinancialAccountInput, 'userId'> = {
      accountType: 'other',
      accountName: nickname,
      accountDescription: notes || `${CATEGORY_LABELS[category]}`,
      accountNumber: accountNumber || crypto.randomUUID(),
      currency,
      status: 'active',
      category: category,
      currentAmount:
        finalAmount !== undefined
          ? { amount: finalAmount, currency }
          : undefined,
      nextRelevantDate: finalDate,
      metadata: {
        obligationType: category,
        dateType: dateType ?? undefined,
        isRepeating: isRepeating,
        repeatFrequency: isRepeating ? repeatFrequency : undefined,
        paymentStructure: paymentStructure ?? undefined,
        plannedPaymentAmount:
          paymentStructure === 'regular' && paymentAmount
            ? parseFloat(paymentAmount)
            : undefined,
        plannedPaymentFrequency:
          paymentStructure === 'regular' ? paymentFrequency : undefined,
        amountType: hasAmount === 'yes' ? amountType : undefined,
      },
      paymentLog: [],
    } as unknown as Omit<CreateFinancialAccountInput, 'userId'>;

    void onComplete(removeUndefined(rawPayload));
  };

  const stepsList: OtherAccountWizardStep[] = [
    'category',
    'basics',
    'amount',
    'dates',
    'payment',
    'details',
    'review',
  ];
  const currentStepIndex = stepsList.indexOf(step);

  // Simple payoff calculation for regular payments
  const estimatedPayoff = useMemo(() => {
    if (
      hasAmount === 'yes' &&
      amount &&
      paymentStructure === 'regular' &&
      paymentAmount
    ) {
      const total = parseFloat(amount);
      const payment = parseFloat(paymentAmount);
      if (total > 0 && payment > 0) {
        const payments = Math.ceil(total / payment);
        return payments;
      }
    }
    return null;
  }, [hasAmount, amount, paymentStructure, paymentAmount]);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={stepsList.length}
        label={step.replace('_', ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'category' && (
          <div className="animate-fadeIn">
            <h2 className="mb-3 text-xl font-bold">
              What would you like to track?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(CATEGORY_LABELS) as CategoryType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                    category === key
                      ? 'border-primary-500 bg-primary-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{CATEGORY_ICONS[key]}</span>
                    <div className="text-sm font-semibold">
                      {CATEGORY_LABELS[key]}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    {CATEGORY_DESCRIPTIONS[key]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'basics' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Give this a name
              </label>
              <input
                type="text"
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={
                  category ? CATEGORY_NICKNAME_HINTS[category] : 'Enter a name'
                }
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                Currency
              </label>
              <Select
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

        {step === 'amount' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              Is there a specific amount involved?
            </h2>

            <div className="flex flex-col gap-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  hasAmount === 'yes'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="hasAmount"
                  checked={hasAmount === 'yes'}
                  onChange={() => setHasAmount('yes')}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">
                    Yes, I owe/track a specific amount
                  </span>
                </div>
              </label>

              {hasAmount === 'yes' && (
                <div className="ml-8 animate-fadeIn space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      How much?
                    </label>
                    <CurrencyInput
                      value={amount}
                      onChange={setAmount}
                      placeholder="$0.00"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Is this the total or what's remaining?
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={amountType === 'total'}
                          onChange={() => setAmountType('total')}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">
                          Total amount (I haven't paid any yet)
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={amountType === 'remaining'}
                          onChange={() => setAmountType('remaining')}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">
                          Remaining balance (I've made some payments)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  hasAmount === 'varies'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="hasAmount"
                  checked={hasAmount === 'varies'}
                  onChange={() => setHasAmount('varies')}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">
                    It varies or I'm not sure
                  </span>
                  <span className="text-sm text-white/60">
                    You can track this without a fixed amount and log payments
                    as you go
                  </span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  hasAmount === 'no'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="hasAmount"
                  checked={hasAmount === 'no'}
                  onChange={() => setHasAmount('no')}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">
                    No amount — just tracking a date/reminder
                  </span>
                  <span className="text-sm text-white/60">
                    We'll help you remember the important date
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 'dates' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              Is there an important date to track?
            </h2>

            <div className="flex flex-col gap-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  hasDate === true && dateType === 'due'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="hasDate"
                  checked={hasDate === true && dateType === 'due'}
                  onChange={() => {
                    setHasDate(true);
                    setDateType('due');
                  }}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">
                    Yes — a due date or deadline
                  </span>
                </div>
              </label>

              {hasDate && dateType === 'due' && (
                <div className="ml-8 animate-fadeIn space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      When?
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      Does this repeat?
                    </label>
                    <div className="flex flex-col gap-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={!isRepeating}
                          onChange={() => setIsRepeating(false)}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">
                          No, it's a one-time date
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={isRepeating}
                          onChange={() => setIsRepeating(true)}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">Yes, it repeats:</span>
                      </label>
                      {isRepeating && (
                        <div className="ml-6 animate-fadeIn">
                          <Select
                            value={repeatFrequency}
                            onChange={(v) =>
                              setRepeatFrequency(v as PaymentFrequency)
                            }
                            options={(
                              Object.keys(
                                PAYMENT_FREQUENCY_LABELS
                              ) as PaymentFrequency[]
                            ).map((freq) => ({
                              value: freq,
                              label: PAYMENT_FREQUENCY_LABELS[freq],
                            }))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  hasDate === true && dateType !== 'due' && dateType !== null
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="hasDate"
                  checked={
                    hasDate === true && dateType !== 'due' && dateType !== null
                  }
                  onChange={() => {
                    setHasDate(true);
                    setDateType('review');
                  }}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">
                    Yes — but it's not a due date
                  </span>
                </div>
              </label>

              {hasDate && dateType !== 'due' && dateType !== null && (
                <div className="ml-8 animate-fadeIn space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      What kind of date?
                    </label>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={dateType === 'review'}
                          onChange={() => setDateType('review')}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">
                          Review date (check in on this)
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={dateType === 'end'}
                          onChange={() => setDateType('end')}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">
                          End date (when this resolves)
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          checked={dateType === 'reminder'}
                          onChange={() => setDateType('reminder')}
                          className="text-primary-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">
                          Reminder date (don't forget about this)
                        </span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      When?
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  hasDate === false
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="hasDate"
                  checked={hasDate === false}
                  onChange={() => {
                    setHasDate(false);
                    setDateType(null);
                    setDate('');
                  }}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">No specific date</span>
                  <span className="text-sm text-white/60">
                    You can add one later if needed
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">How will you pay this off?</h2>

            <div className="flex flex-col gap-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  paymentStructure === 'regular'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentStructure === 'regular'}
                  onChange={() => setPaymentStructure('regular')}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">💵 Regular payments</span>
                </div>
              </label>

              {paymentStructure === 'regular' && (
                <div className="ml-8 animate-fadeIn space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      How much per payment?
                    </label>
                    <CurrencyInput
                      value={paymentAmount}
                      onChange={setPaymentAmount}
                      placeholder="$0.00"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/60">
                      How often?
                    </label>
                    <Select
                      value={paymentFrequency}
                      onChange={(v) =>
                        setPaymentFrequency(v as PaymentFrequency)
                      }
                      options={(
                        Object.keys(
                          PAYMENT_FREQUENCY_LABELS
                        ) as PaymentFrequency[]
                      ).map((freq) => ({
                        value: freq,
                        label: PAYMENT_FREQUENCY_LABELS[freq],
                      }))}
                    />
                  </div>

                  {estimatedPayoff !== null && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="text-sm font-semibold text-emerald-400">
                        📅 Estimated Payoff
                      </div>
                      <div className="mt-1 text-lg font-bold">
                        {estimatedPayoff} payments
                      </div>
                      <div className="text-xs text-white/70">
                        At this pace, you'll pay this off in about{' '}
                        {estimatedPayoff} {paymentFrequency} payments
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  paymentStructure === 'lumpsum'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentStructure === 'lumpsum'}
                  onChange={() => setPaymentStructure('lumpsum')}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">
                    🎯 Lump sum / Pay when I can
                  </span>
                  <span className="text-sm text-white/60">
                    Track the total and log payments whenever you make them
                  </span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                  paymentStructure === 'unsure'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentStructure === 'unsure'}
                  onChange={() => setPaymentStructure('unsure')}
                  className="mt-1 h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="block font-medium">🤷 I'm not sure yet</span>
                  <span className="text-sm text-white/60">
                    You can figure this out later
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Optional Details</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Any details you want to remember?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={category ? CATEGORY_NOTES_HINTS[category] : ''}
                rows={4}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-white/50">
                e.g., Payment terms, deadlines, reference numbers, etc.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Account / Reference Number (Optional)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g., Case #12345"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-600/10 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-3xl">
                {category ? CATEGORY_ICONS[category] : '📋'}
              </div>
              <h2 className="mb-1 text-2xl font-bold text-white">{nickname}</h2>
              <div className="font-medium text-amber-300">
                {category ? CATEGORY_LABELS[category] : 'Other Account'}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              {hasAmount === 'yes' && amount && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/60">Amount</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(parseFloat(amount), currency)}
                    <span className="ml-1 text-xs text-white/50">
                      ({amountType === 'total' ? 'Total' : 'Remaining'})
                    </span>
                  </span>
                </div>
              )}

              {hasAmount === 'varies' && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/60">Amount</span>
                  <span className="font-medium text-white/80">
                    Varies (tracked as paid)
                  </span>
                </div>
              )}

              {hasDate && date && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/60">
                    {dateType === 'due'
                      ? 'Due Date'
                      : dateType === 'review'
                        ? 'Review Date'
                        : dateType === 'end'
                          ? 'End Date'
                          : 'Reminder Date'}
                  </span>
                  <span className="font-medium">
                    {date}
                    {isRepeating && dateType === 'due' && (
                      <span className="ml-1 text-xs text-white/50">
                        (Repeats {PAYMENT_FREQUENCY_LABELS[repeatFrequency]})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {paymentStructure === 'regular' && paymentAmount && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/60">Payment Plan</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(parseFloat(paymentAmount), currency)} /{' '}
                    {PAYMENT_FREQUENCY_LABELS[paymentFrequency]}
                  </span>
                </div>
              )}

              {paymentStructure === 'lumpsum' && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/60">Payment Plan</span>
                  <span className="font-medium text-white/80">
                    Lump sum / As able
                  </span>
                </div>
              )}

              {notes && (
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-xs uppercase text-white/40">Notes</span>
                  <span className="text-sm text-white/80">{notes}</span>
                </div>
              )}
            </div>

            {estimatedPayoff !== null && paymentStructure === 'regular' && (
              <div className="rounded-lg bg-blue-500/10 p-4 text-center text-sm text-blue-200">
                📊 At this pace, you'll pay this off in about {estimatedPayoff}{' '}
                payments
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleBackStep}
          className="hover:bg-white/16 cursor-pointer rounded-lg border border-neutral-600/40 bg-white/10 px-5 py-3.5 font-[650] text-white transition-all hover:border-neutral-500/50"
        >
          {step === 'category' ? 'Cancel' : 'Back'}
        </button>
        <div className="flex-1" />
        {step !== 'review' ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (step === 'category' && !canContinueCategory) ||
              (step === 'basics' && !canContinueBasics) ||
              (step === 'amount' && !canContinueAmount) ||
              (step === 'dates' && !canContinueDates) ||
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
