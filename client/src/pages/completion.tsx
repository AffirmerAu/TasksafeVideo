import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Share2, Home, Clock, Award, User, Tag, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface AccessLogData {
  id: string;
  email: string;
  userName: string;
  videoId: string;
  accessedAt: string;
  watchDuration: number | null;
  completionPercentage: number | null;
  companyTag: string | null;
  videoTitle: string | null;
  videoDuration: string | null;
  videoCategory: string | null;
}

function Completion() {
  const [, params] = useRoute("/completion/:accessId");
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const accessId = params?.accessId;

  // Fetch access log details including video title and completion data
  const { data: accessLogData, isLoading, error } = useQuery<AccessLogData>({
    queryKey: [`/api/access-logs/${accessId}`],
    enabled: !!accessId,
  });

  const videoName = accessLogData?.videoTitle || 'this training module';
  const watchDuration = accessLogData?.watchDuration || 0;
  const accessedAt = accessLogData?.accessedAt ? new Date(accessLogData.accessedAt).toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  }) : null;
  const videoDuration = accessLogData?.videoDuration || 'N/A';
  const videoCategory = accessLogData?.videoCategory || 'N/A';
  const viewerEmail = accessLogData?.email || '';
  const viewerName = accessLogData?.userName || 'Unknown';
  const companyTag = accessLogData?.companyTag || 'N/A';

  const handleShare = async () => {
    setIsSharing(true);
    
    const shareData = {
      title: 'Training Completion Certificate',
      text: `I have successfully completed "${videoName}" on TaskSafe Training Platform!`,
      url: window.location.origin + `/completion/${accessId}?videoName=${encodeURIComponent(videoName)}`
    };

    try {
      // Check if Web Share API is available (mobile devices)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.text}\n\nView certificate: ${shareData.url}`
        );
        toast({
          title: "Link copied!",
          description: "The completion certificate link has been copied to your clipboard."
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        // Fallback: Manual copy
        try {
          await navigator.clipboard.writeText(
            `I have successfully completed "${videoName}" on TaskSafe Training Platform!\n\nView certificate: ${shareData.url}`
          );
          toast({
            title: "Link copied!",
            description: "The completion certificate link has been copied to your clipboard."
          });
        } catch (clipboardError) {
          toast({
            variant: "destructive",
            title: "Sharing failed",
            description: "Unable to share or copy the link. Please try again."
          });
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleBackToHome = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center shadow-xl">
          <CardContent className="p-8">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading completion details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    console.error("Completion page error:", error);
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-red-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center shadow-xl">
          <CardContent className="p-8">
            <p className="text-red-600 dark:text-red-400">Unable to load completion details.</p>
            <p className="text-sm text-gray-500 mt-2">Error: {error?.message || 'Unknown error'}</p>
            <Button
              onClick={handleBackToHome}
              variant="outline"
              className="mt-4"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!accessLogData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-red-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto text-center shadow-xl">
          <CardContent className="p-8">
            <p className="text-red-600 dark:text-red-400">No completion data found.</p>
            <Button
              onClick={handleBackToHome}
              variant="outline"
              className="mt-4"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto text-center shadow-xl">
        <CardContent className="p-8 space-y-6">
          {/* Green Check Icon */}
          <div className="flex justify-center">
            <div className="bg-green-100 dark:bg-green-900 rounded-full p-4">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Congratulations Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Congratulations!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              You have successfully completed{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                "{videoName}"
              </span>
            </p>
          </div>

          {/* Completion Stats */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Watch Time</span>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {Math.floor(watchDuration / 60)}m {Math.floor(watchDuration % 60)}s
              </span>
            </div>

            {accessedAt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completed Date</span>
                </div>
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {accessedAt}
                </span>
              </div>
            )}
          </div>

          {/* Video Metadata */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400" data-testid="text-video-title">
                {videoName}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400" data-testid="text-video-category">
                {videoCategory}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Viewer</span>
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400" data-testid="text-viewer-email">
                {viewerName}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Company</span>
              </div>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400" data-testid="text-company-tag">
                {companyTag}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {isSharing ? "Sharing..." : "Share Achievement"}
            </Button>
            
            <Button
              onClick={handleBackToHome}
              variant="outline"
              className="w-full"
              data-testid="button-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Certificate Note */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            This completion certificate can be shared to verify your training progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Completion;