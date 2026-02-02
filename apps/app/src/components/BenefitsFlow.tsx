import { useState } from 'react';
import type {
  BenefitSubtype,
  BeneficiaryType,
  PaymentFrequency,
  CreateIncomeInput,
} from '@rates/firebase-client';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';
import { removeUndefined } from '../utils/data';

type BenefitsFlowStep =
  | 'name_beneficiary'
  | 'benefit_type_select'
  | 'benefit_details'
  | 'timing_duration'
  | 'review';

interface BenefitsFlowProps {
  onBack: () => void;
  onComplete: (data: CreateIncomeInput) => void | Promise<void>;
}

const BENEFIT_TYPE_OPTIONS: {
  value: BenefitSubtype;
  label: string;
  icon: string;
  description: string;
  category:
    | 'Retirement'
    | 'Disability'
    | 'Veterans'
    | 'Temporary'
    | 'Family'
    | 'Other';
}[] = [
  {
    value: 'social_security',
    label: 'Social Security Retirement',
    icon: '🏛️',
    description: 'Monthly benefit from SSA',
    category: 'Retirement',
  },
  {
    value: 'pension_government',
    label: 'Pension (Government)',
    icon: '💼',
    description: 'Federal, state, or local government pension',
    category: 'Retirement',
  },
  {
    value: 'pension_military',
    label: 'Military Retirement',
    icon: '🎖️',
    description: 'Military pension or retirement pay',
    category: 'Retirement',
  },
  {
    value: 'pension_private',
    label: 'Pension (Private/Corporate)',
    icon: '🏢',
    description: 'Company pension or defined benefit plan',
    category: 'Retirement',
  },
  {
    value: 'social_security_disability',
    label: 'Social Security Disability (SSDI)',
    icon: '♿',
    description: 'Disability benefits from SSA',
    category: 'Disability',
  },
  {
    value: 'ssi',
    label: 'Supplemental Security Income (SSI)',
    icon: '🆘',
    description: 'Need-based federal assistance',
    category: 'Disability',
  },
  {
    value: 'disability_private',
    label: 'Private Disability Insurance',
    icon: '🏥',
    description: 'Long-term or short-term disability insurance',
    category: 'Disability',
  },
  {
    value: 'workers_comp',
    label: "Workers' Compensation",
    icon: '⚠️',
    description: 'Benefits for work-related injury/illness',
    category: 'Disability',
  },
  {
    value: 'va_benefits',
    label: 'VA Disability/Pension',
    icon: '🎖️',
    description: 'Veterans Affairs benefits',
    category: 'Veterans',
  },
  {
    value: 'unemployment',
    label: 'Unemployment Benefits',
    icon: '📉',
    description: 'State unemployment insurance',
    category: 'Temporary',
  },
  {
    value: 'welfare',
    label: 'Welfare / Public Assistance',
    icon: '🏠',
    description: 'TANF, general assistance, etc.',
    category: 'Temporary',
  },
  {
    value: 'child_support',
    label: 'Child Support',
    icon: '👶',
    description: 'Court-ordered child support payments',
    category: 'Family',
  },
  {
    value: 'alimony',
    label: 'Alimony / Spousal Support',
    icon: '💍',
    description: 'Court-ordered spousal support',
    category: 'Family',
  },
  {
    value: 'other',
    label: 'Other Benefit',
    icon: '❓',
    description: 'Any other type of benefit income',
    category: 'Other',
  },
];

const BENEFICIARY_OPTIONS: {
  value: BeneficiaryType;
  label: string;
  icon: string;
}[] = [
  { value: 'self', label: 'Me (myself)', icon: '👤' },
  { value: 'spouse', label: 'My spouse/partner', icon: '👫' },
  { value: 'child', label: 'My child', icon: '👶' },
  { value: 'household', label: 'Household benefit', icon: '🏠' },
];

const FREQUENCY_OPTIONS: { value: PaymentFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
];

export function BenefitsFlow({ onBack, onComplete }: BenefitsFlowProps) {
  const [step, setStep] = useState<BenefitsFlowStep>('name_beneficiary');

  // Form State
  const [name, setName] = useState('');
  const [beneficiary, setBeneficiary] = useState<BeneficiaryType>('self');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [benefitSubtype, setBenefitSubtype] = useState<BenefitSubtype | null>(
    null
  );
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

  // Benefit Details
  const [benefitAmount, setBenefitAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>('monthly');
  const [isPermanent, setIsPermanent] = useState(true);
  const [benefitSource, setBenefitSource] = useState('');

  // Specifics
  const [isSpousalBenefit, setIsSpousalBenefit] = useState(false);
  const [isSurvivorBenefit, setIsSurvivorBenefit] = useState(false);
  const [expectedColaPercent, setExpectedColaPercent] = useState('');
  const [benefitEndDate, setBenefitEndDate] = useState('');
  const [weeksRemaining, setWeeksRemaining] = useState('');
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState('');
  const [isTaxable, setIsTaxable] = useState<boolean | undefined>(undefined);

  const steps: BenefitsFlowStep[] = [
    'name_beneficiary',
    'benefit_type_select',
    'benefit_details',
    'timing_duration',
    'review',
  ];

  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      onBack();
    }
  };

  const handleFinish = () => {
    if (!benefitSubtype) return;

    const payload: Record<string, unknown> = {
      type: 'benefits',
      name,
      currency,
      beneficiary,
      benefitSubtype,
      benefitAmount: { amount: parseFloat(benefitAmount) || 0, currency },
      paymentFrequency,
      isPermanent,
      status: 'active',
    };

    if (beneficiaryName) payload.beneficiaryName = beneficiaryName;
    if (benefitSource) payload.benefitSource = benefitSource;
    if (isSpousalBenefit) payload.isSpousalBenefit = isSpousalBenefit;
    if (isSurvivorBenefit) payload.isSurvivorBenefit = isSurvivorBenefit;
    if (expectedColaPercent)
      payload.expectedColaPercent = parseFloat(expectedColaPercent);
    if (paymentDayOfMonth)
      payload.paymentDayOfMonth = parseInt(paymentDayOfMonth, 10);
    if (isTaxable !== undefined) payload.isTaxable = isTaxable;

    if (!isPermanent) {
      if (benefitEndDate) payload.benefitEndDate = new Date(benefitEndDate);
      if (weeksRemaining) payload.weeksRemaining = parseInt(weeksRemaining, 10);
    }

    void onComplete(removeUndefined(payload) as unknown as CreateIncomeInput);
  };

  const selectedSubtypeInfo = BENEFIT_TYPE_OPTIONS.find(
    (o) => o.value === benefitSubtype
  );

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace(/_/g, ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'name_beneficiary' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              🏛️ Let's add your benefits income
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
                placeholder='e.g., "Social Security", "Military Pension"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-white/80">
                Who receives this benefit?
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BENEFICIARY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBeneficiary(opt.value)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      beneficiary === opt.value
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div className="font-semibold">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {beneficiary !== 'self' && (
              <div className="animate-slideDown">
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Their name (optional)
                </label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="e.g., Jean Smith"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

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

        {step === 'benefit_type_select' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              📋 What type of benefit is this?
            </h2>
            <div className="flex flex-col gap-6">
              {(
                [
                  'Retirement',
                  'Disability',
                  'Veterans',
                  'Temporary',
                  'Family',
                  'Other',
                ] as const
              ).map((cat) => {
                const options = BENEFIT_TYPE_OPTIONS.filter(
                  (o) => o.category === cat
                );
                if (options.length === 0) return null;
                return (
                  <div key={cat} className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">
                      {cat}
                    </h3>
                    <div className="flex flex-col gap-3">
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setBenefitSubtype(opt.value);
                            // Set defaults based on type
                            if (
                              cat === 'Retirement' ||
                              opt.value === 'social_security_disability' ||
                              opt.value === 'va_benefits'
                            ) {
                              setIsPermanent(true);
                              setPaymentFrequency('monthly');
                            } else if (cat === 'Temporary') {
                              setIsPermanent(false);
                            }

                            if (opt.value === 'unemployment') {
                              setPaymentFrequency('weekly');
                              setIsTaxable(true);
                            }

                            if (
                              opt.value === 'va_benefits' ||
                              opt.value === 'ssi'
                            ) {
                              setIsTaxable(false);
                            }
                          }}
                          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                            benefitSubtype === opt.value
                              ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <div>
                            <div className="font-semibold">{opt.label}</div>
                            <div className="text-sm text-white/60">
                              {opt.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'benefit_details' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              {selectedSubtypeInfo?.icon} Tell us about your{' '}
              {selectedSubtypeInfo?.label}
            </h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                How much do you receive?
              </label>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <CurrencyInput
                    value={benefitAmount}
                    onChange={setBenefitAmount}
                    className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="pb-4 font-medium text-white/40">
                  per {paymentFrequency}
                </div>
              </div>
              <p className="mt-2 text-xs text-white/50">
                💡 Enter the amount actually deposited to your account.
              </p>
            </div>

            {(benefitSubtype === 'social_security' ||
              benefitSubtype === 'social_security_disability') && (
              <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
                <label className="text-sm font-medium text-white/80">
                  Beneficiary Details
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpousalBenefit(false);
                      setIsSurvivorBenefit(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      !isSpousalBenefit && !isSurvivorBenefit
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="text-xl">👤</span>
                    <div>
                      <div className="font-semibold">My own benefit</div>
                      <div className="text-xs text-white/50">
                        Based on my own work history
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpousalBenefit(true);
                      setIsSurvivorBenefit(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      isSpousalBenefit
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="text-xl">👫</span>
                    <div>
                      <div className="font-semibold">Spousal benefit</div>
                      <div className="text-xs text-white/50">
                        Based on spouse's work history
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSurvivorBenefit(true);
                      setIsSpousalBenefit(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      isSurvivorBenefit
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="text-xl">🕊️</span>
                    <div>
                      <div className="font-semibold">Survivor benefit</div>
                      <div className="text-xs text-white/50">
                        Based on deceased spouse's history
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {selectedSubtypeInfo?.category === 'Retirement' && (
              <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Expected annual increase (COLA) %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={expectedColaPercent}
                      onChange={(e) => setExpectedColaPercent(e.target.value)}
                      placeholder="e.g., 2.5"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-white/30">
                      %
                    </span>
                  </div>
                </div>
                {benefitSubtype?.includes('pension') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">
                      Pension Source (optional)
                    </label>
                    <input
                      type="text"
                      value={benefitSource}
                      onChange={(e) => setBenefitSource(e.target.value)}
                      placeholder='e.g., "CalPERS", "General Motors"'
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {!['Retirement', 'Veterans'].includes(
              selectedSubtypeInfo?.category || ''
            ) && (
              <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
                <label className="text-sm font-medium text-white/80">
                  Is this a permanent benefit?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPermanent(true)}
                    className={`flex items-center justify-center rounded-xl border p-4 transition-all ${
                      isPermanent
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="font-bold">Permanent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPermanent(false)}
                    className={`flex items-center justify-center rounded-xl border p-4 transition-all ${
                      !isPermanent
                        ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <span className="font-bold">Temporary</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'timing_duration' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Timing & Duration</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Payment Frequency
              </label>
              <Select
                id="frequency"
                value={paymentFrequency}
                onChange={(v) => setPaymentFrequency(v as PaymentFrequency)}
                options={FREQUENCY_OPTIONS}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Payment day of month (optional)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={paymentDayOfMonth}
                onChange={(e) => setPaymentDayOfMonth(e.target.value)}
                placeholder="e.g., 3"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
              />
            </div>

            {!isPermanent && (
              <div className="flex animate-slideDown flex-col gap-6 border-t border-white/10 pt-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary-400">
                  Duration - When does it end?
                </h3>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Benefits end on:
                  </label>
                  <input
                    type="date"
                    value={benefitEndDate}
                    onChange={(e) => setBenefitEndDate(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="text-center text-sm font-bold text-white/30">
                  — OR —
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Weeks remaining:
                  </label>
                  <input
                    type="number"
                    value={weeksRemaining}
                    onChange={(e) => setWeeksRemaining(e.target.value)}
                    placeholder="e.g., 16"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Review Details</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{name}</h3>
                  <p className="text-white/60">
                    {beneficiary === 'self'
                      ? 'Personal Benefit'
                      : `Benefit for ${beneficiaryName || beneficiary}`}
                  </p>
                </div>
                <span className="text-4xl">
                  {selectedSubtypeInfo?.icon || '🏛️'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Subtype
                  </div>
                  <div className="font-semibold capitalize">
                    {benefitSubtype?.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Status
                  </div>
                  <div className="font-semibold">
                    {isPermanent ? 'Permanent' : 'Temporary'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Frequency
                  </div>
                  <div className="font-semibold capitalize">
                    {paymentFrequency}
                  </div>
                </div>
                {paymentDayOfMonth && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/40">
                      Pay Day
                    </div>
                    <div className="font-semibold">Day {paymentDayOfMonth}</div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="text-xs uppercase tracking-widest text-white/40">
                  Amount
                </div>
                <div className="text-3xl font-bold text-primary-400">
                  {currency === 'USD' ? '$' : 'COP'}
                  {parseFloat(benefitAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-secondary-300 text-xs">
                  per {paymentFrequency}
                </p>
              </div>

              {!isPermanent && (benefitEndDate || weeksRemaining) && (
                <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-200">
                  ⚠️ This benefit is temporary and is scheduled to end{' '}
                  {benefitEndDate
                    ? `on ${benefitEndDate}`
                    : `in ${weeksRemaining} weeks`}
                  .
                </div>
              )}
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
            (step === 'name_beneficiary' && !name) ||
            (step === 'benefit_type_select' && !benefitSubtype) ||
            (step === 'benefit_details' && !benefitAmount) ||
            (step === 'timing_duration' &&
              !isPermanent &&
              !benefitEndDate &&
              !weeksRemaining)
          }
          className="flex-[2] rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-4 font-bold shadow-lg shadow-primary-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {step === 'review' ? 'Save Benefit ✓' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
