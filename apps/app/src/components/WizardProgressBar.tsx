export interface WizardProgressBarProps {
  currentStepIndex: number;
  totalSteps: number;
  label?: string;
  className?: string;
}

export function WizardProgressBar({
  currentStepIndex,
  totalSteps,
  label,
  className = '',
}: WizardProgressBarProps) {
  const pct = Math.min(
    100,
    Math.max(0, ((currentStepIndex + 1) / totalSteps) * 100)
  );

  return (
    <div className={`mb-6 ${className}`}>
      <div className="h-1 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-white/40">
        <span>
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}
