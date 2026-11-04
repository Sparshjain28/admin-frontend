import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface VisualDateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  onChange: (start: string, end: string) => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const padZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const formatToYMD = (year: number, month: number, day: number) => {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
};

const formatDisplayDate = (ymdStr: string) => {
  if (!ymdStr) return '';
  const parts = ymdStr.split('-');
  if (parts.length !== 3) return ymdStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${shortMonths[month] || parts[1]} ${year}`;
};

const getDaysDifference = (fromYMD: string, toYMD: string) => {
  if (!fromYMD || !toYMD) return 0;
  const d1 = new Date(fromYMD);
  const d2 = new Date(toYMD);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const VisualDateRangePicker: React.FC<VisualDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  onClear,
  placeholder = 'Date',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Current view month (0-indexed) & year for the left calendar
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external props change
  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate, endDate]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHoverDate(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Next month helper for dual-view
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  // Day click handler (Goibibo 2-click selection flow)
  const handleDateClick = (dateStr: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      // 1st click: Set Start Date
      setDraftStart(dateStr);
      setDraftEnd('');
      setHoverDate(null);
    } else if (draftStart && !draftEnd) {
      // 2nd click: Set End Date
      if (dateStr < draftStart) {
        // If clicked date is earlier than start date, make it the new start date
        setDraftStart(dateStr);
        setDraftEnd('');
      } else {
        setDraftEnd(dateStr);
        setHoverDate(null);
      }
    }
  };


  const handleApply = () => {
    if (draftStart && !draftEnd) {
      // Single date selected -> start & end same
      onChange(draftStart, draftStart);
    } else if (draftStart && draftEnd) {
      onChange(draftStart, draftEnd);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setDraftStart('');
    setDraftEnd('');
    setHoverDate(null);
    onClear();
  };

  // Render month grid
  const renderMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay() - 1; // Mon = 0, Sun = 6
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }

    // Determine current effective range (with hover)
    const effectiveStart = draftStart;
    const effectiveEnd = draftEnd || (hoverDate && draftStart && hoverDate >= draftStart ? hoverDate : '');

    return (
      <div className="w-full sm:w-[260px] select-none">
        {/* Month Header */}
        <div className="text-center font-bold text-sm text-foreground mb-3">
          {MONTH_NAMES[month]} {year}
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-9 w-9" />;
            }

            const dateStr = formatToYMD(year, month, day);
            const isStart = draftStart === dateStr;
            const isEnd = (draftEnd && draftEnd === dateStr) || (!draftEnd && hoverDate === dateStr && draftStart && dateStr > draftStart);
            const isSameDayRange = draftStart === dateStr && draftEnd === dateStr;

            const isInRange =
              effectiveStart &&
              effectiveEnd &&
              dateStr > effectiveStart &&
              dateStr < effectiveEnd;

            // Background strip styles
            let cellBg = '';
            if (isSameDayRange) {
              cellBg = '';
            } else if (isStart && (draftEnd || hoverDate)) {
              cellBg = 'rounded-l-lg bg-blue-100 dark:bg-blue-950/50';
            } else if (isEnd && draftStart) {
              cellBg = 'rounded-r-lg bg-blue-100 dark:bg-blue-950/50';
            } else if (isInRange) {
              cellBg = 'bg-blue-100/90 dark:bg-blue-950/60';
            }

            // Button day style
            let btnStyle = 'text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg';
            if (isStart || isEnd) {
              btnStyle = 'bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700';
            } else if (isInRange) {
              btnStyle = 'text-blue-900 dark:text-blue-200 font-semibold';
            }

            return (
              <div
                key={dateStr}
                className={`relative h-9 flex items-center justify-center ${cellBg}`}
                onMouseEnter={() => {
                  if (draftStart && !draftEnd) {
                    setHoverDate(dateStr);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDateClick(dateStr)}
                  className={`h-8 w-8 text-xs flex items-center justify-center transition-all ${btnStyle}`}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Label for trigger button
  const getButtonLabel = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatDisplayDate(startDate);
      const shortStart = startDate.split('-').slice(1).reverse().join('/');
      const shortEnd = endDate.split('-').slice(1).reverse().join('/');
      return `${shortStart} - ${shortEnd}`;
    }
    if (startDate) return `From: ${formatDisplayDate(startDate)}`;
    return placeholder;
  };

  const hasSelected = Boolean(startDate || endDate);
  const diffDays = draftStart && draftEnd ? getDaysDifference(draftStart, draftEnd) : 0;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-[38px] px-3 rounded-md border text-xs font-medium flex items-center justify-between gap-2 shadow-sm transition-all cursor-pointer min-w-[160px] ${
          hasSelected || isOpen
            ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30 font-semibold'
            : 'border-slate-300 dark:border-zinc-700 bg-card text-foreground hover:border-slate-400 dark:hover:border-zinc-600'
        }`}
        title="Filter by Date Range"
      >
        <div className="flex items-center gap-1.5 truncate">
          <CalendarIcon size={14} className={hasSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'} />
          <span className="truncate">{getButtonLabel()}</span>
        </div>
        {hasSelected ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="p-0.5 hover:bg-blue-200/50 rounded-full transition-colors cursor-pointer text-blue-600 dark:text-blue-400"
            title="Clear date"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        )}
      </button>

      {/* Goibibo Dual Calendar Popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 bg-popover border border-border rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          style={{ width: 'max-content', maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Navigation & Dual Months Container */}
          <div className="relative pt-1">
            {/* Prev & Next Navigation Buttons */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="absolute left-1 top-3.5 z-10 p-1.5 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="absolute right-1 top-3.5 z-10 p-1.5 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>

            {/* Dual Calendars (Side-by-Side on Desktop, 1 Column on Mobile) */}
            <div className="flex flex-col sm:flex-row gap-6 items-start px-2">
              {renderMonth(viewYear, viewMonth)}
              <div className="hidden sm:block w-px bg-border self-stretch" />
              <div className="hidden sm:block">
                {renderMonth(nextMonthYear, nextMonth)}
              </div>
            </div>
          </div>

          {/* Bottom Summary & Actions Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {draftStart && draftEnd ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {formatDisplayDate(draftStart)}
                  </span>
                  <span>→</span>
                  <span className="font-semibold text-foreground">
                    {formatDisplayDate(draftEnd)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    {diffDays} {diffDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
              ) : draftStart ? (
                <span>
                  Start: <strong className="text-foreground">{formatDisplayDate(draftStart)}</strong> (Click end date)
                </span>
              ) : (
                <span>Select start and end date</span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!draftStart}
                onClick={handleApply}
                className="px-5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualDateRangePicker;
