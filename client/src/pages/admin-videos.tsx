import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdmin } from "@/contexts/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  QrCode, 
  Copy,
  Eye,
  PlayCircle,
  Calendar,
  Tag
} from "lucide-react";
import type { Video, InsertVideo, CompanyTag } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "qrcode";

interface VideoFormData {
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  category: string;
  companyTag?: string;
}

function VideoDialog({ 
  video, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  video?: Video; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: VideoFormData) => void;
}) {
  const { adminUser } = useAdmin();
  
  // Fetch company tags if user is super admin
  const { data: companyTags = [] } = useQuery<CompanyTag[]>({
    queryKey: ["/api/admin/company-tags"],
    enabled: adminUser?.role === "SUPER_ADMIN",
  });
  const [formData, setFormData] = useState<VideoFormData>({
    title: video?.title || "",
    description: video?.description || "",
    thumbnailUrl: video?.thumbnailUrl || "",
    videoUrl: video?.videoUrl || "",
    duration: video?.duration || "",
    category: video?.category || "",
    companyTag: video?.companyTag || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: keyof VideoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {video ? "Edit Video" : "Add New Video"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Video title"
                required
                data-testid="input-video-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="e.g., Safety Training"
                required
                data-testid="input-video-category"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Video description"
              required
              rows={3}
              data-testid="input-video-description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) => handleChange("videoUrl", e.target.value)}
                placeholder="https://example.com/video.mp4"
                required
                data-testid="input-video-url"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                placeholder="e.g., 12:34"
                required
                data-testid="input-video-duration"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) => handleChange("thumbnailUrl", e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
                required
                data-testid="input-video-thumbnail"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyTag">Company Tag (Optional)</Label>
              {adminUser?.role === "SUPER_ADMIN" && companyTags.length > 0 ? (
                <Select
                  value={formData.companyTag || "none"}
                  onValueChange={(value) => handleChange("companyTag", value === "none" ? "" : value)}
                  data-testid="select-video-company-tag"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company tag</SelectItem>
                    {companyTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.name}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="companyTag"
                  value={formData.companyTag}
                  onChange={(e) => handleChange("companyTag", e.target.value)}
                  placeholder="e.g., acme-corp"
                  data-testid="input-video-company-tag"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save-video">
              {video ? "Update Video" : "Create Video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QRCodeDialog({ 
  isOpen, 
  onClose, 
  shareUrl 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  shareUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen && shareUrl && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareUrl, { width: 256 }, (error) => {
        if (error) console.error("QR code generation failed:", error);
      });
    }
  }, [isOpen, shareUrl]);

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement("a");
      link.download = "video-qr-code.png";
      link.href = canvasRef.current.toDataURL();
      link.click();
      toast({
        title: "QR Code Downloaded",
        description: "The QR code image has been saved to your device.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="border rounded-lg" />
          </div>
          
          <div className="space-y-2">
            <Label>Share URL</Label>
            <div className="flex space-x-2">
              <Input value={shareUrl} readOnly className="font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast({
                    title: "Copied to clipboard",
                    description: "Share URL has been copied.",
                  });
                }}
                data-testid="button-copy-url"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={downloadQR} data-testid="button-download-qr">
              <QrCode className="h-4 w-4 mr-2" />
              Download QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminVideos() {
  const { adminUser } = useAdmin();
  const { toast } = useToast();
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | undefined>();
  const [qrShareUrl, setQrShareUrl] = useState("");

  // Fetch videos
  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/admin/videos"],
  });

  // Create video mutation
  const createVideoMutation = useMutation({
    mutationFn: (data: VideoFormData) => apiRequest("POST", "/api/admin/videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      setIsVideoDialogOpen(false);
      toast({
        title: "Video Created",
        description: "The video has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create video. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update video mutation
  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VideoFormData }) => 
      apiRequest("PATCH", `/api/admin/videos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      setIsVideoDialogOpen(false);
      setEditingVideo(undefined);
      toast({
        title: "Video Updated",
        description: "The video has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update video. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      toast({
        title: "Video Deleted",
        description: "The video has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveVideo = (data: VideoFormData) => {
    if (editingVideo) {
      updateVideoMutation.mutate({ id: editingVideo.id, data });
    } else {
      createVideoMutation.mutate(data);
    }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setIsVideoDialogOpen(true);
  };

  const handleDeleteVideo = (video: Video) => {
    if (confirm(`Are you sure you want to delete "${video.title}"?`)) {
      deleteVideoMutation.mutate(video.id);
    }
  };

  const handleGenerateQR = (video: Video) => {
    const shareUrl = `${window.location.origin}/?video=${video.id}`;
    setQrShareUrl(shareUrl);
    setIsQRDialogOpen(true);
  };

  const copyShareUrl = (video: Video) => {
    const shareUrl = `${window.location.origin}/?video=${video.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied to clipboard",
      description: "Share URL has been copied.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Videos</h2>
          <p className="text-muted-foreground">Loading videos...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-0">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Videos</h2>
          <p className="text-muted-foreground">
            Manage your training video library ({videos.length} video{videos.length !== 1 ? 's' : ''})
          </p>
        </div>
        
        <Button onClick={() => setIsVideoDialogOpen(true)} data-testid="button-add-video">
          <Plus className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No videos yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first training video.
            </p>
            <Button onClick={() => setIsVideoDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-t-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(video.videoUrl, '_blank')}
                      data-testid={`button-preview-${video.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-2" data-testid={`text-video-title-${video.id}`}>
                      {video.title}
                    </h3>
                    <div className="flex space-x-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditVideo(video)}
                        data-testid={`button-edit-${video.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteVideo(video)}
                        data-testid={`button-delete-${video.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {video.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {video.duration}
                      </span>
                      <span className="flex items-center">
                        <Tag className="h-3 w-3 mr-1" />
                        {video.category}
                      </span>
                    </div>
                  </div>
                  
                  {video.companyTag && (
                    <div className="mb-3">
                      <span className="inline-block bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                        {video.companyTag}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShareUrl(video)}
                      className="flex-1"
                      data-testid={`button-copy-share-${video.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateQR(video)}
                      data-testid={`button-qr-${video.id}`}
                    >
                      <QrCode className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VideoDialog
        video={editingVideo}
        isOpen={isVideoDialogOpen}
        onClose={() => {
          setIsVideoDialogOpen(false);
          setEditingVideo(undefined);
        }}
        onSave={handleSaveVideo}
      />

      <QRCodeDialog
        isOpen={isQRDialogOpen}
        onClose={() => setIsQRDialogOpen(false)}
        shareUrl={qrShareUrl}
      />
    </div>
  );
}