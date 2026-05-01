import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Clock, Trash2, Plus, X, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Reservation } from "@shared/schema";

// ─── Constants ───
const MONTH_NAMES = ["Mai", "Juin", "Juillet", "Août", "Septembre"];
const MONTH_INDICES = [4, 5, 6, 7, 8];
const DAY_WIDTH = 32;

function generateDays(year: number) {
  const days: Date[] = [];
  for (let month = 4; month <= 8; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
  }
  return days;
}

function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(ds: string) {
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Types ───
interface TimelineProps {
  propertyId: string;
  isAdmin?: boolean;
}

// ─── Main Component ───
export default function AvailabilityTimeline({ propertyId, isAdmin = false }: TimelineProps) {
  const year = new Date().getFullYear();
  const days = useMemo(() => generateDays(year), [year]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin selection state
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    status: "pending" as "confirmed" | "pending",
  });

  // Fetch reservations
  const publicQuery = useQuery<Reservation[]>({
    queryKey: [`/api/properties/${propertyId}/reservations`],
    enabled: !isAdmin,
  });

  const adminQuery = useQuery<Reservation[]>({
    queryKey: [`/api/broker/properties/${propertyId}/reservations`],
    enabled: !!isAdmin,
  });

  const reservations = (isAdmin ? adminQuery.data : publicQuery.data) ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/broker/properties/${propertyId}/reservations`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/broker/properties/${propertyId}/reservations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reservations`] });
      toast({ title: "✓ Réservation ajoutée" });
      resetSelection();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de l'ajout.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/broker/reservations/${id}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/broker/properties/${propertyId}/reservations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reservations`] });
      toast({ title: "Supprimée" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "confirmed" ? "pending" : "confirmed";
      const response = await apiRequest('PATCH', `/api/broker/reservations/${id}`, { status: newStatus });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/broker/properties/${propertyId}/reservations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reservations`] });
    },
  });

  // Scroll to today on mount
  useEffect(() => {
    scrollToToday();
  }, []);

  const scrollToToday = useCallback(() => {
    if (scrollRef.current) {
      const today = new Date();
      const startDate = new Date(year, 4, 1);
      const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (86400000));
      const scrollTo = Math.max(0, (diffDays - 4) * DAY_WIDTH);
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, [year]);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -DAY_WIDTH * 7, behavior: 'smooth' });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: DAY_WIDTH * 7, behavior: 'smooth' });
  };

  // Build lookup: date -> array of reservations (supports overlapping)
  const dateMap = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const start = new Date(r.startDate + 'T00:00:00');
      const end = new Date(r.endDate + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = dateStr(d);
        if (!map.has(ds)) map.set(ds, []);
        map.get(ds)!.push(r);
      }
    }
    return map;
  }, [reservations]);

  // Find "label" positions - show client name bubble at the start of each reservation
  const labelPositions = useMemo(() => {
    const labels: { dayIndex: number; reservation: Reservation; spanDays: number }[] = [];
    for (const r of reservations) {
      const start = new Date(r.startDate + 'T00:00:00');
      const startIdx = days.findIndex(d => dateStr(d) === dateStr(start));
      const end = new Date(r.endDate + 'T00:00:00');
      const endIdx = days.findIndex(d => dateStr(d) === dateStr(end));
      if (startIdx >= 0) {
        labels.push({ dayIndex: startIdx, reservation: r, spanDays: (endIdx >= 0 ? endIdx - startIdx + 1 : 1) });
      }
    }
    return labels;
  }, [reservations, days]);

  const today = dateStr(new Date());

  // Admin click handler for date range selection
  const handleDayClick = (day: Date) => {
    if (!isAdmin) return;
    const ds = dateStr(day);

    if (!selectStart || (selectStart && selectEnd)) {
      // Starting new selection
      setSelectStart(ds);
      setSelectEnd(null);
      setShowForm(false);
    } else {
      // Completing selection
      if (ds >= selectStart) {
        setSelectEnd(ds);
        setShowForm(true);
      } else {
        // Clicked before start, reset
        setSelectStart(ds);
        setSelectEnd(null);
      }
    }
  };

  const resetSelection = () => {
    setSelectStart(null);
    setSelectEnd(null);
    setShowForm(false);
    setFormData({ clientName: "", clientPhone: "", status: "pending" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectStart || !selectEnd) return;
    createMutation.mutate({
      ...formData,
      startDate: selectStart,
      endDate: selectEnd,
    });
  };

  const isInSelection = (ds: string) => {
    if (!selectStart) return false;
    if (!selectEnd) return ds === selectStart;
    return ds >= selectStart && ds <= selectEnd;
  };

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary" />
          Disponibilité
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Libre</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Confirmé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">En attente</span>
          </div>
        </div>
      </div>

      {/* Timeline Card */}
      <div className="relative bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {/* Nav arrows */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-r from-card via-card/80 to-transparent hover:from-muted transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={scrollRight}
          className="absolute right-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-l from-card via-card/80 to-transparent hover:from-muted transition-all"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-2 pt-0 mx-8"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
        >
          <div style={{ width: `${days.length * DAY_WIDTH}px` }}>
            {/* Month headers */}
            <div className="flex border-b border-border/20">
              {MONTH_INDICES.map((monthIdx, i) => {
                const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
                return (
                  <div
                    key={monthIdx}
                    className="flex-shrink-0 text-center border-r border-border/15 last:border-r-0"
                    style={{ width: `${daysInMonth * DAY_WIDTH}px` }}
                  >
                    <span className="text-[10px] sm:text-xs font-bold text-foreground/70 py-1 block tracking-wide">
                      {MONTH_NAMES[i]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day numbers row */}
            <div className="flex">
              {days.map((day, idx) => {
                const ds = dateStr(day);
                const isT = ds === today;
                const dayNum = day.getDate();
                return (
                  <div
                    key={`num-${idx}`}
                    className="flex-shrink-0 text-center"
                    style={{ width: `${DAY_WIDTH}px` }}
                  >
                    <span className={`text-[8px] sm:text-[9px] leading-tight block py-0.5 font-medium ${
                      isT ? "text-primary font-extrabold text-[10px]" : "text-muted-foreground/60"
                    }`}>
                      {dayNum}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Color bars */}
            <div className="flex relative">
              {days.map((day, idx) => {
                const ds = dateStr(day);
                const dayReservations = dateMap.get(ds) || [];
                const isT = ds === today;
                const selected = isInSelection(ds);
                const isFirstOfMonth = day.getDate() === 1;

                // Determine bar color: priority = confirmed > pending > free
                let barColor = "bg-[#3b82f6]";
                let bgColor = "bg-[#3b82f6]/10";
                if (dayReservations.length > 0) {
                  const hasConfirmed = dayReservations.some(r => r.status === "confirmed");
                  if (hasConfirmed) {
                    barColor = "bg-[#ef4444]";
                    bgColor = "bg-[#ef4444]/12";
                  } else {
                    barColor = "bg-[#f97316]";
                    bgColor = "bg-[#f97316]/12";
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`flex-shrink-0 relative px-[1px] ${
                      isAdmin ? "cursor-pointer" : ""
                    } ${isFirstOfMonth ? "border-l border-border/30" : ""}`}
                    style={{ width: `${DAY_WIDTH}px` }}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className={`h-7 sm:h-8 rounded-[4px] relative overflow-hidden transition-all ${bgColor} ${
                      selected ? "ring-2 ring-primary ring-offset-1" : ""
                    } ${isAdmin ? "hover:brightness-90" : ""}`}>
                      <div className={`absolute bottom-0 left-0 right-0 h-2 ${barColor} rounded-b-[4px]`} />
                    </div>
                    {/* Today marker */}
                    {isT && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-sm" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Floating reservation labels on the bars */}
              {labelPositions.map((lp, i) => {
                const r = lp.reservation;
                const isConfirmed = r.status === "confirmed";
                const leftPx = lp.dayIndex * DAY_WIDTH + 2;
                const widthPx = Math.max(lp.spanDays * DAY_WIDTH - 4, DAY_WIDTH - 4);
                const nameParts = r.clientName.split(' ');
                const shortName = nameParts.length > 1 ? nameParts[0] + ' ' + nameParts[1].substring(0, 4) + '..' : r.clientName;

                return (
                  <div
                    key={`label-${r.id}-${i}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${leftPx}px`,
                      top: '-2px',
                      width: `${widthPx}px`,
                      height: '100%',
                      zIndex: 5,
                    }}
                  >
                    {/* Bubble */}
                    <div className={`absolute -top-[26px] left-0 max-w-[120px] px-1.5 py-0.5 rounded-md text-white text-[7px] sm:text-[8px] font-semibold whitespace-nowrap overflow-hidden shadow-sm ${
                      isConfirmed ? "bg-red-600/90" : "bg-orange-500/90"
                    }`}>
                      {shortName}
                      {r.clientPhone && <span className="opacity-70 ml-0.5">· {r.clientPhone.substring(0, 5)}..</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Aujourd'hui button */}
        <div className="flex justify-center py-1.5 border-t border-border/20">
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-semibold transition-all"
          >
            <CalendarDays className="w-3 h-3" />
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Admin: Inline selection form */}
      {isAdmin && showForm && selectStart && selectEnd && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Nouvelle réservation: <span className="text-primary">{fmtDate(selectStart)} → {fmtDate(selectEnd)}</span>
            </div>
            <button onClick={resetSelection} className="w-6 h-6 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted">
              <X className="w-3 h-3" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] font-medium">Nom du client *</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Nom complet"
                  className="h-9 text-sm rounded-lg mt-0.5"
                  required
                />
              </div>
              <div>
                <Label className="text-[10px] font-medium">Téléphone</Label>
                <Input
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  placeholder="50344..."
                  className="h-9 text-sm rounded-lg mt-0.5"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "confirmed" })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  formData.status === "confirmed"
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <Check className="w-3 h-3" />
                Confirmé
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "pending" })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                  formData.status === "pending"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <Clock className="w-3 h-3" />
                Non confirmé
              </button>
            </div>
            <Button type="submit" className="w-full h-9 text-xs rounded-lg" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Ajout..." : "Ajouter la réservation"}
            </Button>
          </form>
        </div>
      )}

      {/* Admin: Selection hint */}
      {isAdmin && !showForm && (
        <p className="text-[10px] text-muted-foreground text-center italic">
          {selectStart && !selectEnd
            ? `📌 Début: ${fmtDate(selectStart)} — cliquez sur la date de fin`
            : "Cliquez sur une date de début sur la timeline pour ajouter une réservation"}
        </p>
      )}

      {/* Reservation Summary List */}
      {reservations.length > 0 && (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-border/20 bg-muted/20">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Réservations ({reservations.length})
            </span>
          </div>
          <div className="divide-y divide-border/20 max-h-[300px] overflow-y-auto">
            {reservations.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
              >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  r.status === "confirmed" ? "bg-red-500" : "bg-orange-500"
                }`} />

                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-foreground truncate">
                      {r.clientName}
                    </span>
                    {r.clientPhone && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        · {r.clientPhone}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    de <span className="font-semibold text-foreground/80">{fmtDate(r.startDate)}</span>
                    {' '}à{' '}
                    <span className="font-semibold text-foreground/80">{fmtDate(r.endDate)}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  r.status === "confirmed"
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                }`}>
                  {r.status === "confirmed" ? "Réservé" : "Non confirmé"}
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: r.id, status: r.status })}
                      className={`h-6 w-6 flex items-center justify-center rounded-md transition-all text-xs ${
                        r.status === "confirmed"
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                      }`}
                      title={r.status === "confirmed" ? "→ Non confirmé" : "→ Confirmé"}
                    >
                      {r.status === "confirmed" ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-muted/40 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
