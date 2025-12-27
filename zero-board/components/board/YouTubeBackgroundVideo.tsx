"use client";

import { useRef, useState, useEffect } from "react";
import type { YouTubePlayer, YouTubePlayerEvent } from "@/lib/types/board";

interface YouTubeBackgroundVideoProps {
  videoId: string | null;
  muted: boolean;
  volume: number;
}

export function YouTubeBackgroundVideo({
  videoId,
  muted,
  volume,
}: YouTubeBackgroundVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [apiReady, setApiReady] = useState(false);

  // Load YouTube IFrame Player API
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as { YT?: { Player: new (element: HTMLElement, options: unknown) => YouTubePlayer } }).YT?.Player) {
      setApiReady(true);
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      // Wait for API to be ready
      const checkReady = setInterval(() => {
        if ((window as { YT?: { Player: new (element: HTMLElement, options: unknown) => YouTubePlayer } }).YT?.Player) {
          setApiReady(true);
          clearInterval(checkReady);
        }
      }, 100);
      return () => clearInterval(checkReady);
    }

    // Load the API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };
  }, []);

  // Initialize player when API is ready and iframe is available
  useEffect(() => {
    if (!apiReady || !videoId || !iframeRef.current) return;

    const initPlayer = () => {
      if (iframeRef.current && !playerRef.current) {
        try {
          const YT = (window as unknown as { YT: { Player: new (element: HTMLElement, options: { events: { onReady: (event: YouTubePlayerEvent) => void } }) => YouTubePlayer } }).YT;
          playerRef.current = new YT.Player(iframeRef.current, {
            events: {
              onReady: (event: YouTubePlayerEvent) => {
                event.target.setVolume(volume);
                if (muted) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }
              },
            },
          });
        } catch (error) {
          console.error("Error initializing YouTube player:", error);
        }
      }
    };

    // Small delay to ensure iframe is fully loaded
    const timer = setTimeout(initPlayer, 500);
    return () => clearTimeout(timer);
  }, [apiReady, videoId, muted, volume]);

  // Update volume and mute when they change
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      playerRef.current.setVolume(volume);
      if (muted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch (error) {
      console.error("Error updating YouTube player settings:", error);
    }
  }, [muted, volume]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  if (!videoId) return null;

  const muteParam = muted ? "1" : "0";
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muteParam}&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={embedUrl}
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100vw",
          height: "56.25vw", // 16:9 aspect ratio
          minHeight: "100vh",
          minWidth: "177.77vh", // 16:9 aspect ratio
        }}
      />
    </div>
  );
}

