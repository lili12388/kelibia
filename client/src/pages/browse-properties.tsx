import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, BedDouble, Bath, SlidersHorizontal, X, Eye, Sofa, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";

export default function BrowsePropertiesPage() {
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedRooms, setSelectedRooms] = useState<number | null>(null);
  const [selectedBathrooms, setSelectedBathrooms] = useState<number | null>(null);
  const [furnishedFilter, setFurnishedFilter] = useState<"all" | "furnished" | "semi-furnished" | "unfurnished">("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: properties, isLoading } = useQuery<PropertyWithMedia[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch per-property view counts for public listing
  const { data: propertyViews } = useQuery<{
    propertyId: string;
    totalViews: number;
  }[]>({
    queryKey: ['/api/properties/views'],
  });

  // Map of propertyId -> totalViews
  const viewsMap = useMemo(() => {
    const map = new Map<string, number>();
    if (propertyViews) {
      for (const v of propertyViews) {
        map.set(v.propertyId, v.totalViews ?? 0);
      }
    }
    return map;
  }, [propertyViews]);

  // Filter properties based on criteria
  const filteredProperties = useMemo(() => {
    if (!properties) return [];

    return properties.filter((property) => {
      const price = parseFloat(property.price);
      
      // Price filter
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      
      // Rooms filter
      if (selectedRooms !== null && property.rooms !== selectedRooms) return false;
      
      // Bathrooms filter
      if (selectedBathrooms !== null && property.bathrooms !== selectedBathrooms) return false;
      
      // Furnished filter - we'll need to check the property type field
      // For now, isFurnished is boolean, so we map: furnished=true, unfurnished=false, semi=either with specific indicator
      if (furnishedFilter === "furnished" && !property.isFurnished) return false;
      if (furnishedFilter === "unfurnished" && property.isFurnished) return false;
      // Note: semi-furnished would need a new field in schema, for now treat as "all"
      
      return true;
    });
  }, [properties, minPrice, maxPrice, selectedRooms, selectedBathrooms, furnishedFilter]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedRooms(null);
    setSelectedBathrooms(null);
    setFurnishedFilter("all");
  };

  const hasActiveFilters = minPrice || maxPrice || selectedRooms !== null || selectedBathrooms !== null || furnishedFilter !== "all";

  // Filter Sidebar Component
  const FilterSidebar = () => (
    <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-5 sticky top-24 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filtres
        </h2>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <Separator className="bg-border/40" />

      {/* Price Range */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground">Prix (TND/mois)</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Input
              id="min-price"
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10 text-sm bg-background/60 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <Input
              id="max-price"
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10 text-sm bg-background/60 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Type/Furnished */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground">Type</Label>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { value: "all" as const, label: "Tous" },
            { value: "furnished" as const, label: "Meublé" },
            { value: "semi-furnished" as const, label: "Semi-meublé" },
            { value: "unfurnished" as const, label: "Non meublé" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFurnishedFilter(value)}
              className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                furnishedFilter === value 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Bedrooms */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
          Chambres
        </Label>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setSelectedRooms(selectedRooms === num ? null : num)}
              className={`h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedRooms === num 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/60 text-foreground hover:bg-muted/60 border border-border/40"
              }`}
            >
              {num === 0 ? "S" : num}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Bathrooms */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Bath className="h-3.5 w-3.5 text-muted-foreground" />
          Salles de bain
        </Label>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setSelectedBathrooms(selectedBathrooms === num ? null : num)}
              className={`h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedBathrooms === num 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/60 text-foreground hover:bg-muted/60 border border-border/40"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Active filters count */}
      {hasActiveFilters && (
        <>
          <Separator className="bg-border/40" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredProperties.length} résultat{filteredProperties.length !== 1 ? 's' : ''}</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
              {[minPrice, maxPrice, selectedRooms !== null, selectedBathrooms !== null, furnishedFilter !== "all"].filter(Boolean).length} filtre{[minPrice, maxPrice, selectedRooms !== null, selectedBathrooms !== null, furnishedFilter !== "all"].filter(Boolean).length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </>
      )}
    </div>
  );

  // Generate SEO description based on filters
  const seoDescription = `${filteredProperties.length} ${filteredProperties.length === 1 ? 'propriété disponible' : 'propriétés disponibles'} à Hay Khadhra et Cité Olympique. ${furnishedFilter !== 'all' ? (furnishedFilter === 'furnished' ? 'Appartements meublés' : furnishedFilter === 'semi-furnished' ? 'Appartements semi-meublés' : 'Appartements non meublés') : 'Logements meublés et non meublés'}. Trouvez votre appartement idéal à Tunis.`;

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={`Propriétés Disponibles - ${filteredProperties.length} Logements | Edarna`}
        description={seoDescription}
        keywords="location appartement Hay Khadhra, location Cité Olympique, appartement meublé, appartement non meublé, 2 chambres, 3 chambres, location Tunis"
      />
      <Navbar />
      
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-primary/4">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/3 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-8 bg-primary rounded-full" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Hay Khadhra & Cité Olympique</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-3">
              Trouvez votre
              <span className="text-primary"> logement idéal</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl">
              Des appartements vérifiés, prêts à être loués. Parcourez nos annonces et contactez-nous directement.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 sm:px-6 lg:pl-6 lg:pr-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="w-full flex items-center justify-center gap-2 h-11 text-sm font-medium bg-card border border-border/60 rounded-xl hover:bg-muted/40 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full ml-1">
                  {[minPrice, maxPrice, selectedRooms !== null, selectedBathrooms !== null, furnishedFilter !== "all"].filter(Boolean).length}
                </Badge>
              )}
            </button>
          </div>

          {/* Mobile Filters Overlay */}
          {mobileFiltersOpen && (
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden animate-fade-in" 
              onClick={() => setMobileFiltersOpen(false)}
            >
              <div 
                className="fixed inset-y-0 left-0 w-full max-w-sm bg-background overflow-y-auto p-5 animate-slide-in-right shadow-2xl" 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-foreground">Filtres</h2>
                  <button 
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <FilterSidebar />
              </div>
            </div>
          )}

          {/* Properties Grid */}
          <main className="flex-1 min-w-0">
            {/* Results count */}
            {!isLoading && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredProperties.length}</span> logement{filteredProperties.length !== 1 ? 's' : ''} disponible{filteredProperties.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border/40">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4 rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-1/2 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredProperties.length === 0 && (
              <div className="text-center py-20 animate-fade-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-5">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {properties && properties.length > 0 ? "Aucun résultat" : "Aucune propriété disponible"}
                </h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  {properties && properties.length > 0 
                    ? "Essayez d'ajuster vos filtres pour voir plus de résultats."
                    : "Revenez bientôt pour de nouvelles annonces."
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" className="rounded-xl">
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            )}

            {/* Properties Grid */}
            {!isLoading && filteredProperties.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 stagger-children">
                {filteredProperties.map((property) => {
                  const primaryMedia = property.media.find(m => m.isPrimary) || property.media[0];
                  const price = parseFloat(property.price);
                  const views = viewsMap.get(property.id) ?? 0;
                  
                  return (
                    <Link key={property.id} href={`/property/${property.id}`}>
                      <div className="property-card bg-card rounded-2xl overflow-hidden border border-border/40 h-full flex flex-col cursor-pointer group shadow-sm">
                        {/* Property Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
                          {primaryMedia ? (
                            primaryMedia.mimeType.startsWith('video/') ? (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                <div className="text-center text-white/90">
                                  <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                                    <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
                                  </div>
                                  <div className="text-xs font-medium text-white/60">Vidéo</div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={primaryMedia.url}
                                alt={property.title}
                                className="card-image w-full h-full object-cover"
                                loading="lazy"
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                          
                          {/* Top badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                            <div className="flex gap-1.5">
                              {property.isFurnished && (
                                <span className="glass-dark text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                  <Sofa className="w-3 h-3" />
                                  Meublé
                                </span>
                              )}
                            </div>
                            
                            {views > 0 && (
                              <span className="glass-dark text-white/90 text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {views.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Price overlay */}
                          <div className="absolute bottom-3 left-3">
                            <div className="bg-white/95 backdrop-blur-sm text-foreground font-bold text-sm px-3 py-1.5 rounded-lg shadow-md">
                              {price.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">TND</span>
                            </div>
                          </div>
                        </div>

                        {/* Property Info */}
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold text-foreground text-sm sm:text-[15px] mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-200 leading-snug">
                            {property.title}
                          </h3>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary/60" />
                            <span className="truncate">{property.location}</span>
                          </div>
                          
                          {/* Room / Bath pills */}
                          <div className="mt-auto flex items-center gap-2">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
                              <BedDouble className="w-3.5 h-3.5" />
                              <span>{property.rooms} ch.</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg">
                              <Bath className="w-3.5 h-3.5" />
                              <span>{property.bathrooms} sdb.</span>
                            </div>
                            {property.propertyType && (
                              <div className="text-xs font-medium text-primary/70 bg-primary/8 px-2.5 py-1.5 rounded-lg ml-auto">
                                {property.propertyType}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Edarna — Hay Khadhra & Cité Olympique
          </p>
        </div>
      </footer>
    </div>
  );
}
