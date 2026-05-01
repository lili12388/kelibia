import { useState, useRef, useEffect, useMemo } from "react";
import type { Reservation } from "@shared/schema";

interface TimelineProps {
  reservations: Reservation[];
  isAdmin?: boolean;
}

// Generate all days from May 1 to September 30 of current year
function generateDays(year: number) {
  const days: Date[] = [];
  for (let month = 4; month <= 8; month++) { // May(4) to Sep(8)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
  }
  return days;
}

const MONTH_NAMES = ["Mai", "Juin", "Juillet", "Août", "Septembre"];
const MONTH_INDICES = [4, 5, 6, 7, 8]; // May to September

function formatDate(d: Date) {
  return `${d.getDate()} ${MONTH_NAMES[MONTH_INDICES.indexOf(d.getMonth())]}`;
}

function dateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function AvailabilityTimeline({ reservations, isAdmin = false }: TimelineProps) {
  const year = new Date().getFullYear();
  const days = useMemo(() => generateDays(year), [year]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    reservation: Reservation;
  } | null>(null);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const startDate = new Date(year, 4, 1); // May 1
      const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayWidth = 28; // matches CSS
      const scrollTo = Math.max(0, (diffDays - 3) * dayWidth);
      scrollRef.current.scrollLeft = scrollTo;
    }
  }, [year]);

  // Build a lookup: dateString -> reservation
  const dateMap = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const r of reservations) {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        map.set(dateStr(d), r as Reservation);
      }
    }
    return map;
  }, [reservations]);

  const today = dateStr(new Date());

  const handleTouch = (e: React.TouchEvent | React.MouseEvent, day: Date) => {
    const reservation = dateMap.get(dateStr(day));
    if (reservation) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        reservation,
      });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1">
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Disponibilité</span>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
            <span className="text-[10px] text-muted-foreground">Libre</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
            <span className="text-[10px] text-muted-foreground">Confirmé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-[#f97316]" />
            <span className="text-[10px] text-muted-foreground">En attente</span>
          </div>
        </div>
      </div>

      {/* Timeline container */}
      <div className="relative bg-card border border-border/40 rounded-xl overflow-hidden">
        {/* Month headers */}
        <div className="flex border-b border-border/30 bg-muted/20">
          {MONTH_INDICES.map((monthIdx, i) => {
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
            return (
              <div
                key={monthIdx}
                className="flex-shrink-0 text-center border-r border-border/20 last:border-r-0"
                style={{ width: `${daysInMonth * 28}px` }}
              >
                <span className="text-[11px] font-semibold text-foreground/80 py-1.5 block">
                  {MONTH_NAMES[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable day grid */}
        <div
          ref={scrollRef}
          className="overflow-x-auto no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex" style={{ width: `${days.length * 28}px` }}>
            {days.map((day, idx) => {
              const ds = dateStr(day);
              const reservation = dateMap.get(ds);
              const isToday = ds === today;
              const isFirstOfMonth = day.getDate() === 1;
              const dayNum = day.getDate();

              let bgColor = "bg-[#3b82f6]/15"; // available — light blue
              let barColor = "bg-[#3b82f6]"; // blue bar

              if (reservation) {
                if (reservation.status === "confirmed") {
                  bgColor = "bg-[#ef4444]/15";
                  barColor = "bg-[#ef4444]";
                } else {
                  bgColor = "bg-[#f97316]/15";
                  barColor = "bg-[#f97316]";
                }
              }

              return (
                <div
                  key={idx}
                  className={`flex-shrink-0 relative flex flex-col items-center cursor-pointer group ${
                    isFirstOfMonth ? "border-l-2 border-border/40" : ""
                  }`}
                  style={{ width: "28px" }}
                  onClick={(e) => handleTouch(e, day)}
                  onMouseEnter={(e) => handleTouch(e, day)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Day number */}
                  <div className={`text-[9px] py-1 w-full text-center font-medium ${
                    isToday 
                      ? "text-primary font-bold" 
                      : dayNum % 5 === 1 || dayNum === 1 
                        ? "text-foreground/60" 
                        : "text-transparent"
                  }`}>
                    {dayNum}
                  </div>

                  {/* Color bar */}
                  <div className={`w-full px-[2px] pb-1.5`}>
                    <div className={`h-6 sm:h-7 rounded-[3px] ${bgColor} relative overflow-hidden transition-all group-hover:scale-y-110`}>
                      <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${barColor} rounded-b-[3px]`} />
                    </div>
                  </div>

                  {/* Today marker */}
                  {isToday && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: `${Math.min(tooltip.x, window.innerWidth - 180)}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className={`px-3 py-2 rounded-lg shadow-lg text-xs ${
            tooltip.reservation.status === 'confirmed' 
              ? 'bg-red-600 text-white' 
              : 'bg-orange-500 text-white'
          }`}>
            <div className="font-semibold">{tooltip.reservation.clientName}</div>
            {tooltip.reservation.clientPhone && (
              <div className="text-white/80 text-[10px]">{tooltip.reservation.clientPhone}</div>
            )}
            <div className="text-white/70 text-[10px] mt-0.5">
              {tooltip.reservation.status === 'confirmed' ? '✓ Confirmé' : '⏳ En attente'}
            </div>
          </div>
          {/* Arrow */}
          <div className={`w-2 h-2 mx-auto -mt-1 rotate-45 ${
            tooltip.reservation.status === 'confirmed' ? 'bg-red-600' : 'bg-orange-500'
          }`} />
        </div>
      )}
    </div>
  );
}
