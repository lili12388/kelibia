import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Eye, MousePointer, Activity, Monitor, Smartphone, ArrowLeft, Building2, Trash2, Calendar } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { frenchTitle } from "@/lib/utils";

interface AnalyticsSummary {
  totalVisitors: number;
  totalPageViews: number;
  totalPropertyViews: number;
  totalContacts: number;
  desktopVisitors: number;
  mobileVisitors: number;
  todayVisitors: number;
  todayPageViews: number;
  activeVisitors: number;
  topProperties: Array<{
    propertyId: string;
    title: string;
    totalViews: number;
    totalClicks: number;
    desktopViews: number;
    mobileViews: number;
    lastViewedAt: string;
  }>;
}

interface RealTimeData {
  activeVisitors: number;
}

async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

// Format relative time in French
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relativeText = "";
  
  if (diffMinutes < 1) {
    relativeText = "à l'instant";
  } else if (diffMinutes < 60) {
    relativeText = `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    const minutes = diffMinutes % 60;
    if (minutes > 0) {
      relativeText = `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''} et ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      relativeText = `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    }
  } else if (diffDays < 7) {
    relativeText = `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else {
    relativeText = date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  const formattedDate = date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return `${relativeText} (${formattedDate}, ${formattedTime})`;
}

export default function AdminAnalytics() {
  const [realTimeData, setRealTimeData] = useState<RealTimeData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month">("day");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Function to fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      const response = await apiRequest("/api/admin/analytics/real-time");
      const data = await response.json();
      setRealTimeData(data);
    } catch (error) {
      console.error("Error fetching real-time data:", error);
    }
  }, []);

  // Delete property analytics
  const handleDeletePropertyAnalytics = async (propertyId: string) => {
    setDeletingPropertyId(propertyId);
    try {
      const response = await apiRequest(`/api/admin/analytics/property/${propertyId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast({
          title: "Statistiques supprimées",
          description: "Les statistiques de cette propriété ont été supprimées.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary", timePeriod] });
      } else {
        throw new Error("Failed to delete property analytics");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les statistiques de cette propriété.",
        variant: "destructive",
      });
    } finally {
      setDeletingPropertyId(null);
    }
  };

  // Reset all statistics (set all counts to 0)
  const handleResetAllStatistics = async () => {
    setIsDeleting(true);
    try {
      const response = await apiRequest("/api/admin/analytics/reset", {
        method: "POST",
      });
      
      if (response.ok) {
        toast({
          title: "Statistiques réinitialisées",
          description: "Toutes les statistiques ont été remises à zéro.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary", timePeriod] });
      } else {
        throw new Error("Failed to reset statistics");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les statistiques.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete all visitor logs (for "Tout Supprimer" in Properties section)
  const handleDeleteAllData = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsDeleting(true);
    try {
      const response = await apiRequest("/api/admin/analytics/visitors", {
        method: "DELETE",
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Données supprimées",
          description: "Toutes les données analytiques ont été supprimées avec succès.",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary", timePeriod] });
        setDeleteAllDialogOpen(false);
      } else {
        const error = await response.text();
        console.error('Delete failed:', error);
        throw new Error("Failed to delete data");
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les données analytiques.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch analytics summary
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics/summary", timePeriod],
    queryFn: async () => {
      const response = await apiRequest(`/api/admin/analytics/summary?period=${timePeriod}`);
      return await response.json();
    },
  });

  // Fetch real-time data with polling
  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  if (summaryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a5f3f]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4f0] to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#1a5f3f] mb-2">
                Tableau de bord Analytics
              </h1>
              <p className="text-gray-600">
                Statistiques et informations sur les visiteurs de votre site
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    // Refresh analytics summary (includes "Propriétés les Plus Vues")
                    await queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary", timePeriod] });
                    await queryClient.refetchQueries({ queryKey: ["/api/admin/analytics/summary", timePeriod] });
                    
                    // Refresh real-time data immediately
                    await fetchRealTimeData();
                    
                    toast({ 
                      title: "Données actualisées", 
                      description: "Toutes les statistiques ont été mises à jour" 
                    });
                  } catch (error) {
                    console.error("Error refreshing data:", error);
                    toast({ 
                      title: "Erreur", 
                      description: "Impossible de rafraîchir les données",
                      variant: "destructive"
                    });
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                variant="outline" 
                className="flex items-center gap-2"
                disabled={isRefreshing}
              >
                <Activity className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? "Actualisation..." : "Actualiser"}
              </Button>
              <Link href="/broker/dashboard">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/admin/browse">
                <Button variant="outline" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Posts
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Statistiques Globales</CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Réinitialiser Tout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Réinitialiser les statistiques globales ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action réinitialisera toutes les statistiques (Total Visiteurs, Pages Vues, Aujourd'hui, En Ligne Maintenant) à zéro.
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetAllStatistics}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Oui, réinitialiser
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-l-4 border-[#1a5f3f]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Visiteurs Uniques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#1a5f3f]">
                    {summary?.totalVisitors.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {timePeriod === "day" ? "Aujourd'hui" : timePeriod === "week" ? "Cette semaine" : "Ce mois"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Vues de Propriétés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {summary?.totalPropertyViews.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Vues totales des propriétés
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Activity className="h-4 w-4 animate-pulse" />
                    En Ligne Maintenant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {realTimeData?.activeVisitors || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Visiteurs actifs
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <MousePointer className="h-4 w-4" />
                    Contacts / Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {summary?.totalContacts.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Clics sur le bouton Reserver
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-orange-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Appareils (Mobiles vs PC)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold text-orange-600 flex items-center gap-1">
                        <Smartphone className="h-4 w-4" /> {summary?.mobileVisitors || 0}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Mobiles</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-600 flex items-center gap-1">
                        <Monitor className="h-4 w-4" /> {summary?.desktopVisitors || 0}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Ordinateurs</p>
                    </div>
                  </div>
                  {/* Percentage bar */}
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden flex">
                    <div 
                      className="h-full bg-orange-500" 
                      style={{ 
                        width: `${summary ? (summary.mobileVisitors / ((summary.mobileVisitors + summary.desktopVisitors) || 1)) * 100 : 0}%` 
                      }}
                    ></div>
                    <div 
                      className="h-full bg-gray-400" 
                      style={{ 
                        width: `${summary ? (summary.desktopVisitors / ((summary.mobileVisitors + summary.desktopVisitors) || 1)) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Propriétés les Plus Vues */}

        {/* Top Properties */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  Propriétés les Plus Vues
                </CardTitle>
                <CardDescription>
                  Top 10 des propriétés par nombre de vues
                </CardDescription>
              </div>
              <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tout Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer toutes les données analytiques ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera TOUTES les données analytiques : logs de visites, statistiques des propriétés, et compteurs de vues.
                      Cette action est irréversible et réinitialisera complètement les analytics.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllData}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? "Suppression..." : "Oui, tout supprimer"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary?.topProperties.map((property, index) => (
                <div
                  key={property.propertyId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {frenchTitle(property.title)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Dernière vue: {formatRelativeTime(property.lastViewedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#1a5f3f]">
                        {property.totalViews}
                      </div>
                      <div className="text-xs text-gray-500">Vues</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {property.desktopViews}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Smartphone className="h-3 w-3" />
                        {property.mobileViews}
                      </Badge>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={deletingPropertyId === property.propertyId}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer les statistiques ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Voulez-vous supprimer les statistiques de "{frenchTitle(property.title)}" ?
                            Cela supprimera définitivement toutes les données analytiques de cette propriété.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePropertyAnalytics(property.propertyId)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {(!summary?.topProperties || summary.topProperties.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  Aucune propriété consultée pour le moment
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
