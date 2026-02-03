import { useMemo } from 'react';
import { OtherIncome, OtherInsightsService } from '@rates/firebase-client';
import { formatCurrency } from '../../utils/formatters';

interface OtherIncomeTaxWidgetProps {
  otherIncomes: OtherIncome[];
  primaryCurrency?: string;
}

export function OtherIncomeTaxWidget({
  otherIncomes,
  primaryCurrency = 'USD',
}: OtherIncomeTaxWidgetProps) {
  const analysis = useMemo(() => {
    return OtherInsightsService.getTaxSummary(otherIncomes);
  }, [otherIncomes]);

  const {
    taxable,
    nonTaxable,
    depends,
    totalTaxable,
    totalNonTaxable,
    estimatedTaxRange,
  } = analysis;

  if (otherIncomes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-white">
          <span className="text-xl">📋</span> Other Income Tax Summary
        </h3>
      </div>

      <div className="space-y-8">
        {/* Taxable Section */}
        {taxable.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-danger-400">
                LIKELY TAXABLE
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(totalTaxable, primaryCurrency)}
              </span>
            </div>
            <div className="space-y-3">
              {taxable.map(({ income, guidance }, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-danger-500/20 bg-danger-500/10 p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="font-bold text-white">{income.name}</div>
                    <div className="text-sm font-black text-white">
                      {formatCurrency(
                        income.incomeAmount.amount,
                        income.currency
                      )}
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed text-danger-200/80">
                    {guidance.explanation}
                  </div>
                  {guidance.details && (
                    <div className="mt-2 text-[10px] italic text-white/40">
                      {guidance.details}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-primary-500/20 bg-primary-500/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-400">
                    Estimated Tax
                  </div>
                  <div className="text-sm font-bold text-white">
                    ~{formatCurrency(estimatedTaxRange.low, primaryCurrency)} -{' '}
                    {formatCurrency(estimatedTaxRange.high, primaryCurrency)}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    (estimated at 22-27% combined federal + state)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not Taxable Section */}
        {nonTaxable.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-success-400">
                LIKELY NOT TAXABLE
              </span>
              <span className="text-sm font-bold text-white">
                {formatCurrency(totalNonTaxable, primaryCurrency)}
              </span>
            </div>
            <div className="space-y-3">
              {nonTaxable.map(({ income, guidance }, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-success-500/20 bg-success-500/5 p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="font-bold text-white">{income.name}</div>
                    <div className="text-sm font-black text-white">
                      {formatCurrency(
                        income.incomeAmount.amount,
                        income.currency
                      )}
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed text-success-200/80">
                    {guidance.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Depends Section */}
        {depends.length > 0 && (
          <div>
            <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-warning-400">
              DEPENDS / UNKNOWN
            </div>
            <div className="space-y-3">
              {depends.map(({ income, guidance }, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-warning-500/20 bg-warning-500/5 p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="font-bold text-white">{income.name}</div>
                    <div className="text-sm font-black text-white">
                      {formatCurrency(
                        income.incomeAmount.amount,
                        income.currency
                      )}
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed text-warning-200/80">
                    {guidance.explanation}
                  </div>
                  {guidance.details && (
                    <div className="mt-2 text-[10px] italic text-white/40">
                      {guidance.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclosure */}
        <div className="border-t border-white/10 pt-6">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <span>⚠️</span> IMPORTANT
          </div>
          <p className="m-0 text-xs leading-relaxed text-white/50">
            This is general guidance only. Tax rules are complex and depend on
            your specific situation.
          </p>
          <div className="mt-4 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-tighter text-white/30">
              CONSIDER CONSULTING A TAX PROFESSIONAL FOR:
            </div>
            <ul className="m-0 list-none space-y-0.5 p-0 text-[10px] text-white/40">
              <li>• Large inheritances (estate tax may apply)</li>
              <li>• Prizes over $600</li>
              <li>• Self-employment income over $400</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
