import { useState, useMemo } from 'react';
import type {
  FreelanceGigSubtype,
  IncomePredictability,
  RateType,
  GigPlatformType,
  PaymentFrequency,
  CreateIncomeInput,
} from '@rates/firebase-client';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';

type FreelanceFlowStep =
  | 'basic_info'
  | 'classification'
  | 'predictability'
  | 'amount_entry'
  | 'timing'
  | 'review';

interface FreelanceGigFlowProps {
  onBack: () => void;
  onComplete: (data: CreateIncomeInput) => void | Promise<void>;
}

const SUBTYPE_OPTIONS: {
  value: FreelanceGigSubtype;
  label: string;
  icon: string;
  help: string;
}[] = [
  {
    value: 'freelance',
    label: 'Freelancing',
    icon: '💻',
    help: 'Design, writing, development, etc. for various clients.',
  },
  {
    value: 'consulting',
    label: 'Consulting',
    icon: '🎯',
    help: 'Professional advice and expertise. Often project-based.',
  },
  {
    value: 'gig_platform',
    label: 'Gig Platform',
    icon: '🚗',
    help: 'Uber, DoorDash, Upwork, Fiverr, etc.',
  },
  {
    value: 'creative',
    label: 'Creative Work',
    icon: '🎨',
    help: 'Art, music, photography, content creation.',
  },
  {
    value: 'side_hustle',
    label: 'Side Hustle',
    icon: '🌙',
    help: 'Tutoring, pet sitting, odd jobs, etc.',
  },
  { value: 'other', label: 'Other', icon: '❓', help: 'None of the above' },
];

const PLATFORM_OPTIONS: {
  value: GigPlatformType;
  label: string;
  icon: string;
}[] = [
  { value: 'uber', label: 'Uber', icon: '🚙' },
  { value: 'lyft', label: 'Lyft', icon: '🚕' },
  { value: 'doordash', label: 'DoorDash', icon: '🍔' },
  { value: 'instacart', label: 'Instacart', icon: '🛒' },
  { value: 'upwork', label: 'Upwork', icon: '💼' },
  { value: 'fiverr', label: 'Fiverr', icon: '🎨' },
  { value: 'taskrabbit', label: 'TaskRabbit', icon: '🔨' },
  { value: 'etsy', label: 'Etsy', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '❓' },
];

const PREDICTABILITY_OPTIONS: {
  value: IncomePredictability;
  label: string;
  icon: string;
  help: string;
}[] = [
  {
    value: 'highly_predictable',
    label: 'Very predictable',
    icon: '🎯',
    help: "Retainer or ongoing contract. I know exactly what I'll earn.",
  },
  {
    value: 'somewhat_predictable',
    label: 'Somewhat predictable',
    icon: '📈',
    help: 'Regular clients or steady work. Income varies but I can estimate.',
  },
  {
    value: 'variable',
    label: 'Variable',
    icon: '📉',
    help: 'Work comes and goes. Some months are good, some are slow.',
  },
  {
    value: 'unpredictable',
    label: 'Unpredictable',
    icon: '❓',
    help: "Completely irregular. I really can't estimate well.",
  },
];

const RATE_TYPE_OPTIONS: {
  value: RateType;
  label: string;
  icon: string;
  help: string;
}[] = [
  {
    value: 'hourly',
    label: 'Hourly rate',
    icon: '⏱️',
    help: 'I charge by the hour',
  },
  {
    value: 'per_project',
    label: 'Per project',
    icon: '📦',
    help: 'I charge a fixed fee per project',
  },
  {
    value: 'per_task',
    label: 'Per task',
    icon: '🎫',
    help: 'I get paid per delivery, task, or gig',
  },
  {
    value: 'commission',
    label: 'Commission',
    icon: '📊',
    help: 'I earn a percentage of sales',
  },
  {
    value: 'variable',
    label: 'Mixed / It varies',
    icon: '🔀',
    help: 'I use different methods',
  },
];

const FREQUENCY_OPTIONS: {
  value: PaymentFrequency | 'irregular';
  label: string;
}[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'irregular', label: 'Irregular / As paid' },
];

export function FreelanceGigFlow({
  onBack,
  onComplete,
}: FreelanceGigFlowProps) {
  const [step, setStep] = useState<FreelanceFlowStep>('basic_info');

  // Form State
  const [name, setName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [isSideIncome, setIsSideIncome] = useState(false);
  const [subtype, setSubtype] = useState<FreelanceGigSubtype | null>(null);
  const [platformType, setPlatformType] = useState<GigPlatformType | null>(
    null
  );
  const [predictability, setPredictability] =
    useState<IncomePredictability | null>(null);
  const [rateType, setRateType] = useState<RateType>('hourly');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');

  // Amounts
  const [fixedAmount, setFixedAmount] = useState(''); // For retainers or estimates
  const [rateAmount, setRateAmount] = useState('');
  const [volume, setVolume] = useState(''); // hours/week, projects/month, etc.
  const [rangeLow, setRangeLow] = useState('');
  const [rangeHigh, setRangeHigh] = useState('');

  // Timing
  const [frequency, setFrequency] = useState<PaymentFrequency | 'irregular'>(
    'monthly'
  );
  const [nextPaymentDate, setNextPaymentDate] = useState('');

  const steps: FreelanceFlowStep[] = [
    'basic_info',
    'classification',
    'predictability',
    'amount_entry',
    'timing',
    'review',
  ];

  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < steps.length) {
      setStep(steps[nextIdx]);
    }
  };

  const handleBack = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx >= 0) {
      setStep(steps[prevIdx]);
    } else {
      onBack();
    }
  };

  const handleFinish = () => {
    if (!subtype || !predictability) return;

    const isRetainer = predictability === 'highly_predictable';

    const payload: CreateIncomeInput = {
      type: 'freelance' as const,
      subtype,
      name,
      sourceName: sourceName || undefined,
      isSideIncome,
      predictability,
      status: 'active',
      currency,
      isRetainer,
      nextExpectedPayment: nextPaymentDate
        ? new Date(nextPaymentDate)
        : undefined,
      typicalPaymentFrequency: frequency,

      // Amounts
      ...(isRetainer && {
        retainerAmount: { amount: parseFloat(fixedAmount) || 0, currency },
        retainerFrequency: frequency !== 'irregular' ? frequency : 'monthly',
      }),
      ...(!isRetainer && {
        rateType,
        rateAmount: rateAmount
          ? { amount: parseFloat(rateAmount) || 0, currency }
          : undefined,
        estimatedMonthlyIncome: fixedAmount
          ? { amount: parseFloat(fixedAmount) || 0, currency }
          : undefined,
        incomeRangeLow: rangeLow
          ? { amount: parseFloat(rangeLow) || 0, currency }
          : undefined,
        incomeRangeHigh: rangeHigh
          ? { amount: parseFloat(rangeHigh) || 0, currency }
          : undefined,
      }),

      // Volume if applicable
      ...(rateType === 'hourly' &&
        volume && { typicalHoursPerWeek: parseFloat(volume) }),
      ...(rateType === 'per_project' &&
        volume && { typicalProjectsPerMonth: parseFloat(volume) }),
      ...(rateType === 'per_task' &&
        volume && { typicalTasksPerWeek: parseFloat(volume) }),

      // Platform
      ...(subtype === 'gig_platform' && {
        platformType: platformType || 'other',
      }),
    };

    void onComplete(payload);
  };

  // Estimates for preview
  const monthlyEstimate = useMemo(() => {
    if (fixedAmount) return parseFloat(fixedAmount) || 0;
    if (rateAmount && volume) {
      const r = parseFloat(rateAmount) || 0;
      const v = parseFloat(volume) || 0;
      if (rateType === 'hourly') return r * v * 4.33;
      if (rateType === 'per_project') return r * v;
      if (rateType === 'per_task') return r * v * 4.33;
    }
    if (rangeLow && rangeHigh) {
      return (parseFloat(rangeLow) + parseFloat(rangeHigh)) / 2 || 0;
    }
    return 0;
  }, [fixedAmount, rateAmount, volume, rateType, rangeLow, rangeHigh]);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace('_', ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'basic_info' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              Let's add your freelance income
            </h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                What would you like to call this income?
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "Web Design", "Uber driving"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Where does this come from? (optional)
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder='e.g., "Upwork", "Multiple clients"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                Is this your main income source?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSideIncome(false)}
                  className={`flex-1 rounded-xl border p-4 text-center transition-all ${
                    !isSideIncome
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  🎯 Main Income
                </button>
                <button
                  type="button"
                  onClick={() => setIsSideIncome(true)}
                  className={`flex-1 rounded-xl border p-4 text-center transition-all ${
                    isSideIncome
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  📦 Side Income
                </button>
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
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                  { value: 'USD', label: 'USD (US Dollar)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'classification' && (
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
                      : 'border-white/10 bg-white/5'
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

            {subtype === 'gig_platform' && (
              <div className="mt-4 animate-fadeIn">
                <label className="mb-3 block text-sm font-medium text-white/80">
                  Which platform do you use?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORM_OPTIONS.map((plat) => (
                    <button
                      key={plat.value}
                      type="button"
                      onClick={() => setPlatformType(plat.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition-all ${
                        platformType === plat.value
                          ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <span className="text-xl">{plat.icon}</span>
                      <span>{plat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'predictability' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              How predictable is this income?
            </h2>
            <p className="text-sm text-white/60">
              This helps us give you more accurate projections.
            </p>
            <div className="flex flex-col gap-3">
              {PREDICTABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPredictability(opt.value)}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    predictability === opt.value
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5'
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

        {step === 'amount_entry' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">How much do you earn?</h2>

            {predictability === 'highly_predictable' ? (
              <div className="flex flex-col gap-6">
                <p className="text-sm text-white/60">
                  Tell us about your retainer or contract amount.
                </p>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Retainer amount
                  </label>
                  <CurrencyInput
                    value={fixedAmount}
                    onChange={setFixedAmount}
                    className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold placeholder-white/10 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : predictability === 'somewhat_predictable' ? (
              <div className="flex flex-col gap-6">
                <label className="text-sm font-semibold uppercase tracking-wide text-white/90">
                  How do you charge?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RATE_TYPE_OPTIONS.slice(0, 4).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRateType(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                        rateType === opt.value
                          ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {rateType !== 'variable' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        What's your{' '}
                        {rateType === 'hourly' ? 'hourly rate' : 'typical rate'}
                        ?
                      </label>
                      <CurrencyInput
                        value={rateAmount}
                        onChange={setRateAmount}
                        className="w-full border-b border-white/30 bg-transparent py-2 text-2xl font-bold focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">
                        {rateType === 'hourly'
                          ? 'Typical hours per week'
                          : rateType === 'per_project'
                            ? 'Typical projects per month'
                            : 'Typical tasks per week'}
                      </label>
                      <input
                        type="number"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="w-full border-b border-white/30 bg-transparent py-2 text-xl focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <p className="text-sm text-white/60">
                  Since your income varies, tell us your typical monthly range
                  or a best guess.
                </p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-2 block text-xs font-medium text-white/50">
                      Typical Low
                    </label>
                    <CurrencyInput
                      value={rangeLow}
                      onChange={setRangeLow}
                      className="w-full border-b border-white/20 bg-transparent py-2 text-xl font-bold focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-xs font-medium text-white/50">
                      Typical High
                    </label>
                    <CurrencyInput
                      value={rangeHigh}
                      onChange={setRangeHigh}
                      className="w-full border-b border-white/20 bg-transparent py-2 text-xl font-bold focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Or just a monthly average/guess
                  </label>
                  <CurrencyInput
                    value={fixedAmount}
                    onChange={setFixedAmount}
                    className="w-full border-b border-white/30 bg-transparent py-2 text-xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase text-blue-400">
                Estimated Monthly Earnings
              </h4>
              <div className="text-2xl font-bold">
                $
                {monthlyEstimate.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
              <p className="text-xs text-white/40">
                Based on your {predictability?.replace('_', ' ')} inputs
              </p>
            </div>
          </div>
        )}

        {step === 'timing' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">When do you get paid?</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Typical payment frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCY_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className={`rounded-xl border p-3 text-sm transition-all ${
                      frequency === f.value
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Next expected payment? (optional)
              </label>
              <input
                type="date"
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Review your freelance income</h2>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{name}</h3>
                  <p className="text-white/60">
                    {sourceName ||
                      (subtype
                        ? SUBTYPE_OPTIONS.find((s) => s.value === subtype)
                            ?.label
                        : 'Freelance')}
                  </p>
                </div>
                <span className="text-3xl">
                  {subtype
                    ? SUBTYPE_OPTIONS.find((s) => s.value === subtype)?.icon
                    : '🚀'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Type</span>
                  <span className="font-semibold capitalize">
                    {subtype?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Predictability</span>
                  <span className="font-semibold capitalize">
                    {predictability?.replace('_', ' ')}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-blue-400">
                      Estimated Monthly
                    </span>
                    <span className="font-bold">
                      $
                      {monthlyEstimate.toLocaleString(undefined, {
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
            (step === 'basic_info' && !name) ||
            (step === 'classification' && !subtype) ||
            (step === 'predictability' && !predictability) ||
            (step === 'amount_entry' && monthlyEstimate === 0)
          }
          className="flex-[2] rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-4 font-bold shadow-lg shadow-primary-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {step === 'review' ? 'Save Income ✓' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
