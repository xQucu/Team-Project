import { useEffect, useRef, useState } from "react";

interface WheelPickerProps {
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  onSelect: (value: number) => void;
  onConfirm: (value: number) => void;
  label?: string;
}

export function WheelPicker({
  min,
  max,
  defaultValue,
  unit = "",
  onSelect,
  onConfirm,
  label,
}: WheelPickerProps) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 40; // px

  const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  useEffect(() => {
    if (scrollRef.current) {
      const index = selectedValue - min;
      scrollRef.current.scrollTop = index * itemHeight;
    }
    // Focus container to enable keyboard events
    containerRef.current?.focus();
  }, []);

  const scrollToValue = (val: number) => {
    if (scrollRef.current) {
      const index = val - min;
      scrollRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const value = min + index;
      if (value >= min && value <= max && value !== selectedValue) {
        setSelectedValue(value);
        onSelect(value);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    const nextValue = Math.max(min, Math.min(max, selectedValue + direction));
    if (nextValue !== selectedValue) {
      scrollToValue(nextValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextValue = Math.max(min, selectedValue - 1);
      scrollToValue(nextValue);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextValue = Math.min(max, selectedValue + 1);
      scrollToValue(nextValue);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedValue);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" />
      
      {/* Modal */}
      <div 
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative bg-card rounded-3xl p-6 shadow-2xl border border-border w-full max-w-[320px] animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 focus:outline-none"
      >
        {label && <h3 className="text-lg font-bold mb-6 text-center text-foreground">{label}</h3>}
        
        <div 
          className="relative h-[160px] w-full flex items-center justify-center overflow-hidden mb-2"
          onWheel={handleWheel}
        >
          {/* Selection Highlight */}
          <div className="absolute inset-x-0 top-[60px] h-[40px] bg-primary/20 border-y border-primary/30 pointer-events-none rounded-lg" />
          
          {/* Scrollable Area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar py-[60px]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {range.map((val) => (
              <div
                key={val}
                className={`h-[40px] flex items-center justify-center snap-center transition-all duration-200 ${
                  val === selectedValue ? "text-primary text-2xl font-black" : "text-muted-foreground text-lg opacity-30"
                }`}
              >
                {val}{val === selectedValue && <span className="text-sm ml-1 font-medium">{unit}</span>}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="mt-4 w-full py-4 bg-primary text-primary-foreground text-lg font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 active:scale-[0.98]"
        >
          Confirm {selectedValue}{unit}
        </button>

        <p className="text-[10px] text-center text-muted-foreground mt-4 opacity-50 uppercase tracking-widest">
          Use scroll, arrows, or enter
        </p>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
