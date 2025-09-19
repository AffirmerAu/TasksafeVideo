import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, LogIn, Clock, Tag, Play, BookOpen } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  category: string;
}

export default function Home() {
  // Fetch all available videos
  const { data: videosRaw, isLoading, error } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
    queryFn: async () => {
      const response = await fetch('/api/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      return response.json();
    },
    retry: false,
  });

  // Reorder videos to prioritize "Safe Use of Aircraft Wheel Chocks and Safety Cones"
  const videos = videosRaw ? [...videosRaw].sort((a, b) => {
    // Move aircraft chocks video to the top
    if (a.title.toLowerCase().includes('aircraft') && a.title.toLowerCase().includes('chocks')) {
      return -1;
    }
    if (b.title.toLowerCase().includes('aircraft') && b.title.toLowerCase().includes('chocks')) {
      return 1;
    }
    // Keep original order for other videos
    return 0;
  }) : undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="h-10 bg-muted rounded w-1/2 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-muted rounded w-3/4 mx-auto animate-pulse"></div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-xl mb-4"></div>
                  <div className="h-6 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !videos || videos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-card rounded-xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Training Available</h2>
              <p className="text-muted-foreground">
                There are currently no training videos available. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Safety Training Library
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from our comprehensive safety training modules. Each course provides secure access with progress tracking and completion certificates.
            </p>
          </div>

          {/* Video Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function VideoCard({ video }: { video: Video }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {video.thumbnailUrl ? (
          <img 
            src={video.thumbnailUrl} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
            <Play className="h-12 w-12 text-primary/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="bg-white/90 rounded-full p-3">
            <Play className="h-6 w-6 text-gray-800" />
          </div>
        </div>
      </div>
      
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2" data-testid={`text-video-title-${video.id}`}>
          {video.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3" data-testid={`text-video-description-${video.id}`}>
          {video.description}
        </p>
        
        {/* Video Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span data-testid={`text-video-duration-${video.id}`}>{video.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            <span data-testid={`text-video-category-${video.id}`}>{video.category}</span>
          </div>
        </div>
        
        {/* Register Button */}
        <Link href={`/video-request?video=${video.id}`}>
          <Button className="w-full" data-testid={`button-register-${video.id}`}>
            Register for Training
          </Button>
        </Link>
      </CardContent>
    </Card>
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
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Secure Access</span>
            </div>
            <Link href="/admin/login">
              <Button variant="outline" size="sm" data-testid="button-admin-login">
                <LogIn className="h-4 w-4 mr-2" />
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Shield className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              © 2024 TaskSafe. Secure training platform.
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
            <div className="flex items-center space-x-1">
              <Lock className="h-3 w-3" />
              <span>SSL Secured</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}