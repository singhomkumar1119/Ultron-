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
      title: 'Neural Research & Synthesis',
      description:
        'Ultron analyzes complex domains, cross-references multi-source documentation, and synthesizes structured insights without fluff.',
      icon: Sparkles,
      tag: '01. Cognitive Reasoning',
    },
    {
      title: 'Autonomous Coding Agent',
      description:
        'Describe bugs, refactors, or new architectures. Ultron plans the solution, modifies code, highlights unified diffs, runs test suites, and awaits your approval.',
      icon: Code2,
      tag: '02. Code Synthesis',
    },
    {
      title: 'Spatial Voice & Document Intelligence',
      description:
        'Interact through full-screen real-time voice mode or inspect documents side-by-side with automatic page citations and actionable extract lists.',
      icon: Mic,
      tag: '03. Multimodal Execution',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg p-6 md:p-8 rounded-2xl glass-panel text-white shadow-2xl border border-white/10 transition-all duration-300"
      >
        {/* Glow ambient highlight */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-amber-400 font-mono tracking-wider">
          <span>{step.tag}</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Skip Intro
          </button>
        </div>

        <div className="mt-6 flex flex-col items-start transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <StepIcon className="w-6 h-6" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {step.title}
          </h2>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Step indicator dots & buttons */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-6 bg-amber-400' : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
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
