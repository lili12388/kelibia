import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, BedDouble, Bath, CheckCircle2, XCircle, Eye, Pencil, Upload, Search, ChefHat, Refrigerator, Flame, WashingMachine } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PropertySubmissionWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import { Link } from "wouter";

export default function BrokerDashboardPage() {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<PropertySubmissionWithMedia | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
      hasMicrowave: false,
      hasWashingMachine: false,
      hasCoffeeMaker: false,
      hasBalcony: false,
      hasGarden: false,
      hasLinens: false,
      hasTowels: false,
      tvType: "None",
      numDoubleBeds: 0,
      numSingleBeds: 0,
      hasSofaBed: false,
      bedDetails: "",
      locationRepere: "",
      nearbyCommodities: "",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      cancellationPolicy: "",
      houseRules: "",
    },
  });

  const { data: pendingSubmissions, isLoading: pendingLoading } = useQuery<PropertySubmissionWithMedia[]>({
    queryKey: ['/api/broker/submissions', 'pending'],
  });

  const { data: approvedSubmissions, isLoading: approvedLoading } = useQuery<PropertySubmissionWithMedia[]>({
    queryKey: ['/api/broker/submissions', 'approved'],
  });

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return apiRequest('POST', `/api/broker/submissions/${submissionId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({
        title: "Property Approved",
        description: "The property has been published and is now visible to tenants.",
      });
      setViewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return apiRequest('POST', `/api/broker/submissions/${submissionId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/submissions'] });
      toast({
        title: "Property Rejected",
        description: "The property submission has been rejected.",
      });
      setViewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, file }: { id: string; data: any; file: File | null }) => {
      const formData = new FormData();
      
      // Append all property data
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      // Append neighborhood map if provided
      if (file) {
        formData.append('neighborhoodMap', file);
      }
      
      return apiRequest('PUT', `/api/broker/submissions/${id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broker/submissions'] });
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

  const handleViewSubmission = (submission: PropertySubmissionWithMedia) => {
    setSelectedSubmission(submission);
    setCurrentImageIndex(0);
    setViewDialogOpen(true);
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
      pricePerWeek: (submission as any).pricePerWeek || "",
      googleMapsUrl: submission.googleMapsUrl || "",
      requiresDeposit: (submission as any).requiresDeposit ?? true,
      showOwnerContact: submission.showOwnerContact,
      showGoogleMaps: submission.showGoogleMaps,
      showExactLocation: submission.showExactLocation,
      showNeighborhoodMap: submission.showNeighborhoodMap,
      showPrice: submission.showPrice,
      showRooms: submission.showRooms,
      showBathrooms: submission.showBathrooms,
      showSize: submission.showSize,
      showDescription: submission.showDescription,
      showDeposit: (submission as any).showDeposit ?? true,
      hasMicrowave: submission.hasMicrowave,
      hasWashingMachine: submission.hasWashingMachine,
      hasCoffeeMaker: submission.hasCoffeeMaker,
      hasBalcony: submission.hasBalcony,
      hasGarden: submission.hasGarden,
      hasLinens: submission.hasLinens,
      hasTowels: submission.hasTowels ?? false,
      tvType: submission.tvType || "None",
      numDoubleBeds: submission.numDoubleBeds ?? 0,
      numSingleBeds: submission.numSingleBeds ?? 0,
      hasSofaBed: submission.hasSofaBed ?? false,
      bedDetails: submission.bedDetails || "",
      locationRepere: submission.locationRepere || "",
      nearbyCommodities: submission.nearbyCommodities || "",
      checkInTime: submission.checkInTime || "14:00",
      checkOutTime: submission.checkOutTime || "11:00",
      cancellationPolicy: submission.cancellationPolicy || "",
      houseRules: submission.houseRules || "",
    });
    setNeighborhoodMapFile(null);
    setNeighborhoodMapPreview(submission.neighborhoodMapUrl || null);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSubmission) return;
    
    const formData = editForm.getValues();
    
    // Generate bedDetails summary
    const bedSummary = [
      formData.numDoubleBeds > 0 ? `${formData.numDoubleBeds} lit${formData.numDoubleBeds > 1 ? 's' : ''} double${formData.numDoubleBeds > 1 ? 's' : ''}` : null,
      formData.numSingleBeds > 0 ? `${formData.numSingleBeds} lit${formData.numSingleBeds > 1 ? 's' : ''} simple${formData.numSingleBeds > 1 ? 's' : ''}` : null,
      formData.hasSofaBed ? "1 canapé-lit (Salon)" : null
    ].filter(Boolean).join(", ");
    
    const finalData = { ...formData, bedDetails: bedSummary };
    
    updateMutation.mutate({
      id: selectedSubmission.id,
      data: finalData,
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

  const handleApprove = (submissionId: string) => {
    approveMutation.mutate(submissionId);
  };

  const handleReject = (submissionId: string) => {
    rejectMutation.mutate(submissionId);
  };

  const currentMedia = selectedSubmission?.media[currentImageIndex];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page Header */}
      <div className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Broker Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage property submissions and listings</p>
            </div>
            <Link href="/broker/browse">
              <Button variant="default" size="lg">
                <Search className="mr-2 h-5 w-5" />
                Browse as Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending Submissions
              {pendingSubmissions && pendingSubmissions.length > 0 && (
                <Badge className="ml-2" variant="secondary">{pendingSubmissions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Active Listings
            </TabsTrigger>
          </TabsList>

          {/* Pending Submissions Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingLoading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <Skeleton className="w-32 h-32 rounded-lg" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!pendingLoading && (!pendingSubmissions || pendingSubmissions.length === 0) && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-no-pending">
                    No Pending Submissions
                  </h3>
                  <p className="text-muted-foreground">
                    All property submissions have been reviewed.
                  </p>
                </CardContent>
              </Card>
            )}

            {!pendingLoading && pendingSubmissions && pendingSubmissions.length > 0 && (
              <div className="space-y-4">
                {pendingSubmissions.map((submission) => {
                  const primaryMedia = submission.media.find(m => m.isPrimary) || submission.media[0];
                  
                  return (
                    <Card key={submission.id} className="overflow-hidden" data-testid={`card-submission-${submission.id}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-6 flex-col md:flex-row">
                          {/* Thumbnail */}
                          <div className="w-full md:w-32 aspect-square rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {primaryMedia ? (
                              primaryMedia.mimeType.startsWith('video/') ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                  <div className="text-center text-white">
                                    <div className="text-4xl mb-2">🎥</div>
                                    <div className="text-xs font-medium">Video</div>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={primaryMedia.url}
                                  alt={submission.title}
                                  className="w-full h-full object-cover"
                                  data-testid={`img-submission-${submission.id}`}
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground mb-1" data-testid={`text-title-${submission.id}`}>
                                {submission.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span data-testid={`text-location-${submission.id}`}>{submission.location}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <BedDouble className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{submission.rooms} rooms</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{submission.bathrooms} baths</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ChefHat className="w-4 h-4 text-muted-foreground" />
                              </div>
                              {submission.hasFridge && (
                                <div className="flex items-center gap-1">
                                  <Refrigerator className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              {submission.hasGasStove && (
                                <div className="flex items-center gap-1">
                                  <Flame className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              {submission.hasWashingMachine && (
                                <div className="flex items-center gap-1">
                                  <WashingMachine className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Owner: {submission.ownerName}</span>
                              <span>•</span>
                              <span>{submission.ownerEmail}</span>
                              <span>•</span>
                              <span>{submission.ownerPhone}</span>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Submitted {new Date(submission.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex md:flex-col gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSubmission(submission)}
                              data-testid={`button-view-${submission.id}`}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditSubmission(submission)}
                              data-testid={`button-edit-${submission.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(submission.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-${submission.id}`}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(submission.id)}
                              disabled={rejectMutation.isPending}
                              data-testid={`button-reject-${submission.id}`}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Active Listings Tab */}
          <TabsContent value="approved" className="space-y-4">
            {approvedLoading && (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            )}

            {!approvedLoading && (!approvedSubmissions || approvedSubmissions.length === 0) && (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-no-approved">
                    No Active Listings
                  </h3>
                  <p className="text-muted-foreground">
                    Approved properties will appear here.
                  </p>
                </CardContent>
              </Card>
            )}

            {!approvedLoading && approvedSubmissions && approvedSubmissions.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Published</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedSubmissions.map((submission) => (
                        <TableRow key={submission.id} data-testid={`row-approved-${submission.id}`}>
                          <TableCell className="font-medium">{submission.title}</TableCell>
                          <TableCell>{submission.location}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 text-sm">
                              <span>{submission.rooms}BR</span>
                              <span>{submission.bathrooms}BA</span>
                              <span>{submission.sizeM2}m²</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {parseFloat(submission.price).toLocaleString()} TND
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {submission.approvedAt && new Date(submission.approvedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Submission Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">{selectedSubmission?.title}</DialogTitle>
            <DialogDescription>
              Review property details before approving or rejecting
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Image Gallery */}
              {selectedSubmission.media.length > 0 && (
                <div className="space-y-3">
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    {currentMedia?.mimeType.startsWith('image/') ? (
                      <img
                        src={currentMedia.url}
                        alt="Property"
                        className="w-full h-full object-cover"
                        data-testid="dialog-img-main"
                      />
                    ) : currentMedia?.mimeType.startsWith('video/') ? (
                      <video src={currentMedia.url} controls className="w-full h-full object-contain bg-black" />
                    ) : null}
                  </div>
                  
                  {selectedSubmission.media.length > 1 && (
                    <div className="grid grid-cols-6 gap-2">
                      {selectedSubmission.media.map((media, index) => (
                        <button
                          key={media.id}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`aspect-square rounded overflow-hidden border-2 ${
                            index === currentImageIndex ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          {media.mimeType.startsWith('image/') ? (
                            <img src={media.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                              Video
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Location</div>
                  <div className="text-foreground">{selectedSubmission.location}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Price</div>
                  <div className="text-foreground font-semibold">
                    {parseFloat(selectedSubmission.price).toLocaleString()} TND/month
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Rooms</div>
                  <div className="text-foreground">{selectedSubmission.rooms}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Bathrooms</div>
                  <div className="text-foreground">{selectedSubmission.bathrooms}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Size</div>
                  <div className="text-foreground">{selectedSubmission.sizeM2}m²</div>
                </div>
                {selectedSubmission.bedDetails && (
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1">Couchages</div>
                    <div className="text-foreground">{selectedSubmission.bedDetails}</div>
                  </div>
                )}
                {(selectedSubmission.locationRepere || selectedSubmission.nearbyCommodities) && (
                  <div className="col-span-2 border-t pt-2 mt-2">
                    <div className="text-sm font-medium mb-1">Quartier</div>
                    <div className="space-y-1">
                      {selectedSubmission.locationRepere && (
                        <div className="text-sm"><span className="text-muted-foreground">Repère:</span> {selectedSubmission.locationRepere}</div>
                      )}
                      {selectedSubmission.nearbyCommodities && (
                        <div className="text-sm"><span className="text-muted-foreground">Commodités:</span> {selectedSubmission.nearbyCommodities}</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="col-span-2 border-t pt-2 mt-2">
                  <div className="text-sm font-medium mb-1">Règlement</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Check-in:</span> {selectedSubmission.checkInTime || "14:00"}</div>
                    <div><span className="text-muted-foreground">Check-out:</span> {selectedSubmission.checkOutTime || "11:00"}</div>
                    {selectedSubmission.houseRules && (
                      <div className="col-span-2"><span className="text-muted-foreground">Règles:</span> {selectedSubmission.houseRules}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <div className="text-foreground whitespace-pre-line">{selectedSubmission.description}</div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="text-sm font-medium mb-2">Owner Contact</div>
                <div className="space-y-1 text-sm">
                  <div>Name: {selectedSubmission.ownerName}</div>
                  <div>Email: {selectedSubmission.ownerEmail}</div>
                  <div>Phone: {selectedSubmission.ownerPhone}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              data-testid="button-dialog-cancel"
            >
              Close
            </Button>
            {selectedSubmission?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedSubmission.id)}
                  disabled={rejectMutation.isPending}
                  data-testid="button-dialog-reject"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  disabled={approveMutation.isPending}
                  data-testid="button-dialog-approve"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Publish
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Submission Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property Submission</DialogTitle>
            <DialogDescription>
              Modify property details and control what's visible to the public
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Property Type & Floor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-property-type">Type de bien</Label>
                <Select
                  value={editForm.watch("propertyType")}
                  onValueChange={(value) => editForm.setValue("propertyType", value)}
                >
                  <SelectTrigger id="edit-property-type">
                    <SelectValue placeholder="Choisir le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="House">Maison/Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-floor-level">Étage</Label>
                <Select
                  value={editForm.watch("floorLevel") || ""}
                  onValueChange={(value) => editForm.setValue("floorLevel", value)}
                >
                  <SelectTrigger id="edit-floor-level">
                    <SelectValue placeholder="Choisir l'étage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rez-de-chaussée">Rez-de-chaussée</SelectItem>
                    <SelectItem value="1er étage">1er étage</SelectItem>
                    <SelectItem value="2ème étage">2ème étage</SelectItem>
                    <SelectItem value="3ème étage">3ème étage</SelectItem>
                    <SelectItem value="4ème étage">4ème étage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Furnished & Living Room */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-furnished">Meublé?</Label>
                <Select
                  value={editForm.watch("isFurnished") ? "true" : "false"}
                  onValueChange={(value) => editForm.setValue("isFurnished", value === "true")}
                >
                  <SelectTrigger id="edit-furnished">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Non</SelectItem>
                    <SelectItem value="true">Oui</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-living-room">Salon?</Label>
                <div className="flex items-center gap-4">
                  <Select
                    value={editForm.watch("hasLivingRoom") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasLivingRoom", value === "true")}
                  >
                    <SelectTrigger id="edit-living-room">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Kitchen & Logistics */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Cuisine & Logistique</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fridge">Réfrigérateur?</Label>
                  <Select
                    value={editForm.watch("hasFridge") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasFridge", value === "true")}
                  >
                    <SelectTrigger id="edit-fridge">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-gas-stove">Cuisinière à gaz?</Label>
                  <Select
                    value={editForm.watch("hasGasStove") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasGasStove", value === "true")}
                  >
                    <SelectTrigger id="edit-gas-stove">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-microwave">Micro-ondes?</Label>
                  <Select
                    value={editForm.watch("hasMicrowave") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasMicrowave", value === "true")}
                  >
                    <SelectTrigger id="edit-microwave">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-washing">Machine à laver?</Label>
                  <Select
                    value={editForm.watch("hasWashingMachine") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasWashingMachine", value === "true")}
                  >
                    <SelectTrigger id="edit-washing">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>



                <div className="space-y-2">
                  <Label htmlFor="edit-linens">Draps fournis?</Label>
                  <Select
                    value={editForm.watch("hasLinens") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasLinens", value === "true")}
                  >
                    <SelectTrigger id="edit-linens">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg border">
                  <Checkbox
                    id="edit-towels"
                    checked={editForm.watch("hasTowels")}
                    onCheckedChange={(checked) => editForm.setValue("hasTowels", !!checked)}
                  />
                  <Label htmlFor="edit-towels">Serviettes fournies</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-balcony">Balcon / Terrasse?</Label>
                  <Select
                    value={editForm.watch("hasBalcony") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasBalcony", value === "true")}
                  >
                    <SelectTrigger id="edit-balcony">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-garden">Jardin / Accès extérieur?</Label>
                  <Select
                    value={editForm.watch("hasGarden") ? "true" : "false"}
                    onValueChange={(value) => editForm.setValue("hasGarden", value === "true")}
                  >
                    <SelectTrigger id="edit-garden">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Non</SelectItem>
                      <SelectItem value="true">Oui</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2 p-2 bg-slate-50 rounded-lg border">
                  <Label htmlFor="edit-tv">Télévision</Label>
                  <Select 
                    value={editForm.watch("tvType")} 
                    onValueChange={(val) => editForm.setValue("tvType", val)}
                  >
                    <SelectTrigger id="edit-tv">
                      <SelectValue placeholder="Choisir le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">Pas de TV</SelectItem>
                      <SelectItem value="Standard">Oui, TV Standard</SelectItem>
                      <SelectItem value="Smart TV">Oui, Smart TV (Netflix/YouTube)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Property Title</Label>
              <Input
                id="edit-title"
                {...editForm.register("title")}
                placeholder="e.g., Apartment - 2ème étage - Avec salon - Meublé"
              />
            </div>

            {/* Rooms, Bathrooms, Price, Deposit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-rooms">Chambres</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-rooms"
                      checked={editForm.watch("showRooms")}
                      onCheckedChange={(checked) => editForm.setValue("showRooms", !!checked)}
                    />
                    <Label htmlFor="show-rooms" className="text-xs text-blue-600 cursor-pointer">
                      Show to public?
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

              {/* Bed Details - Structured */}
              <div className="col-span-2 grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="edit-double-beds">Lits doubles</Label>
                  <Input
                    id="edit-double-beds"
                    type="number"
                    {...editForm.register("numDoubleBeds", { valueAsNumber: true })}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-single-beds">Lits simples</Label>
                  <Input
                    id="edit-single-beds"
                    type="number"
                    {...editForm.register("numSingleBeds", { valueAsNumber: true })}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Canapé-lit?</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="edit-sofa-bed"
                      checked={editForm.watch("hasSofaBed")}
                      onCheckedChange={(checked) => editForm.setValue("hasSofaBed", !!checked)}
                    />
                    <Label htmlFor="edit-sofa-bed" className="text-xs">Salon</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-bathrooms">Salles de bain</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-bathrooms"
                      checked={editForm.watch("showBathrooms")}
                      onCheckedChange={(checked) => editForm.setValue("showBathrooms", !!checked)}
                    />
                    <Label htmlFor="show-bathrooms" className="text-xs text-blue-600 cursor-pointer">
                      Show to public?
                    </Label>
                  </div>
                </div>
                <Select
                  value={String(editForm.watch("bathrooms"))}
                  onValueChange={(value) => editForm.setValue("bathrooms", parseInt(value))}
                >
                  <SelectTrigger id="edit-bathrooms">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 salle de bain</SelectItem>
                    <SelectItem value="2">2 salles de bain</SelectItem>
                    <SelectItem value="3">3+ salles de bain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-price">Loyer mensuel (TND)</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-price"
                      checked={editForm.watch("showPrice")}
                      onCheckedChange={(checked) => editForm.setValue("showPrice", !!checked)}
                    />
                    <Label htmlFor="show-price" className="text-xs text-blue-600 cursor-pointer">
                      Show to public?
                    </Label>
                  </div>
                </div>
                <Input
                  id="edit-price"
                  {...editForm.register("price")}
                  placeholder="e.g., 1200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-price-week">Prix par semaine (TND) — optionnel</Label>
                <Input
                  id="edit-price-week"
                  {...editForm.register("pricePerWeek")}
                  placeholder="ex: 650 (laisser vide si pas de tarif semaine)"
                />
                <p className="text-xs text-muted-foreground">Si rempli, appara??tra en vert sous le prix/nuit</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-deposit">Cautionnement requis?</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-deposit"
                      checked={editForm.watch("showDeposit")}
                      onCheckedChange={(checked) => editForm.setValue("showDeposit", !!checked)}
                    />
                    <Label htmlFor="show-deposit" className="text-xs text-blue-600 cursor-pointer">
                      Show to public?
                    </Label>
                  </div>
                </div>
                <Select
                  value={editForm.watch("requiresDeposit") ? "true" : "false"}
                  onValueChange={(value) => editForm.setValue("requiresDeposit", value === "true")}
                >
                  <SelectTrigger id="edit-deposit">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Non</SelectItem>
                    <SelectItem value="true">Oui</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-description">Description</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-description"
                    checked={editForm.watch("showDescription")}
                    onCheckedChange={(checked) => editForm.setValue("showDescription", !!checked)}
                  />
                  <Label htmlFor="show-description" className="text-xs text-blue-600 cursor-pointer">
                    Show to public?
                  </Label>
                </div>
              </div>
              <Textarea
                id="edit-description"
                {...editForm.register("description")}
                rows={4}
                placeholder="Décrivez votre propriété en détail..."
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-location">Localisation exacte</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-location"
                    checked={editForm.watch("showExactLocation")}
                    onCheckedChange={(checked) => editForm.setValue("showExactLocation", !!checked)}
                  />
                  <Label htmlFor="show-location" className="text-xs text-blue-600 cursor-pointer">
                    Show to public?
                  </Label>
                </div>
              </div>
              <Input
                id="edit-location"
                {...editForm.register("location")}
                placeholder="e.g., Hay Khadhra, près de l'avenue principale"
              />
            </div>

            {/* Neighborhood Points */}
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="edit-nearby">Commodités à proximité</Label>
                <Input
                  id="edit-nearby"
                  {...editForm.register("nearbyCommodities")}
                  placeholder="ex: Épicerie, Restaurant"
                />
              </div>
            </div>

            {/* Règlement */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Règlement & Réassurance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-checkin">Heure d'entrée (Check-in)</Label>
                  <Input
                    id="edit-checkin"
                    {...editForm.register("checkInTime")}
                    placeholder="14:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-checkout">Heure de sortie (Check-out)</Label>
                  <Input
                    id="edit-checkout"
                    {...editForm.register("checkOutTime")}
                    placeholder="11:00"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-cancel">Conditions d'annulation</Label>
                  <Textarea
                    id="edit-cancel"
                    {...editForm.register("cancellationPolicy")}
                    rows={2}
                    placeholder="ex: Annulation gratuite jusqu'à 7 jours..."
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-rules">Règles de la maison</Label>
                  <Input
                    id="edit-rules"
                    {...editForm.register("houseRules")}
                    placeholder="ex: Animaux non admis"
                  />
                </div>
              </div>
            </div>

            {/* Google Maps URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-google-maps">Lien Google Maps (Optionnel)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-google-maps"
                    checked={editForm.watch("showGoogleMaps")}
                    onCheckedChange={(checked) => editForm.setValue("showGoogleMaps", !!checked)}
                  />
                  <Label htmlFor="show-google-maps" className="text-xs text-blue-600 cursor-pointer">
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

            {/* Neighborhood Map Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-neighborhood-map">Neighborhood Map (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-neighborhood-map"
                    checked={editForm.watch("showNeighborhoodMap")}
                    onCheckedChange={(checked) => editForm.setValue("showNeighborhoodMap", !!checked)}
                  />
                  <Label htmlFor="show-neighborhood-map" className="text-xs text-blue-600 cursor-pointer">
                    Show to public?
                  </Label>
                </div>
              </div>
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

            {/* Owner Contact Visibility */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Owner Contact Information</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-owner-contact"
                    checked={editForm.watch("showOwnerContact")}
                    onCheckedChange={(checked) => editForm.setValue("showOwnerContact", !!checked)}
                  />
                  <Label htmlFor="show-owner-contact" className="text-xs text-blue-600 cursor-pointer">
                    Show to public?
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Owner: {selectedSubmission?.ownerName} • {selectedSubmission?.ownerEmail} • {selectedSubmission?.ownerPhone}
              </p>
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
    </div>
  );
}
