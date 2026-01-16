import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Download, Lock, LogOut, Play, Pause, Settings, Type, Edit2 } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { Button } from './ui/button';
import { Input } from './ui/input';
import UpgradeModal from './UpgradeModal';
import type { User } from '../lib/api';
import {
  Caption,
  TextStyle,
  DEFAULT_TEXT_STYLE,
  CAPTION_STYLES,
} from '../lib/caption';

// Helper: Convert TextStyle to ASS style
function textStyleToASS(textStyle: TextStyle) {
  // Convert HTML color to ASS format (&H00BBGGRR)
  const colorToASS = (hex: string) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `&H00${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}`;
  };

  return {
    fontName: textStyle.fontFamily,
    fontSize: textStyle.fontSize,
    primaryColor: colorToASS(textStyle.color),
    outlineColor: colorToASS(textStyle.strokeColor),
    outlineWidth: textStyle.strokeWidth,
    bold: textStyle.fontWeight === 'bold',
    uppercase: textStyle.textTransform === 'uppercase',
    shadowColor: textStyle.shadowColor ? colorToASS(textStyle.shadowColor) : undefined,
    shadowBlur: textStyle.shadowBlur,
    shadowOffsetX: textStyle.shadowOffsetX,
    shadowOffsetY: textStyle.shadowOffsetY,
  };
}
import { renderSubtitles, resetSubtitleRenderer } from '../lib/subtitle-renderer';
import { formatTime, isValidYouTubeUrl } from '../lib/utils';

interface DashboardProps {
  user: User;
  isPremium: boolean;
  onLogout: () => void;
  onRefreshUser: () => void;
}

interface VideoData {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  streamUrl: string;
  originalUrl: string;
}

export default function Dashboard({ user, isPremium, onLogout, onRefreshUser }: DashboardProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastLoadedUrl, setLastLoadedUrl] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);
  const [editingCaptionIndex, setEditingCaptionIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    speed: string;
    eta: string;
  } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [previewMode, setPreviewMode] = useState<'16:9' | '9:16'>('16:9');
  const [captionYPosition, setCaptionYPosition] = useState<number>(150); // Distance from bottom in pixels
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Refs to avoid stale closures
  const captionsRef = useRef<Caption[]>([]);
  const textStyleRef = useRef<TextStyle>(DEFAULT_TEXT_STYLE);
  const startTimeRef = useRef(0);
  const endTimeRef = useRef(0);
  const captionYPositionRef = useRef<number>(150);

  // Keep refs in sync
  useEffect(() => {
    captionsRef.current = captions;
  }, [captions]);

  useEffect(() => {
    textStyleRef.current = textStyle;
  }, [textStyle]);

  useEffect(() => {
    startTimeRef.current = startTime;
    endTimeRef.current = endTime;
  }, [startTime, endTime]);

  useEffect(() => {
    captionYPositionRef.current = captionYPosition;
  }, [captionYPosition]);

  // Load custom fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const resourcesPath = await window.electron.app.getResourcesPath();
        // Note: Custom fonts would need to be loaded from resources folder
        // For now, we'll use system fonts as fallback
        console.log('Resources path:', resourcesPath);
      } catch (error) {
        console.error('Failed to load custom fonts:', error);
      }
    };
    loadFonts();
  }, []);

  // Set up download progress listener
  useEffect(() => {
    window.electron.ytdlp.onProgress((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      window.electron.ytdlp.removeProgressListener();
    };
  }, []);

  // Auto-load video when valid URL is pasted
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isValidYouTubeUrl(youtubeUrl) && youtubeUrl !== lastLoadedUrl && !loading) {
        handleFetchVideo();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [youtubeUrl]);

  // Handle video metadata loaded
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setEndTime(duration);
      setVideoData((prev) => (prev ? { ...prev, duration } : null));
      setIsVideoReady(true);
      videoRef.current.currentTime = 0;
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);

      if (isVideoReady && !isDraggingSlider && endTime > 0 && startTime >= 0) {
        if (current >= endTime) {
          videoRef.current.pause();
          videoRef.current.currentTime = startTime;
        }
        if (current < startTime) {
          videoRef.current.currentTime = startTime;
        }
      }
    }
  };

  // Handle play
  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current && isVideoReady && !isDraggingSlider) {
      const current = videoRef.current.currentTime;
      if (endTime > 0 && startTime >= 0) {
        if (current < startTime || current >= endTime) {
          videoRef.current.currentTime = startTime;
        }
      }
    }
  };

  // Handle pause
  const handlePause = () => {
    setIsPlaying(false);
  };

  // Fetch video using yt-dlp (stream URL, no download)
  const handleFetchVideo = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    console.log('[Dashboard] Starting fetch for:', youtubeUrl);

    setLoading(true);
    setIsVideoReady(false);
    setVideoData(null);
    setLastLoadedUrl(youtubeUrl);
    setCaptions([]);

    try {
      // Get video info using yt-dlp
      toast.loading('Fetching video info...', { id: 'fetch' });
      const info = await window.electron.ytdlp.getInfo(youtubeUrl);
      console.log('[Dashboard] Got info:', info);

      // Get progressive stream URL (non-HLS)
      toast.loading('Loading stream...', { id: 'fetch' });
      const streamUrl = await window.electron.ytdlp.getStreamUrl(youtubeUrl);
      console.log('[Dashboard] Got stream URL');

      setVideoData({
        id: info.id,
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        streamUrl,
        originalUrl: youtubeUrl,
      });
      setStartTime(0);
      setEndTime(info.duration);

      toast.success('Video loaded successfully!', { id: 'fetch' });
    } catch (error) {
      console.error('Error fetching video:', error);
      toast.error('Failed to fetch video. Make sure yt-dlp is installed.', { id: 'fetch' });
      setLastLoadedUrl('');
    } finally {
      setLoading(false);
    }
  };

  // Download clip as MP4
  const handleDownloadClip = async () => {
    if (!videoData || !videoRef.current) {
      toast.error('Please load a video first');
      return;
    }

    if (startTime >= endTime) {
      toast.error('Start time must be before end time');
      return;
    }

    setIsProcessing(true);
    setDownloadProgress(null);
    const processingToast = toast.loading('Processing your clip...');

    try {
      // Get save path from user
      const aspectSuffix = aspectRatio === '9:16' ? '_shorts' : '';
      const savePath = await window.electron.dialog.saveFile({
        title: 'Save Clip',
        defaultPath: `${videoData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_clip${aspectSuffix}.mp4`,
        filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
      });

      if (!savePath) {
        toast.dismiss(processingToast);
        setIsProcessing(false);
        setDownloadProgress(null);
        return;
      }

      // Download only the clip section (no need for full video)
      toast.loading('Downloading clip...', { id: processingToast });
      const tempClipPath = await window.electron.ytdlp.downloadTemp(videoData.originalUrl, {
        startTime,
        endTime,
      });
      setDownloadProgress(null);

      const tempDir = await window.electron.app.getPath('temp');

      // Convert to 9:16 if needed
      let processedPath = tempClipPath;
      if (aspectRatio === '9:16') {
        toast.loading('Converting to shorts format...', { id: processingToast });
        const shortsPath = `${tempDir}/shorts_${Date.now()}.mp4`;
        await window.electron.ffmpeg.convertTo916(tempClipPath, shortsPath);
        processedPath = shortsPath;
      }

      // Burn subtitles if they exist
      if (captions.length > 0) {
        toast.loading('Adding subtitles...', { id: processingToast });
        const assStyle = { ...textStyleToASS(textStyle), captionYPosition };
        await window.electron.ffmpeg.burnSubtitles(processedPath, captions, assStyle, savePath);
      } else {
        // No subtitles, just move to save path
        await window.electron.ffmpeg.trim(processedPath, 0, 999999, savePath);
      }

      toast.success('Clip downloaded successfully!', { id: processingToast });
    } catch (error) {
      console.error('Error processing video:', error);
      toast.error('Failed to process clip. Please try again.', { id: processingToast });
    } finally {
      setIsProcessing(false);
      setDownloadProgress(null);
    }
  };

  // Download as GIF (Premium)
  const handleDownloadGif = async () => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }

    if (!videoData || !videoRef.current) {
      toast.error('Please load a video first');
      return;
    }

    if (startTime >= endTime) {
      toast.error('Start time must be before end time');
      return;
    }

    setIsProcessing(true);
    setDownloadProgress(null);
    const processingToast = toast.loading('Converting to GIF...');

    try {
      const aspectSuffix = aspectRatio === '9:16' ? '_shorts' : '';
      const savePath = await window.electron.dialog.saveFile({
        title: 'Save GIF',
        defaultPath: `${videoData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_clip${aspectSuffix}.gif`,
        filters: [{ name: 'GIF Image', extensions: ['gif'] }],
      });

      if (!savePath) {
        toast.dismiss(processingToast);
        setIsProcessing(false);
        setDownloadProgress(null);
        return;
      }

      // Download only the clip section
      toast.loading('Downloading clip...', { id: processingToast });
      const tempClipPath = await window.electron.ytdlp.downloadTemp(videoData.originalUrl, {
        startTime,
        endTime,
      });
      setDownloadProgress(null);

      const tempDir = await window.electron.app.getPath('temp');

      // Convert to 9:16 if needed
      let processedPath = tempClipPath;
      if (aspectRatio === '9:16') {
        toast.loading('Converting to shorts format...', { id: processingToast });
        const shortsPath = `${tempDir}/shorts_${Date.now()}.mp4`;
        await window.electron.ffmpeg.convertTo916(tempClipPath, shortsPath);
        processedPath = shortsPath;
      }

      toast.loading('Converting to GIF...', { id: processingToast });
      const gifWidth = aspectRatio === '9:16' ? 540 : 480;
      await window.electron.ffmpeg.toGif(processedPath, savePath, { width: gifWidth, fps: 15 });

      toast.success('GIF downloaded successfully!', { id: processingToast });
    } catch (error) {
      console.error('Error creating GIF:', error);
      toast.error('Failed to create GIF. Please try again.', { id: processingToast });
    } finally {
      setIsProcessing(false);
      setDownloadProgress(null);
    }
  };

  // Generate captions (Premium)
  const handleGenerateCaptions = async () => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }

    if (!videoData) {
      toast.error('Please load a video first');
      return;
    }

    setIsGeneratingCaptions(true);
    setDownloadProgress(null);
    const generatingToast = toast.loading('Generating captions...');

    try {
      // Download only the clip section for captions
      toast.loading('Downloading clip...', { id: generatingToast });
      const clipPath = await window.electron.ytdlp.downloadTemp(videoData.originalUrl, {
        startTime,
        endTime,
      });
      setDownloadProgress(null);

      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      toast.loading('Sending to caption service...', { id: generatingToast });

      // Call backend API for caption generation via IPC
      const captions = await window.electron.captions.generate(clipPath, token);

      if (captions && captions.length > 0) {
        setCaptions(captions);
        resetSubtitleRenderer();

        if (videoRef.current) {
          videoRef.current.currentTime = startTime;
          setCurrentTime(startTime);
        }

        toast.success(`Captions generated! (${captions.length} captions)`, {
          id: generatingToast,
        });
      } else {
        throw new Error('No captions returned from service');
      }
    } catch (error) {
      console.error('Error generating captions:', error);
      toast.error(`Failed to generate captions: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        id: generatingToast,
      });
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // Canvas rendering loop
  const renderCanvasWithSubtitles = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (video.readyState >= 2) {
      if (previewMode === '9:16') {
        // For 9:16 preview, crop the center portion of the video
        // Source video is 16:9 (1920x1080), we want to show 9:16 crop
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        const cropWidth = sourceHeight * (9 / 16); // Width for 9:16 from height
        const cropX = (sourceWidth - cropWidth) / 2; // Center crop

        // Draw the cropped portion
        ctx.drawImage(
          video,
          cropX, 0, cropWidth, sourceHeight, // source crop
          0, 0, canvas.width, canvas.height  // destination
        );
      } else {
        // Normal 16:9 rendering
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }

    const currentCaptions = captionsRef.current;
    const currentTextStyle = textStyleRef.current;
    const currentStartTime = startTimeRef.current;
    const currentEndTime = endTimeRef.current;
    const currentYPosition = captionYPositionRef.current;

    if (currentCaptions.length > 0 && video.readyState >= 2) {
      const captionTime = video.currentTime - currentStartTime;
      if (captionTime >= 0 && captionTime <= currentEndTime - currentStartTime) {
        renderSubtitles(ctx, captionTime, currentCaptions, currentTextStyle, canvas.width, canvas.height, 1, currentYPosition);
      }
    }

    if (!video.paused) {
      animationFrameRef.current = requestAnimationFrame(renderCanvasWithSubtitles);
    }
  }, [previewMode]);

  // Start canvas rendering loop when playing
  useEffect(() => {
    if (isPlaying && videoRef.current) {
      renderCanvasWithSubtitles();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, renderCanvasWithSubtitles]);

  // Render when captions, style, or preview mode changes
  useEffect(() => {
    if (videoRef.current && !isPlaying) {
      renderCanvasWithSubtitles();
    }
  }, [captions, textStyle, previewMode, renderCanvasWithSubtitles, isPlaying]);

  // Render when currentTime changes
  useEffect(() => {
    if (videoRef.current && !isPlaying) {
      renderCanvasWithSubtitles();
    }
  }, [currentTime, renderCanvasWithSubtitles, isPlaying]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => renderCanvasWithSubtitles();
    const handlePlayEvent = () => renderCanvasWithSubtitles();
    const handlePauseEvent = () => renderCanvasWithSubtitles();
    const handleSeeked = () => {
      resetSubtitleRenderer();
      renderCanvasWithSubtitles();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlayEvent);
    video.addEventListener('pause', handlePauseEvent);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlayEvent);
      video.removeEventListener('pause', handlePauseEvent);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [videoData, renderCanvasWithSubtitles]);

  // Toggle play/pause
  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.currentTime >= video.duration - 0.1) {
        video.currentTime = 0;
        setCurrentTime(0);
      }
      try {
        await video.play();
      } catch (err) {
        console.error('Play failed:', err);
      }
    } else {
      video.pause();
    }
  };

  // Handle caption dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || captions.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const canvasHeight = canvas.height;
    const scaleY = canvasHeight / rect.height;
    const actualY = y * scaleY;

    // Check if click is near caption area (within 100px of caption position)
    const captionY = canvasHeight - captionYPosition;
    if (Math.abs(actualY - captionY) < 100) {
      setIsDraggingCaption(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCaption || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const canvasHeight = canvas.height;
    const scaleY = canvasHeight / rect.height;
    const actualY = y * scaleY;

    // Calculate new Y position (distance from bottom)
    const newYPosition = Math.max(50, Math.min(canvasHeight - 50, canvasHeight - actualY));
    setCaptionYPosition(newYPosition);
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCaption(false);
  };

  // Apply preset style
  const applyPreset = (presetId: string) => {
    const preset = CAPTION_STYLES.find((s) => s.id === presetId);
    if (preset) {
      const { id, name, category, ...styleProps } = preset;
      setTextStyle(styleProps as TextStyle);
    }
  };

  // Caption editing
  const handleEditCaption = (index: number) => {
    setEditingCaptionIndex(index);
    setEditText(captions[index].text);
  };

  const handleSaveCaption = () => {
    if (editingCaptionIndex === null) return;
    setCaptions(
      captions.map((caption, i) =>
        i === editingCaptionIndex
          ? { ...caption, text: editText, words: undefined }
          : caption
      )
    );
    setEditingCaptionIndex(null);
  };

  const handleDeleteCaption = (index: number) => {
    setCaptions(captions.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
            <span className="text-lg font-semibold">YouTube Clips</span>
            {isPremium ? (
              <span className="px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                PREMIUM
              </span>
            ) : (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full hover:bg-secondary/80 transition flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                Upgrade
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* URL Input */}
        <div className="mb-6">
          <div className="relative">
            <Input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube video URL..."
              disabled={loading}
              className="h-12 text-base pr-12"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="spinner border-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {videoData && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
              {/* Left Column: Video Player */}
              <div className="space-y-4">
                {/* Hidden Video Element */}
                <video
                  ref={videoRef}
                  src={videoData.streamUrl || ''}
                  className="hidden"
                  onLoadedMetadata={handleVideoLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  preload="metadata"
                  playsInline
                  crossOrigin="anonymous"
                />

                {/* Canvas Display */}
                <div className="space-y-3">
                  {/* Preview Mode Toggle */}
                  <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
                    <span className="text-sm font-medium text-muted-foreground px-2">Preview Mode</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPreviewMode('16:9');
                          setAspectRatio('16:9');
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                          previewMode === '16:9'
                            ? 'bg-primary text-white'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                        }`}
                      >
                        16:9
                      </button>
                      <button
                        onClick={() => {
                          setPreviewMode('9:16');
                          setAspectRatio('9:16');
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                          previewMode === '9:16'
                            ? 'bg-primary text-white'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                        }`}
                      >
                        9:16 Shorts
                      </button>
                    </div>
                  </div>

                  <div className={`relative bg-black rounded-xl overflow-hidden ${previewMode === '9:16' ? 'flex items-center justify-center' : ''}`}>
                    <canvas
                      ref={canvasRef}
                      width={previewMode === '9:16' ? 1080 : 1920}
                      height={previewMode === '9:16' ? 1920 : 1080}
                      className={`${previewMode === '9:16' ? 'h-[500px]' : 'w-full'} ${captions.length > 0 ? 'cursor-move' : ''}`}
                      style={{ aspectRatio: previewMode === '9:16' ? '9/16' : '16/9' }}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                    />

                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlayPause}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center bg-primary/80 hover:bg-primary text-white rounded-full transition-all backdrop-blur-sm"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`text-xs px-3 py-1 rounded-full backdrop-blur-sm ${
                        isVideoReady ? 'bg-green-500/80 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isVideoReady ? 'Ready' : 'Loading...'}
                      </span>
                    </div>

                    {/* Preview Mode Indicator */}
                    {previewMode === '9:16' && (
                      <div className="absolute top-4 left-4">
                        <span className="text-xs px-3 py-1 rounded-full backdrop-blur-sm bg-primary/80 text-white font-semibold">
                          Shorts Preview
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Playback Timeline */}
                <div className="bg-secondary/50 rounded-xl px-4 py-4">
                  <input
                    type="range"
                    min="0"
                    max={videoData.duration}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => {
                      const video = videoRef.current;
                      if (video) {
                        const newTime = parseFloat(e.target.value);
                        video.currentTime = newTime;
                        setCurrentTime(newTime);
                        resetSubtitleRenderer();
                      }
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(currentTime / videoData.duration) * 100}%, hsl(var(--muted)) ${(currentTime / videoData.duration) * 100}%, hsl(var(--muted)) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(videoData.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Controls */}
              <div className="space-y-4">
                {/* Clip Timeline */}
                <div className="bg-secondary/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-4">Clip Timeline</h3>

                  {/* Timeline Visualization */}
                  <div className="relative h-2 bg-muted rounded-full mb-6">
                    <div
                      className="absolute h-full bg-primary rounded-full"
                      style={{
                        left: `${(startTime / videoData.duration) * 100}%`,
                        width: `${((endTime - startTime) / videoData.duration) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute w-1 h-4 bg-foreground -top-1 rounded"
                      style={{ left: `${(currentTime / videoData.duration) * 100}%` }}
                    />
                  </div>

                  {/* Start Time */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Start</span>
                      <span className="font-mono">{formatTime(startTime)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={videoData.duration}
                      step="0.1"
                      value={startTime}
                      onMouseDown={() => setIsDraggingSlider(true)}
                      onMouseUp={() => {
                        setIsDraggingSlider(false);
                        if (videoRef.current) videoRef.current.currentTime = startTime;
                      }}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value < endTime) setStartTime(value);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* End Time */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">End</span>
                      <span className="font-mono">{formatTime(endTime)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={videoData.duration}
                      step="0.1"
                      value={endTime}
                      onMouseDown={() => setIsDraggingSlider(true)}
                      onMouseUp={() => {
                        setIsDraggingSlider(false);
                        if (videoRef.current) videoRef.current.currentTime = endTime;
                      }}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value > startTime) setEndTime(value);
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Clip Info */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-card rounded-lg p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Start</p>
                      <p className="font-mono font-bold">{formatTime(startTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-mono font-bold text-primary">{formatTime(endTime - startTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">End</p>
                      <p className="font-mono font-bold">{formatTime(endTime)}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => setShowDownloadModal(true)}
                    disabled={isProcessing}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>

                  <Button
                    variant={isPremium ? 'secondary' : 'outline'}
                    className="w-full"
                    onClick={handleGenerateCaptions}
                    disabled={isGeneratingCaptions || !isPremium}
                  >
                    {!isPremium && <Lock className="w-4 h-4 mr-2" />}
                    {isGeneratingCaptions ? 'Generating...' : 'Add Subtitles'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subtitle Controls */}
        {videoData && captions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Type className="w-5 h-5" />
                Subtitle Settings
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubtitleSettings(!showSubtitleSettings)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerateCaptions}
                  disabled={isGeneratingCaptions}
                >
                  {isGeneratingCaptions ? 'Generating...' : 'Regenerate'}
                </Button>
              </div>
            </div>

            {/* Style Presets */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Style Presets</h4>
              <div className="grid grid-cols-2 gap-3">
                {CAPTION_STYLES.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className="relative h-24 rounded-lg overflow-hidden transition-all hover:scale-105 border-2 border-border hover:border-primary bg-muted"
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        style={{
                          fontFamily: preset.fontFamily,
                          fontSize: '1.5rem',
                          color: preset.color,
                          WebkitTextStroke: `${preset.strokeWidth / 6}px ${preset.strokeColor}`,
                          textTransform: preset.textTransform as 'uppercase',
                          fontWeight: 'bold',
                          backgroundColor: preset.backgroundStyle === 'word-box' ? preset.backgroundColor : 'transparent',
                          padding: preset.backgroundStyle === 'word-box' ? '4px 12px' : '0',
                          borderRadius: preset.backgroundStyle === 'word-box' ? '8px' : '0',
                        }}
                      >
                        {preset.name.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customization Settings */}
            {showSubtitleSettings && (
              <div className="border-t border-border pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Font Size: {textStyle.fontSize}px</label>
                    <input
                      type="range"
                      min="24"
                      max="96"
                      value={textStyle.fontSize}
                      onChange={(e) => setTextStyle({ ...textStyle, fontSize: parseInt(e.target.value) })}
                      className="w-full mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Outline: {textStyle.strokeWidth}px</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={textStyle.strokeWidth}
                      onChange={(e) => setTextStyle({ ...textStyle, strokeWidth: parseInt(e.target.value) })}
                      className="w-full mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Text Color</label>
                    <input
                      type="color"
                      value={textStyle.color}
                      onChange={(e) => setTextStyle({ ...textStyle, color: e.target.value })}
                      className="w-full h-10 rounded-lg cursor-pointer mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Effect</label>
                    <select
                      value={textStyle.effect}
                      onChange={(e) => setTextStyle({ ...textStyle, effect: e.target.value as TextStyle['effect'] })}
                      className="w-full h-10 rounded-lg bg-secondary border-0 mt-2 px-3"
                    >
                      <option value="none">None</option>
                      <option value="highlight">Highlight</option>
                      <option value="karaoke">Karaoke</option>
                      <option value="typewriter">Typewriter</option>
                      <option value="bounce">Bounce</option>
                      <option value="fade">Fade</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Caption List */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Captions ({captions.length})
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {captions.map((caption, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition"
                  >
                    <div className="flex-1">
                      {editingCaptionIndex === index ? (
                        <div className="space-y-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveCaption}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCaptionIndex(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground mb-1">
                            {caption.start.toFixed(1)}s - {caption.end.toFixed(1)}s
                          </div>
                          <div className="text-sm">{caption.text}</div>
                        </>
                      )}
                    </div>
                    {editingCaptionIndex !== index && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditCaption(index)}
                          className="p-2 text-muted-foreground hover:text-primary transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCaption(index)}
                          className="p-2 text-muted-foreground hover:text-destructive transition"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!videoData && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">How to use:</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Paste a YouTube video URL in the input field above</li>
              <li>Use the sliders to select the start and end times for your clip</li>
              <li>Click "Download" to get your clip or "Add Subtitles" for premium features</li>
            </ol>
          </div>
        )}
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={user.email}
      />

      {/* Download Format Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full animate-slide-up">
            <h3 className="text-xl font-bold mb-4">Choose Download Format</h3>

            {/* Aspect Ratio Selection */}
            <div className="mb-4">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Aspect Ratio for Download</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setAspectRatio('16:9');
                    setPreviewMode('16:9');
                  }}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    aspectRatio === '16:9'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-semibold">16:9</div>
                  <div className="text-xs text-muted-foreground">Standard</div>
                </button>
                <button
                  onClick={() => {
                    setAspectRatio('9:16');
                    setPreviewMode('9:16');
                  }}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    aspectRatio === '9:16'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-semibold">9:16</div>
                  <div className="text-xs text-muted-foreground">Shorts/Reels</div>
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use the preview toggle above to see how your clip will look before downloading
              </p>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Button
                className="w-full h-14"
                onClick={() => {
                  setShowDownloadModal(false);
                  handleDownloadClip();
                }}
                disabled={isProcessing}
              >
                <Download className="w-5 h-5 mr-2" />
                Download MP4 {aspectRatio === '9:16' && '(Shorts)'}
              </Button>

              <Button
                variant={isPremium ? 'secondary' : 'outline'}
                className="w-full h-14"
                onClick={() => {
                  setShowDownloadModal(false);
                  handleDownloadGif();
                }}
                disabled={isProcessing || !isPremium}
              >
                {!isPremium && <Lock className="w-4 h-4 mr-2" />}
                <Download className="w-5 h-5 mr-2" />
                Download GIF {!isPremium && '(Premium)'}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowDownloadModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Overlay */}
      {downloadProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-center mb-6">
              <div className="spinner border-primary w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2">Downloading...</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Please wait while we fetch your clip
            </p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono font-bold text-primary">{downloadProgress.percent.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              {downloadProgress.speed && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Speed</p>
                  <p className="font-mono font-semibold">{downloadProgress.speed}</p>
                </div>
              )}
              {downloadProgress.eta && (
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">ETA</p>
                  <p className="font-mono font-semibold">{downloadProgress.eta}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
