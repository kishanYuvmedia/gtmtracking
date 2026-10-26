import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerPopoverProps {
  onClose: () => void;
  onApply?: (startDate: Date, endDate: Date) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const RECENTLY_USED = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 90 Days', value: 'last-90' },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function CalendarMonth({
  year,
  month,
  selectedStart,
  selectedEnd,
  hoverDate,
  onSelect,
  onHover,
}: {
  year: number;
  month: number;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  hoverDate: Date | null;
  onSelect: (date: Date) => void;
  onHover: (date: Date | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelectedStart = (day: number) => {
    if (!selectedStart) return false;
    return new Date(year, month, day).getTime() === selectedStart.getTime();
  };

  const isSelectedEnd = (day: number) => {
    if (!selectedEnd) return false;
    return new Date(year, month, day).getTime() === selectedEnd.getTime();
  };

  const isInRange = (day: number) => {
    const d = new Date(year, month, day).getTime();
    const start = selectedStart?.getTime();
    const end = selectedEnd?.getTime() || hoverDate?.getTime();
    if (start && end) {
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      return d > min && d < max;
    }
    return false;
  };

  const isRangeStart = (day: number) => {
    if (!selectedStart) return false;
    const d = new Date(year, month, day).getTime();
    const end = selectedEnd?.getTime() || hoverDate?.getTime();
    return end ? d === Math.min(selectedStart.getTime(), end) : false;
  };

  const isRangeEnd = (day: number) => {
    if (!selectedStart) return false;
    const d = new Date(year, month, day).getTime();
    const end = selectedEnd?.getTime() || hoverDate?.getTime();
    return end ? d === Math.max(selectedStart.getTime(), end) : false;
  };

  return (
    <div className="flex-1 min-w-[220px]">
      <p className="text-[12px] font-semibold text-[#111111] text-center mb-2">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAYS.map((wd, i) => (
          <div key={i} className="text-center text-[10px] text-[#9CA3AF] font-medium py-1">
            {wd}
          </div>
        ))}
        {days.map((day, i) => (
          <div key={i} className="flex items-center justify-center h-[30px] relative">
            {day !== null && (
              <>
                {(isRangeStart(day) || isRangeEnd(day)) && isInRange(day) && (
                  <div className="absolute inset-y-0 left-1/2 w-full bg-[#F3F4F6] -translate-x-1/2" />
                )}
                {isRangeStart(day) && !isRangeEnd(day) && (
                  <div className="absolute inset-y-0 left-1/2 w-full bg-[#F3F4F6] -translate-x-1/2" />
                )}
                {isRangeEnd(day) && !isRangeStart(day) && (
                  <div className="absolute inset-y-0 left-0 w-full bg-[#F3F4F6] -translate-x-1/2" />
                )}
                {!isRangeStart(day) && !isRangeEnd(day) && isInRange(day) && (
                  <div className="absolute inset-y-0 left-0 w-full bg-[#F3F4F6]" />
                )}
                <button
                  onClick={() => onSelect(new Date(year, month, day))}
                  onMouseEnter={() => onHover(new Date(year, month, day))}
                  onMouseLeave={() => onHover(null)}
                  className={`relative w-[28px] h-[28px] flex items-center justify-center rounded-md text-[12px] transition-all z-10 ${
                    isSelectedStart(day) || isSelectedEnd(day)
                      ? 'bg-[#111111] text-white font-semibold'
                      : isToday(day)
                      ? 'text-[#3B82F6] font-bold'
                      : 'text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {day}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({ onClose, onApply }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [leftMonth, setLeftMonth] = useState(8);
  const [leftYear, setLeftYear] = useState(2019);
  const [rightMonth, setRightMonth] = useState(9);
  const [rightYear, setRightYear] = useState(2019);

  const [fromDate, setFromDate] = useState('03/01/2026');
  const [toDate, setToDate] = useState('03/04/2026');
  const [compareWith, setCompareWith] = useState(true);
  const [compareTo, setCompareTo] = useState('Previous Period');
  const [compFromDate, setCompFromDate] = useState('02/01/2026');
  const [compToDate, setCompToDate] = useState('02/04/2026');

  const [selectedStart, setSelectedStart] = useState<Date | null>(new Date(2019, 8, 12));
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(new Date(2019, 8, 23));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activeQuickSelect, setActiveQuickSelect] = useState<string>('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handlePrev = () => {
    setLeftMonth(leftMonth === 0 ? 11 : leftMonth - 1);
    setLeftYear(leftMonth === 0 ? leftYear - 1 : leftYear);
    setRightMonth(rightMonth === 0 ? 11 : rightMonth - 1);
    setRightYear(rightMonth === 0 ? rightYear - 1 : rightYear);
  };

  const handleNext = () => {
    setLeftMonth(leftMonth === 11 ? 0 : leftMonth + 1);
    setLeftYear(leftMonth === 11 ? leftYear + 1 : leftYear);
    setRightMonth(rightMonth === 11 ? 0 : rightMonth + 1);
    setRightYear(rightMonth === 11 ? rightYear + 1 : rightYear);
  };

  const handleDateSelect = (date: Date) => {
    setActiveQuickSelect('');
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date);
      setSelectedEnd(null);
    } else {
      if (date < selectedStart) {
        setSelectedEnd(selectedStart);
        setSelectedStart(date);
      } else {
        setSelectedEnd(date);
      }
    }
  };

  const handleQuickSelect = (value: string) => {
    setActiveQuickSelect(value);
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (value) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = start;
        break;
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last-90':
        start = new Date(today);
        start.setDate(start.getDate() - 90);
        end = today;
        break;
      default:
        return;
    }

    setSelectedStart(start);
    setSelectedEnd(end);
    setFromDate(`${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}/${start.getFullYear()}`);
    setToDate(`${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}/${end.getFullYear()}`);
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-start justify-end pt-16 pr-8 z-[100]">
      <div
        ref={ref}
        className="bg-white rounded-xl shadow-2xl w-[640px] flex overflow-hidden border border-[#E5E7EB]"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Left Sidebar */}
        <div className="w-[200px] border-r border-[#E5E7EB] p-3 flex flex-col bg-[#FAFAFA]">
          {/* Primary Date Range */}
          <div className="space-y-2 mb-3">
            <div>
              <label className="block text-[11px] text-[#6B7280] font-medium mb-1">From</label>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#D1D5DB] rounded-md text-[#111111] focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#6B7280] font-medium mb-1">To</label>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#D1D5DB] rounded-md text-[#111111] focus:outline-none focus:border-[#3B82F6] transition-colors"
              />
            </div>
          </div>

          {/* Divider */}
          <hr className="border-[#E5E7EB] mb-2" />

          {/* Compare Toggle */}
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-[#374151] font-medium">Compare with</label>
            <button
              onClick={() => setCompareWith(!compareWith)}
              className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                compareWith ? 'bg-[#3B82F6]' : 'bg-[#D1D5DB]'
              }`}
            >
              <span
                className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  compareWith ? 'translate-x-[18px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>

          {/* Compare To Section */}
          {compareWith && (
            <div className="space-y-2 mb-3">
              <div>
                <label className="block text-[11px] text-[#6B7280] font-medium mb-1">Compare To</label>
                <select
                  value={compareTo}
                  onChange={(e) => setCompareTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#D1D5DB] rounded-md text-[#111111] focus:outline-none focus:border-[#3B82F6] appearance-none cursor-pointer"
                >
                  <option>Previous Period</option>
                  <option>Previous Year</option>
                  <option>Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#6B7280] font-medium mb-1">From</label>
                <input
                  type="text"
                  value={compFromDate}
                  onChange={(e) => setCompFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#D1D5DB] rounded-md text-[#111111] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6B7280] font-medium mb-1">To</label>
                <input
                  type="text"
                  value={compToDate}
                  onChange={(e) => setCompToDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-white border border-[#D1D5DB] rounded-md text-[#111111] focus:outline-none focus:border-[#3B82F6] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Recently Used */}
          <div className="mt-auto">
            <p className="text-[11px] text-[#6B7280] font-medium mb-1.5">Recently Used</p>
            <div className="space-y-0.5">
              {RECENTLY_USED.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleQuickSelect(item.value)}
                  className="w-full flex items-center gap-2 px-1.5 py-1.5 text-[12px] text-[#374151] hover:bg-white rounded-md transition-colors"
                >
                  <div className={`w-[14px] h-[14px] rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                    activeQuickSelect === item.value
                      ? 'border-[#3B82F6] bg-[#3B82F6]'
                      : 'border-[#D1D5DB]'
                  }`}>
                    {activeQuickSelect === item.value && (
                      <div className="w-[5px] h-[5px] rounded-full bg-white" />
                    )}
                  </div>
                  <span className={activeQuickSelect === item.value ? 'font-medium text-[#111111]' : ''}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Apply Button */}
            <button
              onClick={() => {
                if (selectedStart && selectedEnd && onApply) {
                  onApply(selectedStart, selectedEnd);
                }
                onClose();
              }}
              className="w-full mt-3 px-3 py-2 bg-[#6B7280] text-white text-[12px] font-semibold rounded-md hover:bg-[#4B5563] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Calendar Area */}
        <div className="flex-1 p-3">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrev}
              className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-8">
              <span className="text-[12px] text-[#111111] font-semibold">
                {MONTHS[leftMonth]} {leftYear}
              </span>
              <span className="text-[12px] text-[#111111] font-semibold">
                {MONTHS[rightMonth]} {rightYear}
              </span>
            </div>
            <button
              onClick={handleNext}
              className="p-1.5 text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Selected Range Display */}
          {/* {(selectedStart || selectedEnd) && (
            <div className="flex items-center justify-center gap-3 mb-3 px-3 py-1.5 bg-[#F9FAFB] rounded-md border border-[#E5E7EB]">
              <div className="text-center">
                <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider font-medium">Start</p>
                <p className="text-[12px] text-[#111111] font-semibold">{formatDisplayDate(selectedStart)}</p>
              </div>
              <div className="w-px h-5 bg-[#E5E7EB]" />
              <div className="text-center">
                <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider font-medium">End</p>
                <p className="text-[12px] text-[#111111] font-semibold">{formatDisplayDate(selectedEnd)}</p>
              </div>
            </div>
          )} */}

          {/* Dual Calendars */}
          <div className="flex gap-4">
            <CalendarMonth
              year={leftYear}
              month={leftMonth}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              hoverDate={hoverDate}
              onSelect={handleDateSelect}
              onHover={setHoverDate}
            />
            <CalendarMonth
              year={rightYear}
              month={rightMonth}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              hoverDate={hoverDate}
              onSelect={handleDateSelect}
              onHover={setHoverDate}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
