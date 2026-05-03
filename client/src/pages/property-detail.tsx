import { useState, useEffect } from "react";
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
import {
  ArrowLeft, MapPin, BedDouble, Bath, Phone, Mail,
  ChevronLeft, ChevronRight, User, Pencil, ChefHat,
  Refrigerator, Flame, Wind, Wifi, Car, Waves, Users,
  TriangleAlert, Microwave, Coffee, Home, Utensils, Info, Clock, ShieldCheck,
  Ban, Smoke, NotebookText
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PropertyWithMedia, PropertySubmissionWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import { SEO } from "@/components/seo";
import { Helmet } from "react-helmet-async";
import AvailabilityTimeline from "@/components/availability-timeline";

// Broker contact info
const BROKER_PHONE = "50344187";
const BROKER_PHONE_DISPLAY = "50 344 187";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className={className} fill="currentColor">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.4c-33 0-65.4-8.9-94-25.7l-6.7-4-69.8 18.3L72 334.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
  </svg>
);

export default function PropertyDetailPage() {
  const { toast } = useToast();

  const [, paramsProperty] = useRoute("/property/:id");
  const [, paramsMaisons] = useRoute("/maisons/:id");

  const fullId = paramsMaisons?.id || paramsProperty?.id;

  let propertyId = undefined;
  if (fullId) {
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const uuidMatch = fullId.match(uuidRegex);

    if (uuidMatch) {
      propertyId = uuidMatch[0];
    } else {
      const refMatch = fullId.match(/-(REF-.*)$/i);
      if (refMatch) {
        propertyId = refMatch[1];
      } else {
        propertyId = fullId;
      }
    }
  }
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [neighborhoodMapFile, setNeighborhoodMapFile] = useState<File | null>(null);
  const [neighborhoodMapPreview, setNeighborhoodMapPreview] = useState<string | null>(null);

  // Swipe controls for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      prevImage();
    }
  };

  const editForm = useForm({
    defaultValues: {
      title: "",
      propertyType: "Apartment",
      floorLevel: "",
      isFurnished: false,
      hasLivingRoom: false,
      hasFridge: false,
      hasGasStove: false,
      hasAC: false,
      hasWiFi: false,
      hasParking: false,
      hasSeaView: false,
      description: "",
      rooms: 1,
      bathrooms: 1,
      maxGuests: 1,
      location: "",
      referenceCode: "",
      distanceToBeach: "",
      nearbyPlaces: "[]",
      price: "",
      googleMapsUrl: "",
      showOwnerContact: false,
      showGoogleMaps: true,
      showExactLocation: false,
      showNeighborhoodMap: true,
      showPrice: true,
      showRooms: true,
      showBathrooms: true,
      showDescription: true,
    },
  });

  const { data: property, isLoading } = useQuery<PropertyWithMedia>({
    queryKey: ['/api/properties', propertyId],
    enabled: !!propertyId,
  });

  const { data: reservations = [] } = useQuery<any[]>({
    queryKey: ['/api/properties', property?.id, 'reservations'],
    enabled: !!property?.id,
  });

  // Booking states
  const currentMonthNum = new Date().getMonth() + 1;
  const initialMonth = currentMonthNum.toString().padStart(2, '0');
  
  const [startDay, setStartDay] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>(initialMonth);
  const [endDay, setEndDay] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>(initialMonth);
  const [reserveDays, setReserveDays] = useState<number | ''>('');
  const [hasInterference, setHasInterference] = useState<boolean>(false);

  // Computed values
  const currentYear = new Date().getFullYear();
  const bookingYear = currentMonthNum > 9 ? currentYear + 1 : currentYear;

  const startDate = (startDay && startMonth) ? `${bookingYear}-${startMonth}-${startDay.padStart(2, '0')}` : '';
  const endDate = (endDay && endMonth) ? `${bookingYear}-${endMonth}-${endDay.padStart(2, '0')}` : '';

  const checkInterference = (start: string, end: string) => {
    if (!start || !end) return false;
    for (const r of reservations) {
      if (r.startDate <= end && r.endDate >= start) {
        return true;
      }
    }
    return false;
  };

  const handleWhatsAppReserve = () => {
    if (!property) return;

    // Check for interference first
    if (startDate && endDate) {
      if (checkInterference(startDate, endDate)) {
        setHasInterference(true);
        document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    const ref = property.referenceCode || "N/A";
    let message = `Bonjour, je souhaite réserver la propriété [${ref}] : ${property.title}.`;

    if (startDay && endDay) {
      const monthNames: { [key: string]: string } = {
        "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août", "09": "Septembre"
      };
      const mStart = monthNames[startMonth] || "Juin";
      const mEnd = monthNames[endMonth] || "Juin";
      message += `\nDu ${startDay} ${mStart} au ${endDay} ${mEnd}.`;
      if (reserveDays) message += ` (${reserveDays} nuits)`;
    } else {
      message += `\nJe n'ai pas encore choisi mes dates.`;
    }

    message += `\nLien: ${window.location.href}`;

    window.open(`https://wa.me/216${BROKER_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleReserveDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = e.target.value === '' ? '' : parseInt(e.target.value);
    setReserveDays(days);
    setHasInterference(false);

    if (startDate && days !== '') {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        start.setDate(start.getDate() + days);
        setEndMonth((start.getMonth() + 1).toString().padStart(2, '0'));
        setEndDay(start.getDate().toString());
      }
    }
  };

  // Sync reserveDays when end date is fully entered manually
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          setReserveDays((prev) => prev !== diffDays ? diffDays : prev);
        }
      }
    }
  }, [startDate, endDate]);

  const onReserveClick = () => {
    if (startDate && endDate) {
      const interferes = checkInterference(startDate, endDate);
      if (interferes) {
        setHasInterference(true);
        // Scroll to the booking widget on mobile
        document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setHasInterference(false);
    setBookingDialogOpen(true);
  };

  const { data: authStatus } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/broker/auth-status'],
  });

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

  const { data: ownerContact } = useQuery<{
    ownerContactVisible: boolean;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
  }>({
    queryKey: ['/api/properties', propertyId, 'owner-contact'],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}/owner-contact`);
      return response.json();
    },
    enabled: !!propertyId && !isAdmin,
  });

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
        title: "Propriété mise à jour",
        description: "Les détails de la propriété ont été mis à jour avec succès.",
      });
      setEditDialogOpen(false);
      setNeighborhoodMapFile(null);
      setNeighborhoodMapPreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Échec de la mise à jour",
        description: error.message || "Échec de la mise à jour de la propriété. Veuillez réessayer.",
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
      hasAC: submission.hasAC ?? false,
      hasWiFi: submission.hasWiFi ?? false,
      hasParking: submission.hasParking ?? false,
      hasSeaView: submission.hasSeaView ?? false,
      description: submission.description,
      rooms: submission.rooms,
      bathrooms: submission.bathrooms,
      maxGuests: submission.maxGuests ?? 1,
      location: submission.location,
      referenceCode: submission.referenceCode ?? "",
      distanceToBeach: submission.distanceToBeach ?? "",
      nearbyPlaces: submission.nearbyPlaces ?? "[]",
      price: submission.price,
      googleMapsUrl: submission.googleMapsUrl || "",
      showOwnerContact: submission.showOwnerContact ?? false,
      showGoogleMaps: submission.showGoogleMaps ?? true,
      showExactLocation: submission.showExactLocation ?? false,
      showNeighborhoodMap: submission.showNeighborhoodMap ?? true,
      showPrice: submission.showPrice ?? true,
      showRooms: submission.showRooms ?? true,
      showBathrooms: submission.showBathrooms ?? true,
      showDescription: submission.showDescription ?? true,
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Propriété non trouvée</h2>
          <Link href="/browse-properties">
            <Button>Parcourir les propriétés</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentMedia = property.media[currentImageIndex] || property.media[0];

  // SEO data
  const primaryImage = property.media.find(m => m.isPrimary) || property.media[0];
  const seoTitle = `${property.title} - ${property.rooms} Ch, ${property.bathrooms} Salles de bain | Edarna`;
  const seoDescription = `${property.isFurnished ? 'Appartement meublé' : 'Appartement'} avec ${property.rooms} chambres et ${property.bathrooms} salles de bain à ${property.location}. Prix: ${parseFloat(property.price).toLocaleString()} TND/nuit. ${property.description.substring(0, 100)}...`;

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
    <div className="min-h-screen bg-background pb-20 md:pb-12">
      <SEO
        title={seoTitle}
        description={seoDescription}
        keywords={`${property.title}, location ${property.location}, ${property.rooms} chambres, ${property.isFurnished ? 'meublé' : 'non meublé'}, ${parseFloat(property.price).toLocaleString()} TND`}
        image={primaryImage?.url}
        type="article"
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-32 lg:pb-10">

        {/* Back Navigation */}
        <div className="mb-4 animate-fade-in">
          <button 
            onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/'}
            className="inline-flex items-center gap-1.5 text-primary hover:opacity-70 transition-all py-2 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm sm:text-base font-bold tracking-tight">Accueil</span>
          </button>
        </div>

        {/* Title & Location at the top (Airbnb style) */}
        <div className="mb-6 animate-fade-in-up">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 leading-tight">
            {property.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm sm:text-base">
            <span className="flex items-center gap-1 font-medium text-foreground underline decoration-foreground/30 underline-offset-4">
              <MapPin className="w-4 h-4 text-primary" />
              {property.location}
            </span>
            {property.distanceToBeach && (
              <>
                <span className="mx-1 text-muted-foreground/50">•</span>
                <span className="flex items-center gap-1">
                  <Waves className="w-4 h-4 text-blue-500" />
                  {property.distanceToBeach}
                </span>
              </>
            )}
            {isAdmin && !property.showExactLocation && (
              <Badge variant="secondary" className="text-[10px] ml-2">Admin seulement</Badge>
            )}
            {isAdmin && property.referenceCode && (
              <Badge variant="outline" className="text-[10px] ml-2 font-mono text-primary border-primary">REF: {property.referenceCode}</Badge>
            )}
          </div>
        </div>

        {/* Hero Image Gallery (Airbnb Style) */}
        <div className="mb-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          {property.media.length > 0 ? (
            <>
              {/* Desktop Hero Grid (Hidden on mobile) */}
              <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[50vh] min-h-[400px] max-h-[500px] rounded-xl overflow-hidden">
                {/* Main large image */}
                <div
                  className={`col-span-2 row-span-2 relative ${property.media[0].mimeType.startsWith('image/') ? 'cursor-pointer' : ''} group`}
                  onClick={() => property.media[0].mimeType.startsWith('image/') && setCurrentImageIndex(0)}
                >
                  {property.media[0].mimeType.startsWith('image/') ? (
                    <img
                      src={property.media[0].url}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={property.media[0].url}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {property.media[0].mimeType.startsWith('image/') && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                  )}
                </div>

                {/* Smaller images (up to 4) */}
                {property.media.slice(1, 5).map((media, idx) => (
                  <div
                    key={media.id}
                    className={`relative ${media.mimeType.startsWith('image/') ? 'cursor-pointer' : ''} group overflow-hidden`}
                    onClick={() => media.mimeType.startsWith('image/') && setCurrentImageIndex(idx + 1)}
                  >
                    {media.mimeType.startsWith('image/') ? (
                      <img
                        src={media.url}
                        alt={`Aperçu ${idx + 2}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {media.mimeType.startsWith('image/') && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                    )}

                    {/* Overlay for the last image if there are more than 5 */}
                    {idx === 3 && property.media.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center hover:bg-black/40 transition-colors">
                        <span className="text-white font-semibold text-lg flex items-center gap-2">
                          Voir toutes les photos ({property.media.length})
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Fill empty spots if less than 5 images */}
                {Array.from({ length: Math.max(0, 4 - (property.media.length - 1)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-muted w-full h-full"></div>
                ))}
              </div>

              {/* Mobile Gallery: Main Viewer + Thumbnails (Hidden on desktop) */}
              <div className="md:hidden flex flex-col gap-2">

                {/* ── Main Viewer ── */}
                <div
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {currentMedia.mimeType.startsWith('image/') ? (
                    <img
                      key={currentImageIndex}
                      src={currentMedia.url}
                      alt={property.title}
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  ) : (
                    <video
                      key={currentImageIndex}
                      src={currentMedia.url}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  )}

                  {property.media.length > 1 && (
                    <>
                      {/* Left arrow */}
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 z-30">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-10 h-10 rounded-full bg-white/90 shadow-lg border-0 active:scale-90 transition-transform"
                          onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        >
                          <ChevronLeft className="h-5 w-5 text-foreground" />
                        </Button>
                      </div>

                      {/* Right arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-30">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-10 h-10 rounded-full bg-white/90 shadow-lg border-0 active:scale-90 transition-transform"
                          onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        >
                          <ChevronRight className="h-5 w-5 text-foreground" />
                        </Button>
                      </div>

                      {/* Counter */}
                      <div className="absolute bottom-3 right-3 bg-black/65 text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-30">
                        {currentImageIndex + 1} / {property.media.length}
                      </div>
                    </>
                  )}
                </div>

                {/* ── Thumbnail Strip ── */}
                {property.media.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
                    {property.media.map((media, idx) => {
                      const isActive = idx === currentImageIndex;
                      const isVideo = media.mimeType.startsWith('video/');
                      return (
                        <button
                          key={media.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden transition-all active:scale-95 ${isActive
                            ? 'ring-2 ring-primary ring-offset-1 opacity-100'
                            : 'opacity-55 hover:opacity-80'
                            }`}
                        >
                          {/* Thumbnail image */}
                          {isVideo ? (
                            media.thumbnailUrl ? (
                              <img
                                src={media.thumbnailUrl}
                                alt={`Vidéo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1" />
                              </div>
                            )
                          ) : (
                            <img
                              src={media.url}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}

                          {/* Play overlay for videos */}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[7px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="aspect-[4/3] md:h-[50vh] rounded-xl bg-muted flex flex-col items-center justify-center">
              <MapPin className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">Aucune photo disponible</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>

            {/* Quick Summary Row */}
            <div className="flex flex-wrap items-center gap-4 pb-2 border-b border-border">
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{property.maxGuests || 1} voyageurs</span>
                  <span className="text-muted-foreground/30 hidden sm:inline ml-2">•</span>
                </div>
              )}
              {(isAdmin || property.showRooms) && (
                <div className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{property.rooms} chambres</span>
                </div>
              )}
              <span className="text-muted-foreground/30 hidden sm:inline">•</span>
              {(isAdmin || property.showBathrooms) && (
                <div className="flex items-center gap-2">
                  <Bath className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{property.bathrooms} salles de bain</span>
                </div>
              )}
            </div>

            {/* Bed Details (New) */}
            {property.bedDetails && (
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                <BedDouble className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <span className="text-sm font-bold text-foreground block">Couchages</span>
                  <span className="text-sm text-muted-foreground">{property.bedDetails}</span>
                </div>
              </div>
            )}

            {/* Availability Timeline */}
            <div className="pt-2 pb-6 border-b border-border">
              <h2 className="text-xl font-semibold mb-2 text-foreground">Disponibilités</h2>
              <AvailabilityTimeline
                propertyId={property.id}
                isAdmin={isAdmin}
              />
            </div>

            {/* Amenities Grid (Ce que propose ce logement) - Moved up */}
            <div className="py-6 border-b border-border">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Ce que propose ce logement</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {property.hasWiFi && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Wifi className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Wi-Fi</span>
                  </div>
                )}
                {property.hasAC && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Wind className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Climatisation</span>
                  </div>
                )}
                {property.hasParking && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Car className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Parking gratuit</span>
                  </div>
                )}
                {property.hasSeaView && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Waves className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Vue sur mer</span>
                  </div>
                )}
                {property.hasFridge && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Refrigerator className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Réfrigérateur</span>
                  </div>
                )}
                {property.hasGasStove && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Flame className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Cuisinière à gaz</span>
                  </div>
                )}
                {property.hasMicrowave && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Microwave className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Micro-ondes</span>
                  </div>
                )}
                {property.hasCoffeeMaker && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <Coffee className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Machine à café</span>
                  </div>
                )}
                {property.hasLinens && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <NotebookText className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Draps fournis</span>
                  </div>
                )}
                {property.hasTowels && (
                  <div className="flex items-center gap-3 text-foreground/80">
                    <NotebookText className="w-6 h-6 opacity-70" />
                    <span className="font-medium">Serviettes fournies</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {(isAdmin || property.showDescription) && (
              <div className="pb-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  À propos de ce logement
                  {isAdmin && !property.showDescription && (
                    <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                  )}
                </h2>
                <div className="text-foreground/90 whitespace-pre-line leading-relaxed mb-8">
                  {property.description}
                </div>

            {/* Rules & Terms (New) - Moved before Map */}
            <div className="py-6 border-t border-border">
              <h2 className="text-xl font-semibold mb-6 text-foreground">Règles et conditions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Entry/Exit Times */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground block">Heures d'arrivée / départ</span>
                      <span className="font-bold text-foreground">Entrée: {property.checkInTime || "14:00"} • Sortie: {property.checkOutTime || "11:00"}</span>
                    </div>
                  </div>

                  {property.houseRules && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">Règles de la maison</span>
                        <span className="font-medium text-foreground">{property.houseRules}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cancellation Policy */}
                {property.cancellationPolicy && (
                  <div className="bg-muted/30 p-5 rounded-2xl border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Conditions d'annulation</h3>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed italic">
                      "{property.cancellationPolicy}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Google Maps Embed Location - Moved right under rules */}
            {property.location && (
              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Où se situe le logement</h3>
                  {property.distanceToBeach && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                      <Waves className="w-3 h-3 mr-1" />
                      {property.distanceToBeach}
                    </Badge>
                  )}
                </div>
                <div className="w-full h-64 md:h-[350px] rounded-xl overflow-hidden border border-border shadow-sm mb-4">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(property.location + ', Tunisia')}&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>

                {/* Neighborhood Points (New) */}
                {(property.locationRepere || property.nearbyCommodities) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.locationRepere && (
                      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <MapPin className="w-5 h-5 text-primary mt-1 shrink-0" />
                        <p className="text-sm font-medium text-foreground">{property.locationRepere}</p>
                      </div>
                    )}
                    {property.nearbyCommodities && (
                      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                        <Utensils className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                        <p className="text-sm text-muted-foreground">{property.nearbyCommodities}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Column - Booking / Contact Card (Sticky) */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <Card className="sticky top-24 shadow-xl border-border/60 overflow-hidden">
              <CardContent className="p-3 sm:p-6">
                <div>
                  {(isAdmin || property.showPrice) && (
                    <div className="mb-6 flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-foreground">
                        {parseFloat(property.price).toLocaleString()} TND
                      </span>
                      <span className="text-base text-muted-foreground font-semibold">/ nuit</span>
                      {isAdmin && !property.showPrice && (
                        <Badge variant="secondary" className="text-[10px] ml-2">Admin</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div id="booking-widget" className="space-y-4 border rounded-xl p-2 sm:p-4 bg-muted/30 mb-6">

                  {/* Booking Widget Inputs */}
                  <div className="border-2 border-border/60 rounded-xl bg-card overflow-hidden shadow-sm transition-all focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
                    <div className="flex items-center">
                      {/* Arrivée -> Du */}
                      <div className="flex-1 p-3 sm:p-5 border-r border-border/60 bg-transparent relative group">
                        <label className="block text-[10px] font-black uppercase text-primary mb-2 tracking-widest">
                          Du
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            placeholder="Jour"
                            className="w-full text-lg sm:text-xl font-black bg-muted/40 hover:bg-muted/70 focus:bg-background rounded-xl px-2 py-3 sm:py-4 outline-none text-center transition-all border border-transparent focus:border-primary/30 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={startDay}
                            id="start-day-input"
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length > 2) val = val.slice(0, 2);
                              setStartDay(val);
                              setHasInterference(false);
                            }}
                            min="1"
                            max="31"
                          />
                          <select
                            className="w-full text-base sm:text-lg font-black bg-muted/40 hover:bg-muted/70 focus:bg-background rounded-xl px-1 py-3 sm:py-4 outline-none cursor-pointer text-foreground transition-all border border-transparent focus:border-primary/30"
                            value={startMonth}
                            onChange={(e) => {
                              setStartMonth(e.target.value);
                              setHasInterference(false);
                            }}
                          >
                            <option value="05">Mai</option>
                            <option value="06">Juin</option>
                            <option value="07">Juil.</option>
                            <option value="08">Août</option>
                            <option value="09">Sept.</option>
                          </select>
                        </div>
                      </div>

                      {/* Départ -> Au */}
                      <div className="flex-1 p-3 sm:p-5 bg-transparent relative group">
                        <label className="block text-[10px] font-black uppercase text-primary mb-2 tracking-widest">
                          Au
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            placeholder="Jour"
                            className="w-full text-lg sm:text-xl font-black bg-muted/40 hover:bg-muted/70 focus:bg-background rounded-xl px-2 py-3 sm:py-4 outline-none text-center transition-all border border-transparent focus:border-primary/30 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={endDay}
                            id="end-day-input"
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length > 2) val = val.slice(0, 2);
                              setEndDay(val);
                              setHasInterference(false);
                            }}
                            min="1"
                            max="31"
                          />
                          <select
                            className="w-full text-base sm:text-lg font-black bg-muted/40 hover:bg-muted/70 focus:bg-background rounded-xl px-1 py-3 sm:py-4 outline-none cursor-pointer text-foreground transition-all border border-transparent focus:border-primary/30"
                            value={endMonth}
                            onChange={(e) => {
                              setEndMonth(e.target.value);
                              setHasInterference(false);
                            }}
                          >
                            <option value="05">Mai</option>
                            <option value="06">Juin</option>
                            <option value="07">Juil.</option>
                            <option value="08">Août</option>
                            <option value="09">Sept.</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Durée */}
                    <div className="border-t border-border/60 p-3.5 flex items-center justify-between bg-muted/10">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Durée (nuits)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-16 text-base font-bold outline-none bg-background rounded-md px-2 py-1 text-right shadow-sm border border-border/50 focus:border-primary/50 transition-colors [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={reserveDays}
                          onChange={handleReserveDaysChange}
                          placeholder="Ex: 3"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Display */}
                  {String(reserveDays) !== '' && !isNaN(Number(reserveDays)) && (
                    <div className="flex justify-between items-center py-2 text-foreground font-medium">
                      <span className="underline decoration-muted-foreground/30 underline-offset-4">{parseFloat(property.price)} TND × {reserveDays} nuits</span>
                      <span className="text-lg font-bold">{(parseFloat(property.price) * Number(reserveDays)).toLocaleString()} TND</span>
                    </div>
                  )}

                  {/* Interference Warning */}
                  {hasInterference && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-600 text-sm animate-in fade-in zoom-in-95">
                      <TriangleAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Dates non disponibles</p>
                        <p className="text-red-600/80 text-xs mt-1">Ces dates interfèrent avec une réservation existante. Veuillez choisir d'autres dates.</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      className="w-full py-6 text-lg font-black rounded-xl shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-95 text-white border-0"
                      onClick={onReserveClick}
                    >
                      Réserver
                    </Button>
                  </div>
                </div>

                {/* Legacy Phone Block - Hidden if using the new widget */}
                {!hasInterference && (
                  <div className="flex items-start gap-3 mt-4 justify-center border-t border-border pt-4">
                    <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Téléphone</div>
                      <a
                        href={`tel:${BROKER_PHONE}`}
                        className="text-lg font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {BROKER_PHONE_DISPLAY}
                      </a>
                    </div>
                  </div>
                )}

                {/* Admin Modify Button */}
                {isAdmin && submission && (
                  <div className="pt-6 mt-6 border-t border-border">
                    <Button
                      variant="outline"
                      className="w-full bg-blue-50/50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      onClick={handleEditProperty}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier l'annonce
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Property Dialog (Admin) */}
      {isAdmin && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la Propriété</DialogTitle>
              <DialogDescription>
                Mettre à jour les informations de cette annonce.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre</Label>
                <Input
                  id="edit-title"
                  {...editForm.register("title")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  {...editForm.register("description")}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-location">Emplacement exact</Label>
                <Input
                  id="edit-location"
                  {...editForm.register("location")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-distance-beach">Distance à la plage</Label>
                <Input
                  id="edit-distance-beach"
                  {...editForm.register("distanceToBeach")}
                  placeholder="ex: 5 min à pied"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rooms">Chambres</Label>
                  <Input
                    id="edit-rooms"
                    type="number"
                    {...editForm.register("rooms", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Salles de bain</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    {...editForm.register("bathrooms", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-max-guests">Voyageurs max</Label>
                  <Input
                    id="edit-max-guests"
                    type="number"
                    {...editForm.register("maxGuests", { valueAsNumber: true })}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-price">Prix par nuit (TND)</Label>
                  <Input
                    id="edit-price"
                    {...editForm.register("price")}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold text-sm">Équipements</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-ac" checked={editForm.watch("hasAC")} onCheckedChange={(c) => editForm.setValue("hasAC", !!c)} />
                    <Label htmlFor="edit-ac" className="cursor-pointer">Climatisation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-wifi" checked={editForm.watch("hasWiFi")} onCheckedChange={(c) => editForm.setValue("hasWiFi", !!c)} />
                    <Label htmlFor="edit-wifi" className="cursor-pointer">Wi-Fi</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-parking" checked={editForm.watch("hasParking")} onCheckedChange={(c) => editForm.setValue("hasParking", !!c)} />
                    <Label htmlFor="edit-parking" className="cursor-pointer">Parking gratuit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-sea-view" checked={editForm.watch("hasSeaView")} onCheckedChange={(c) => editForm.setValue("hasSeaView", !!c)} />
                    <Label htmlFor="edit-sea-view" className="cursor-pointer">Vue sur mer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-fridge" checked={editForm.watch("hasFridge")} onCheckedChange={(c) => editForm.setValue("hasFridge", !!c)} />
                    <Label htmlFor="edit-fridge" className="cursor-pointer">Réfrigérateur</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="edit-stove" checked={editForm.watch("hasGasStove")} onCheckedChange={(c) => editForm.setValue("hasGasStove", !!c)} />
                    <Label htmlFor="edit-stove" className="cursor-pointer">Gaz de ville/Cuisinière</Label>
                  </div>
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-300">Paramètres de visibilité</h4>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-show-exact-location"
                      checked={editForm.watch("showExactLocation")}
                      onCheckedChange={(checked) => editForm.setValue("showExactLocation", !!checked)}
                    />
                    <Label htmlFor="edit-show-exact-location" className="cursor-pointer text-sm">
                      Afficher l'emplacement exact aux visiteurs
                    </Label>
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Floating Booking Bar - Balanced & Refined */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-lg border-t border-border/40 p-4 pb-6 flex flex-col gap-3 z-[100] shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.2)] animate-slide-up">

        {/* Row 1: Price and Date Selection (Expanded) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col flex-shrink-0">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-foreground tracking-tighter">
                {parseFloat(property.price).toLocaleString()} TND
              </span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase">/ nuit</span>
            </div>
          </div>

          {/* Date Picker (Expanded to fill space) */}
          <div className="flex-1 flex gap-2">
            {/* Du */}
            <div className="flex-1 bg-muted/40 rounded-xl p-2 border border-border/60 shadow-sm transition-all active:bg-muted/60 relative">
              <span className="block text-[9px] font-black uppercase text-primary/70 mb-1 text-center leading-none tracking-tight">Du</span>
              <div className="flex gap-2 items-center justify-center">
                <input
                  type="number"
                  placeholder="--"
                  className="w-8 text-base font-bold bg-transparent text-center outline-none focus:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value.slice(0, 2))}
                />
                <select
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                >
                  <option value="05">Mai</option>
                  <option value="06">Juin</option>
                  <option value="07">Juil.</option>
                  <option value="08">Août</option>
                  <option value="09">Sep.</option>
                </select>
              </div>
            </div>

            {/* Au */}
            <div className="flex-1 bg-muted/40 rounded-xl p-2 border border-border/60 shadow-sm transition-all active:bg-muted/60 relative">
              <span className="block text-[9px] font-black uppercase text-primary/70 mb-1 text-center leading-none tracking-tight">Au</span>
              <div className="flex gap-2 items-center justify-center">
                <input
                  type="number"
                  placeholder="--"
                  className="w-8 text-base font-bold bg-transparent text-center outline-none focus:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={endDay}
                  onChange={(e) => setEndDay(e.target.value.slice(0, 2))}
                />
                <select
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                >
                  <option value="05">Mai</option>
                  <option value="06">Juin</option>
                  <option value="07">Juil.</option>
                  <option value="08">Août</option>
                  <option value="09">Sep.</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-95 text-white font-black py-7 rounded-2xl shadow-lg transition-all active:scale-[0.98] border-0 text-lg"
          onClick={onReserveClick}
        >
          Réserver
        </Button>
      </div>

      {/* Booking Options Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="sm:max-w-md mx-auto w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">Options de contact</DialogTitle>
            <DialogDescription className="text-center">

            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              className="w-full justify-between text-lg py-7 h-auto rounded-2xl shadow-md transition-transform active:scale-[0.98] bg-gradient-to-r from-[#FF385C] to-[#D80765] hover:opacity-90 text-white border-0"
              onClick={() => window.location.href = `tel:${BROKER_PHONE}`}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">Appeler par Téléphone</span>
                <span className="text-xs opacity-90">{BROKER_PHONE_DISPLAY}</span>
              </div>
              <Phone className="w-6 h-6" />
            </Button>

            <Button
              className="w-full justify-between text-lg py-7 h-auto rounded-2xl shadow-md transition-transform active:scale-[0.98] bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:opacity-90 text-white border-0"
              onClick={handleWhatsAppReserve}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">Réserver par WhatsApp</span>
                <span className="text-xs opacity-90">{BROKER_PHONE_DISPLAY}</span>
              </div>
              <WhatsAppIcon className="w-7 h-7" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
