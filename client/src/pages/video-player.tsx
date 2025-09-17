import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Shield, Eye, Clock, Play, CheckCircle, BarChart3, Volume2, VolumeX } from "lucide-react";
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

// YouTube Player API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Utility functions for video URL detection
const getVideoType = (url: string): 'youtube' | 'vimeo' | 'direct' => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'direct';
};

const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export default function VideoPlayer() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState({ watchDuration: 0, completionPercentage: 0 });
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMobilePlayButton, setShowMobilePlayButton] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const progressRef = useRef({ watchDuration: 0, completionPercentage: 0 });
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  
  // Mobile device detection - using multiple methods for better detection
  const isMobile = () => {
    const userAgent = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return isMobileUA || (isTouchDevice && isSmallScreen);
  };
  
  const isMobileDevice = isMobile();

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

  // Load YouTube API
  useEffect(() => {
    if (!accessData || getVideoType(accessData.video.videoUrl) !== 'youtube') return;

    // Load YouTube API if not already loaded
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        setIsYouTubeAPIReady(true);
      };
    } else {
      setIsYouTubeAPIReady(true);
    }
  }, [accessData]);

  // Progress update functions (shared across all player types)
  const updateProgress = useCallback((watchDuration: number, completionPercentage: number) => {
    const newProgress = {
      watchDuration: Math.round(watchDuration),
      completionPercentage: Math.max(completionPercentage, progressRef.current.completionPercentage)
    };

    progressRef.current = newProgress;
    setProgress(newProgress);
  }, []);

  const sendProgressUpdate = useCallback(() => {
    if (!accessData) return;
    
    fetch(`/api/access/${accessData.accessLog.id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressRef.current),
    }).catch(() => {
      // Silently handle errors to avoid restarting the player
      console.error('Progress update failed');
    });
  }, [accessData]);

  // Handle YouTube player
  useEffect(() => {
    if (!accessData || !isYouTubeAPIReady || getVideoType(accessData.video.videoUrl) !== 'youtube') return;

    const videoId = extractYouTubeVideoId(accessData.video.videoUrl);
    if (!videoId) return;

    let progressInterval: NodeJS.Timeout;

    const player = new window.YT.Player('youtube-player', {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        mute: isMobileDevice ? 1 : 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        disablekb: 1,
        fs: 0,
      },
      events: {
        onReady: () => {
          setIsVideoLoaded(true);
          youtubePlayerRef.current = player;
          setIsMuted(isMobileDevice);
          if (isMobileDevice) {
            setShowMobilePlayButton(true);
          }
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            // Start progress tracking
            progressInterval = setInterval(() => {
              const currentTime = player.getCurrentTime();
              const duration = player.getDuration();
              const completionPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
              
              updateProgress(currentTime, completionPercentage);
              sendProgressUpdate();
            }, 5000);
          } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
            // Update progress one final time
            clearInterval(progressInterval);
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            const completionPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
            
            updateProgress(currentTime, completionPercentage);
            sendProgressUpdate();

            if (event.data === window.YT.PlayerState.ENDED) {
              // Redirect to completion page
              const videoName = encodeURIComponent(accessData.video.title);
              const accessId = accessData.accessLog.id;
              setLocation(`/completion/${accessId}?videoName=${videoName}`);
            }
          }
        },
      },
    });

    return () => {
      clearInterval(progressInterval);
      if (player && player.destroy) {
        player.destroy();
      }
    };
  }, [accessData, isYouTubeAPIReady, updateProgress, sendProgressUpdate]);

  // Handle regular video events
  useEffect(() => {
    if (!accessData || getVideoType(accessData.video.videoUrl) !== 'direct') return;
    
    const video = videoRef.current;
    if (!video) return;

    let updateInterval: NodeJS.Timeout;

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      const completionPercentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      
      updateProgress(currentTime, completionPercentage);
    };

    const handlePlay = () => {
      // Update progress every 5 seconds while playing
      updateInterval = setInterval(() => {
        sendProgressUpdate();
      }, 5000);
    };

    const handlePause = () => {
      clearInterval(updateInterval);
      sendProgressUpdate();
    };

    const handleEnded = () => {
      clearInterval(updateInterval);
      sendProgressUpdate();
      
      // Redirect to completion page
      const videoName = encodeURIComponent(accessData.video.title);
      const accessId = accessData.accessLog.id;
      setLocation(`/completion/${accessId}?videoName=${videoName}`);
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
  }, [accessData, updateProgress, sendProgressUpdate]);

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
                  {getVideoType(video.videoUrl) === 'youtube' ? (
                    <div
                      id="youtube-player"
                      className="w-full h-full"
                      data-testid="video-player"
                    />
                  ) : getVideoType(video.videoUrl) === 'vimeo' ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${video.videoUrl.split('/')[3]}?h=${video.videoUrl.split('/')[4]}&badge=0&autopause=0&autoplay=1&muted=${isMobileDevice ? 1 : 0}&controls=0&player_id=0&app_id=58479`}
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
                      autoPlay
                      muted={isMobileDevice}
                      playsInline
                      preload="metadata"
                      poster=""
                      data-testid="video-player"
                      onLoadedMetadata={() => {
                        setIsVideoLoaded(true);
                        setIsMuted(isMobileDevice);
                        if (isMobileDevice) {
                          setShowMobilePlayButton(true);
                        }
                      }}
                      controls={false}
                      onSeeking={(e) => {
                        const video = e.target as HTMLVideoElement;
                        const currentProgress = progressRef.current.completionPercentage;
                        const maxTime = (video.duration * currentProgress) / 100;
                        if (video.currentTime > maxTime) {
                          video.currentTime = maxTime;
                        }
                      }}
                      onPlay={() => {
                        setIsPlaying(true);
                        if (isMobileDevice && videoRef.current && !videoRef.current.muted) {
                          setShowMobilePlayButton(false);
                        }
                      }}
                      onPause={() => setIsPlaying(false)}
                    >
                      <source src={video.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                  
                  {/* Mobile Play/Unmute Overlay */}
                  {(showMobilePlayButton && isMobileDevice) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <div 
                        className="bg-white/90 rounded-full p-6 cursor-pointer hover:bg-white transition-colors"
                        onClick={async () => {
                          if (getVideoType(video.videoUrl) === 'youtube' && youtubePlayerRef.current) {
                            youtubePlayerRef.current.unMute();
                            youtubePlayerRef.current.playVideo();
                            setIsMuted(false);
                            setShowMobilePlayButton(false);
                          } else if (getVideoType(video.videoUrl) === 'direct' && videoRef.current) {
                            videoRef.current.muted = false;
                            try {
                              await videoRef.current.play();
                              setIsMuted(false);
                              setShowMobilePlayButton(false);
                            } catch (error) {
                              console.error('Play failed:', error);
                            }
                          } else if (getVideoType(video.videoUrl) === 'vimeo') {
                            // For Vimeo, we need to reload with muted=0
                            const iframe = document.querySelector('iframe');
                            if (iframe) {
                              const currentSrc = iframe.src;
                              iframe.src = currentSrc.replace('muted=1', 'muted=0');
                              setIsMuted(false);
                              setShowMobilePlayButton(false);
                            }
                          }
                        }}
                        data-testid="button-mobile-play"
                      >
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-2">
                            <Play className="h-12 w-12 text-gray-800 mr-2" />
                            <Volume2 className="h-8 w-8 text-gray-800" />
                          </div>
                          <p className="text-sm text-gray-800 font-medium">Tap to play with sound</p>
                        </div>
                      </div>
                    </div>
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

                {/* Progress Tracking */}
                <div className="bg-muted/50 rounded-lg p-4 mt-4 mb-4">
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
