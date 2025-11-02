import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { MapPin, BedDouble, Bath, Maximize, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PropertySubmissionWithMedia } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function BrokerDashboardPage() {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<PropertySubmissionWithMedia | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const handleViewSubmission = (submission: PropertySubmissionWithMedia) => {
    setSelectedSubmission(submission);
    setCurrentImageIndex(0);
    setViewDialogOpen(true);
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
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">Broker Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage property submissions and listings</p>
        </div>
      </header>

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
                              <img
                                src={primaryMedia.url}
                                alt={submission.title}
                                className="w-full h-full object-cover"
                                data-testid={`img-submission-${submission.id}`}
                              />
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
                                <Maximize className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{submission.sizeM2}m²</span>
                              </div>
                              <Badge className="font-bold" data-testid={`badge-price-${submission.id}`}>
                                {parseFloat(submission.price).toLocaleString()} TND
                              </Badge>
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
                      <video src={currentMedia.url} controls className="w-full h-full" />
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
    </div>
  );
}
