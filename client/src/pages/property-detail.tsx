import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, MapPin, BedDouble, Bath, Phone, Mail, ChevronLeft, ChevronRight, User, Pencil, ChefHat, Refrigerator, Flame } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PropertyWithMedia, PropertySubmissionWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePageView } from "@/hooks/use-analytics";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";
import { Helmet } from "react-helmet-async";

export default function PropertyDetailPage() {
  const { toast } = useToast();
  
  // Track page view for this specific property (increments analytics)
  usePageView();
  const [, params] = useRoute("/property/:id");
  const propertyId = params?.id;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [neighborhoodMapFile, setNeighborhoodMapFile] = useState<File | null>(null);
  const [neighborhoodMapPreview, setNeighborhoodMapPreview] = useState<string | null>(null);

  const editForm = useForm({
    defaultValues: {
      title: "",
      propertyType: "Apartment",
      floorLevel: "",
      isFurnished: false,
      hasLivingRoom: false,
      hasFridge: false,
      hasGasStove: false,
      description: "",
      rooms: 1,
      bathrooms: 1,
      sizeM2: 0,
      location: "",
      price: "",
      googleMapsUrl: "",
      requiresDeposit: true,
      showOwnerContact: false,
      showGoogleMaps: true,
      showExactLocation: false,
      showNeighborhoodMap: true,
      showPrice: true,
      showRooms: true,
      showBathrooms: true,
      showSize: true,
      showDescription: true,
      showDeposit: true,
    },
  });

  const { data: property, isLoading } = useQuery<PropertyWithMedia>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });

  // Check if user is admin
  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });

  // Fetch submission data to get owner info (only if admin)
  const { data: submission } = useQuery<PropertySubmissionWithMedia | null>({
    queryKey: ['/api/broker/submissions', property?.submissionId],
    enabled: !!(authStatus?.isAuthenticated && property?.submissionId),
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/broker/submissions/approved');
      const submissions = await response.json() as PropertySubmissionWithMedia[];
      return submissions.find((s: PropertySubmissionWithMedia) => s.id === property?.submissionId) || null;
    },
  });

  const isAdmin = authStatus?.isAuthenticated;

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, file }: { id: string; data: any; file: File | null }) => {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      if (file) {
        formData.append('neighborhoodMap', file);
      }
      
      return apiRequest('PUT', `/api/broker/submissions/${id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Property Updated",
        description: "The property details have been updated successfully.",
      });
      setEditDialogOpen(false);
      setNeighborhoodMapFile(null);
      setNeighborhoodMapPreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditProperty = () => {
    if (!submission) return;
    
    editForm.reset({
      title: submission.title,
      propertyType: submission.propertyType,
      floorLevel: submission.floorLevel || "",
      isFurnished: submission.isFurnished,
      hasLivingRoom: submission.hasLivingRoom,
      hasFridge: submission.hasFridge,
      hasGasStove: submission.hasGasStove,
      description: submission.description,
      rooms: submission.rooms,
      bathrooms: submission.bathrooms,
      sizeM2: submission.sizeM2,
      location: submission.location,
      price: submission.price,
      googleMapsUrl: submission.googleMapsUrl || "",
      requiresDeposit: submission.requiresDeposit,
      showOwnerContact: submission.showOwnerContact ?? false,
      showGoogleMaps: submission.showGoogleMaps ?? true,
      showExactLocation: submission.showExactLocation ?? false,
      showNeighborhoodMap: submission.showNeighborhoodMap ?? true,
      showPrice: submission.showPrice ?? true,
      showRooms: submission.showRooms ?? true,
      showBathrooms: submission.showBathrooms ?? true,
      showSize: submission.showSize ?? true,
      showDescription: submission.showDescription ?? true,
      showDeposit: submission.showDeposit ?? true,
    });
    setNeighborhoodMapFile(null);
    setNeighborhoodMapPreview(submission.neighborhoodMapUrl || null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!submission) return;
    
    const formData = editForm.getValues();
    updateMutation.mutate({
      id: submission.id,
      data: formData,
      file: neighborhoodMapFile,
    });
  };

  const handleNeighborhoodMapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNeighborhoodMapFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNeighborhoodMapPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const nextImage = () => {
    if (property && property.media.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.media.length);
    }
  };

  const prevImage = () => {
    if (property && property.media.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.media.length) % property.media.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="aspect-video w-full mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h2>
          <Link href="/browse-properties">
            <Button>Browse Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentMedia = property.media[currentImageIndex];
  
  // SEO data
  const primaryImage = property.media.find(m => m.isPrimary) || property.media[0];
  const seoTitle = `${property.title} - ${property.rooms} Ch, ${property.bathrooms} SDB | Edarna`;
  const seoDescription = `${property.isFurnished ? 'Appartement meublé' : 'Appartement'} avec ${property.rooms} chambres et ${property.bathrooms} salles de bain à ${property.location}. Prix: ${parseFloat(property.price).toLocaleString()} TND/mois. ${property.description.substring(0, 100)}...`;
  
  // Structured Data (Schema.org) for Google rich snippets
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": property.title,
    "description": property.description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": property.location,
      "addressCountry": "TN"
    },
    "price": parseFloat(property.price),
    "priceCurrency": "TND",
    "numberOfRooms": property.rooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": property.sizeM2,
      "unitCode": "MTK"
    },
    "image": primaryImage?.url || "",
    "availableAtOrFrom": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": property.location,
        "addressCountry": "Tunisia"
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={`${property.title}, location appartement ${property.location}, ${property.rooms} chambres, ${property.isFurnished ? 'meublé' : 'non meublé'}, ${parseFloat(property.price).toLocaleString()} TND`}
        image={primaryImage?.url}
        type="article"
      />
      
      {/* Structured Data for Google Rich Snippets */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Image Gallery */}
        <div className="mb-8">
          {property.media.length > 0 ? (
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                {currentMedia.mimeType.startsWith('image/') ? (
                  <img
                    src={currentMedia.url}
                    alt={property.title}
                    className="w-full h-full object-cover"
                    data-testid="img-main"
                  />
                ) : (
                  <video
                    src={currentMedia.url}
                    controls
                    className="w-full h-full object-contain bg-black"
                    data-testid="video-main"
                  />
                )}
                
                {/* Navigation Arrows */}
                {property.media.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      onClick={prevImage}
                      data-testid="button-prev-image"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      onClick={nextImage}
                      data-testid="button-next-image"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {property.media.length > 1 && (
                <div className="grid grid-cols-5 md:grid-cols-8 gap-2">
                  {property.media.map((media, index) => (
                    <button
                      key={media.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover-elevate ${
                        index === currentImageIndex 
                          ? 'border-primary' 
                          : 'border-transparent'
                      }`}
                      data-testid={`button-thumbnail-${index}`}
                    >
                      {media.mimeType.startsWith('image/') ? (
                        <img
                          src={media.url}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Video</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              <MapPin className="w-20 h-20 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Property Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-title">
                {property.title}
              </h1>
              
              {/* Show exact location based on visibility setting */}
              {(isAdmin || property.showExactLocation) && (
                <div className="flex items-center gap-2 text-muted-foreground mb-6">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg" data-testid="text-location">{property.location}</span>
                  {isAdmin && !property.showExactLocation && (
                    <Badge variant="secondary" className="text-[10px] ml-2">Admin only</Badge>
                  )}
                </div>
              )}

              {/* Metadata Grid - with visibility controls */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Rooms */}
                {(isAdmin || property.showRooms) && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <BedDouble className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold text-foreground" data-testid="text-rooms">{property.rooms}</div>
                      <div className="text-sm text-muted-foreground">Rooms</div>
                      {isAdmin && !property.showRooms && (
                        <Badge variant="secondary" className="text-[9px] mt-1">Admin only</Badge>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {/* Bathrooms */}
                {(isAdmin || property.showBathrooms) && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold text-foreground" data-testid="text-bathrooms">{property.bathrooms}</div>
                      <div className="text-sm text-muted-foreground">Bathrooms</div>
                      {isAdmin && !property.showBathrooms && (
                        <Badge variant="secondary" className="text-[9px] mt-1">Admin only</Badge>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {/* Kitchen Amenities */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <ChefHat className="w-6 h-6 text-primary" />
                      <div className="font-semibold text-foreground">Cuisine</div>
                    </div>
                    <div className="flex items-center gap-4 justify-center text-sm text-muted-foreground">
                      {property.hasFridge && (
                        <div className="flex items-center gap-1">
                          <Refrigerator className="w-5 h-5" />
                          <span>Frigo</span>
                        </div>
                      )}
                      {property.hasGasStove && (
                        <div className="flex items-center gap-1">
                          <Flame className="w-5 h-5" />
                          <span>Gaz</span>
                        </div>
                      )}
                      {!property.hasFridge && !property.hasGasStove && (
                        <span className="text-xs">Aucun équipement</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Price */}
                {(isAdmin || property.showPrice) && (
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary mb-1" data-testid="text-price">
                        {parseFloat(property.price).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">TND / month</div>
                      {isAdmin && !property.showPrice && (
                        <Badge variant="secondary" className="text-[9px] mt-1">Admin only</Badge>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Description - with visibility control */}
            {(isAdmin || property.showDescription) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Description
                    {isAdmin && !property.showDescription && (
                      <Badge variant="secondary" className="text-[10px]">Admin only</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-line leading-relaxed" data-testid="text-description">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Neighborhood Map - with visibility control */}
            {property.neighborhoodMapUrl && (isAdmin || property.showNeighborhoodMap) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Neighborhood Location
                    {isAdmin && !property.showNeighborhoodMap && (
                      <Badge variant="secondary" className="text-[10px]">Admin only</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={property.neighborhoodMapUrl}
                      alt="Neighborhood map"
                      className="w-full h-auto"
                      data-testid="img-neighborhood-map"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Map showing the property's neighborhood and surrounding area
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Contact */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Contact Broker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  {/* Price - with visibility control */}
                  {(isAdmin || property.showPrice) && (
                    <>
                      <div className="text-3xl font-bold text-primary mb-2" data-testid="text-price-card">
                        {parseFloat(property.price).toLocaleString()} TND
                        {isAdmin && !property.showPrice && (
                          <Badge variant="secondary" className="text-[9px] ml-2">Admin only</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">per month</div>
                    </>
                  )}
                  
                  {/* Deposit/Caution Badge - with visibility control */}
                  {property.requiresDeposit && (isAdmin || property.showDeposit) && (
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-full">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Cautionnement
                      </span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                          {parseFloat(property.price).toLocaleString()} TND
                        </span>
                      </div>
                      {isAdmin && !property.showDeposit && (
                        <Badge variant="secondary" className="text-[9px]">Admin only</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Phone</div>
                      <a 
                        href="tel:50344187" 
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                        data-testid="link-phone"
                      >
                        50 344 187
                  
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Email</div>
                      <a 
                        href="mailto:laithou123@gmail.com" 
                        className="text-base font-medium text-foreground hover:text-primary transition-colors break-all"
                        data-testid="link-email"
                      >
                        laithou123@gmail.com
                      </a>
                    </div>
                  </div>
                  
                  {/* Google Maps Link - with visibility control */}
                  {property.googleMapsUrl && (isAdmin || property.showGoogleMaps) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                          Location
                          {isAdmin && !property.showGoogleMaps && (
                            <Badge variant="secondary" className="text-[10px]">Admin only</Badge>
                          )}
                        </div>
                        <a 
                          href={property.googleMapsUrl} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium text-primary hover:underline transition-colors"
                          data-testid="link-google-maps"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Modify Button - More Prominent */}
                {isAdmin && submission && (
                  <div className="pt-4 border-t border-primary/20">
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg text-base font-semibold"
                      onClick={handleEditProperty}
                    >
                      <Pencil className="mr-2 h-5 w-5" />
                      Modify This Post
                    </Button>
                  </div>
                )}

                {/* Admin Owner Info Section */}
                {isAdmin && submission && (
                  <div className="pt-4 border-t border-primary/20 bg-primary/5 -mx-6 -mb-6 px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <User className="w-4 h-4" />
                        <span>OWNER CONTACT</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        Only shown for you!
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Owner Name</div>
                          <span className="text-sm font-medium text-foreground">{submission.ownerName}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Owner Phone</div>
                          <a 
                            href={`tel:${submission.ownerPhone}`}
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            {submission.ownerPhone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Owner Email</div>
                          <a 
                            href={`mailto:${submission.ownerEmail}`}
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {submission.ownerEmail}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show owner contact to regular users if enabled */}
                {!isAdmin && property.showOwnerContact && submission && (
                  <div className="pt-4 border-t border-primary/20 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Owner Contact
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Owner Name</div>
                          <span className="text-sm font-medium text-foreground">{submission.ownerName}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Owner Phone</div>
                          <a 
                            href={`tel:${submission.ownerPhone}`}
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            {submission.ownerPhone}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Owner Email</div>
                          <a 
                            href={`mailto:${submission.ownerEmail}`}
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {submission.ownerEmail}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isAdmin && !property.showOwnerContact && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Our broker will help you arrange a viewing and answer any questions about this property.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Property Dialog */}
      {isAdmin && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modify Property</DialogTitle>
              <DialogDescription>
                Edit the property details that are visible to public users
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Property Title</Label>
                <Input
                  id="edit-title"
                  {...editForm.register("title")}
                  placeholder="e.g., Modern Apartment in City Center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  {...editForm.register("description")}
                  rows={4}
                  placeholder="Detailed description of the property..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  {...editForm.register("location")}
                  placeholder="e.g., Hay Khadhra, near main street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rooms">Rooms</Label>
                  <Input
                    id="edit-rooms"
                    type="number"
                    {...editForm.register("rooms", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    {...editForm.register("bathrooms", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-size">Size (m²)</Label>
                  <Input
                    id="edit-size"
                    type="number"
                    {...editForm.register("sizeM2", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-price">Monthly Rent (TND)</Label>
                  <Input
                    id="edit-price"
                    {...editForm.register("price")}
                    placeholder="e.g., 1200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-google-maps">Google Maps Link (Optional)</Label>
                <Input
                  id="edit-google-maps"
                  type="url"
                  {...editForm.register("googleMapsUrl")}
                  placeholder="e.g., https://maps.app.goo.gl/..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-requires-deposit"
                  checked={editForm.watch("requiresDeposit")}
                  onCheckedChange={(checked) => editForm.setValue("requiresDeposit", !!checked)}
                />
                <Label htmlFor="edit-requires-deposit" className="cursor-pointer">
                  Requires deposit (cautionnement)
                </Label>
              </div>

              {/* Visibility Controls */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900">Visibility Settings (What Regular Users See)</h4>
                <p className="text-xs text-blue-700">Control what information is visible to regular users. You as admin always see everything.</p>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-show-owner-contact"
                      checked={editForm.watch("showOwnerContact")}
                      onCheckedChange={(checked) => editForm.setValue("showOwnerContact", !!checked)}
                    />
                    <Label htmlFor="edit-show-owner-contact" className="cursor-pointer text-sm">
                      Show owner contact information to users
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-show-google-maps"
                      checked={editForm.watch("showGoogleMaps")}
                      onCheckedChange={(checked) => editForm.setValue("showGoogleMaps", !!checked)}
                    />
                    <Label htmlFor="edit-show-google-maps" className="cursor-pointer text-sm">
                      Show Google Maps link to users
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-show-exact-location"
                      checked={editForm.watch("showExactLocation")}
                      onCheckedChange={(checked) => editForm.setValue("showExactLocation", !!checked)}
                    />
                    <Label htmlFor="edit-show-exact-location" className="cursor-pointer text-sm">
                      Show exact location to users
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-show-neighborhood-map"
                      checked={editForm.watch("showNeighborhoodMap")}
                      onCheckedChange={(checked) => editForm.setValue("showNeighborhoodMap", !!checked)}
                    />
                    <Label htmlFor="edit-show-neighborhood-map" className="cursor-pointer text-sm">
                      Show neighborhood map to users
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-neighborhood-map">Neighborhood Map (Optional)</Label>
                <div className="space-y-3">
                  <Input
                    id="edit-neighborhood-map"
                    type="file"
                    accept="image/*"
                    onChange={handleNeighborhoodMapChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a map or screenshot showing the neighborhood location
                  </p>
                  
                  {neighborhoodMapPreview && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <img
                        src={neighborhoodMapPreview}
                        alt="Neighborhood map preview"
                        className="w-full max-h-48 object-contain rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
