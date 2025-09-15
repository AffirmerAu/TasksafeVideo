import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import VideoThumbnail from "@/components/video-thumbnail";
import EmailForm from "@/components/email-form";
import EmailSentModal from "@/components/email-sent-modal";
import { Button } from "@/components/ui/button";
import { Shield, Lock, CheckCircle, LogIn } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  category: string;
}

export default function Home() {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const emailFormRef = useRef<HTMLDivElement>(null);

  // Get video ID from URL parameters, default to specific video if none provided
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoParam = urlParams.get('video');
    // Set default video ID if no video parameter is provided
    setVideoId(videoParam || '0f7e5417-33c0-4764-a8fb-4a49a193861c');
  }, []);

  // Fetch specific video by ID
  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["/api/videos", videoId],
    queryFn: async () => {
      if (!videoId) return null;
      // Fetch specific video by ID
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Video not found');
      }
      return response.json();
    },
    enabled: !!videoId,
    retry: false,
  });

  const handleEmailSent = (email: string) => {
    setUserEmail(email);
    setShowEmailModal(true);
  };

  const scrollToEmailForm = () => {
    emailFormRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-12"></div>
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="h-80 bg-muted rounded-xl"></div>
                <div className="h-80 bg-muted rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-card rounded-xl p-8 shadow-sm">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-destructive" />
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
        <div className="max-w-4xl mx-auto">
          {/* Video Section - Moved to Top */}
          <div className="mb-12">
            <div className="max-w-2xl mx-auto">
              <VideoThumbnail video={video} onClick={scrollToEmailForm} />
              
              {/* Video Details */}
              <div className="mt-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" data-testid="text-video-title">
                  {video.title}
                </h2>
                <p className="text-muted-foreground mb-4" data-testid="text-video-description">
                  {video.description}
                </p>
              </div>
            </div>
          </div>

          {/* Email Access Form - Centered */}
          <div className="max-w-md mx-auto" ref={emailFormRef}>
            <EmailForm onEmailSent={handleEmailSent} video={video} />
          </div>
        </div>
      </main>

      <Footer />

      <EmailSentModal 
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        email={userEmail}
      />
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
