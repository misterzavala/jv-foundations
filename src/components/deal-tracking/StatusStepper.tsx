
import React from "react";

interface StatusStepperProps {
  currentStep: number; // 0-7 (8 total steps)
}

const steps = [
  "Lead Submitted",
  "Qualifying Lead", 
  "Contract Signed",
  "Escrow Opened",
  "Disposition Started",
  "Securing Buyers",
  "Contract Assigned",
  "Closing"
];

export function StatusStepper({ currentStep }: StatusStepperProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-6">
      {/* Desktop: Horizontal Progress Bar */}
      <div className="hidden md:block">
        <ol className="flex justify-between list-none p-0 m-0">
          {steps.map((step, index) => {
            const isComplete = index < currentStep;
            const isActive = index === currentStep;
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;
            
            return (
              <li
                key={index}
                className={`
                  flex-1 relative pb-3.5 text-sm leading-6 font-semibold whitespace-nowrap overflow-visible min-w-0 text-center
                  border-b-2 transition-all duration-200 ease-in-out
                  ${isLast ? 'text-right' : ''}
                  ${isComplete || isActive ? 'text-primary border-b-primary' : 'text-muted-foreground border-b-border'}
                  before:content-[''] before:block before:w-3 before:h-3 before:rounded-full before:border-2
                  before:absolute before:z-30 before:transition-all before:duration-300 before:ease-in-out
                  ${isFirst ? 'before:left-0' : isLast ? 'before:right-0 before:left-auto' : 'before:left-1/2 before:-translate-x-1/2'}
                  before:bottom-[-8px]
                  ${isComplete 
                    ? 'before:bg-primary before:border-primary before:shadow-lg' 
                    : isActive 
                    ? 'before:bg-card before:border-primary before:border-2 dark:before:animate-glow-dark before:animate-glow' 
                    : 'before:bg-border before:border-border'
                  }
                  hover:before:scale-110 hover:before:border-primary
                `}
              >
                {/* Progress line for completed and active steps */}
                {(isComplete || isActive) && !isFirst && (
                  <div
                    className={`
                      absolute bottom-[-2px] z-20 border-b-2 border-primary
                      ${isLast ? 'w-full left-[-100%]' : 'w-full left-[-50%]'}
                    `}
                  />
                )}
                
                {/* Step label - only show for active step or on hover */}
                <span
                  className={`
                    transition-opacity duration-300 ease-in-out
                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    ${isLast ? 'w-full inline-block absolute left-[-100%]' : ''}
                  `}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile: Vertical Stack */}
      <div className="md:hidden space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isActive = index === currentStep;
          
          return (
            <div key={index} className="relative">
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-muted/20">
                {/* Step Indicator */}
                <div
                  className={`w-4 h-4 rounded-full flex-shrink-0 transition-all duration-300 border-2 ${
                    isComplete
                      ? 'bg-primary border-primary shadow-lg'
                      : isActive
                      ? 'bg-card border-primary dark:animate-glow-dark animate-glow'
                      : 'bg-muted border-muted opacity-40'
                  }`}
                />
                
                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium transition-all duration-300 ${
                      isComplete || isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground opacity-40'
                    }`}
                  >
                    {step}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
