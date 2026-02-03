import { useState, useMemo } from 'react';
import type {
  RentalSubtype,
  RentalPlatformType,
  CreateIncomeInput,
} from '@rates/firebase-client';
import { WizardProgressBar } from './WizardProgressBar';
import { Select } from './Select';
import { CurrencyInput } from './CurrencyInput';

type RentalFlowStep =
  | 'name_property'
  | 'rental_type'
  | 'short_term_platform'
  | 'amount_details'
  | 'multi_unit_entry'
  | 'timing_lease'
  | 'short_term_timing'
  | 'review';

interface RentalFlowProps {
  onBack: () => void;
  onComplete: (data: CreateIncomeInput) => void | Promise<void>;
}

const RENTAL_SUBTYPE_OPTIONS: {
  value: RentalSubtype;
  label: string;
  icon: string;
  help: string;
}[] = [
  {
    value: 'long_term',
    label: 'Long-term rental',
    icon: '📋',
    help: 'Traditional lease (6+ months), fixed monthly rent.',
  },
  {
    value: 'short_term',
    label: 'Short-term / Vacation',
    icon: '🏖️',
    help: 'Airbnb, VRBO, or similar nightly/weekly bookings.',
  },
  {
    value: 'room_rental',
    label: 'Room rental',
    icon: '🛏️',
    help: 'Renting a room in your home to a roommate.',
  },
  {
    value: 'commercial',
    label: 'Commercial rental',
    icon: '🏢',
    help: 'Office, retail, or industrial space.',
  },
];

const PLATFORM_OPTIONS: {
  value: RentalPlatformType;
  label: string;
  icon: string;
}[] = [
  { value: 'airbnb', label: 'Airbnb', icon: '🏠' },
  { value: 'vrbo', label: 'VRBO', icon: '🌴' },
  { value: 'booking_com', label: 'Booking.com', icon: '🌐' },
  { value: 'direct', label: 'Direct bookings', icon: '👤' },
  { value: 'property_manager', label: 'Property Manager', icon: '🏢' },
  { value: 'other', label: 'Other', icon: '❓' },
];

export function RentalFlow({ onBack, onComplete }: RentalFlowProps) {
  const [step, setStep] = useState<RentalFlowStep>('name_property');

  // Form State
  const [name, setName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [isPrimaryResidence, setIsPrimaryResidence] = useState<boolean | null>(
    null
  );
  const [rentalSubtype, setRentalSubtype] = useState<RentalSubtype | null>(
    null
  );
  const [platformType, setPlatformType] =
    useState<RentalPlatformType>('airbnb');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('USD');

  // Amount Details
  const [rentalAmount, setRentalAmount] = useState('');
  const [numberOfUnits, setNumberOfUnits] = useState('1');
  const [isPerUnit, setIsPerUnit] = useState(false);
  const [unitAmounts, setUnitAmounts] = useState<string[]>([]);
  const [nightlyRate, setNightlyRate] = useState('');
  const [occupancyPercent, setOccupancyPercent] = useState('60');

  // Timing & Lease
  const [tenantName, setTenantName] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [isMonthToMonth, setIsMonthToMonth] = useState(false);
  const [isCurrentlyVacant, setIsCurrentlyVacant] = useState(false);

  const steps = useMemo(() => {
    const s: RentalFlowStep[] = ['name_property', 'rental_type'];
    if (rentalSubtype === 'short_term') {
      s.push('short_term_platform', 'amount_details', 'short_term_timing');
    } else {
      s.push('amount_details');
      if (parseInt(numberOfUnits) > 1 && isPerUnit) {
        s.push('multi_unit_entry');
      }
      s.push('timing_lease');
    }
    s.push('review');
    return s;
  }, [rentalSubtype, numberOfUnits, isPerUnit]);

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
    if (!rentalSubtype) return;

    const amount = parseFloat(rentalAmount) || 0;
    const nightly = parseFloat(nightlyRate) || 0;

    const payload: Record<string, unknown> = {
      type: 'rental',
      name,
      status: 'active',
      currency,
      rentalSubtype,
      isPrimaryResidence: isPrimaryResidence === true,
      trackNetIncome: false,
      rentalFrequency: 'monthly',
    };

    if (propertyAddress) {
      payload.propertyAddress = { street: propertyAddress };
    }

    if (rentalSubtype === 'short_term') {
      payload.platformType = platformType;
      payload.nightlyRate = { amount: nightly, currency };
      payload.expectedOccupancyPercent = parseInt(occupancyPercent);
      // Estimate monthly income based on nightly rate and occupancy
      payload.rentalAmount = {
        amount: nightly * 30 * (parseInt(occupancyPercent) / 100),
        currency,
      };
    } else {
      payload.rentalAmount = { amount, currency };
      payload.numberOfUnits = parseInt(numberOfUnits);
      if (tenantName) {
        payload.tenantName = tenantName;
      }
      payload.isCurrentlyVacant = isCurrentlyVacant;
      if (!isMonthToMonth && leaseEndDate) {
        payload.leaseEndDate = new Date(leaseEndDate);
      }
    }

    void onComplete(payload as CreateIncomeInput);
  };

  const monthlyEstimate = useMemo(() => {
    if (rentalSubtype === 'short_term') {
      const rate = parseFloat(nightlyRate) || 0;
      const occ = parseInt(occupancyPercent) || 0;
      return (rate * 30 * occ) / 100;
    }
    return parseFloat(rentalAmount) || 0;
  }, [rentalSubtype, rentalAmount, nightlyRate, occupancyPercent]);

  return (
    <div className="flex h-full flex-col text-white">
      <WizardProgressBar
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        label={step.replace(/_/g, ' ')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 pr-2">
        {step === 'name_property' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              🏠 Let's add your rental income
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
                placeholder='e.g., "Main Street Duplex", "Beach House Airbnb"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Property address or identifier (optional)
              </label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder='e.g., "123 Main St, Apt 2B"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/30 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-3 block text-sm font-medium text-white/80">
                Is this property your primary residence?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPrimaryResidence(false)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    isPrimaryResidence === false
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <span className="text-2xl">🏠</span>
                  <div className="text-center">
                    <div className="font-bold">No</div>
                    <div className="text-[10px] text-white/50">
                      Separate investment
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrimaryResidence(true)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    isPrimaryResidence === true
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <span className="text-2xl">🏡</span>
                  <div className="text-center">
                    <div className="font-bold">Yes</div>
                    <div className="text-[10px] text-white/50">
                      I live here (House Hack)
                    </div>
                  </div>
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
                  { value: 'USD', label: 'USD (US Dollar)' },
                  { value: 'COP', label: 'COP (Colombian Peso)' },
                ]}
              />
            </div>
          </div>
        )}

        {step === 'rental_type' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              🔑 What type of rental is this?
            </h2>
            <div className="flex flex-col gap-3">
              {RENTAL_SUBTYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRentalSubtype(opt.value)}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    rentalSubtype === opt.value
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

        {step === 'short_term_platform' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">
              🏝️ How do you manage bookings?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlatformType(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    platformType === opt.value
                      ? 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="font-semibold">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'amount_details' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">💵 Income details</h2>
            {rentalSubtype === 'short_term' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    What's your average nightly rate?
                  </label>
                  <CurrencyInput
                    value={nightlyRate}
                    onChange={setNightlyRate}
                    className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-white/50">
                    After platform fees, if possible
                  </p>
                </div>
                <div>
                  <label className="mb-4 block text-sm font-medium text-white/80">
                    Average occupancy rate:{' '}
                    <span className="font-bold text-primary-400">
                      {occupancyPercent}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={occupancyPercent}
                    onChange={(e) => setOccupancyPercent(e.target.value)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary-500"
                  />
                  <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-white/40">
                    <span>0%</span>
                    <span>
                      ~{Math.round((30 * parseInt(occupancyPercent)) / 100)}{' '}
                      nights/mo
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    What is the monthly rent amount?
                  </label>
                  <CurrencyInput
                    value={rentalAmount}
                    onChange={setRentalAmount}
                    className="w-full border-b border-white/30 bg-transparent py-4 text-3xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    How many units does this cover?
                  </label>
                  <input
                    type="number"
                    value={numberOfUnits}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNumberOfUnits(val);
                      if (parseInt(val) > 1) {
                        setUnitAmounts(
                          new Array(parseInt(val)).fill(rentalAmount)
                        );
                      }
                    }}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                {parseInt(numberOfUnits) > 1 && (
                  <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
                    <input
                      type="checkbox"
                      id="isPerUnit"
                      checked={isPerUnit}
                      onChange={(e) => setIsPerUnit(e.target.checked)}
                      className="h-5 w-5 rounded border-white/20 bg-white/5 accent-primary-500"
                    />
                    <label htmlFor="isPerUnit" className="text-sm font-medium">
                      Rent varies by unit (enter individually)
                    </label>
                  </div>
                )}
              </>
            )}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <h4 className="mb-2 text-xs font-bold uppercase text-blue-400">
                Monthly Estimate
              </h4>
              <div className="text-2xl font-bold">
                $
                {monthlyEstimate.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'multi_unit_entry' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">🏢 Enter rent for each unit</h2>
            <div className="space-y-4">
              {unitAmounts.map((amt, idx) => (
                <div key={idx} className="rounded-xl bg-white/5 p-4">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-white/50">
                    Unit {idx + 1}
                  </label>
                  <CurrencyInput
                    value={amt}
                    onChange={(newVal) => {
                      const newAmounts = [...unitAmounts];
                      newAmounts[idx] = newVal;
                      setUnitAmounts(newAmounts);
                      const total = newAmounts.reduce(
                        (sum, a) => sum + (parseFloat(a) || 0),
                        0
                      );
                      setRentalAmount(total.toString());
                    }}
                    className="w-full border-b border-white/20 bg-transparent py-2 text-xl font-bold focus:border-primary-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'timing_lease' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">📋 Tell us about the lease</h2>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Tenant name (optional)
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder='e.g., "John Smith"'
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsMonthToMonth(true)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  isMonthToMonth
                    ? 'border-primary-500 bg-primary-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div>
                  <div className="font-semibold">🔄 Month-to-month</div>
                  <div className="text-xs text-white/50">No fixed end date</div>
                </div>
              </button>
              <div
                className={`rounded-xl border p-4 transition-all ${
                  !isMonthToMonth
                    ? 'border-primary-500 bg-primary-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <input
                    type="radio"
                    name="leaseType"
                    checked={!isMonthToMonth}
                    onChange={() => setIsMonthToMonth(false)}
                    className="h-5 w-5 bg-white/5 accent-primary-500"
                  />
                  <span className="font-semibold">📅 Fixed lease</span>
                </div>
                {!isMonthToMonth && (
                  <input
                    type="date"
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-black/20 px-4 py-3 focus:border-primary-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
              <input
                type="checkbox"
                id="isVacant"
                checked={isCurrentlyVacant}
                onChange={(e) => setIsCurrentlyVacant(e.target.checked)}
                className="h-5 w-5 rounded bg-white/5 accent-primary-500"
              />
              <label
                htmlFor="isVacant"
                className="text-sm font-medium text-orange-200"
              >
                Property is currently vacant (looking for tenant)
              </label>
            </div>
          </div>
        )}

        {step === 'short_term_timing' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">📅 Consistency & Seasonality</h2>
            <p className="text-sm text-white/60">
              Does your income vary significantly throughout the year?
            </p>
            <div className="space-y-3 font-medium">
              <div className="rounded-xl border border-primary-500 bg-primary-500/20 p-4">
                <div className="font-semibold">🔄 Fairly consistent</div>
                <div className="text-xs text-white/50">
                  Similar occupancy year-round
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 opacity-50">
                <div className="font-semibold">
                  📈 Highly seasonal (Coming soon)
                </div>
                <div className="text-xs text-white/50">
                  Significant peak/off months
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex animate-fadeIn flex-col gap-6">
            <h2 className="text-xl font-bold">Check your details</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{name}</h3>
                  <p className="text-white/60">
                    {propertyAddress || 'New Property'}
                  </p>
                </div>
                <span className="text-4xl">
                  {RENTAL_SUBTYPE_OPTIONS.find((o) => o.value === rentalSubtype)
                    ?.icon || '🏠'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Type
                  </div>
                  <div className="font-semibold capitalize">
                    {rentalSubtype?.replace('_', ' ')}
                  </div>
                </div>
                {rentalSubtype === 'short_term' && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/40">
                      Platform
                    </div>
                    <div className="font-semibold capitalize">
                      {platformType}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40">
                    Currency
                  </div>
                  <div className="font-semibold">{currency}</div>
                </div>
                {rentalSubtype !== 'short_term' && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/40">
                      Units
                    </div>
                    <div className="font-semibold">{numberOfUnits}</div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/40">
                      Estimated Monthly
                    </div>
                    <div className="text-3xl font-bold text-primary-400">
                      ${monthlyEstimate.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {rentalSubtype !== 'short_term' && (
                <div className="pt-2">
                  <div className="mb-1 text-xs uppercase tracking-widest text-white/40">
                    Status
                  </div>
                  <div
                    className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isCurrentlyVacant
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}
                  >
                    {isCurrentlyVacant ? 'Vacant' : 'Occupied'}
                  </div>
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
            (step === 'name_property' && !name) ||
            (step === 'rental_type' && !rentalSubtype) ||
            (step === 'amount_details' &&
              rentalSubtype !== 'short_term' &&
              !rentalAmount) ||
            (step === 'amount_details' &&
              rentalSubtype === 'short_term' &&
              !nightlyRate)
          }
          className="flex-[2] rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 py-4 font-bold shadow-lg shadow-primary-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {step === 'review' ? 'Save Rental ✓' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
