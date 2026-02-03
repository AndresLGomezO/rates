import { useMemo } from 'react';
import {
  BenefitsIncome,
  Income,
  BenefitsInsightsService,
} from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface BenefitsTaxRealityWidgetProps {
  benefits: BenefitsIncome[];
  otherIncomes: Income[];
}

export function BenefitsTaxRealityWidget({
  benefits,
  otherIncomes,
}: BenefitsTaxRealityWidgetProps) {
  const analysis = useMemo(() => {
    // For now using a hardcoded marginal rate, in a real app this would come from user profile
    return BenefitsInsightsService.calculateBenefitsTaxReality(
      benefits,
      otherIncomes,
      { marginalRate: 0.22 }
    );
  }, [benefits, otherIncomes]);

  const { totalGross, totalAfterTax, keepPercentage, byBenefit } = analysis;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">💰</span> Benefits After Taxes
        </h3>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-white/60">
        Not all benefits are tax-free. Here's a breakdown of what you actually
        keep after estimated federal taxes.
      </p>

      <div className="mb-8 space-y-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
          Your Benefits Breakdown
        </div>
        {byBenefit.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/5 bg-white/5 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {item.benefit.name}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                  {Math.round(item.taxablePercentage * 100)}% Taxable
                </span>
              </div>
              <div className="text-sm font-bold text-white">
                {formatCurrency(
                  item.benefit.benefitAmount.amount,
                  item.benefit.currency
                )}
                <span className="text-[10px] font-normal text-white/40">
                  {' '}
                  /mo
                </span>
              </div>
            </div>

            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-primary-500 transition-all duration-1000"
                style={{ width: `${100 - item.taxablePercentage * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="italic text-white/40">{item.explanation}</span>
              <span className="font-medium text-danger-400">
                -{formatCurrency(item.monthlyTax, item.benefit.currency)} tax
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary-500/20 bg-primary-500/10 p-5 shadow-inner">
        <div className="mb-4 flex flex-col gap-1 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary-400">
            Monthly Take-Home
          </div>
          <div className="text-4xl font-black text-white">
            {formatCurrency(totalAfterTax, benefits[0]?.currency || 'USD')}
          </div>
          <div className="text-xs text-white/40">
            out of {formatCurrency(totalGross, benefits[0]?.currency || 'USD')}{' '}
            total gross
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-white/60">Keep Rate</span>
            <span className="text-xs font-bold text-success-400">
              {Math.round(keepPercentage)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-success-500 transition-all duration-1000"
              style={{ width: `${keepPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4 italic">
        <span className="text-lg opacity-40">ℹ️</span>
        <p className="m-0 text-[11px] leading-relaxed text-white/40">
          Taxes are estimated based on a 22% marginal rate and current Social
          Security combined income rules. Your actual tax liability may vary.
        </p>
      </div>
    </div>
  );
}
