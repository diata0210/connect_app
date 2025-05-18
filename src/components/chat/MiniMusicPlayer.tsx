import React, { useEffect, useState, useRef } from 'react';
import { updateMusicState, subscribeToMusicChanges } from '../../services/musicSyncService';

interface MiniMusicPlayerProps {
  chatId: string;
  currentUserId: string;
  onMaximize: () => void;
}

const MiniMusicPlayer: React.FC<MiniMusicPlayerProps> = ({ chatId, currentUserId, onMaximize }) => {
  const [currentSong, setCurrentSong] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [songTitle, setSongTitle] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    const unsubscribe = subscribeToMusicChanges(
      chatId,
      currentUserId,
      (state) => {
        setCurrentSong(state.currentSong);
        setIsPlaying(state.isPlaying);
        
        if (audioRef.current) {
          // Sync playback state
          if (state.isPlaying && audioRef.current.paused) {
            audioRef.current.play().catch(err => console.error("Play error:", err));
          } else if (!state.isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
          }
          
          // Sync current time (if difference is more than 2 seconds)
          const timeDiff = Math.abs(audioRef.current.currentTime - state.currentTime);
          if (timeDiff > 2) {
            audioRef.current.currentTime = state.currentTime;
          }
          
          // Sync volume
          audioRef.current.volume = state.volume;
        }

        // Extract song title from URL or path
        if (state.currentSong) {
          const pathParts = state.currentSong.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const title = fileName.replace(/\.[^/.]+$/, "").replace(/-/g, " ");
          setSongTitle(title);
        }
      },
      // Add handler for invitation acceptance that will trigger sync
      (acceptorId) => {
        console.log(`User ${acceptorId} accepted the music invitation`);
        // May want to show a notification or update UI here
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUserId]);

  useEffect(() => {
    // Create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Add event listeners for playback control
      audioRef.current.onended = handleSongEnd;
      audioRef.current.onpause = () => {
        if (isPlaying) {
          handlePlayPause(false);
        }
      };
      audioRef.current.onplay = () => {
        if (!isPlaying) {
          handlePlayPause(true);
        }
      };
    }
    
    // Update source if changed
    if (currentSong && audioRef.current.src !== currentSong) {
      audioRef.current.src = currentSong;
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error("Play error:", err));
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [currentSong, isPlaying]);

  const handlePlayPause = async (play: boolean) => {
    try {
      setIsPlaying(play);
      //@ts-ignore
      await updateMusicState(chatId, currentUserId as any, { isPlaying: play });
      
      if (audioRef.current) {
        if (play) {
          audioRef.current.play().catch(err => console.error("Play error:", err));
        } else {
          audioRef.current.pause();
        }
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  };

  const handleSongEnd = async () => {
    try {
      setIsPlaying(false);
      //@ts-ignore
      await updateMusicState(chatId, currentUserId, { isPlaying: false });
    } catch (error) {
      console.error("Error handling song end:", error);
    }
  };

  return (
    <div className="fixed bottom-16 right-4 bg-purple-800 text-white rounded-lg shadow-lg px-3 py-2 flex items-center z-40">
      <button 
        onClick={() => handlePlayPause(!isPlaying)}
        className="p-2 rounded-full hover:bg-purple-700 mr-2"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
      <div className="flex-1 truncate max-w-[100px]" title={songTitle}>
        {songTitle || "No song playing"}
      </div>
      <button 
        onClick={onMaximize}
        className="p-2 rounded-full hover:bg-purple-700 ml-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
    </div>
  );
};

export default MiniMusicPlayer;
