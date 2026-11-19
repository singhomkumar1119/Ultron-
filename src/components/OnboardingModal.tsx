import React, { useState } from 'react';
import { Sparkles, Code2, Mic, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Intelligent Chat & Research',
      description:
        'Ask Ultron anything—from drafting emails and study plans to live web search, maps lookup, and formatted technical breakdowns.',
      icon: Sparkles,
      tag: '01 · Assistant',
    },
    {
      title: 'Built-In Coding Workspace',
      description:
        'Send any code idea directly to the Coding Agent to inspect side-by-side diffs, run tests, and review changes with full control.',
      icon: Code2,
      tag: '02 · Coding Agent',
    },
    {
      title: 'Live Voice & Document Lab',
      description:
        'Talk naturally in full-screen Live Voice mode or inspect long documents alongside clickable citations and extracted action items.',
      icon: Mic,
      tag: '03 · Multimodal Tools',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg p-6 md:p-8 rounded-2xl bg-white dark:bg-[#12151E] text-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-white/10 transition-all duration-200"
      >
        <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide">
          <span>{step.tag}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-col items-start">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <StepIcon className="w-6 h-6" />
          </div>

          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {step.title}
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                    : 'w-2 bg-slate-200 dark:bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}</span>
              {currentStep === steps.length - 1 ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
