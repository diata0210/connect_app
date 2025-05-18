import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { 
  initializeMusicSync, 
  updateMusicState, 
  subscribeToMusicChanges, 
  sendMusicInvitation,
  checkCanListenMusic,
  checkMusicInvitationAccepted,
  markMusicNotificationSeen,
  checkNotificationStatus,
  terminateSession,
  subscribeToSessionStatus,
  isSessionActive
} from '../../services/musicSyncService';
import { doc, getDoc } from 'firebase/firestore';

interface MusicPlayerProps {
  chatId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName?: string;
  onClose: () => void;
  onMinimize: () => void;  // Add this prop to handle minimizing
}

interface Song {
  title: string;
  url: string;
}

// Create the forwardRef component properly
const MusicPlayer = forwardRef<
  { getCurrentSongInfo: () => { title: string; isPlaying: boolean }; togglePlayPause: () => void },
  MusicPlayerProps
>(({ 
  chatId, 
  currentUserId, 
  otherUserId, 
  otherUserName = 'Người dùng khác', 
  onClose,
  onMinimize
}, ref) => {
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [canListen, setCanListen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [notificationCleared, setNotificationCleared] = useState(false);
  //@ts-expect-error
  const [showMusicInvitation, setShowMusicInvitation] = useState(false);
    //@ts-expect-error
  const [musicInviterId, setMusicInviterId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationShownRef = useRef(false);
  const sessionTerminatedRef = useRef(false);
  const sessionStatusCheckedRef = useRef(false);
  const lastSyncedTime = useRef(0);

  // Handle minimizing the player (just hide the UI, keep playing)
  const handleMinimizePlayer = () => {
    onMinimize();
  };

  // Function to get current song information for other components
  const getCurrentSongInfo = () => {
    const songTitle = availableSongs.length > 0 
      ? availableSongs[currentSongIndex].title 
      : 'No song selected';
      
    return {
      title: songTitle,
      isPlaying: isPlaying
    };
  };
  
  // Export methods through ref
  useImperativeHandle(ref, () => ({
    getCurrentSongInfo,
    togglePlayPause
  }), [currentSongIndex, isPlaying, availableSongs]);

  // Handle closing player properly - terminate the session when closed
  const handleClosePlayer = async () => {
    try {
      // Terminate session and clear all notifications
      await terminateSession(chatId, currentUserId);
      setNotificationCleared(true);
      notificationShownRef.current = true;
      sessionTerminatedRef.current = true;
      onClose();
    } catch (error) {
      console.error("Error terminating session:", error);
      onClose();
    }
  };

  // Listen for session termination or acceptance by other user
  useEffect(() => {
    if (!chatId || !currentUserId || sessionTerminatedRef.current) return;

    const unsubscribe = subscribeToSessionStatus(chatId, currentUserId, (isTerminated, terminatedBy) => {
      if (isTerminated && terminatedBy !== currentUserId) {
        console.log("Session terminated by other user");
        sessionTerminatedRef.current = true;
        // Close the player immediately without alert
        onClose();
      } else if (!isTerminated && terminatedBy && terminatedBy !== currentUserId) {
        // This means the other user accepted the invitation
        if (!notificationShownRef.current) {
          console.log("Invitation accepted by other user");
          setInvitationAccepted(true);
          setCanListen(true);
          notificationShownRef.current = true;
        }
      }
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, currentUserId, otherUserName, onClose]);

  // Initial setup for music player
  useEffect(() => {
    // Load available songs with corrected filenames
    setAvailableSongs([
      { title: "Câu Vọng Khuyết", url: "/music/cau-vong-khuyet.mp3" },
      { title: "Đừng Làm Trái Tim Anh Đau", url: "/music/dung-lam-trai-tim-anh-dau.mp3" },
      { title: "Tâm Trí Lang Thang", url: "/music/tam-tri-lang-thang.mp3" }
    ]);
    
    // Initialize music sync service
    initializeMusicSync(chatId, currentUserId);
    
    // Check session status on component mount
    const checkSessionStatus = async () => {
      if (sessionStatusCheckedRef.current) return;
      
      try {
        setIsCheckingStatus(true);
        
        // First check if session is active at all
        const active = await isSessionActive(chatId);
        if (!active) {
          setCanListen(false);
          setInviteSent(false);
          setInvitationAccepted(false);
          setIsCheckingStatus(false);
          sessionStatusCheckedRef.current = true;
          return;
        }
        
        // Then check permission status
        const notificationSeen = await checkNotificationStatus(chatId, currentUserId);
        const canListenMusic = await checkCanListenMusic(chatId, currentUserId);
        
        if (canListenMusic) {
          setCanListen(true);
          setInviteSent(false);
          setInvitationAccepted(true);
          
          // Check if notification needs to be shown
          if (!notificationCleared && !notificationShownRef.current && !notificationSeen) {
            const invitationStatus = await checkMusicInvitationAccepted(chatId, currentUserId);
            if (invitationStatus.accepted) {
              notificationShownRef.current = true;
              await markMusicNotificationSeen(chatId, currentUserId);
            }
          }
        } else {
          // Check if user has sent invitation
          const invitationStatus = await checkMusicInvitationAccepted(chatId, currentUserId);
          // If the user is waiting for acceptance (not accepted yet), consider it sent
          if (invitationStatus && !invitationStatus.accepted) {
            setInviteSent(true);
          }
        }
      } catch (error) {
        console.error('Error checking music permissions:', error);
      }
      
      setIsCheckingStatus(false);
      sessionStatusCheckedRef.current = true;
    };
    
    checkSessionStatus();
    
    // Cleanup function for component unmount
    return () => {
      // Do NOT terminate session on unmount - this will allow music to continue playing
      // We only terminate the session when the user explicitly clicks the stop button
    };
  }, [chatId, currentUserId, notificationCleared]);

  // Set up audio element and listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Sync playback position every 3 seconds
      if (Math.abs(lastSyncedTime.current - audio.currentTime) > 3) {
        if (canListen) {
          updateMusicState(chatId, {
            currentTime: audio.currentTime
          }, currentUserId);
          lastSyncedTime.current = audio.currentTime;
        }
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [chatId, currentUserId, canListen]);

  // Subscription to music state changes
  useEffect(() => {
    if (!canListen && !invitationAccepted) return;

    const unsubscribe = subscribeToMusicChanges(
      chatId,
      currentUserId,
      (musicState) => {
        const audio = audioRef.current;
        if (!audio || !availableSongs.length) return;
        // Luôn đồng bộ bài hát mọi lúc
        const songIndex = availableSongs.findIndex(s => s.url === musicState.currentSong);
        if (songIndex !== -1) {
          setCurrentSongIndex(songIndex);
          if (audio.src !== musicState.currentSong) {
            audio.src = musicState.currentSong;
            audio.load();
          }
        }
        // Đồng bộ play/pause
        if (musicState.isPlaying !== undefined) {
          setIsPlaying(musicState.isPlaying);
          if (musicState.isPlaying) {
            audio.play().catch(() => {});
          } else {
            audio.pause();
          }
        }
        // Đồng bộ thời gian
        if (musicState.currentTime !== undefined) {
          setCurrentTime(musicState.currentTime);
          if (Math.abs(audio.currentTime - musicState.currentTime) > 0.5) {
            audio.currentTime = musicState.currentTime;
          }
        }
        // Đồng bộ volume
        if (musicState.volume !== undefined) {
          setVolume(musicState.volume);
          audio.volume = musicState.volume;
        }
        // Đồng bộ invitation
        if (musicState.invitationAccepted && !canListen) {
          setCanListen(true);
          setInvitationAccepted(true);
        }
      },
      () => {
        setCanListen(true);
        setInvitationAccepted(true);
      }
    );
    return () => unsubscribe();
  }, [chatId, currentUserId, canListen, invitationAccepted, availableSongs]);

  // Khi canListen = true, lấy trạng thái nhạc hiện tại từ Firestore và set vào player
  useEffect(() => {
    if (!canListen) return;
    (async () => {
      const musicSyncRef = doc(require('../../firebase').db, 'musicSync', chatId);
      const musicSyncDoc = await getDoc(musicSyncRef);
      if (musicSyncDoc.exists()) {
        const data = musicSyncDoc.data();
        // Đồng bộ bài hát
        if (data.currentSong && availableSongs.length > 0) {
          const songIndex = availableSongs.findIndex(s => s.url === data.currentSong);
          if (songIndex !== -1) {
            setCurrentSongIndex(songIndex);
            if (audioRef.current) {
              audioRef.current.src = data.currentSong;
            }
          }
        }
        // Đồng bộ thời gian
        if (typeof data.currentTime === 'number') {
          setCurrentTime(data.currentTime);
          if (audioRef.current) audioRef.current.currentTime = data.currentTime;
        }
        // Đồng bộ play/pause
        if (typeof data.isPlaying === 'boolean') {
          setIsPlaying(data.isPlaying);
          if (audioRef.current) {
            if (data.isPlaying) {
              audioRef.current.play().catch(()=>{});
            } else {
              audioRef.current.pause();
            }
          }
        }
        // Đồng bộ volume
        if (typeof data.volume === 'number') {
          setVolume(data.volume);
          if (audioRef.current) audioRef.current.volume = data.volume;
        }
      }
    })();
    // eslint-disable-next-line
  }, [canListen, availableSongs]);

  // Hiển thị popup lời mời nghe nhạc ngay khi nhận được tin nhắn mời (ưu tiên show popup trước khi render message)
  // Đặt useEffect này lên trên các useEffect khác để đảm bảo popup xuất hiện sớm
  useEffect(() => {
    if (!chatId || !currentUserId) return;
    let unsub: any;
    (async () => {
      const { checkMusicInvitation } = await import('../../services/musicSyncService');
      const checkInvite = async () => {
        const res = await checkMusicInvitation(chatId, currentUserId);
        if (res.isPending) {
          setShowMusicInvitation(true);
          //@ts-ignore
          setMusicInviterId(res.inviterId);
        }
      };
      checkInvite();
      unsub = setInterval(checkInvite, 500); // Kiểm tra nhanh hơn (0.5s)
    })();
    return () => { if (unsub) clearInterval(unsub); };
  }, [chatId, currentUserId]);

  // Handle sending music invitation
  const handleSendInvitation = async () => {
    try {
      const success = await sendMusicInvitation(chatId, currentUserId, otherUserId);
      if (success) {
        setInviteSent(true);
      } else {
        console.error("Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
    }
  };

  // Handle playing/pausing the current song
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Optimistic update: set state cục bộ ngay
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }

    // Đồng bộ Firestore
    if (canListen) {
      updateMusicState(chatId, {
        isPlaying: !isPlaying
      }, currentUserId);
    }
  };

  // Handle song changes
  const changeSong = (direction: 'prev' | 'next') => {
    if (availableSongs.length === 0) return;
    let newIndex = currentSongIndex;
    if (direction === 'next') {
      newIndex = (currentSongIndex + 1) % availableSongs.length;
    } else {
      newIndex = (currentSongIndex - 1 + availableSongs.length) % availableSongs.length;
    }
    // Optimistic update: set state cục bộ ngay
    setCurrentSongIndex(newIndex);
    setIsPlaying(true);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.src = availableSongs[newIndex].url;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    // Đồng bộ Firestore
    if (canListen) {
      updateMusicState(chatId, {
        currentSong: availableSongs[newIndex].url,
        isPlaying: true,
        currentTime: 0
      }, currentUserId);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setVolume(newVolume);
    audio.volume = newVolume;
    
    // Sync with server
    if (canListen) {
      updateMusicState(chatId, {
        volume: newVolume
      }, currentUserId);
    }
  };

  // Render UI for music player
  return (
    <div className="music-player w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-4 mt-4">
      <div className="player-header flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-purple-700 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
          Music Player
        </h2>
        <button onClick={handleClosePlayer} className="text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded">
          Close
        </button>
      </div>
      <div className="player-controls flex items-center justify-center gap-4 mb-2">
        <button onClick={handleMinimizePlayer} className="text-purple-500 hover:bg-purple-100 rounded-full p-2" title="Minimize">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>
        </button>
        <button onClick={() => changeSong('prev')} className="text-purple-500 hover:bg-purple-100 rounded-full p-2" title="Previous">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button onClick={togglePlayPause} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow transition-all">
          {isPlaying ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6"/></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
          )}
        </button>
        <button onClick={() => changeSong('next')} className="text-purple-500 hover:bg-purple-100 rounded-full p-2" title="Next">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div className="song-info text-center mb-2">
        <div className="font-semibold text-gray-800 text-base truncate">{availableSongs[currentSongIndex]?.title || "No song selected"}</div>
        <div className="text-xs text-gray-500 mt-1">{`${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`}</div>
      </div>
      <audio ref={audioRef} src={availableSongs[currentSongIndex]?.url} />
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-500">🔊</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume} 
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} 
          className="w-full accent-purple-600"
        />
      </div>
      {!canListen && !inviteSent && (
        <div className="invitation-prompt text-center mt-4">
          <span className="text-gray-600">Người dùng khác chưa chấp nhận lời mời nghe nhạc.</span>
          <button onClick={handleSendInvitation} className="ml-2 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition">Gửi lời mời</button>
        </div>
      )}
      {isCheckingStatus && <div className="text-center text-xs text-gray-400 mt-2">Đang kiểm tra trạng thái phiên...</div>}
    </div>
  );
});

export default MusicPlayer;
