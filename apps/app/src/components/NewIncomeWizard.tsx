import { useState, useEffect } from 'react';
import type { IncomeType, CreateIncomeInput } from '@rates/firebase-client';
import { createIncome } from '../services/incomes';
import { SalaryFlow } from './SalaryFlow';
import { FreelanceGigFlow } from './FreelanceGigFlow';
import { RentalFlow } from './RentalFlow';
import { InvestmentFlow } from './InvestmentFlow';
import { BenefitsFlow } from './BenefitsFlow';
import { Modal } from './Modal';

interface NewIncomeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (incomeId: string) => void;
}

const INCOME_TYPE_OPTIONS: {
  type: IncomeType;
  label: string;
  icon: string;
  help: string;
  disabled?: boolean;
}[] = [
  {
    type: 'salary',
    label: 'Salary & Wages',
    icon: '💼',
    help: 'Regular employment income from a job.',
  },
  {
    type: 'freelance',
    label: 'Freelance & Gig',
    icon: '🚀',
    help: 'Income from projects, gig work, or consulting.',
  },
  {
    type: 'rental',
    label: 'Rental Income',
    icon: '🏠',
    help: 'Income from properties you rent out.',
  },
  {
    type: 'investments',
    label: 'Investments',
    icon: '📈',
    help: 'Dividends, interest, or capital gains.',
  },
  {
    type: 'benefits',
    label: 'Benefits',
    icon: '🛡️',
    help: 'Social security, pensions, or other aids.',
  },
  {
    type: 'other',
    label: 'Other',
    icon: '📋',
    help: 'Any other source of income.',
    disabled: true,
  },
];

export function NewIncomeWizard({
  isOpen,
  onClose,
  onCreated,
}: NewIncomeWizardProps) {
  const [step, setStep] = useState<'type' | 'flow'>('type');
  const [selectedType, setSelectedType] = useState<IncomeType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('type');
      setSelectedType(null);
      setError(null);
    }
  }, [isOpen]);

  const handleTypeSelect = (type: IncomeType) => {
    if (
      type !== 'salary' &&
      type !== 'freelance' &&
      type !== 'rental' &&
      type !== 'investments' &&
      type !== 'benefits'
    )
      return;
    setSelectedType(type);
    setStep('flow');
  };

  const handleCreate = async (data: CreateIncomeInput) => {
    try {
      setSaving(true);
      setError(null);
      const incomeId = await createIncome(data);
      onCreated?.(incomeId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'type' ? 'Add Income Source' : `New ${selectedType} Income`
      }
      compactHeader
    >
      <div className="flex flex-col text-white">
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/20 p-3 text-red-200">
            {error}
          </div>
        )}

        {step === 'type' && (
          <div className="animate-fadeIn">
            <p className="mb-6 text-white/60">
              Select the category that best describes your income source.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {INCOME_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleTypeSelect(opt.type)}
                  className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    opt.disabled
                      ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40'
                      : 'border-white/10 bg-white/5 hover:border-primary-500/50 hover:bg-white/10 hover:shadow-lg active:scale-95'
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 font-bold">
                      {opt.label}
                      {opt.disabled && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                          Soon
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{opt.help}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'flow' && selectedType === 'salary' && (
          <SalaryFlow
            onBack={() => setStep('type')}
            onComplete={handleCreate}
          />
        )}

        {step === 'flow' && selectedType === 'freelance' && (
          <FreelanceGigFlow
            onBack={() => setStep('type')}
            onComplete={handleCreate}
          />
        )}

        {step === 'flow' && selectedType === 'rental' && (
          <RentalFlow
            onBack={() => setStep('type')}
            onComplete={handleCreate}
          />
        )}

        {step === 'flow' && selectedType === 'investments' && (
          <InvestmentFlow
            onBack={() => setStep('type')}
            onComplete={handleCreate}
          />
        )}

        {step === 'flow' && selectedType === 'benefits' && (
          <BenefitsFlow
            onBack={() => setStep('type')}
            onComplete={handleCreate}
          />
        )}

        {saving && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <p className="font-bold">Saving Income...</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
