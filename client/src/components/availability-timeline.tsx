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
const MONTHS_FR = ["Mai", "Juin", "Juillet", "Août", "Septembre"];
const MONTH_IDX = [4, 5, 6, 7, 8];
const DW = 28; // day width px
const BRACE_H = 28; // height of each brace+label row
const BRACE_GAP = 2;
const LABEL_H = 16; // label text height

function genDays(year: number) {
  const d: Date[] = [];
  for (let m = 4; m <= 8; m++) {
    const c = new Date(year, m + 1, 0).getDate();
    for (let day = 1; day <= c; day++) d.push(new Date(year, m, day));
  }
  return d;
}

function ds(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtS(s: string) {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── SVG curly brace path ───
function bracePath(x1: number, x2: number, h: number) {
  const mid = (x1 + x2) / 2;
  const q = h * 0.6;
  // Curly brace: starts at x1, curves up to peak at mid, back down to x2
  return `M ${x1},0 C ${x1},${-q} ${mid - 4},${-h} ${mid},${-h} C ${mid + 4},${-h} ${x2},${-q} ${x2},0`;
}

// ─── Lane assignment (confirmed=green on top) ───
interface Laned { r: Reservation; lane: number; si: number; ei: number; }

function assignLanes(res: Reservation[], days: Date[]): Laned[] {
  const sorted = [...res].sort((a, b) => {
    if (a.status === "confirmed" && b.status !== "confirmed") return -1;
    if (a.status !== "confirmed" && b.status === "confirmed") return 1;
    return a.startDate.localeCompare(b.startDate);
  });
  const result: Laned[] = [];
  const ends: number[] = [];
  for (const r of sorted) {
    const si = days.findIndex(d => ds(d) === r.startDate);
    const ei = days.findIndex(d => ds(d) === r.endDate);
    if (si < 0 || ei < 0) continue;
    let lane = -1;
    for (let l = 0; l < ends.length; l++) { if (ends[l] < si) { lane = l; break; } }
    if (lane === -1) { lane = ends.length; ends.push(-1); }
    ends[lane] = ei;
    result.push({ r, lane, si, ei });
  }
  return result;
}

// ─── Props ───
interface Props { propertyId: string; isAdmin?: boolean; }

export default function AvailabilityTimeline({ propertyId, isAdmin = false }: Props) {
  const year = new Date().getFullYear();
  const days = useMemo(() => genDays(year), [year]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selS, setSelS] = useState<string|null>(null);
  const [selE, setSelE] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientName: "", clientPhone: "", status: "pending" as "confirmed"|"pending" });

  const pubQ = useQuery<Reservation[]>({ queryKey: [`/api/properties/${propertyId}/reservations`], enabled: !isAdmin });
  const admQ = useQuery<Reservation[]>({ queryKey: [`/api/broker/properties/${propertyId}/reservations`], enabled: !!isAdmin });
  const reservations = (isAdmin ? admQ.data : pubQ.data) ?? [];

  const inv = () => { qc.invalidateQueries({ queryKey: [`/api/broker/properties/${propertyId}/reservations`] }); qc.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reservations`] }); };
  const createM = useMutation({
    mutationFn: async (d: any) => { const r = await apiRequest('POST', `/api/broker/properties/${propertyId}/reservations`, d); return r.json(); },
    onSuccess: () => { inv(); toast({ title: "✓ Réservation ajoutée" }); resetSel(); },
    onError: () => { toast({ title: "Erreur", variant: "destructive" }); },
  });
  const deleteM = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest('DELETE', `/api/broker/reservations/${id}`, {}); return r.json(); },
    onSuccess: () => { inv(); toast({ title: "Supprimée" }); },
  });
  const toggleM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await apiRequest('PATCH', `/api/broker/reservations/${id}`, { status: status === "confirmed" ? "pending" : "confirmed" });
      return r.json();
    },
    onSuccess: () => inv(),
  });

  useEffect(() => { scrollToToday(); }, []);
  const scrollToToday = useCallback(() => {
    if (!scrollRef.current) return;
    const diff = Math.floor((Date.now() - new Date(year, 4, 1).getTime()) / 86400000);
    scrollRef.current.scrollTo({ left: Math.max(0, (diff - 4) * DW), behavior: 'smooth' });
  }, [year]);

  const laned = useMemo(() => assignLanes(reservations, days), [reservations, days]);
  const maxLane = laned.length > 0 ? Math.max(...laned.map(l => l.lane)) : -1;
  const braceAreaH = (maxLane + 1) * (BRACE_H + LABEL_H + BRACE_GAP) + 12;

  const today = ds(new Date());

  const handleClick = (day: Date) => {
    if (!isAdmin) return;
    const d = ds(day);
    if (!selS || (selS && selE)) { setSelS(d); setSelE(null); setShowForm(false); }
    else { if (d >= selS) { setSelE(d); setShowForm(true); } else { setSelS(d); setSelE(null); } }
  };
  const resetSel = () => { setSelS(null); setSelE(null); setShowForm(false); setForm({ clientName: "", clientPhone: "", status: "pending" }); };
  const inSel = (d: string) => { if (!selS) return false; if (!selE) return d === selS; return d >= selS && d <= selE; };

  const totalW = days.length * DW;

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-primary" /> Disponibilité
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /><span className="text-[9px] sm:text-[10px] text-muted-foreground">Libre</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" /><span className="text-[9px] sm:text-[10px] text-muted-foreground">Confirmé</span></div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#f97316]" /><span className="text-[9px] sm:text-[10px] text-muted-foreground">En attente</span></div>
        </div>
      </div>

      {/* Timeline Card */}
      <div className="relative bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {/* Scroll arrows */}
        <button onClick={() => scrollRef.current?.scrollBy({ left: -DW * 7, behavior: 'smooth' })}
          className="absolute left-0 top-0 bottom-0 z-20 w-8 flex items-center justify-center bg-gradient-to-r from-card to-transparent hover:from-muted/80 transition-all">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => scrollRef.current?.scrollBy({ left: DW * 7, behavior: 'smooth' })}
          className="absolute right-0 top-0 bottom-0 z-20 w-8 flex items-center justify-center bg-gradient-to-l from-card to-transparent hover:from-muted/80 transition-all">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div ref={scrollRef} className="overflow-x-auto mx-8 pb-1" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          <div style={{ width: `${totalW}px`, position: 'relative' }}>

            {/* Month headers */}
            <div className="flex border-b border-border/15">
              {MONTH_IDX.map((mi, i) => {
                const cnt = new Date(year, mi + 1, 0).getDate();
                return (
                  <div key={mi} className="flex-shrink-0 text-center border-r border-border/10 last:border-r-0" style={{ width: `${cnt * DW}px` }}>
                    <span className="text-[10px] sm:text-xs font-bold text-foreground/70 py-1 block tracking-wide">{MONTHS_FR[i]}</span>
                  </div>
                );
              })}
            </div>

            {/* Day numbers */}
            <div className="flex">
              {days.map((day, i) => (
                <div key={i} className={`flex-shrink-0 text-center ${isAdmin ? 'cursor-pointer' : ''}`} style={{ width: `${DW}px` }}
                  onClick={() => handleClick(day)}>
                  <span className={`text-[8px] sm:text-[9px] block py-0.5 font-semibold ${
                    ds(day) === today ? 'text-primary font-extrabold text-[10px]' :
                    inSel(ds(day)) ? 'text-primary font-bold' : 'text-foreground/50'
                  }`}>{day.getDate()}</span>
                </div>
              ))}
            </div>

            {/* ═══ THE BLUE LINE ═══ */}
            <div className="relative" style={{ height: '20px' }}>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#3b82f6] rounded-full" />
              {/* Tick marks */}
              {days.map((day, i) => (
                <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${i * DW + DW / 2}px` }}>
                  <div className={`w-[2px] -translate-y-1/2 rounded-full ${day.getDate() === 1 ? 'h-[14px] bg-foreground/50' : 'h-[8px] bg-foreground/25'}`} />
                </div>
              ))}
              {/* Today dot */}
              {(() => { const ti = days.findIndex(d => ds(d) === today); return ti >= 0 ? (
                <div className="absolute top-1/2 -translate-y-1/2 z-10" style={{ left: `${ti * DW + DW / 2 - 5}px` }}>
                  <div className="w-[10px] h-[10px] bg-primary rounded-full border-2 border-white shadow" />
                </div>
              ) : null; })()}
              {/* Selection highlight */}
              {selS && (() => {
                const si = days.findIndex(d => ds(d) === selS);
                const ei = selE ? days.findIndex(d => ds(d) === selE) : si;
                if (si < 0) return null;
                return <div className="absolute top-0 bottom-0 bg-primary/10 border border-primary/30 rounded" style={{ left: `${si * DW}px`, width: `${(ei - si + 1) * DW}px` }} />;
              })()}
            </div>

            {/* ═══ BRACE AREA (below the line) ═══ */}
            <div className="relative" style={{ height: `${Math.max(braceAreaH, 12)}px` }}>
              {laned.map((item) => {
                const { r, lane, si, ei } = item;
                const isC = r.status === "confirmed";
                const color = isC ? "#16a34a" : "#f97316";

                // Positions
                const x1 = si * DW + DW / 2;
                const x2 = ei * DW + DW / 2;
                const spanW = x2 - x1;
                const rowTop = lane * (BRACE_H + LABEL_H + BRACE_GAP);
                const braceHeight = BRACE_H;

                // Name
                const parts = r.clientName.split(' ');
                const name = parts.length > 1 ? parts[0] + ' ' + parts[1].substring(0, 4) + '..' : r.clientName;
                const phone = r.clientPhone ? r.clientPhone.substring(0, 6) + '..' : '';

                return (
                  <div key={r.id} className="absolute" style={{ left: `${x1}px`, top: `${rowTop}px`, width: `${Math.max(spanW, 10)}px` }}>
                    {/* SVG Curly Brace pointing downward */}
                    <svg width={Math.max(spanW, 10)} height={braceHeight} viewBox={`0 0 ${Math.max(spanW, 10)} ${braceHeight}`}
                      className="overflow-visible" style={{ display: 'block' }}>
                      {/* The brace shape: starts at left, curves down to center, curves back up to right */}
                      <path
                        d={(() => {
                          const w = Math.max(spanW, 10);
                          const mid = w / 2;
                          const peakY = braceHeight - 2;
                          const cpY = braceHeight * 0.7;
                          return `M 0,2 C 0,${cpY} ${mid - 6},${peakY} ${mid},${peakY} C ${mid + 6},${peakY} ${w},${cpY} ${w},2`;
                        })()}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Small vertical stem at the peak */}
                      <line x1={Math.max(spanW, 10) / 2} y1={braceHeight - 2} x2={Math.max(spanW, 10) / 2} y2={braceHeight + 2}
                        stroke={color} strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    {/* Label below the brace */}
                    <div className="flex items-center justify-center mt-0.5" style={{ height: `${LABEL_H}px` }}>
                      <span className="text-[8px] sm:text-[9px] font-bold whitespace-nowrap" style={{ color }}>
                        {name}
                        {phone && <span className="opacity-60 ml-0.5 font-medium">· {phone}</span>}
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
            <CalendarDays className="w-3.5 h-3.5" /> Aujourd'hui
          </button>
        </div>
      </div>

      {/* Admin form */}
      {isAdmin && showForm && selS && selE && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Nouvelle réservation: <span className="text-primary">{fmtS(selS)} → {fmtS(selE)}</span>
            </div>
            <button onClick={resetSel} className="w-6 h-6 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted"><X className="w-3 h-3" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); createM.mutate({ ...form, startDate: selS, endDate: selE }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">Nom du client *</Label><Input value={form.clientName} onChange={(e) => setForm({...form, clientName: e.target.value})} placeholder="Nom complet" className="h-9 text-sm rounded-lg mt-0.5" required /></div>
              <div><Label className="text-[10px]">Téléphone</Label><Input value={form.clientPhone} onChange={(e) => setForm({...form, clientPhone: e.target.value})} placeholder="50344..." className="h-9 text-sm rounded-lg mt-0.5" /></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({...form, status: "confirmed"})} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${form.status === "confirmed" ? "bg-green-600 text-white shadow-sm" : "bg-muted/40 text-muted-foreground"}`}>
                <Check className="w-3 h-3" /> Confirmé
              </button>
              <button type="button" onClick={() => setForm({...form, status: "pending"})} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${form.status === "pending" ? "bg-orange-500 text-white shadow-sm" : "bg-muted/40 text-muted-foreground"}`}>
                <Clock className="w-3 h-3" /> Non confirmé
              </button>
            </div>
            <Button type="submit" className="w-full h-9 text-xs rounded-lg" disabled={createM.isPending}>{createM.isPending ? "Ajout..." : "Ajouter la réservation"}</Button>
          </form>
        </div>
      )}

      {isAdmin && !showForm && (
        <p className="text-[10px] text-muted-foreground text-center italic">
          {selS && !selE ? `📌 Début: ${fmtS(selS)} — cliquez sur la date de fin` : "Cliquez sur une date pour commencer une réservation"}
        </p>
      )}

      {/* Summary list */}
      {reservations.length > 0 && (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-border/20 bg-muted/20">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Réservations ({reservations.length})</span>
          </div>
          <div className="divide-y divide-border/15 max-h-[280px] overflow-y-auto">
            {reservations.map((r) => {
              const isC = r.status === "confirmed";
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/15 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isC ? "bg-green-600" : "bg-orange-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">{r.clientName}</span>
                      {r.clientPhone && <span className="text-[10px] text-muted-foreground font-medium">· {r.clientPhone}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      de <span className="font-semibold text-foreground/80">{fmtS(r.startDate)}</span> à <span className="font-semibold text-foreground/80">{fmtS(r.endDate)}</span>
                    </div>
                  </div>
                  <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    isC ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                  }`}>{isC ? "Réservé" : "Non confirmé"}</div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleM.mutate({ id: r.id, status: r.status })} className={`h-6 w-6 flex items-center justify-center rounded-md transition-all ${isC ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-orange-100 text-orange-600 hover:bg-orange-200"}`}>
                        {isC ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      </button>
                      <button onClick={() => deleteM.mutate(r.id)} className="h-6 w-6 flex items-center justify-center rounded-md bg-muted/40 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
