/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sprout, 
  Compass, 
  Award, 
  Bell, 
  Search,
  CheckCircle2,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { User as UserType } from '../types';

interface OnboardingTourProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  selector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'bottom' | 'top' | 'center';
}

// Helper to get the currently visible DOM element among multiple possible selector matches or comma-separated selectors
const getVisibleElement = (selectorStr: string): HTMLElement | null => {
  if (!selectorStr) return null;
  
  const selectors = selectorStr.split(',').map(s => s.trim());
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const r = el.getBoundingClientRect();
      // Element is visible if it has a non-zero layout size
      if (r.width > 0 && r.height > 0) {
        return el;
      }
    }
  }
  
  return document.querySelector(selectors[0]) as HTMLElement | null;
};

export default function OnboardingTour({ user, isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipHeight, setTooltipHeight] = useState(180);

  const steps: TourStep[] = [
    {
      selector: '',
      title: `Welcome to Adubiaro, ${user.name.split(' ')[0]}!`,
      description: "We're thrilled to partner with you. Let's take a brief 1-minute interactive tour of your secure investor suite to show you how to monitor your land assets, track processed payouts, and fetch certified deeds.",
      icon: <Sprout className="h-10 w-10 text-[#D4A017] animate-bounce" />,
      position: 'center'
    },
    {
      selector: '#investor-stats-grid',
      title: "Real-Time Portfolio Metrics",
      description: "Your absolute capital allocation is indexed here. Monitor active oil palm investments, total deeded hectares, and official land survey clearance credentials at a single glance.",
      icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
      position: 'bottom'
    },
    {
      selector: '#investor-farms-list',
      title: "Deed-Allocated Estates",
      description: "This registry displays each high-yield oil palm farm estate you hold deed ownership in. Click on any estate block to view land boundaries, drone logs, and chronicled farm manager updates.",
      icon: <Compass className="h-6 w-6 text-emerald-600" />,
      position: 'bottom'
    },
    {
      selector: '#investor-plots-table',
      title: "Granular Acreage specifications",
      description: "View specific oil palm cultivar classifications, certified hectarage sizes, and notarized covenant identifiers for every plot allocated to your portfolio.",
      icon: <Award className="h-6 w-6 text-amber-500" />,
      position: 'top'
    },
    {
      selector: '#notification-wrapper',
      title: "Live Alerts & Processed Payouts",
      description: "Your notification center. You will receive real-time, instantaneous alerts directly here whenever a quarterly ROI payout has been processed or when survey documents are ready for download.",
      icon: <Bell className="h-6 w-6 text-emerald-600" />,
      position: 'bottom'
    },
    {
      selector: '#global-search-container, #mobile-search-container',
      title: "Universal Registry Lookup",
      description: "Quickly lookup specific estate blocks, land plots, contract serials, processed payout periods, or shared deed archives across the entire platform.",
      icon: <Search className="h-6 w-6 text-[#D4A017]" />,
      position: 'bottom'
    },
    {
      selector: '',
      title: "Your Portfolio is Secured",
      description: "You're all set to explore! All transactions, plot boundaries, and quarterly returns are fully synchronized, backed by notarized legal covenants. Enjoy transparent, hassle-free agricultural investment.",
      icon: <CheckCircle2 className="h-12 w-12 text-[#52B788]" />,
      position: 'center'
    }
  ];

  const step = steps[currentStep];

  // Measure tooltip size to prevent layout overflow
  useEffect(() => {
    const measure = () => {
      if (tooltipRef.current) {
        setTooltipHeight(tooltipRef.current.offsetHeight);
      }
    };
    measure();
    // Small timeout to let rendering layout stabilize
    const timer = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [currentStep, isOpen]);

  // Track active target element position with multi-stage updates as smooth scroll completes
  useEffect(() => {
    if (!isOpen) {
      setRect(null);
      return;
    }

    if (!step.selector) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const element = getVisibleElement(step.selector);
      if (element) {
        setRect(element.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    // Scroll into view centered on step change
    const element = getVisibleElement(step.selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Run initial update plus delayed updates to capture final state after smooth scroll ends
    updatePosition();
    const timers = [
      setTimeout(updatePosition, 100),
      setTimeout(updatePosition, 300),
      setTimeout(updatePosition, 600),
      setTimeout(updatePosition, 1000)
    ];

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      timers.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, step.selector, isOpen]);

  if (!isOpen) return null;

  // Calculate Tooltip coordinate styles with strict anti-overlapping guarantees
  const getTooltipStyle = () => {
    const margin = 16;
    const tooltipWidth = Math.min(340, window.innerWidth - 32);

    // If there is no targeted spotlight element, place it dead center in the viewport
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
        zIndex: 100,
        width: `${tooltipWidth}px`
      };
    }

    // For Mobile & Tablet views (width < 1024px) or short screens (height < 768px):
    // Use the foolproof "opposite vertical half" placement.
    // If the spotlight's vertical center is in the top half of the screen, place the tooltip at the bottom.
    // If the spotlight's vertical center is in the bottom half of the screen, place the tooltip at the top.
    const isConstrainedScreen = window.innerWidth < 1024 || window.innerHeight < 768;

    if (isConstrainedScreen) {
      const spotlightCenterY = rect.top + rect.height / 2;
      const isInTopHalf = spotlightCenterY < window.innerHeight / 2;

      if (isInTopHalf) {
        return {
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed' as const,
          zIndex: 100,
          width: `${tooltipWidth}px`
        };
      } else {
        return {
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed' as const,
          zIndex: 100,
          width: `${tooltipWidth}px`
        };
      }
    }

    // On Desktop PCs (width >= 1024px and height >= 768px), try a smart relative placement
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + margin;
    let left = rect.left + (rect.width - tooltipWidth) / 2;

    // Boundary check for horizontal overflow
    left = Math.max(24, Math.min(window.innerWidth - tooltipWidth - 24, left));

    // If there's not enough space below, place it above the element
    if (spaceBelow < tooltipHeight + margin && spaceAbove > tooltipHeight + margin) {
      top = rect.top - tooltipHeight - margin;
    } else if (spaceBelow < tooltipHeight + margin && spaceAbove < tooltipHeight + margin) {
      // Fallback: If neither above nor below has enough space, use the vertical opposite-half method
      const spotlightCenterY = rect.top + rect.height / 2;
      if (spotlightCenterY < window.innerHeight / 2) {
        return {
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed' as const,
          zIndex: 100,
          width: `${tooltipWidth}px`
        };
      } else {
        return {
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          position: 'fixed' as const,
          zIndex: 100,
          width: `${tooltipWidth}px`
        };
      }
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed' as const,
      zIndex: 100,
      width: `${tooltipWidth}px`
    };
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem(`onboarding_tour_completed_${user.id}`, 'true');
    } catch (e) {
      console.warn('LocalStorage error saving onboarding progress', e);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] overflow-hidden pointer-events-auto">
        {/* Spotlight Mask */}
        {rect ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed border-2 border-[#D4A017] shadow-[0_0_0_9999px_rgba(7,20,14,0.7)] backdrop-blur-[0.5px] rounded-2xl pointer-events-none transition-all duration-300 z-40"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
          >
            {/* Pulsing ring around the spotlight */}
            <div className="absolute inset-0 border border-white rounded-2xl animate-ping opacity-60" />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#07140e]/65 backdrop-blur-[1px] z-40"
            onClick={currentStep === 0 ? undefined : handleComplete}
          />
        )}

        {/* Tooltip Card */}
        <motion.div
          ref={tooltipRef}
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={getTooltipStyle()}
          className="bg-white dark:bg-stone-900 border border-[#2D6A4F]/20 dark:border-stone-800 w-full max-w-[340px] rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col justify-between select-text z-50"
        >
          {/* Close button */}
          <button 
            onClick={handleComplete}
            className="absolute top-4 right-4 p-1.5 text-gray-400 dark:text-stone-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer"
            title="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon and Title */}
          <div className="space-y-3.5 pr-2">
            <div className="flex items-center gap-3">
              {step.icon}
              <div className="text-[10px] font-mono font-bold text-[#D4A017] tracking-widest uppercase">
                Step {currentStep} of {steps.length - 1}
              </div>
            </div>
            
            <h3 className="font-serif font-extrabold text-[#1B4332] dark:text-stone-100 text-lg tracking-wide leading-tight">
              {step.title}
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-stone-400 font-sans leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Footer Controls */}
          <div className="mt-6 pt-4 border-t border-gray-150 dark:border-stone-800/80 flex items-center justify-between">
            {/* Step Indicators */}
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep 
                      ? 'w-4 bg-[#D4A017]' 
                      : 'w-1.5 bg-gray-200 dark:bg-stone-800'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="p-1.5 border border-gray-200 dark:border-stone-800 text-gray-600 dark:text-stone-400 hover:bg-neutral-50 dark:hover:bg-stone-800 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition shadow-sm"
              >
                <span>{currentStep === 0 ? "Let's Go" : currentStep === steps.length - 1 ? "Finish" : "Next"}</span>
                {currentStep < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
