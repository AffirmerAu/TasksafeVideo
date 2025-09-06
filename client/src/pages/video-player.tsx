import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Shield, Eye, Clock, Play, CheckCircle, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface AccessData {
  video: {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    duration: string;
    category: string;
  };
  accessLog: {
    id: string;
    accessedAt: string;
    email: string;
  };
  token: string;
}

export default function VideoPlayer() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState({ watchDuration: 0, completionPercentage: 0 });
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef({ watchDuration: 0, completionPercentage: 0 });

  // Get token from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  // Validate access token and get video data
  const { data: accessData, isLoading, error } = useQuery<AccessData>({
    queryKey: ["/api/access", token],
    enabled: !!token,
    retry: false,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (updates: { watchDuration: number; completionPercentage: number }) => {
      if (!accessData) return;
      
      const response = await fetch(`/api/access/${accessData.accessLog.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update progress');
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Progress Update Failed",
        description: "Unable to track viewing progress.",
      });
    }
  });

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !accessData) return;

    let updateInterval: NodeJS.Timeout;

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      const completionPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      
      const newProgress = {
        watchDuration: Math.round(currentTime),
        completionPercentage: Math.max(completionPercentage, progressRef.current.completionPercentage)
      };

      progressRef.current = newProgress;
      setProgress(newProgress);
    };

    const handlePlay = () => {
      // Update progress every 5 seconds while playing
      updateInterval = setInterval(() => {
        updateProgressMutation.mutate(progressRef.current);
      }, 5000);
    };

    const handlePause = () => {
      clearInterval(updateInterval);
      updateProgressMutation.mutate(progressRef.current);
    };

    const handleEnded = () => {
      clearInterval(updateInterval);
      const finalProgress = { ...progressRef.current, completionPercentage: 100 };
      updateProgressMutation.mutate(finalProgress);
      
      toast({
        title: "Training Complete",
        description: "You have successfully completed this training module.",
      });
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      clearInterval(updateInterval);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [accessData, updateProgressMutation]);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      setLocation("/access-denied");
    }
  }, [token, setLocation]);

  // Handle access errors
  useEffect(() => {
    if (error) {
      setLocation("/access-denied");
    }
  }, [error, setLocation]);

  if (!token) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            <Card className="mb-8">
              <CardContent className="p-0">
                <div className="relative bg-black aspect-video flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading secure video...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!accessData) return null;

  const { video, accessLog } = accessData;
  const accessTime = new Date(accessLog.accessedAt).toLocaleTimeString();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Video Player Section */}
          <Card className="mb-8 overflow-hidden shadow-lg">
            <CardContent className="p-0">
              <div className="relative">
                <div className="relative bg-black aspect-video">
                  {video.videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${video.videoUrl.split('/')[3]}?h=${video.videoUrl.split('/')[4]}&badge=0&autopause=0&autoplay=1&muted=1&player_id=0&app_id=58479`}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                      title={video.title}
                      data-testid="video-player"
                      onLoad={() => setIsVideoLoaded(true)}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      controls
                      autoPlay
                      muted
                      playsInline
                      preload="metadata"
                      poster={video.thumbnailUrl || ""}
                      data-testid="video-player"
                      onLoadedMetadata={() => setIsVideoLoaded(true)}
                    >
                      <source src={video.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                  
                  {!isVideoLoaded && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                        <p>Loading secure video...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Controls Info */}
                <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-md text-sm">
                  <Eye className="inline h-4 w-4 mr-2" />
                  <span>Viewing tracked for compliance</span>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-6">
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-video-title">
                    {video.title}
                  </h1>
                  <p className="text-muted-foreground" data-testid="text-video-description">
                    {video.description}
                  </p>
                </div>

                {/* Video Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="font-semibold" data-testid="text-video-duration">{video.duration}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Category</div>
                    <div className="font-semibold" data-testid="text-video-category">{video.category}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Access Time</div>
                    <div className="font-semibold" data-testid="text-access-time">{accessTime}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Viewer</div>
                    <div className="font-semibold text-sm" data-testid="text-viewer-email">
                      {accessLog.email.substring(0, accessLog.email.indexOf('@'))}...
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Tracking */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                <BarChart3 className="inline h-5 w-5 mr-2 text-primary" />
                Viewing Progress
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground">Completion</span>
                    <span className="text-muted-foreground" data-testid="text-completion-percentage">
                      {progress.completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress.completionPercentage}%` }}
                      data-testid="progress-bar"
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Play className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Started: </span>
                    <span className="font-medium" data-testid="text-start-time">{accessTime}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-muted-foreground">Watched: </span>
                    <span className="font-medium" data-testid="text-watch-duration">
                      {Math.floor(progress.watchDuration / 60)}:{(progress.watchDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className={`h-4 w-4 ${progress.completionPercentage >= 100 ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-muted-foreground">Completed: </span>
                    <span className="font-medium" data-testid="text-completion-status">
                      {progress.completionPercentage >= 100 ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Token - Bottom of Page */}
          <Card className="shadow-sm mt-8">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">Access Token</div>
                <div className="font-mono text-xs bg-muted px-3 py-2 rounded inline-block" data-testid="text-access-token">
                  {token.substring(0, 8)}...{token.substring(token.length - 8)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TaskSafe</h1>
              <p className="text-xs text-muted-foreground">Secure Training Platform</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
            data-testid="button-home"
          >
            Return Home
          </Button>
        </div>
      </div>
    </header>
  );
}
