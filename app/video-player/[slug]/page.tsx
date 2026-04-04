'use client';

import { useEffect, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface VideoPlayerPageProps {
  params: Promise<{ slug: string }>;
}

export default function VideoPlayerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Auto-play
    video.play().catch(() => {
      setError('Tap to play video');
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (document as any).webkitFullscreenElement ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (document as any).mozFullScreenElement ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      if (
        !document.fullscreenElement &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !(document as any).webkitFullscreenElement
      ) {
        if (video.requestFullscreen) {
          await video.requestFullscreen();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((video as any).webkitRequestFullscreen) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (video as any).webkitRequestFullscreen();
        }
      }
    } catch (err) {
      console.error('Error playing video:', err);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src="/api/video/pharmacovigilance"
        controls
        playsInline
        className={`h-full w-full object-contain ${isFullscreen ? '' : 'max-h-screen'}`}
        onClick={handlePlayClick}
      />
      {error && (
        <button
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/50"
        >
          <div className="rounded-lg bg-white px-8 py-4 text-xl font-semibold text-black">
            Tap to Play Video
          </div>
        </button>
      )}
    </div>
  );
}
