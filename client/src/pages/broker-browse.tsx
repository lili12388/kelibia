import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { MapPin, BedDouble, Bath, Search, Phone, Mail, User, ArrowLeft, Pencil, ChefHat, Refrigerator, Flame, BarChart3, Eye, MousePointer, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PropertyWithMedia, PropertySubmissionWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";

interface PropertyAnalytics {
  propertyId: string;
  totalViews: number;
  totalClicks: number;
  desktopViews: number;
  mobileViews: number;
  lastViewedAt: string;
  cityViews: Record<string, number>;
}

export default function BrokerBrowsePage() {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<PropertySubmissionWithMedia | null>(null);
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

  const { data: properties, isLoading } = useQuery<PropertyWithMedia[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch submissions to get owner info
  const { data: submissions } = useQuery<PropertySubmissionWithMedia[]>({
    queryKey: ['/api/broker/submissions', 'approved'],
  });

  // Fetch property analytics for selected property
  const { data: propertyAnalytics, isLoading: analyticsLoading } = useQuery<PropertyAnalytics>({
    queryKey: selectedPropertyId 
      ? [`/api/admin/analytics/property/${selectedPropertyId}`]
      : [],
    enabled: !!selectedPropertyId && analyticsDialogOpen,
  });

  // Create a map of property submission IDs to full submission data
  const submissionsMap = new Map(
    submissions?.map(sub => [sub.id, sub]) || []
  );

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

  const deleteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await fetch(`/api/broker/properties/${propertyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete property');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Property Deleted",
        description: "The property has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProperty = (propertyId: string, propertyTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${propertyTitle}"? This action cannot be undone.`)) {
      deleteMutation.mutate(propertyId);
    }
  };

  const handleEditSubmission = (submission: PropertySubmissionWithMedia) => {
    setSelectedSubmission(submission);
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
    if (!selectedSubmission) return;
    
    const formData = editForm.getValues();
    updateMutation.mutate({
      id: selectedSubmission.id,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Admin Header */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/broker/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h2 className="text-xl font-bold text-foreground">Admin Browse Mode</h2>
                <p className="text-sm text-muted-foreground">View properties with owner information</p>
              </div>
            </div>
            <Badge variant="default" className="px-3 py-1">
              Admin View
            </Badge>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search properties..." 
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">Published Properties</h1>
          <p className="text-muted-foreground text-lg">
            Browse all approved listings with owner contact information
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        {!isLoading && (!properties || properties.length === 0) && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted text-muted-foreground mb-6">
              <MapPin className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              No Published Properties
            </h3>
            <p className="text-muted-foreground mb-6">
              Approve property submissions to see them here.
            </p>
            <Link href="/broker/dashboard">
              <Button>
                Go to Dashboard
              </Button>
            </Link>
          </div>
        )}

        {/* Property Grid with Owner Info */}
        {!isLoading && properties && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const primaryMedia = property.media.find(m => m.isPrimary) || property.media[0];
              const submission = submissionsMap.get(property.submissionId);
              
              return (
                <Card key={property.id} className="overflow-hidden hover-elevate transition-all h-full flex flex-col">
                  {/* Property Image */}
                  <Link href={`/property/${property.id}`}>
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer">
                      {primaryMedia ? (
                        <img
                          src={primaryMedia.url}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Price Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-primary text-primary-foreground font-bold text-base px-3 py-1.5">
                          {parseFloat(property.price).toLocaleString()} TND
                        </Badge>
                      </div>
                    </div>
                  </Link>

                  {/* Property Info */}
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <Link href={`/property/${property.id}`}>
                      <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer">
                        {property.title}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{property.location}</span>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BedDouble className="w-4 h-4" />
                        <span>{property.rooms}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Bath className="w-4 h-4" />
                        <span>{property.bathrooms}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ChefHat className="w-4 h-4" />
                      </div>
                      {property.hasFridge && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Refrigerator className="w-4 h-4" />
                        </div>
                      )}
                      {property.hasGasStove && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Flame className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Admin Only */}
                    {submission && (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="default"
                            size="default"
                            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditSubmission(submission);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Modify
                          </Button>
                          <Button
                            variant="destructive"
                            size="default"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteProperty(property.id, property.title);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="default"
                          className="w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedPropertyId(property.id);
                            setAnalyticsDialogOpen(true);
                          }}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Analytics
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Property Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modify Property</DialogTitle>
            <DialogDescription>
              Edit the property details that are visible to public users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title - Always shown */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Property Title</Label>
              <Input
                id="edit-title"
                {...editForm.register("title")}
                placeholder="e.g., Modern Apartment in City Center"
              />
            </div>

            {/* Description with visibility toggle */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="edit-description">Description</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-description"
                    checked={editForm.watch("showDescription")}
                    onCheckedChange={(checked) => editForm.setValue("showDescription", !!checked)}
                  />
                  <Label htmlFor="show-description" className="text-xs cursor-pointer text-blue-700 font-medium">
                    Show to public?
                  </Label>
                </div>
              </div>
              <Textarea
                id="edit-description"
                {...editForm.register("description")}
                rows={4}
                placeholder="Detailed description of the property..."
              />
            </div>

            {/* Location with visibility toggle */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="edit-location">Exact Location</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-location"
                    checked={editForm.watch("showExactLocation")}
                    onCheckedChange={(checked) => editForm.setValue("showExactLocation", !!checked)}
                  />
                  <Label htmlFor="show-location" className="text-xs cursor-pointer text-blue-700 font-medium">
                    Show to public?
                  </Label>
                </div>
              </div>
              <Input
                id="edit-location"
                {...editForm.register("location")}
                placeholder="e.g., Hay Khadhra, near main street"
              />
            </div>

            {/* Property Details Grid with individual toggles */}
            <div className="grid grid-cols-2 gap-4">
              {/* Rooms */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="edit-rooms">Rooms</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-rooms"
                      checked={editForm.watch("showRooms")}
                      onCheckedChange={(checked) => editForm.setValue("showRooms", !!checked)}
                    />
                    <Label htmlFor="show-rooms" className="text-xs cursor-pointer text-blue-700 font-medium">
                      Show?
                    </Label>
                  </div>
                </div>
                <Input
                  id="edit-rooms"
                  type="number"
                  {...editForm.register("rooms", { valueAsNumber: true })}
                  min={1}
                />
              </div>

              {/* Bathrooms */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-bathrooms"
                      checked={editForm.watch("showBathrooms")}
                      onCheckedChange={(checked) => editForm.setValue("showBathrooms", !!checked)}
                    />
                    <Label htmlFor="show-bathrooms" className="text-xs cursor-pointer text-blue-700 font-medium">
                      Show?
                    </Label>
                  </div>
                </div>
                <Input
                  id="edit-bathrooms"
                  type="number"
                  {...editForm.register("bathrooms", { valueAsNumber: true })}
                  min={1}
                />
              </div>

              {/* Size */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="edit-size">Size (m²)</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-size"
                      checked={editForm.watch("showSize")}
                      onCheckedChange={(checked) => editForm.setValue("showSize", !!checked)}
                    />
                    <Label htmlFor="show-size" className="text-xs cursor-pointer text-blue-700 font-medium">
                      Show?
                    </Label>
                  </div>
                </div>
                <Input
                  id="edit-size"
                  type="number"
                  {...editForm.register("sizeM2", { valueAsNumber: true })}
                  min={1}
                />
              </div>

              {/* Price */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="edit-price">Monthly Rent (TND)</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-price"
                      checked={editForm.watch("showPrice")}
                      onCheckedChange={(checked) => editForm.setValue("showPrice", !!checked)}
                    />
                    <Label htmlFor="show-price" className="text-xs cursor-pointer text-blue-700 font-medium">
                      Show?
                    </Label>
                  </div>
                </div>
                <Input
                  id="edit-price"
                  {...editForm.register("price")}
                  placeholder="e.g., 1200"
                />
              </div>
            </div>

            {/* Google Maps with visibility toggle */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="edit-google-maps">Google Maps Link (Optional)</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-google-maps"
                    checked={editForm.watch("showGoogleMaps")}
                    onCheckedChange={(checked) => editForm.setValue("showGoogleMaps", !!checked)}
                  />
                  <Label htmlFor="show-google-maps" className="text-xs cursor-pointer text-blue-700 font-medium">
                    Show to public?
                  </Label>
                </div>
              </div>
              <Input
                id="edit-google-maps"
                type="url"
                {...editForm.register("googleMapsUrl")}
                placeholder="e.g., https://maps.app.goo.gl/..."
              />
            </div>

            {/* Deposit requirement with visibility toggle */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-requires-deposit"
                    checked={editForm.watch("requiresDeposit")}
                    onCheckedChange={(checked) => editForm.setValue("requiresDeposit", !!checked)}
                  />
                  <Label htmlFor="edit-requires-deposit" className="cursor-pointer font-medium">
                    Requires deposit (cautionnement)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-deposit"
                    checked={editForm.watch("showDeposit")}
                    onCheckedChange={(checked) => editForm.setValue("showDeposit", !!checked)}
                  />
                  <Label htmlFor="show-deposit" className="text-xs cursor-pointer text-blue-700 font-medium">
                    Show to public?
                  </Label>
                </div>
              </div>
            </div>

            {/* Additional Visibility Controls */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-900">Additional Visibility Settings</h4>
              <p className="text-xs text-blue-700">More granular control over what users can see</p>
              
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

      {/* Property Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Property Analytics
              {selectedPropertyId && properties && (
                <>
                  {' for '}
                  <span className="text-[#1a5f3f]">
                    {properties.find(p => p.id === selectedPropertyId)?.title || 'Unknown Property'}
                  </span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              View detailed statistics for this property
            </DialogDescription>
          </DialogHeader>

          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a5f3f]"></div>
            </div>
          ) : propertyAnalytics ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Views</p>
                        <p className="text-3xl font-bold text-[#1a5f3f]">
                          {propertyAnalytics.totalViews || 0}
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-[#1a5f3f] opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Contact Clicks</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {propertyAnalytics.totalClicks || 0}
                        </p>
                      </div>
                      <MousePointer className="h-8 w-8 text-blue-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Device Breakdown */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Device Breakdown
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Monitor className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Desktop</p>
                        <p className="text-xl font-bold">{propertyAnalytics.desktopViews || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Smartphone className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Mobile</p>
                        <p className="text-xl font-bold">{propertyAnalytics.mobileViews || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* City Breakdown */}
              {propertyAnalytics.cityViews && Object.keys(propertyAnalytics.cityViews).length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Views by City
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(propertyAnalytics.cityViews)
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 5)
                        .map(([city, count]: any) => (
                          <div key={city} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{city}</span>
                            <Badge variant="secondary">{count} views</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Last Viewed */}
              {propertyAnalytics.lastViewedAt && (
                <div className="text-sm text-gray-600">
                  Last viewed: {new Date(propertyAnalytics.lastViewedAt).toLocaleString('fr-TN')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No analytics data available for this property yet.</p>
              <p className="text-sm mt-2">Views will be tracked once visitors start viewing this property.</p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setAnalyticsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
