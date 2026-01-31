import { useEffect, useMemo, useState } from 'react';
import type {
  BillSubtype,
  CreateFinancialAccountInput,
  PaymentFrequency,
} from '@rates/firebase-client';

import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';
import { formatCurrency } from '../utils/formatters';

const BILL_SUBTYPE_LABELS: Record<BillSubtype, string> = {
  rent: 'Rent or Lease',
  utility: 'Utility',
  subscription: 'Subscription',
  insurance: 'Insurance',
  tax: 'Tax Payment',
  other: 'Other',
};

const BILL_SUBTYPE_ICONS: Record<BillSubtype, string> = {
  rent: '🏠',
  utility: '💡',
  subscription: '📺',
  insurance: '🛡️',
  tax: '🧾',
  other: '📦',
};

const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  quarterly: 'Quarterly',
  semi_annually: 'Twice a year',
  annually: 'Yearly',
  daily: 'Daily',
};

type BillWizardStep =
  | 'subtype'
  | 'basics'
  | 'frequency' // Recurring vs One-time, Fixed vs Variable
  | 'amount'
  | 'dates'
  | 'details'
  | 'review';

interface BillFlowProps {
  onBack: () => void;
  onComplete: (data: Omit<CreateFinancialAccountInput, 'userId'>) => void;
  initialData?: Partial<CreateFinancialAccountInput>;
}

export function BillFlow({ onBack, onComplete, initialData }: BillFlowProps) {
  const [step, setStep] = useState<BillWizardStep>('subtype');

  // --- State ---

  // Phase 1: Basic Identification
  const [subtype, setSubtype] = useState<BillSubtype | null>(null);
  const [nickname, setNickname] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

  // Phase 2: Recurring or One-Time
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [isAmountVariable, setIsAmountVariable] = useState(false);

  // Amount
  const [amount, setAmount] = useState(''); // Stores fixed amount, typical amount, or one-time amount
  const [isAmountUnknown, setIsAmountUnknown] = useState(false);

  // Phase 3 & 4: Timeline
  const [nextDueDate, setNextDueDate] = useState('');
  const [isDueDateUnknown, setIsDueDateUnknown] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  // Phase 5: Optional Details
  const [payee, setPayee] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');

  // --- Effects ---

  // Smart Defaults for Nickname based on Subtype
  useEffect(() => {
    if (subtype && !initialData?.accountName) {
      const defaults: Partial<Record<BillSubtype, string>> = {
        rent: 'Apartment Rent',
        utility: 'Electric Bill',
        subscription: 'Netflix',
        insurance: 'Car Insurance',
        tax: 'Property Tax',
      };
      const defaultName = defaults[subtype];
      if (defaultName) {
        setNickname((prev) => prev || defaultName);
      }
    }
  }, [subtype, initialData]);

  // Smart Defaults for Frequency based on Subtype
  useEffect(() => {
    if (subtype) {
      if (subtype === 'tax') setFrequency('quarterly');
      else if (subtype === 'insurance')
        setFrequency('monthly'); // Could be annual too
      else setFrequency('monthly'); // Rent, Utility, Sub defaults
    }
  }, [subtype]);

  // Init from initialData
  useEffect(() => {
    if (initialData) {
      if (initialData.accountType === 'bill' || 'billSubtype' in initialData) {
        const data = initialData as { billSubtype?: BillSubtype };
        if (data.billSubtype) setSubtype(data.billSubtype);
      }
      if (initialData.accountName) setNickname(initialData.accountName);
      if (initialData.currency)
        setCurrency(initialData.currency as 'COP' | 'USD');
    }
  }, [initialData]);

  // --- Calculations ---

  const annualCost = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    const val = parseFloat(amount);

    if (!isRecurring) return val; // Just the one-time payment

    const multipliers: Record<PaymentFrequency, number> = {
      daily: 365,
      weekly: 52,
      biweekly: 26,
      monthly: 12,
      quarterly: 4,
      semi_annually: 2,
      annually: 1,
    };

    return val * (multipliers[frequency] || 1);
  }, [amount, isRecurring, frequency]);

  // --- Navigation & Validation ---

  const handleNext = () => {
    if (step === 'subtype') setStep('basics');
    else if (step === 'basics') setStep('frequency');
    else if (step === 'frequency') setStep('amount');
    else if (step === 'amount') setStep('dates');
    else if (step === 'dates') setStep('details');
    else if (step === 'details') setStep('review');
  };

  const handleBackStep = () => {
    if (step === 'subtype') onBack();
    else if (step === 'basics') setStep('subtype');
    else if (step === 'frequency') setStep('basics');
    else if (step === 'amount') setStep('frequency');
    else if (step === 'dates') setStep('amount');
    else if (step === 'details') setStep('dates');
    else if (step === 'review') setStep('details');
  };

  const handleFinish = () => {
    if (!subtype) return;

    const finalAmount = amount ? parseFloat(amount) : 0;
    const finalNextDueDate =
      !isDueDateUnknown && nextDueDate ? new Date(nextDueDate) : undefined;
    const finalEndDate = hasEndDate && endDate ? new Date(endDate) : undefined;

    // Construct payload with strict types and spread for optional fields
    const payload = {
      accountType: 'bill' as const,
      billSubtype: subtype,
      accountName: nickname,
      accountDescription: notes || `${BILL_SUBTYPE_LABELS[subtype]} Account`,
      accountNumber: accountNumber || crypto.randomUUID(),
      currency,
      status: 'active' as const,
      isRecurring,
      isAmountVariable: isRecurring ? isAmountVariable : false,
      paymentLog: [],
      ...(isRecurring
        ? {
            paymentFrequency: frequency,
            ...(finalAmount > 0
              ? { recurringAmount: { amount: finalAmount, currency } }
              : {}),
            ...(finalEndDate ? { endDate: finalEndDate } : {}),
          }
        : {}),
      ...(finalNextDueDate ? { nextDueDate: finalNextDueDate } : {}),
    };

    onComplete(payload);
  };

  // Validation
  const canContinueSubtype = !!subtype;
  const canContinueBasics = nickname.trim().length > 0;
  // Frequency step is always valid as it has defaults
  const canContinueAmount =
    isAmountUnknown || (!!amount && parseFloat(amount) > 0);
  const canContinueDates = isDueDateUnknown || !!nextDueDate;

  const stepsList: BillWizardStep[] = [
    'subtype',
    'basics',
    'frequency',
    'amount',
    'dates',
    'details',
    'review',
  ];
  const currentStepIndex = stepsList.indexOf(step);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={stepsList.length}
        label={step.replace(/^\w/, (c) => c.toUpperCase())}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'subtype' && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-xl font-bold">What type of bill?</h2>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(BILL_SUBTYPE_LABELS) as BillSubtype[]).map(
                (key) => (
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
                    <span className="text-3xl">{BILL_SUBTYPE_ICONS[key]}</span>
                    <span className="text-sm font-semibold">
                      {BILL_SUBTYPE_LABELS[key]}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {step === 'basics' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Give this bill a name
              </label>
              <input
                type="text"
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Apartment Rent"
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
                  { value: 'USD', label: 'USD (US Dollar)' }, // Swapped order based on typical bill defaults? default is COP in state though.
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'frequency' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div>
              <h2 className="mb-3 text-lg font-bold">Recurring or One-time?</h2>
              <div className="flex flex-col gap-3">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
                    isRecurring
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurring"
                    checked={isRecurring}
                    onChange={() => setIsRecurring(true)}
                    className="h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="block font-medium">
                      🔄 Recurring — I pay this regularly
                    </span>
                    <span className="text-sm text-white/60">
                      Examples: Rent, Netflix, Insurance
                    </span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all ${
                    !isRecurring
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurring"
                    checked={!isRecurring}
                    onChange={() => setIsRecurring(false)}
                    className="h-5 w-5 border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="block font-medium">
                      1️⃣ One-time — Just this once
                    </span>
                    <span className="text-sm text-white/60">
                      Examples: Annual tax, one-time fee
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {isRecurring && (
              <div className="animate-slideUp space-y-4 border-t border-white/10 pt-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                    How often do you pay?
                  </label>
                  <Select
                    value={frequency}
                    onChange={(v) => setFrequency(v as PaymentFrequency)}
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                    Does the amount vary?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        checked={!isAmountVariable}
                        onChange={() => setIsAmountVariable(false)}
                        className="text-primary-500 focus:ring-offset-0"
                      />
                      <span>💵 Same amount (Fixed)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        checked={isAmountVariable}
                        onChange={() => setIsAmountVariable(true)}
                        className="text-primary-500 focus:ring-offset-0"
                      />
                      <span>📊 It varies (Variable)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'amount' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              {isRecurring
                ? isAmountVariable
                  ? "What's a typical amount?"
                  : 'How much is this bill?'
                : 'How much is the payment?'}
            </h2>

            <div>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                disabled={isAmountUnknown}
                placeholder="$0.00"
                className="w-full border-b border-white/30 bg-transparent py-2 text-3xl placeholder-white/10 focus:border-primary-500 focus:outline-none disabled:opacity-50"
              />
              {isRecurring && (
                <p className="mt-2 text-sm text-white/60">
                  per {PAYMENT_FREQUENCY_LABELS[frequency].toLowerCase()}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAmountUnknown}
                onChange={(e) => {
                  setIsAmountUnknown(e.target.checked);
                  if (e.target.checked) setAmount('');
                }}
                className="h-4 w-4 rounded border-white/30 bg-transparent text-primary-500 focus:ring-offset-0"
              />
              <span className="text-sm text-white/60">
                I don't know / Skip for now
              </span>
            </label>

            {isAmountVariable && (
              <div className="rounded-lg bg-blue-500/10 p-4 text-sm text-blue-200">
                💡 Since this varies, we'll ask you to log the exact amount each
                time you pay. This estimate helps us plan your monthly expenses.
              </div>
            )}
          </div>
        )}

        {step === 'dates' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Timeline</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                When is it due?
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  disabled={isDueDateUnknown}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none disabled:opacity-50"
                  required // Force browser validation somewhat if we utilized forms, but we use controlled state
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
                    I'm not sure — remind me to check
                  </span>
                </label>
              </div>
            </div>

            {isRecurring && (
              <div className="border-t border-white/10 pt-4">
                <label className="mb-3 block text-sm font-medium text-white/80">
                  Does this bill have an end date?
                </label>
                <div className="flex flex-col gap-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={!hasEndDate}
                      onChange={() => setHasEndDate(false)}
                      className="text-primary-500 focus:ring-offset-0"
                    />
                    <span>No, it's ongoing</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={hasEndDate}
                      onChange={() => setHasEndDate(true)}
                      className="text-primary-500 focus:ring-offset-0"
                    />
                    <span>Yes, it ends on...</span>
                  </label>
                </div>
                {hasEndDate && (
                  <div className="mt-3 animate-fadeIn">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={
                        nextDueDate || new Date().toISOString().split('T')[0]
                      }
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'details' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Optional Details</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Who do you pay? (Payee)
              </label>
              <input
                type="text"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="e.g. Comcast, Landlord"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Account / Reference Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. Policy #12345678"
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
                placeholder="e.g. Cancel before July"
                rows={3}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-indigo-600/10 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-3xl">
                {subtype ? BILL_SUBTYPE_ICONS[subtype] : '📄'}
              </div>
              <h2 className="mb-1 text-2xl font-bold text-white">{nickname}</h2>
              <div className="font-medium text-purple-300">
                {subtype ? BILL_SUBTYPE_LABELS[subtype] : 'Bill'}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Amount</span>
                <span className="font-mono font-bold">
                  {amount
                    ? formatCurrency(parseFloat(amount), currency)
                    : 'Unknown'}
                  {isRecurring &&
                    amount &&
                    ` / ${PAYMENT_FREQUENCY_LABELS[frequency].replace('Monthly', 'mo').replace('Weekly', 'wk').replace('Yearly', 'yr')}`}
                </span>
              </div>
              {isRecurring && (
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/60">Annual Cost</span>
                  <span className="font-mono font-bold text-amber-200">
                    {formatCurrency(annualCost, currency)}/yr
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/60">Next Due</span>
                <span className="font-medium">
                  {isDueDateUnknown ? 'Remind me later' : nextDueDate}
                </span>
              </div>
              {hasEndDate && (
                <div className="flex justify-between">
                  <span className="text-white/60">Ends</span>
                  <span className="font-medium">{endDate}</span>
                </div>
              )}
            </div>

            {isAmountVariable && (
              <p className="text-center text-sm text-white/50">
                * Variable amounts will be tracked as you pay them.
              </p>
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
              (step === 'amount' && !canContinueAmount) ||
              (step === 'dates' && !canContinueDates)
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
            Create Bill
          </button>
        )}
      </div>
    </div>
  );
}
