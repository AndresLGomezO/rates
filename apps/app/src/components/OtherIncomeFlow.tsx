import { useState, useMemo } from 'react';
import type {
  OtherIncomeSubtype,
  IncomePredictability,
  PaymentFrequency,
  CreateIncomeInput,
} from '@rates/firebase-client';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';
import { removeUndefined } from '../utils/data';
import { formatCurrency } from '../utils/formatters';

type OtherIncomeWizardStep =
  | 'category'
  | 'type_choice'
  | 'details'
  | 'additional'
  | 'review';

const SUBTYPE_LABELS: Record<OtherIncomeSubtype, string> = {
  gift: 'Gift',
  inheritance: 'Inheritance',
  prize_lottery: 'Prize / Lottery',
  sale_personal_items: 'Sold Personal Items',
  insurance_settlement: 'Insurance Settlement',
  legal_settlement: 'Legal Settlement',
  tax_refund: 'Tax Refund',
  rebate_cashback: 'Rebate / Cash Back',
  odd_jobs: 'Odd Jobs / Informal Work',
  crypto_airdrop: 'Crypto Airdrop',
  found_money: 'Found Money',
  stipend: 'Stipend',
  allowance: 'Allowance',
  reimbursement: 'Reimbursement',
  other: 'Other',
};

const SUBTYPE_ICONS: Record<OtherIncomeSubtype, string> = {
  gift: '🎁',
  inheritance: '🏛️',
  prize_lottery: '🎰',
  sale_personal_items: '🏷️',
  insurance_settlement: '🛡️',
  legal_settlement: '⚖️',
  tax_refund: '💰',
  rebate_cashback: '🔄',
  odd_jobs: '🔧',
  crypto_airdrop: '🪙',
  found_money: '🔍',
  stipend: '📚',
  allowance: '👨‍👩‍👧',
  reimbursement: '📋',
  other: '❓',
};

const PAYMENT_FREQUENCY_OPTIONS: {
  value: PaymentFrequency | 'irregular';
  label: string;
}[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'irregular', label: 'Irregular (no set schedule)' },
];

interface OtherIncomeFlowProps {
  onBack: () => void;
  onComplete: (data: CreateIncomeInput) => void | Promise<void>;
}

export function OtherIncomeFlow({ onBack, onComplete }: OtherIncomeFlowProps) {
  const [step, setStep] = useState<OtherIncomeWizardStep>('category');

  // Data State
  const [name, setName] = useState('');
  const [subtype, setSubtype] = useState<OtherIncomeSubtype>('other');
  const [isOneTime, setIsOneTime] = useState<boolean>(true);

  // One-time Details
  const [amount, setAmount] = useState('');
  const [isReceived, setIsReceived] = useState(true);
  const [incomeDate, setIncomeDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [incomeSource, setIncomeSource] = useState('');

  // Recurring Details
  const [frequency, setFrequency] = useState<PaymentFrequency | 'irregular'>(
    'monthly'
  );
  const [predictability, setPredictability] =
    useState<IncomePredictability>('highly_predictable');

  // Additional Details
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [isTaxable, setIsTaxable] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

  // Navigation
  const steps: OtherIncomeWizardStep[] = [
    'category',
    'type_choice',
    'details',
    'additional',
    'review',
  ];
  const currentStepIndex = steps.indexOf(step);

  const canContinue = useMemo(() => {
    if (step === 'category') return name.trim().length > 0;
    if (step === 'type_choice') return true;
    if (step === 'details') {
      if (isOneTime) return !!amount && !!incomeDate;
      return !!amount && !!frequency;
    }
    if (step === 'additional') return true;
    return true;
  }, [step, name, amount, incomeDate, isOneTime, frequency]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBackStep = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    } else {
      onBack();
    }
  };

  const handleFinish = () => {
    const commonProps = {
      name,
      type: 'other' as const,
      subtype,
      currency,
      incomeAmount: { amount: parseFloat(amount) || 0, currency },
      incomeSource: incomeSource || undefined,
      notes: notes || undefined,
      isTaxable: isTaxable === null ? undefined : isTaxable,
    };

    let payload: CreateIncomeInput;

    if (isOneTime) {
      payload = {
        ...commonProps,
        status: 'one_time',
        isOneTime: true,
        includeInProjections: !isReceived,
        incomeDate: new Date(incomeDate),
        isReceived,
      } as CreateIncomeInput;
    } else {
      payload = {
        ...commonProps,
        status: 'active',
        isOneTime: false,
        includeInProjections: true,
        paymentFrequency: frequency as PaymentFrequency,
        predictability,
        endDate: hasEndDate && endDate ? new Date(endDate) : undefined,
      } as CreateIncomeInput;
    }

    void onComplete(removeUndefined(payload));
  };

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace(/_/g, ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'category' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Let's add your income</h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                What would you like to call this income?
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Birthday gift, Tax refund"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                What type of income is this? (optional)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(SUBTYPE_LABELS) as OtherIncomeSubtype[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSubtype(st)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
                        subtype === st
                          ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl">{SUBTYPE_ICONS[st]}</span>
                      <span className="text-xs font-medium">
                        {SUBTYPE_LABELS[st]}
                      </span>
                    </button>
                  )
                )}
              </div>
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
                  { value: 'USD', label: 'USD (US Dollar)' },
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'type_choice' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              Is this a one-time or recurring income?
            </h2>
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsOneTime(true);
                  handleNext();
                }}
                className={`flex flex-col gap-2 rounded-xl border p-6 text-left transition-all ${
                  isOneTime
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <span className="text-lg font-bold">One-time</span>
                </div>
                <p className="text-sm text-white/60">
                  A single payment received or expected. e.g., Gift, tax refund.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOneTime(false);
                  handleNext();
                }}
                className={`flex flex-col gap-2 rounded-xl border p-6 text-left transition-all ${
                  !isOneTime
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔄</span>
                  <span className="text-lg font-bold">Recurring</span>
                </div>
                <p className="text-sm text-white/60">
                  Income received regularly. e.g., Allowance, stipends.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              {isOneTime ? 'One-time Details' : 'Recurring Details'}
            </h2>

            <div className="flex flex-col gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  {isOneTime
                    ? 'How much is/was this income?'
                    : 'How much do you typically receive?'}
                </label>
                <CurrencyInput
                  value={amount}
                  onChange={setAmount}
                  className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                />
              </div>

              {isOneTime ? (
                <>
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-medium text-white/80">
                      Have you received this money yet?
                    </label>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => setIsReceived(true)}
                        className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                          isReceived
                            ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isReceived ? 'border-primary-500' : 'border-white/30'}`}
                        >
                          {isReceived && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold">
                            Yes, I already received it
                          </div>
                          <div className="text-xs text-white/50">
                            When did you receive it?
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsReceived(false)}
                        className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                          !isReceived
                            ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${!isReceived ? 'border-primary-500' : 'border-white/30'}`}
                        >
                          {!isReceived && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold">No, I'm expecting it</div>
                          <div className="text-xs text-white/50">
                            When do you expect it?
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Date
                    </label>
                    <input
                      type="date"
                      value={incomeDate}
                      onChange={(e) => setIncomeDate(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      How often?
                    </label>
                    <Select
                      value={frequency}
                      onChange={(v) =>
                        setFrequency(v as PaymentFrequency | 'irregular')
                      }
                      options={PAYMENT_FREQUENCY_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Predictability
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        {
                          id: 'highly_predictable',
                          label: 'Very predictable',
                          sub: 'Same amount, same time',
                        },
                        {
                          id: 'somewhat_predictable',
                          label: 'Somewhat predictable',
                          sub: 'Usually comes, amount may vary',
                        },
                        {
                          id: 'variable',
                          label: 'Variable / Unpredictable',
                          sub: 'Irregular frequency or amount',
                        },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setPredictability(p.id as IncomePredictability)
                          }
                          className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                            predictability === p.id
                              ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className="font-bold">{p.label}</span>
                          <span className="text-xs text-white/50">{p.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'additional' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Additional Details</h2>

            <div className="flex flex-col gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Source (optional)
                </label>
                <input
                  type="text"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  placeholder="e.g., Grandma, Company Name"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {!isOneTime && (
                <button
                  type="button"
                  onClick={() => setHasEndDate(!hasEndDate)}
                  className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                    hasEndDate
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold font-medium">
                      Has an end date?
                    </div>
                    <div className="text-left text-xs text-white/50">
                      Does this income stream stop at some point?
                    </div>
                  </div>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-all ${hasEndDate ? 'border-primary-500 bg-primary-500' : 'border-white/20'}`}
                  >
                    {hasEndDate && (
                      <span className="text-xs text-white">✓</span>
                    )}
                  </div>
                </button>
              )}

              {hasEndDate && !isOneTime && (
                <div className="animate-slideDown">
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="mb-3 block text-sm font-medium text-white/80">
                  Is this taxable?
                </label>
                <div className="flex gap-2">
                  {[
                    { value: true, label: 'Yes' },
                    { value: false, label: 'No' },
                    { value: null, label: 'Not Sure' },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setIsTaxable(opt.value)}
                      className={`flex-1 rounded-lg border py-3 font-medium transition-all ${
                        isTaxable === opt.value
                          ? 'border-primary-500 bg-primary-500/20 font-bold text-primary-300 ring-1 ring-primary-500'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Review your income</h2>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{name}</h3>
                  <p className="text-white/60">{SUBTYPE_LABELS[subtype]}</p>
                </div>
                <span className="text-4xl">{SUBTYPE_ICONS[subtype]}</span>
              </div>

              <div className="space-y-4">
                <div className="text-secondary-50 flex justify-between border-b border-white/5 pb-2 text-sm">
                  <span className="text-white/50">Type</span>
                  <span className="font-semibold">
                    {isOneTime ? 'One-time' : 'Recurring'}
                  </span>
                </div>
                <div className="text-secondary-50 flex justify-between border-b border-white/5 pb-2 text-sm">
                  <span className="text-white/50">Amount</span>
                  <span className="font-semibold">
                    {formatCurrency(parseFloat(amount) || 0, currency)}
                  </span>
                </div>
                {!isOneTime && (
                  <div className="text-secondary-50 flex justify-between border-b border-white/5 pb-2 text-sm">
                    <span className="text-white/50">Frequency</span>
                    <span className="font-semibold capitalize">
                      {frequency}
                    </span>
                  </div>
                )}
                <div className="text-secondary-50 flex justify-between border-b border-white/5 pb-2 text-sm">
                  <span className="text-white/50">
                    {isOneTime
                      ? isReceived
                        ? 'Received Date'
                        : 'Expected Date'
                      : 'Duration'}
                  </span>
                  <span className="font-semibold">
                    {isOneTime
                      ? incomeDate
                      : hasEndDate
                        ? `Ends ${endDate}`
                        : 'Ongoing'}
                  </span>
                </div>

                {notes && (
                  <div className="border-t border-white/10 pt-2">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-white/40">
                      Notes
                    </div>
                    <div className="text-sm italic text-white/80">
                      "{notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handleBackStep}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 py-4 font-bold transition-all hover:bg-white/10"
        >
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={step === 'review' ? handleFinish : handleNext}
          className="flex-[2] rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-4 font-bold shadow-lg shadow-primary-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {step === 'review' ? 'Save Income ✓' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
