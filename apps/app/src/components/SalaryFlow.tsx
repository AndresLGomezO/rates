import { useState, useMemo, useEffect } from 'react';
import type {
  SalarySubtype,
  PaymentFrequency,
  CreateIncomeInput,
} from '@rates/firebase-client';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';

type SalaryFlowStep =
  | 'name_employer'
  | 'employment_type'
  | 'frequency'
  | 'amount_method'
  | 'amount_entry'
  | 'timing'
  | 'review';

type AmountMethod = 'take_home' | 'gross' | 'annual' | 'hourly';

interface SalaryFlowProps {
  onBack: () => void;
  onComplete: (data: CreateIncomeInput) => void | Promise<void>;
}

const SUBTYPE_OPTIONS: {
  value: SalarySubtype;
  label: string;
  icon: string;
  help: string;
}[] = [
  {
    value: 'full_time',
    label: 'Full-time employee',
    icon: '🏢',
    help: 'Regular hours, typically 35-40+ hours/week',
  },
  {
    value: 'part_time',
    label: 'Part-time employee',
    icon: '🕐',
    help: 'Regular but reduced hours',
  },
  {
    value: 'hourly',
    label: 'Hourly worker',
    icon: '⏱️',
    help: 'Pay varies based on hours worked',
  },
  {
    value: 'contract',
    label: 'Contract/Temp worker',
    icon: '📋',
    help: 'Fixed-term or project-based employment',
  },
  { value: 'other', label: 'Other', icon: '❓', help: 'None of the above' },
];

const FREQUENCY_OPTIONS: {
  value: PaymentFrequency;
  label: string;
  help: string;
  badge?: string;
}[] = [
  { value: 'weekly', label: 'Every week', help: '52 paychecks per year' },
  {
    value: 'biweekly',
    label: 'Every two weeks',
    help: '26 paychecks per year',
    badge: 'Common',
  },
  {
    value: 'monthly',
    label: 'Once a month',
    help: '12 paychecks per year',
    badge: 'Common',
  },
  { value: 'quarterly', label: 'Quarterly', help: '4 paychecks per year' },
  { value: 'annually', label: 'Annually', help: '1 paycheck per year' },
];

export function SalaryFlow({ onBack, onComplete }: SalaryFlowProps) {
  const [step, setStep] = useState<SalaryFlowStep>('name_employer');

  // Form State
  const [name, setName] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [subtype, setSubtype] = useState<SalarySubtype | null>(null);
  const [frequency, setFrequency] = useState<PaymentFrequency>('biweekly');
  const [amountMethod, setAmountMethod] = useState<AmountMethod>('take_home');
  const [amountValue, setAmountValue] = useState('');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

  // Hourly specific
  const [typicalHoursPerWeek, setTypicalHoursPerWeek] = useState('40');

  // Timing
  const [nextPayDate, setNextPayDate] = useState('');

  const steps: SalaryFlowStep[] = [
    'name_employer',
    'employment_type',
    'frequency',
    'amount_method',
    'amount_entry',
    'timing',
    'review',
  ];

  const currentStepIndex = steps.indexOf(step);

  // Auto-switch amount method if hourly
  useEffect(() => {
    if (subtype === 'hourly') {
      setAmountMethod('hourly');
    } else if (amountMethod === 'hourly') {
      setAmountMethod('take_home');
    }
  }, [subtype, amountMethod]);

  const handleNext = () => {
    if (step === 'name_employer') setStep('employment_type');
    else if (step === 'employment_type') setStep('frequency');
    else if (step === 'frequency') {
      if (subtype === 'hourly') setStep('amount_entry');
      else setStep('amount_method');
    } else if (step === 'amount_method') setStep('amount_entry');
    else if (step === 'amount_entry') setStep('timing');
    else if (step === 'timing') setStep('review');
  };

  const handleBack = () => {
    if (step === 'name_employer') onBack();
    else if (step === 'employment_type') setStep('name_employer');
    else if (step === 'frequency') setStep('employment_type');
    else if (step === 'amount_method') setStep('frequency');
    else if (step === 'amount_entry') {
      if (subtype === 'hourly') setStep('frequency');
      else setStep('amount_method');
    } else if (step === 'timing') setStep('amount_entry');
    else if (step === 'review') setStep('timing');
  };

  const handleFinish = () => {
    if (!subtype) return;

    const amount = parseFloat(amountValue) || 0;
    const hours = parseFloat(typicalHoursPerWeek) || 0;

    const payload = {
      type: 'salary',
      subtype,
      name,
      employerName: employerName || undefined,
      status: 'active',
      currency,
      paymentFrequency: frequency,
      isVariable: subtype === 'hourly',
      nextPayDate: nextPayDate ? new Date(nextPayDate) : undefined,
      ...(amountMethod === 'take_home' && {
        takeHomePay: { amount, currency },
      }),
      ...(amountMethod === 'gross' && { grossPay: { amount, currency } }),
      ...(amountMethod === 'annual' && { annualSalary: { amount, currency } }),
      ...(amountMethod === 'hourly' && {
        hourlyRate: { amount, currency },
        typicalHoursPerWeek: hours,
      }),
    } as CreateIncomeInput;

    void onComplete(payload);
  };

  // Calculations for preview
  const estimates = useMemo(() => {
    const val = parseFloat(amountValue) || 0;
    let monthly = 0;
    let annual = 0;

    if (amountMethod === 'take_home' || amountMethod === 'gross') {
      const multiplier =
        frequency === 'weekly' ? 4.33 : frequency === 'biweekly' ? 2.17 : 1;
      monthly = val * multiplier;
      annual = monthly * 12;
    } else if (amountMethod === 'annual') {
      annual = val;
      monthly = annual / 12;
    } else if (amountMethod === 'hourly') {
      const hours = parseFloat(typicalHoursPerWeek) || 0;
      const weekly = val * hours;
      monthly = weekly * 4.33;
      annual = monthly * 12;
    }

    return { monthly, annual };
  }, [amountValue, amountMethod, frequency, typicalHoursPerWeek]);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace('_', ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'name_employer' && (
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
                placeholder='e.g., "My main job", "Part-time at Target"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Who do you work for? (optional)
              </label>
              <input
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder='e.g., "Acme Corporation"'
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

        {step === 'employment_type' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">What type of work is this?</h2>
            <div className="flex flex-col gap-3">
              {SUBTYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSubtype(opt.value)}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    subtype === opt.value
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-sm text-white/60">{opt.help}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'frequency' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">How often do you get paid?</h2>
            <div className="flex flex-col gap-3">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    frequency === opt.value
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-sm text-white/60">{opt.help}</div>
                  </div>
                  {opt.badge && (
                    <span className="rounded-full bg-primary-500/30 px-2 py-0.5 text-xs text-primary-300">
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'amount_method' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">How much do you earn?</h2>
            <p className="text-sm text-white/60">
              What's the easiest way for you to enter your pay?
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setAmountMethod('take_home')}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  amountMethod === 'take_home'
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-semibold">
                    💵 I know my take-home pay
                  </div>
                  <div className="text-sm text-white/60">
                    The amount that actually hits my bank
                  </div>
                </div>
                <span className="rounded-full bg-green-500/30 px-2 py-0.5 text-xs text-green-300">
                  Easiest
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAmountMethod('gross')}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                  amountMethod === 'gross'
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-semibold">📄 I know my gross pay</div>
                  <div className="text-sm text-white/60">
                    The amount before taxes (from pay stub)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAmountMethod('annual')}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                  amountMethod === 'annual'
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-semibold">
                    📅 I know my annual salary
                  </div>
                  <div className="text-sm text-white/60">
                    My yearly salary before taxes
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAmountMethod('hourly')}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                  amountMethod === 'hourly'
                    ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="font-semibold">⏱️ I know my hourly rate</div>
                  <div className="text-sm text-white/60">
                    Pay based on hours worked
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'amount_entry' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              {amountMethod === 'take_home'
                ? "What's your take-home pay?"
                : amountMethod === 'gross'
                  ? "What's your gross pay?"
                  : amountMethod === 'annual'
                    ? "What's your annual salary?"
                    : "What's your hourly rate?"}
            </h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                {amountMethod === 'hourly'
                  ? 'How much do you earn per hour?'
                  : 'How much do you receive each paycheck?'}
              </label>
              <CurrencyInput
                value={amountValue}
                onChange={setAmountValue}
                className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold placeholder-white/10 focus:border-primary-500 focus:outline-none"
              />
              {amountMethod !== 'annual' && amountMethod !== 'hourly' && (
                <p className="mt-2 text-sm text-white/50">
                  per paycheck ({frequency})
                </p>
              )}
            </div>

            {amountMethod === 'hourly' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  How many hours do you typically work per week?
                </label>
                <input
                  type="number"
                  value={typicalHoursPerWeek}
                  onChange={(e) => setTypicalHoursPerWeek(e.target.value)}
                  className="w-full border-b border-white/30 bg-transparent py-2 text-xl focus:border-primary-500 focus:outline-none"
                />
              </div>
            )}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase text-blue-400">
                Estimated Earnings
              </h4>
              <div className="flex flex-col gap-1 text-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-white/60">Monthly</span>
                  <span className="font-bold">
                    $
                    {estimates.monthly.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="mt-1 flex justify-between border-t border-white/10 pt-1">
                  <span className="text-sm text-white/60">Annual</span>
                  <span className="font-bold">
                    $
                    {estimates.annual.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'timing' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">When do you get paid?</h2>
            <p className="text-sm text-white/60">
              This helps us predict your upcoming income.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                When is your next payday?
              </label>
              <input
                type="date"
                value={nextPayDate}
                onChange={(e) => setNextPayDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
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
                  <p className="text-white/60">
                    {employerName || 'Private Employer'}
                  </p>
                </div>
                <span className="text-3xl">
                  {subtype
                    ? SUBTYPE_OPTIONS.find((o) => o.value === subtype)?.icon
                    : '💼'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Pay frequency</span>
                  <span className="font-semibold capitalize">{frequency}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Amount</span>
                  <span className="font-semibold">
                    ${parseFloat(amountValue).toLocaleString()} (
                    {amountMethod.replace('_', ' ')})
                  </span>
                </div>
                {nextPayDate && (
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-white/50">Next payday</span>
                    <span className="font-semibold">
                      {new Date(nextPayDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-blue-400">
                      Monthly Estimate
                    </span>
                    <span className="font-bold">
                      $
                      {estimates.monthly.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-white/40">
                    <span>Annual Total</span>
                    <span>
                      $
                      {estimates.annual.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={handleBack}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 py-4 font-bold transition-all hover:bg-white/10"
        >
          Back
        </button>
        <button
          onClick={step === 'review' ? handleFinish : handleNext}
          disabled={
            (step === 'name_employer' && !name) ||
            (step === 'employment_type' && !subtype) ||
            (step === 'amount_entry' && !amountValue)
          }
          className="flex-[2] rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-4 font-bold shadow-lg shadow-primary-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {step === 'review' ? 'Save Income ✓' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
