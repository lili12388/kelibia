import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Check, Clock, X } from "lucide-react";
import type { Reservation } from "@shared/schema";

interface Props {
  propertyId: string;
}

export default function ReservationManager({ propertyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    startDate: "",
    endDate: "",
    status: "pending" as "confirmed" | "pending",
  });

  // Fetch admin (unmasked) reservations
  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: [`/api/broker/properties/${propertyId}/reservations`],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', `/api/broker/properties/${propertyId}/reservations`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/broker/properties/${propertyId}/reservations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/reservations`] });
      toast({ title: "Réservation ajoutée", description: "Le calendrier a été mis à jour." });
      setShowForm(false);
      setFormData({ clientName: "", clientPhone: "", startDate: "", endDate: "", status: "pending" });
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
      toast({ title: "Supprimée", description: "Réservation supprimée." });
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

  return (
    <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Gérer les réservations</h3>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-8 text-xs rounded-lg"
        >
          {showForm ? <X className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          {showForm ? "Annuler" : "Ajouter"}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="bg-muted/30 rounded-lg p-3 space-y-3 border border-border/30"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-medium">Nom du client *</Label>
              <Input
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="MR ABDL..."
                className="h-9 text-sm rounded-lg mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium">Téléphone</Label>
              <Input
                value={formData.clientPhone}
                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                placeholder="+216 50..."
                className="h-9 text-sm rounded-lg mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-medium">Du *</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-9 text-sm rounded-lg mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium">Au *</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-9 text-sm rounded-lg mt-1"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: "confirmed" })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formData.status === "confirmed"
                  ? "bg-red-500 text-white"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Confirmé
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: "pending" })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                formData.status === "pending"
                  ? "bg-orange-500 text-white"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Non confirmé
            </button>
          </div>
          <Button
            type="submit"
            className="w-full h-9 text-xs rounded-lg"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Ajout..." : "Ajouter la réservation"}
          </Button>
        </form>
      )}

      {/* Existing reservations list */}
      {reservations.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Aucune réservation pour cette propriété.
        </p>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {reservations.map((r) => (
          <div
            key={r.id}
            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
              r.status === "confirmed"
                ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
                : "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30"
            }`}
          >
            {/* Status dot */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              r.status === "confirmed" ? "bg-red-500" : "bg-orange-500"
            }`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{r.clientName}</div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(r.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                {' → '}
                {new Date(r.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                {r.clientPhone && ` · ${r.clientPhone}`}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => toggleStatusMutation.mutate({ id: r.id, status: r.status })}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-all ${
                r.status === "confirmed"
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-orange-100 text-orange-600 hover:bg-orange-200"
              }`}
              title={r.status === "confirmed" ? "Marquer non confirmé" : "Marquer confirmé"}
            >
              {r.status === "confirmed" ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => deleteMutation.mutate(r.id)}
              className="h-7 w-7 flex items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-all"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
