"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatepickerProps {
  value: {
    startDate: Date;
    endDate: Date;
  };
  onChange: (value: { startDate: Date; endDate: Date }) => void;
  showShortcuts?: boolean;
}

export function Datepicker({
  value,
  onChange,
  showShortcuts = false,
}: DatepickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<"start" | "end" | null>(null);
  const [tempRange, setTempRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: value.startDate,
    endDate: value.endDate,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize with provided values
  useEffect(() => {
    if (value.startDate && !isNaN(value.startDate.getTime())) {
      setMonth(new Date(value.startDate));
      setTempRange({
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
      });
    }
  }, [value.startDate, value.endDate]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return "Datum auswählen";
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for first day of month
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const firstDayOfMonth = getFirstDayOfMonth(year, monthIndex);

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, monthIndex, i));
    }

    return days;
  };

  // Check if date is in range
  const isInRange = (date: Date) => {
    if (!tempRange.startDate || !tempRange.endDate) return false;

    const time = date.getTime();
    return (
      time >= tempRange.startDate.getTime() &&
      time <= tempRange.endDate.getTime()
    );
  };

  // Check if date is start or end of range
  const isRangeEnd = (date: Date) => {
    if (!tempRange.startDate || !tempRange.endDate) return false;

    const time = date.getTime();
    return (
      time === tempRange.startDate.getTime() ||
      time === tempRange.endDate.getTime()
    );
  };

  // Check if date would be in temporary hover range
  const isInHoverRange = (date: Date) => {
    if (!hoverDate || !selecting || !tempRange.startDate) return false;

    if (selecting === "end" && tempRange.startDate) {
      const startTime = tempRange.startDate.getTime();
      const hoverTime = hoverDate.getTime();
      const currentTime = date.getTime();

      return currentTime >= startTime && currentTime <= hoverTime;
    }

    return false;
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (!selecting) {
      // Start new selection
      setSelecting("end");
      setTempRange({ startDate: date, endDate: null });
    } else if (selecting === "end") {
      // Complete selection
      let startDate = tempRange.startDate;
      let endDate = date;

      // Ensure start date is before end date
      if (startDate && startDate.getTime() > date.getTime()) {
        startDate = date;
        endDate = tempRange.startDate as Date;
      }

      setTempRange({ startDate, endDate });
      setSelecting(null);

      // Call onChange with new values
      if (startDate && endDate) {
        onChange({ startDate, endDate });
      }
    }
  };

  // Handle date hover
  const handleDateHover = (date: Date) => {
    setHoverDate(date);
  };

  // Navigate to previous month
  const prevMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  // Apply shortcut
  const applyShortcut = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    setTempRange({ startDate, endDate });
    onChange({ startDate, endDate });
    setIsOpen(false);
  };

  // Render shortcuts
  const renderShortcuts = () => {
    if (!showShortcuts) return null;

    return (
      <div className="border-t border-black p-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="px-2 py-1 text-xs border border-black bg-white hover:bg-gray-50"
          onClick={() => applyShortcut(7)}
        >
          Letzte 7 Tage
        </button>
        <button
          type="button"
          className="px-2 py-1 text-xs border border-black bg-white hover:bg-gray-50"
          onClick={() => applyShortcut(30)}
        >
          Letzte 30 Tage
        </button>
        <button
          type="button"
          className="px-2 py-1 text-xs border border-black bg-white hover:bg-gray-50"
          onClick={() => applyShortcut(90)}
        >
          Letzte 90 Tage
        </button>
      </div>
    );
  };

  return (
    <div className="mb-3 relative" ref={containerRef}>
      {/* Date display */}
      <div
        className="relative flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="appearance-none w-full p-2 pr-10 border border-black focus:outline-black bg-white cursor-pointer">
          <div className="flex flex-col text-sm">
            <span>
              {formatDate(tempRange.startDate)} -{" "}
              {formatDate(tempRange.endDate)}
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black">
          <ChevronDown className="w-6 h-6" />
        </div>
      </div>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-72 border border-black bg-white shadow-md">
          {/* Calendar header */}
          <div className="flex items-center justify-between p-2 border-b border-black">
            <button
              type="button"
              className="p-1 hover:bg-gray-100"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              {month.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <button
              type="button"
              className="p-1 hover:bg-gray-100"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="p-2">
            {/* Day names */}
            <div className="grid grid-cols-7 mb-1">
              {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs text-gray-500 h-8 flex items-center justify-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {generateCalendarDays().map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-8" />;
                }

                const isSelected = isRangeEnd(date);
                const isRange = isInRange(date) && !isSelected;
                const isHoverRange =
                  isInHoverRange(date) && !isSelected && !isRange;

                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      h-8 flex items-center justify-center text-sm cursor-pointer
                      ${isSelected ? "bg-black text-white" : ""}
                      ${isRange ? "bg-gray-200" : ""}
                      ${isHoverRange ? "bg-gray-100" : ""}
                      ${
                        !isSelected && !isRange && !isHoverRange
                          ? "hover:bg-gray-100"
                          : ""
                      }
                    `}
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => handleDateHover(date)}
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shortcuts */}
          {renderShortcuts()}
        </div>
      )}
    </div>
  );
}

// Helper component for the dropdown icon
function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.186l3.71-3.955a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
