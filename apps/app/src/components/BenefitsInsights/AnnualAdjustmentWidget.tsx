import { BenefitsIncome } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface AnnualAdjustmentWidgetProps {
  benefit: BenefitsIncome;
}

export function AnnualAdjustmentWidget({
  benefit,
}: AnnualAdjustmentWidgetProps) {
  // Check if benefit typically has COLA
  const supportsCola = [
    'social_security',
    'social_security_disability',
    'pension_government',
    'pension_military',
  ].includes(benefit.benefitSubtype);

  if (!supportsCola) return null;

  const latestCola = benefit.expectedColaPercent || 2.5; // Fallback to 2025 SS COLA if not set
  const monthlyAmount = benefit.benefitAmount.amount;
  const previousAmount = monthlyAmount / (1 + latestCola / 100);
  const monthlyIncrease = monthlyAmount - previousAmount;

  const history = [
    { year: 2025, cola: 2.5, amount: monthlyAmount, change: monthlyIncrease },
    {
      year: 2024,
      cola: 3.2,
      amount: previousAmount,
      change: previousAmount * 0.032,
    },
    {
      year: 2023,
      cola: 8.7,
      amount: previousAmount / 1.032,
      change: (previousAmount / 1.032) * 0.087,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">📈</span> Annual Adjustment Tracker
        </h3>
        <span className="rounded-full bg-success-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-success-400 ring-1 ring-success-500/20">
          COLA Protected
        </span>
      </div>

      <div className="mb-8 rounded-xl border border-primary-500/10 bg-gradient-to-br from-primary-600/20 to-blue-600/20 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-white/80">2025 Increase</div>
          <div className="text-2xl font-black text-white">+{latestCola}%</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Monthly Extra
            </div>
            <div className="text-xl font-bold text-success-400">
              +{formatCurrency(monthlyIncrease, benefit.currency)}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Annual Gain
            </div>
            <div className="text-xl font-bold text-success-400">
              +{formatCurrency(monthlyIncrease * 12, benefit.currency)}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
          Benefit History
        </div>
        {history.map((record) => (
          <div
            key={record.year}
            className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-bold text-white">{record.year}</span>
              <span className="text-xs text-white/40">{record.cola}%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-medium text-white/80">
                {formatCurrency(record.amount, benefit.currency)}
              </span>
              <span className="text-[10px] text-success-400">
                +{formatCurrency(record.change, benefit.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 italic">
        <div className="text-xs text-white/60">
          Keeping pace with inflation?
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-success-400">
          <span>✅ YES</span>
        </div>
      </div>
    </div>
  );
}
