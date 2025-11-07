import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, BedDouble, Bath, Search, ChefHat, Refrigerator, Flame, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PropertyWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/navbar";

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
    <div className="bg-white rounded-lg border border-border p-6 space-y-6 sticky top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6" />
          Filtres
        </h2>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-primary hover:text-primary/80"
          >
            Réinitialiser
          </Button>
        )}
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold text-foreground">Prix (TND)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="min-price" className="text-sm text-muted-foreground">Minimum</Label>
            <Input
              id="min-price"
              type="number"
              placeholder="Ex: 500"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="text-lg h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-price" className="text-sm text-muted-foreground">Maximum</Label>
            <Input
              id="max-price"
              type="number"
              placeholder="Ex: 2000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="text-lg h-12"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Bedrooms */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BedDouble className="h-5 w-5" />
          Chambres
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((num) => (
            <Button
              key={num}
              variant={selectedRooms === num ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedRooms(selectedRooms === num ? null : num)}
              className={`text-lg font-semibold h-14 ${
                selectedRooms === num 
                  ? "bg-primary text-white" 
                  : "hover:bg-primary/10"
              }`}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Bathrooms */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bath className="h-5 w-5" />
          Salles de bain
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((num) => (
            <Button
              key={num}
              variant={selectedBathrooms === num ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedBathrooms(selectedBathrooms === num ? null : num)}
              className={`text-lg font-semibold h-14 ${
                selectedBathrooms === num 
                  ? "bg-primary text-white" 
                  : "hover:bg-primary/10"
              }`}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Furnished */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold text-foreground">Type</Label>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant={furnishedFilter === "all" ? "default" : "outline"}
            size="lg"
            onClick={() => setFurnishedFilter("all")}
            className={`text-base h-12 justify-start ${
              furnishedFilter === "all" 
                ? "bg-primary text-white" 
                : "hover:bg-primary/10"
            }`}
          >
            Tous les logements
          </Button>
          <Button
            variant={furnishedFilter === "furnished" ? "default" : "outline"}
            size="lg"
            onClick={() => setFurnishedFilter("furnished")}
            className={`text-base h-12 justify-start ${
              furnishedFilter === "furnished" 
                ? "bg-primary text-white" 
                : "hover:bg-primary/10"
            }`}
          >
            Meublé
          </Button>
          <Button
            variant={furnishedFilter === "semi-furnished" ? "default" : "outline"}
            size="lg"
            onClick={() => setFurnishedFilter("semi-furnished")}
            className={`text-base h-12 justify-start ${
              furnishedFilter === "semi-furnished" 
                ? "bg-primary text-white" 
                : "hover:bg-primary/10"
            }`}
          >
            Semi-meublé
          </Button>
          <Button
            variant={furnishedFilter === "unfurnished" ? "default" : "outline"}
            size="lg"
            onClick={() => setFurnishedFilter("unfurnished")}
            className={`text-base h-12 justify-start ${
              furnishedFilter === "unfurnished" 
                ? "bg-primary text-white" 
                : "hover:bg-primary/10"
            }`}
          >
            Non meublé
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="pt-4 border-t border-border">
        <p className="text-center text-lg font-medium text-muted-foreground">
          {filteredProperties.length} {filteredProperties.length === 1 ? "résultat" : "résultats"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4f0] to-white">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Propriétés Disponibles</h1>
          <p className="text-muted-foreground text-lg">
            Parcourez les logements vérifiés à Hay Khadhra & Cité Olympique
          </p>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
          {/* Sidebar - Desktop - Far Left, Wider */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="w-full h-14 text-lg font-semibold"
            >
              <SlidersHorizontal className="mr-2 h-5 w-5" />
              Filtres {hasActiveFilters && `(${[minPrice, maxPrice, selectedRooms, selectedBathrooms, furnishedFilter !== "all"].filter(Boolean).length})`}
            </Button>
          </div>

          {/* Mobile Filters Overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
              <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Filtres</h2>
                  <Button variant="ghost" size="icon" onClick={() => setMobileFiltersOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
                <FilterSidebar />
              </div>
            </div>
          )}

          {/* Properties Grid */}
          <main className="flex-1 min-w-0">
            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredProperties.length === 0 && (
              <div className="text-center py-16 bg-white rounded-lg border border-border">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted text-muted-foreground mb-6">
                  <MapPin className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  {properties && properties.length > 0 ? "Aucun résultat" : "Aucune propriété disponible"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {properties && properties.length > 0 
                    ? "Essayez d'ajuster vos filtres pour voir plus de résultats."
                    : "Revenez bientôt pour de nouvelles annonces."
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} size="lg">
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            )}

            {/* Property Grid */}
            {!isLoading && filteredProperties.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((property) => {
                  const primaryMedia = property.media.find(m => m.isPrimary) || property.media[0];
                  const price = parseFloat(property.price);
                  
                  return (
                    <Link key={property.id} href={`/property/${property.id}`}>
                      <Card className="overflow-hidden hover-elevate transition-all h-full flex flex-col group">
                        {/* Property Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          {primaryMedia ? (
                            <img
                              src={primaryMedia.url}
                              alt={property.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Price Badge */}
                          <div className="absolute bottom-3 right-3">
                            <Badge className="bg-gradient-to-r from-[#1a5f3f] to-[#2d8659] text-white border-0 font-bold text-lg px-4 py-2 shadow-xl">
                              {price.toLocaleString()} TND
                            </Badge>
                          </div>

                          {/* Furnished Badge */}
                          {property.isFurnished && (
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-blue-600 text-white border-0 font-semibold text-sm px-3 py-1">
                                Meublé
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Property Info */}
                        <CardContent className="p-5 flex-1 flex flex-col">
                          <h3 className="font-bold text-foreground text-xl mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                            {property.title}
                          </h3>
                          
                          <div className="flex items-center gap-2 text-base text-muted-foreground mb-4">
                            <MapPin className="w-5 h-5 flex-shrink-0" />
                            <span className="line-clamp-1">{property.location}</span>
                          </div>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-4 mt-auto text-base flex-wrap">
                            <div className="flex items-center gap-2 text-foreground font-semibold bg-muted px-3 py-2 rounded-lg">
                              <BedDouble className="w-5 h-5" />
                              <span>{property.rooms}</span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground font-semibold bg-muted px-3 py-2 rounded-lg">
                              <Bath className="w-5 h-5" />
                              <span>{property.bathrooms}</span>
                            </div>
                            {property.hasFridge && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Refrigerator className="w-5 h-5" />
                              </div>
                            )}
                            {property.hasGasStove && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Flame className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
