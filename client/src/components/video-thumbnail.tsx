import { Play, Clock, Shield } from "lucide-react";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
}

interface VideoThumbnailProps {
  video: Video;
  onClick?: () => void;
}

export default function VideoThumbnail({ video, onClick }: VideoThumbnailProps) {
  return (
    <div 
      className="relative group cursor-pointer" 
      onClick={onClick}
      data-testid="video-thumbnail"
    >
      <div className="relative overflow-hidden rounded-xl shadow-lg">
        <img 
          src={video.thumbnailUrl} 
          alt={`${video.title} thumbnail`}
          className="w-full h-64 sm:h-80 object-cover transition-transform duration-300 group-hover:scale-105"
          data-testid="img-video-thumbnail"
        />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors duration-300">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Play className="h-6 w-6 text-primary ml-1" data-testid="icon-play" />
          </div>
        </div>

        {/* Video Info Badge */}
        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-1 rounded-md text-sm">
          <Clock className="inline h-3 w-3 mr-1" />
          <span data-testid="text-video-duration">{video.duration}</span>
        </div>

        {/* Security Badge */}
        <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-md text-sm">
          <Shield className="inline h-3 w-3 mr-1" />
          <span>Secure</span>
        </div>
      </div>
    </div>
  );
}
