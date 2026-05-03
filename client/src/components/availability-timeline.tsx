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
const MONTH_NAMES_FR = ["Mai", "Juin", "Juillet", "Août", "Septembre"];
const MONTH_INDICES = [4, 5, 6, 7, 8];
const DAY_W = 28; // width per day in px
const BRACKET_H = 24; // height of each bracket row
const BRACKET_GAP = 4; // vertical gap between stacked brackets

function generateDays(year: number) {
  const days: Date[] = [];
  for (let m = 4; m <= 8; m++) {
    const count = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= count; d++) days.push(new Date(year, m, d));
  }
  return days;
}

function ds(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtShort(s: string) {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Lane assignment algorithm (confirmed on top, then stack by overlap) ───
interface LanedReservation {
  reservation: Reservation;
  lane: number;
  startIdx: number;
  endIdx: number;
}

function assignLanes(reservations: Reservation[], days: Date[]): LanedReservation[] {
  // Sort only by start date to keep non-overlapping reservations in the same lane
  const sorted = [...reservations].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const result: LanedReservation[] = [];
  const laneEnds: number[] = []; // tracks the endIdx of the last item in each lane

  for (const r of sorted) {
    const startIdx = days.findIndex(d => ds(d) === r.startDate);
    const endIdx = days.findIndex(d => ds(d) === r.endDate);
    if (startIdx < 0 || endIdx < 0) continue;

    // Find first lane where this reservation fits (no overlap)
    let lane = -1;
    for (let l = 0; l < laneEnds.length; l++) {
      if (laneEnds[l] < startIdx) {
        lane = l;
        break;
      }
    }
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(-1);
    }
    laneEnds[lane] = endIdx;
    result.push({ reservation: r, lane, startIdx, endIdx });
  }

  return result;
}

// ─── Props ───
interface TimelineProps {
  propertyId: string;
  isAdmin?: boolean;
}

// ─── Component ───
export default function AvailabilityTimeline({ propertyId, isAdmin = false }: TimelineProps) {
  const year = new Date().getFullYear();
  const days = useMemo(() => generateDays(year), [year]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // Admin date-range selection
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientName: "", clientPhone: "", status: "pending" as "confirmed" | "pending" });

  // Fetch
  const pubQ = useQuery<Reservation[]>({ queryKey: [`/api/properties/${propertyId}/reservations`], enabled: !isAdmin });
  const admQ = useQuery<Reservation[]>({ queryKey: [`/api/broker/properties/${propertyId}/reservations`], enabled: !!isAdmin });
  const reservations = (isAdmin ? admQ.data : pubQ.data) ?? [];

  // Mutations
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [`/api/broker/properties/${propertyId}/reservations`] });
    qc.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reservations`] });
  };
  const createM = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest('POST', `/api/broker/properties/${propertyId}/reservations`, d); return r.json(); },
    onSuccess: () => { invalidate(); toast({ title: "✓ Réservation ajoutée" }); resetSel(); },
    onError: () => { toast({ title: "Erreur", variant: "destructive" }); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest('DELETE', `/api/broker/reservations/${id}`, {}); return r.json(); },
    onSuccess: () => { invalidate(); toast({ title: "Supprimée" }); },
  });
  const toggleM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await apiRequest('PATCH', `/api/broker/reservations/${id}`, { status: status === "confirmed" ? "pending" : "confirmed" });
      return r.json();
    },
    onSuccess: () => invalidate(),
  });

  // Scroll to today
  useEffect(() => { scrollToToday(); }, []);
  const scrollToToday = useCallback(() => {
    if (!scrollRef.current) return;
    const diff = Math.floor((Date.now() - new Date(year, 4, 1).getTime()) / 86400000);
    scrollRef.current.scrollTo({ left: Math.max(0, (diff - 4) * DAY_W), behavior: 'smooth' });
  }, [year]);

  // Lane layout
  const lanedItems = useMemo(() => assignLanes(reservations, days), [reservations, days]);
  const maxLane = lanedItems.length > 0 ? Math.max(...lanedItems.map(l => l.lane)) : -1;
  const bracketAreaH = (maxLane + 1) * (BRACKET_H + BRACKET_GAP) + 8;

  const today = ds(new Date());

  // Admin click
  const handleDayClick = (day: Date) => {
    if (!isAdmin) return;
    const d = ds(day);
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d); setSelEnd(null); setShowForm(false);
    } else {
      if (d >= selStart) { setSelEnd(d); setShowForm(true); }
      else { setSelStart(d); setSelEnd(null); }
    }
  };

  const resetSel = () => { setSelStart(null); setSelEnd(null); setShowForm(false); setForm({ clientName: "", clientPhone: "", status: "pending" }); };

  const isInSel = (d: string) => {
    if (!selStart) return false;
    if (!selEnd) return d === selStart;
    return d >= selStart && d <= selEnd;
  };

  const totalW = days.length * DAY_W;

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary" />
          Disponibilité
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /><span className="text-[9px] sm:text-[10px] text-muted-foreground">Libre</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" /><span className="text-[9px] sm:text-[10px] text-muted-foreground">Confirmé</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" /><span className="text-[9px] sm:text-[10px] text-muted-foreground">En attente</span></div>
        </div>
      </div>

      {/* Timeline Card */}
      <div className="relative bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {/* Left/Right scroll arrows */}
        <button onClick={() => scrollRef.current?.scrollBy({ left: -DAY_W * 7, behavior: 'smooth' })} className="absolute left-0 top-0 bottom-0 z-20 w-8 flex items-center justify-center bg-gradient-to-r from-card to-transparent hover:from-muted/80 transition-all">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => scrollRef.current?.scrollBy({ left: DAY_W * 7, behavior: 'smooth' })} className="absolute right-0 top-0 bottom-0 z-20 w-8 flex items-center justify-center bg-gradient-to-l from-card to-transparent hover:from-muted/80 transition-all">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div ref={scrollRef} className="overflow-x-auto mx-8 pb-1" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          <div style={{ width: `${totalW}px` }}>

            {/* Month headers */}
            <div className="flex h-6">
              {MONTH_INDICES.map((mIdx, i) => {
                const cnt = new Date(year, mIdx + 1, 0).getDate();
                return (
                  <div key={mIdx} className="flex-shrink-0 relative border-r border-border/15 last:border-r-0" style={{ width: `${cnt * DAY_W}px` }}>
                    <div className="absolute top-0 left-0" style={{ width: `${DAY_W}px` }}>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-foreground py-1 block tracking-wide text-center whitespace-nowrap overflow-visible z-10">
                        {MONTH_NAMES_FR[i]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day numbers */}
            <div className="flex">
              {days.map((day, i) => {
                const dStr = ds(day);
                let status = "free";
                const r = reservations.find(r => r.startDate <= dStr && r.endDate >= dStr);
                if (r) {
                  status = r.status === "confirmed" ? "confirmed" : "pending";
                }
                const textColor = 
                  dStr === today ? 'text-primary font-extrabold text-[10px]' :
                  isInSel(dStr) ? 'text-primary font-bold' :
                  status === "confirmed" ? 'text-[#16a34a] font-bold' :
                  status === "pending" ? 'text-[#f97316] font-bold' :
                  'text-foreground/50';

                return (
                  <div key={i} className={`flex-shrink-0 text-center ${isAdmin ? 'cursor-pointer' : ''}`} style={{ width: `${DAY_W}px` }} onClick={() => handleDayClick(day)}>
                    <span className={`text-[8px] sm:text-[9px] block py-0.5 font-semibold ${textColor}`}>{day.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* The BLUE LINE with tick marks */}
            <div className="relative" style={{ height: '20px' }}>
              {/* Main blue line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#3b82f6] rounded-full" />
              
              {/* Colored Line Segments for Reservations */}
              {reservations.map((r, idx) => {
                const sIdx = days.findIndex(d => ds(d) === r.startDate);
                const eIdx = days.findIndex(d => ds(d) === r.endDate);
                
                // If entirely out of bounds
                if ((sIdx < 0 && r.startDate > ds(days[days.length - 1])) || (eIdx < 0 && r.endDate < ds(days[0]))) {
                  return null;
                }
                
                const actualS = sIdx < 0 ? 0 : sIdx;
                const actualE = eIdx < 0 ? days.length - 1 : eIdx;
                
                // Tick is in the center of the day column (DAY_W / 2)
                const startX = actualS * DAY_W + DAY_W / 2;
                const endX = actualE * DAY_W + DAY_W / 2;
                const width = Math.max(0, endX - startX);
                
                const bgColor = r.status === "confirmed" ? "bg-[#16a34a]" : "bg-[#f97316]";
                
                return (
                  <div 
                    key={`res-line-${idx}`}
                    className={`absolute top-1/2 -translate-y-1/2 h-[3px] z-10 ${bgColor} rounded-full`}
                    style={{ left: `${startX}px`, width: `${width}px` }}
                  />
                );
              })}
              {/* Day tick marks */}
              {days.map((day, i) => {
                const isMonth1 = day.getDate() === 1;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${i * DAY_W + DAY_W / 2}px` }}
                  >
                    <div className={`w-[2px] ${isMonth1 ? 'h-[14px] bg-foreground/50' : 'h-[8px] bg-foreground/25'} rounded-full -translate-y-1/2`} style={{ marginTop: '1px' }} />
                  </div>
                );
              })}
              {/* Today red dot */}
              {(() => {
                const tIdx = days.findIndex(d => ds(d) === today);
                if (tIdx < 0) return null;
                return (
                  <div className="absolute top-1/2 -translate-y-1/2 z-10" style={{ left: `${tIdx * DAY_W + DAY_W / 2 - 4}px` }}>
                    <div className="w-[9px] h-[9px] bg-[#16a34a] rounded-full border-2 border-white shadow-sm" />
                  </div>
                );
              })()}
              {/* Selection highlight */}
              {selStart && (() => {
                const sIdx = days.findIndex(d => ds(d) === selStart);
                const eIdx = selEnd ? days.findIndex(d => ds(d) === selEnd) : sIdx;
                if (sIdx < 0) return null;
                const left = sIdx * DAY_W;
                const width = (eIdx - sIdx + 1) * DAY_W;
                return <div className="absolute top-0 bottom-0 bg-primary/10 border border-primary/30 rounded" style={{ left: `${left}px`, width: `${width}px` }} />;
              })()}
            </div>

            {/* Bracket area — reservations stack below the line */}
            <div className="relative" style={{ height: `${Math.max(bracketAreaH, 8)}px` }}>
              {lanedItems.map((item) => {
                const { reservation: r, lane, startIdx, endIdx } = item;
                const isConfirmed = r.status === "confirmed";
                const left = startIdx * DAY_W + Math.floor(DAY_W / 2);
                const width = Math.max((endIdx - startIdx) * DAY_W, DAY_W / 2);
                const top = lane * (BRACKET_H + BRACKET_GAP) + 4;

                // Build display name
                const displayName = r.clientName;
                const phoneShort = r.clientPhone ? r.clientPhone : '';

                return (
                  <div
                    key={r.id}
                    className="absolute flex items-center transition-all"
                    style={{ left: `${left}px`, width: `${width}px`, top: `${top}px`, height: `${BRACKET_H}px` }}
                  >
                    {/* The bracket shape */}
                    <div className={`w-full h-full rounded-md flex items-center justify-center gap-1 px-1.5 overflow-hidden ${
                      isConfirmed
                        ? 'border-[3px] border-[#16a34a] bg-[#16a34a]/10'
                        : 'border-2 border-[#f97316] bg-[#f97316]/8'
                    }`}>
                      {/* Label */}
                      <span className={`text-[10px] sm:text-[11px] font-extrabold truncate tracking-tight ${
                        isConfirmed ? 'text-[#15803d]' : 'text-[#ea580c]'
                      }`}>
                        {displayName}
                        {phoneShort && <span className="opacity-60 ml-0.5">· {phoneShort}</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Aujourd'hui button */}
        <div className="flex justify-center py-2 border-t border-border/15">
          <button onClick={scrollToToday} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95">
            <div className="w-2.5 h-2.5 bg-[#16a34a] rounded-full border border-white shadow-sm" />
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Admin: Inline form after click-to-select */}
      {isAdmin && showForm && selStart && selEnd && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Nouvelle réservation: <span className="text-primary">{fmtShort(selStart)} → {fmtShort(selEnd)}</span>
            </div>
            <button onClick={resetSel} className="w-6 h-6 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted"><X className="w-3 h-3" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); createM.mutate({ ...form, startDate: selStart, endDate: selEnd }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] font-medium">Nom du client *</Label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nom complet" className="h-9 text-sm rounded-lg mt-0.5" required />
              </div>
              <div>
                <Label className="text-[10px] font-medium">Téléphone</Label>
                <Input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} placeholder="50344..." className="h-9 text-sm rounded-lg mt-0.5" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, status: "confirmed" })} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${form.status === "confirmed" ? "bg-red-500 text-white shadow-sm" : "bg-muted/40 text-muted-foreground"}`}>
                <Check className="w-3 h-3" /> Confirmé
              </button>
              <button type="button" onClick={() => setForm({ ...form, status: "pending" })} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${form.status === "pending" ? "bg-orange-500 text-white shadow-sm" : "bg-muted/40 text-muted-foreground"}`}>
                <Clock className="w-3 h-3" /> Non confirmé
              </button>
            </div>
            <Button type="submit" className="w-full h-9 text-xs rounded-lg" disabled={createM.isPending}>
              {createM.isPending ? "Ajout..." : "Ajouter la réservation"}
            </Button>
          </form>
        </div>
      )}

      {/* Admin hint */}
      {isAdmin && !showForm && (
        <p className="text-[10px] text-muted-foreground text-center italic">
          {selStart && !selEnd ? `📌 Début: ${fmtShort(selStart)} — cliquez sur la date de fin` : "Cliquez sur une date pour commencer une réservation"}
        </p>
      )}

      {/* Reservation Summary List */}
      {reservations.length > 0 && (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-border/20 bg-muted/20">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Réservations ({reservations.length})</span>
          </div>
          <div className="divide-y divide-border/15 max-h-[280px] overflow-y-auto">
            {reservations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/15 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.status === "confirmed" ? "bg-[#16a34a]" : "bg-orange-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-foreground truncate">{r.clientName}</span>
                    {r.clientPhone && <span className="text-[10px] text-muted-foreground font-medium">· {r.clientPhone}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    de <span className="font-semibold text-foreground/80">{fmtShort(r.startDate)}</span> à <span className="font-semibold text-foreground/80">{fmtShort(r.endDate)}</span>
                  </div>
                </div>
                <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  r.status === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                }`}>
                  {r.status === "confirmed" ? "Réservé" : "Non confirmé"}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleM.mutate({ id: r.id, status: r.status })} className={`h-6 w-6 flex items-center justify-center rounded-md transition-all ${r.status === "confirmed" ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-orange-100 text-orange-600 hover:bg-orange-200"}`} title={r.status === "confirmed" ? "→ Non confirmé" : "→ Confirmé"}>
                      {r.status === "confirmed" ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </button>
                    <button onClick={() => deleteM.mutate(r.id)} className="h-6 w-6 flex items-center justify-center rounded-md bg-muted/40 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-all" title="Supprimer">
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
