import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, setDoc, serverTimestamp, getDoc, collection, addDoc, deleteField } from 'firebase/firestore';

export interface SyncedMusicState {
  currentSong: string; // URL or path to the song
  isPlaying: boolean;
  currentTime: number; // Current playback position in seconds
  lastUpdated: any; // Timestamp
  updatedBy: string; // User ID who last updated the state
  volume: number; // Volume level (0-1)
  participants: string[]; // User IDs of participants who have joined the music session
  pendingInvites: string[]; // User IDs of users with pending invites
  invitationAccepted: boolean; // Flag to indicate if invitation is accepted
}

// Add new session status types to track termination
export interface SessionStatus {
  isTerminated: boolean;
  terminatedBy?: string;
  terminatedAt?: any;
}

// Add these new interfaces and functions
export interface MusicPlayerState {
  isOpen: boolean;
  isMinimized: boolean;
}

// Gửi lời mời nghe nhạc
export const sendMusicInvitation = async (
  chatId: string, 
  senderId: string, 
  recipientId: string
): Promise<boolean> => {
  try {
    // First reset any terminated session
    await initializeMusicSync(chatId, senderId);
    
    // Tạo thông báo lời mời trong Firestore
    await addDoc(collection(db, 'messages'), {
      chatId: chatId,
      senderId: senderId,
      text: `Tôi muốn mời bạn nghe nhạc cùng. Bạn có muốn tham gia không?`,
      type: 'musicInvitation',
      musicInvitation: {
        status: 'pending',
        senderId: senderId,
        recipientId: recipientId,
        timestamp: serverTimestamp()
      },
      timestamp: serverTimestamp()
    });

    // Cập nhật trạng thái pendingInvites trong musicSync
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const pendingInvites = musicSyncDoc.data().pendingInvites || [];
      if (!pendingInvites.includes(recipientId)) {
        await updateDoc(musicSyncRef, {
          pendingInvites: [...pendingInvites, recipientId]
        });
      }
    } else {
      // Tạo document nếu chưa tồn tại
      await initializeMusicSync(chatId, senderId);
      await updateDoc(musicSyncRef, {
        pendingInvites: [recipientId]
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending music invitation:', error);
    return false;
  }
};

// Chấp nhận lời mời nghe nhạc
export const acceptMusicInvitation = async (
  chatId: string,
  userId: string,
  inviterId: string
): Promise<boolean> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const data = musicSyncDoc.data();
      const pendingInvites = data.pendingInvites || [];
      const participants = data.participants || [];
      
      // Xóa người nhận khỏi danh sách pendingInvites và thêm vào participants
      await updateDoc(musicSyncRef, {
        pendingInvites: pendingInvites.filter((id: string) => id !== userId),
        participants: [...new Set([...participants, userId, inviterId])],
        invitationAccepted: true, // Set flag to true when invitation is accepted
        lastUpdated: serverTimestamp()
      });

      // Add specific notification in music state for the inviter
      // Fix: Use a structure that works better with Firestore and onSnapshot
      await updateDoc(musicSyncRef, {
        [`invitationAcceptedBy.${userId}`]: {
          accepted: true,
          timestamp: serverTimestamp(),
          acceptedInviterId: inviterId // Add reference to who sent the invite
        }
      });

      // Gửi tin nhắn chấp nhận
      await addDoc(collection(db, 'messages'), {
        chatId: chatId,
        senderId: userId,
        text: `Tôi đã chấp nhận lời mời nghe nhạc cùng.`,
        type: 'musicInvitationAccepted',
        timestamp: serverTimestamp()
      });
      
      // Add notification tracking fields
      await updateDoc(musicSyncRef, {
        [`notificationSeen.${inviterId}`]: false
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error accepting music invitation:', error);
    return false;
  }
};

// Từ chối lời mời nghe nhạc
export const declineMusicInvitation = async (
  chatId: string,
  userId: string,
): Promise<boolean> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const pendingInvites = musicSyncDoc.data().pendingInvites || [];
      
      // Xóa người nhận khỏi danh sách pendingInvites
      await updateDoc(musicSyncRef, {
        pendingInvites: pendingInvites.filter((id: string) => id !== userId)
      });

      // Gửi tin nhắn từ chối
      await addDoc(collection(db, 'messages'), {
        chatId: chatId,
        senderId: userId,
        text: `Tôi đã từ chối lời mời nghe nhạc cùng.`,
        type: 'musicInvitationDeclined',
        timestamp: serverTimestamp()
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error declining music invitation:', error);
    return false;
  }
};

// Kiểm tra người dùng có được mời nghe nhạc không
export const checkMusicInvitation = async (
  chatId: string,
  userId: string
): Promise<{isPending: boolean, inviterId?: string}> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const pendingInvites = musicSyncDoc.data().pendingInvites || [];
      const isPending = pendingInvites.includes(userId);
      
      return {
        isPending,
        inviterId: isPending ? musicSyncDoc.data().updatedBy : undefined
      };
    }
    
    return { isPending: false };
  } catch (error) {
    console.error('Error checking music invitation:', error);
    return { isPending: false };
  }
};

// Kiểm tra người dùng có thể nghe nhạc đồng bộ không
export const checkCanListenMusic = async (
  chatId: string,
  userId: string
): Promise<boolean> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const participants = musicSyncDoc.data().participants || [];
      return participants.includes(userId);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking music permissions:', error);
    return false;
  }
};

// Add this missing function to check notification status
export const checkNotificationStatus = async (
  chatId: string,
  userId: string
): Promise<boolean> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const data = musicSyncDoc.data();
      // Check if this notification has already been seen by this user
      return data.notificationSeen?.[userId] === true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
};

// Add for marking notification as seen
export const markMusicNotificationSeen = async (
  chatId: string,
  userId: string
): Promise<void> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    
    // Use dot notation for nested updates
    await updateDoc(musicSyncRef, {
      [`notificationSeen.${userId}`]: true
    });
  } catch (error) {
    console.error('Error marking notification as seen:', error);
    throw error;
  }
};

// Add function to clear notification
export const clearMusicNotification = async (
  chatId: string
): Promise<void> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    await updateDoc(musicSyncRef, {
      notificationSeen: {},
      invitationAccepted: false
    });
  } catch (error) {
    console.error('Error clearing music notification:', error);
    throw error;
  }
};

// Cập nhật lại initializeMusicSync để thêm các trường mới
export const initializeMusicSync = async (chatId: string, userId: string): Promise<void> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (!musicSyncDoc.exists()) {
      // Create initial music sync document if it doesn't exist
      await setDoc(musicSyncRef, {
        currentSong: '',
        isPlaying: false,
        currentTime: 0,
        lastUpdated: serverTimestamp(),
        updatedBy: userId,
        volume: 0.8,
        participants: [userId], // Người khởi tạo luôn là người tham gia
        pendingInvites: [], // Danh sách người dùng đang có lời mời
        playerState: {
          [userId]: { isOpen: false, isMinimized: false }
        },
        sessionStatus: {
          isTerminated: false,
          terminatedBy: null,
          terminatedAt: null
        }
      });
    } else {
      // If exists but was terminated, reset it
      const data = musicSyncDoc.data();
      if (data.sessionStatus?.isTerminated) {
        await updateDoc(musicSyncRef, {
          participants: [userId],
          pendingInvites: [],
          playerState: {
            [userId]: { isOpen: false, isMinimized: false }
          },
          sessionStatus: {
            isTerminated: false,
            terminatedBy: null,
            terminatedAt: null
          },
          invitationAcceptedBy: deleteField(),
          notificationSeen: deleteField(),
          invitationAccepted: false
        });
      }
    }
  } catch (error) {
    console.error('Error initializing music sync:', error);
  }
};

// Get current song info without needing component
export const getCurrentSongInfo = async (chatId: string): Promise<{ title: string, isPlaying: boolean } | null> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (!musicSyncDoc.exists()) return null;
    
    const data = musicSyncDoc.data();
    if (!data.currentSong) return null;
    
    return {
      title: data.currentSongTitle || formatSongTitle(data.currentSong.split('/').pop()?.split('.')[0] || 'Unknown Song'),
      isPlaying: data.isPlaying || false
    };
  } catch (error) {
    console.error('Error getting current song info:', error);
    return null;
  }
};

// Update music sync to include song title for display in chat header
export const updateMusicState = async (
  chatId: string,
  state: Partial<SyncedMusicState>,
  userId: string
): Promise<void> => {
  try {
    // Get current state first
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (!musicSyncDoc.exists()) {
      // Create initial doc if it doesn't exist
      await setDoc(musicSyncRef, {
        currentSong: state.currentSong || null,
        currentTime: state.currentTime || 0,
        isPlaying: state.isPlaying || false,
        volume: state.volume || 0.8,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    
    // Extract title from URL if song is changing
    let updateData: any = {
      ...state,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    };
    
    // If we're changing songs, extract and store the title
    if (state.currentSong) {
      // Extract song title from URL
      const songTitle = state.currentSong.split('/').pop()?.split('.').shift() || 'Unknown Song';
      updateData.currentSongTitle = formatSongTitle(songTitle);
    }
    
    await updateDoc(musicSyncRef, updateData);
  } catch (error) {
    console.error('Error updating music state:', error);
    throw error;
  }
};

// Helper to format song title from URL
const formatSongTitle = (filename: string): string => {
  if (!filename) return 'Unknown Song';
  
  // Convert kebab-case to Title Case
  return filename
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Add a function to check if invitation was accepted
export const checkMusicInvitationAccepted = async (
  chatId: string,
  userId: string
): Promise<{accepted: boolean, acceptedBy?: string}> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      const data = musicSyncDoc.data();
      
      // Check if invitation was accepted
      if (data.invitationAccepted && data.invitationAcceptedBy) {
        // Find who accepted the invitation
        for (const [acceptorId, details] of Object.entries(data.invitationAcceptedBy)) {
          const acceptDetails = details as { accepted: boolean };
          if (acceptorId !== userId && acceptDetails.accepted) {
            return {
              accepted: true,
              acceptedBy: acceptorId
            };
          }
        }
      }
    }
    
    return { accepted: false };
  } catch (error) {
    console.error('Error checking music invitation acceptance:', error);
    return { accepted: false };
  }
};

// Enhance the subscription to detect invitation acceptance
export const subscribeToMusicChanges = (
  chatId: string, 
  userId: string,
  onMusicStateChange: (state: SyncedMusicState) => void,
  onInvitationAccepted?: (acceptorId: string) => void
): (() => void) => {
  const musicSyncRef = doc(db, 'musicSync', chatId);
  
  const unsubscribe = onSnapshot(musicSyncRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data() as SyncedMusicState & { 
        invitationAcceptedBy?: Record<string, {
          accepted: boolean, 
          timestamp: any,
          acceptedInviterID?: string
        }> 
      };
      
      // Check if invitation was accepted
      if (onInvitationAccepted && data.invitationAcceptedBy) {
        for (const [acceptorId, details] of Object.entries(data.invitationAcceptedBy)) {
          // For the inviter: check if someone else accepted their invitation
          if (acceptorId !== userId && details.accepted && details.acceptedInviterID === userId) {
            onInvitationAccepted(acceptorId);
          }
          // For everyone else: just check if an acceptance happened
          else if (acceptorId !== userId && details.accepted) {
            onInvitationAccepted(acceptorId);
          }
        }
      }
      
      // Only react to changes made by the other user
      if (data.updatedBy !== userId) {
        onMusicStateChange(data);
      }
    }
  });
  
  return unsubscribe;
};

// Add subscription function to monitor session status
export const subscribeToSessionStatus = (
  chatId: string,
  userId: string,
  onStatusChange: (isTerminated: boolean, terminatedBy?: string) => void
): (() => void) => {
  const musicSyncRef = doc(db, 'musicSync', chatId);
  
  const unsubscribe = onSnapshot(musicSyncRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      
      // Check session status
      if (data.sessionStatus && data.sessionStatus.isTerminated) {
        onStatusChange(true, data.sessionStatus.terminatedBy);
      }
      
      // Check if the other user has accepted the invitation
      if (data.invitationAccepted && 
          data.invitationAcceptedBy && 
          data.invitationAcceptedBy[userId] !== true) {
        // This means someone else accepted but not this user
        const acceptedBy = Object.keys(data.invitationAcceptedBy)
          .find(key => key !== userId && data.invitationAcceptedBy[key] === true);
          
        if (acceptedBy) {
          // Trigger real-time update for the user who is still waiting
          onStatusChange(false, acceptedBy);
        }
      }
    }
  });
  
  return unsubscribe;
};

// Function to terminate a music session
export const terminateSession = async (
  chatId: string,
  userId: string
): Promise<void> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (musicSyncDoc.exists()) {
      // Update the session status to terminated
      await updateDoc(musicSyncRef, {
        'sessionStatus': {
          isTerminated: true,
          terminatedBy: userId,
          terminatedAt: serverTimestamp()
        },
        'invitationAcceptedBy': {},
        'notificationSeen': {},
        'invitationAccepted': false,
        'participants': [] // Clear participants to force re-invitation
      });
    }
  } catch (error) {
    console.error('Error terminating music session:', error);
    throw error;
  }
};

// Add support for checking if a session is active
export const isSessionActive = async (
  chatId: string
): Promise<boolean> => {
  try {
    const musicSyncRef = doc(db, 'musicSync', chatId);
    const musicSyncDoc = await getDoc(musicSyncRef);
    
    if (!musicSyncDoc.exists()) {
      return false;
    }
    
    const data = musicSyncDoc.data();
    
    // Check if session has been terminated
    if (data.sessionStatus?.isTerminated === true) {
      return false;
    }
    
    // Check if there are any active participants
    if (!data.participants || data.participants.length === 0) {
      return false;
    }
    
    // Check if invitation has been accepted
    if (!data.invitationAccepted) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking session status:', error);
    return false;
  }
};
