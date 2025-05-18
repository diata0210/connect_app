//@ts-ignore
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import ChatGames from './ChatGames';
import ChatSuggestions from './ChatSuggestions';
import IceBreakerModal from './IceBreakerModal';
import MusicPlayer from './MusicPlayer';
import MusicInvitationModal from './MusicInvitationModal';
import {
  acceptMusicInvitation,
  declineMusicInvitation,
  checkMusicInvitation
} from '../../services/musicSyncService';

interface Message {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: any;
  type?: string;
  gameInvitation?: GameInvitation;
  reactions?: { [emoji: string]: string[] }; // emoji -> userId[]
}

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface GameInvitation {
  id: string;
  gameType: 'truth-or-lie' | 'word-chain' | 'proverbs' | 'riddles'; // Updated game types
  senderId: string;
  recipientId: string;
  chatId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: any;
  gameSessionId?: string; // Added to store game session ID upon acceptance
}

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate(); // Add this line to use navigation
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [activeGame, setActiveGame] = useState<'tictactoe' | 'connect4' | 'wordgame' | null>(null); // This state might be for other embedded games.
  const [pendingGameInvite, setPendingGameInvite] = useState<GameInvitation | null>(null);
  const [showInviteMessage, setShowInviteMessage] = useState(false);
  const [isAnonymousChat, setIsAnonymousChat] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [showIceBreakerModal, setShowIceBreakerModal] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [showMusicInvitation, setShowMusicInvitation] = useState(false);
  const [musicInviterId, setMusicInviterId] = useState<string | undefined>(undefined);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null); // messageId
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Reaction emoji list
  const REACTION_EMOJIS = ['👍', '😂', '😍', '😮', '😢', '🔥', '🎉', '😆', '😡', '🙏'];

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email || '',
          photoURL: user.photoURL || ''
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up real-time listeners for chat and messages
  useEffect(() => {
    if (!chatId) {
      setErrorDetail("No chat ID provided in URL");
      setLoading(false);
      return;
    }
    
    if (!currentUser) {
      console.log("Waiting for authentication...");
      return;
    }

    setLoading(true);
    console.log("Fetching chat data for:", chatId);

    const fetchChat = async () => {
      try {
        // Get chat details
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
          console.error('Chat not found in database', chatId);
          setErrorDetail(`Chat with ID ${chatId} was not found in the database`);
          setLoading(false);
          return;
        }
        
        const chatData = chatSnap.data();
        setIsAnonymousChat(chatData.isAnonymous || false);
        
        // Determine the other user in the chat
        const otherUserId = chatData.user1 === currentUser.uid ? chatData.user2 : chatData.user1;
        
        if (!otherUserId) {
          setErrorDetail("Chat missing valid participant information");
          setLoading(false);
          return;
        }
        
        console.log("Other user ID:", otherUserId);
        
        // Get other user details
        const userRef = doc(db, 'users', otherUserId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          // If chat is anonymous, mask the user details
          if (chatData.isAnonymous) {
            setOtherUser({
              uid: otherUserId,
              displayName: "Anonymous User",
              photoURL: "https://ui-avatars.com/api/?background=random&name=Anonymous&size=128"
            });
          } else {
            setOtherUser({
              uid: otherUserId,
              displayName: userData.displayName || 'User',
              email: userData.email || '',
              photoURL: userData.photoURL || ''
            });

            // Fetch shared interests for non-anonymous chats
            try {
              // Get current user interests
              const currentUserInterestsDoc = await getDoc(doc(db, 'user_interests', currentUser.uid));
              const currentUserInterests = currentUserInterestsDoc.exists() 
                ? (currentUserInterestsDoc.data() as { interests: string[] }).interests 
                : [];
              
              // Get other user interests
              const otherUserInterestsDoc = await getDoc(doc(db, 'user_interests', otherUserId));
              const otherUserInterests = otherUserInterestsDoc.exists() 
                ? (otherUserInterestsDoc.data() as { interests: string[] }).interests 
                : [];
              
              // Find shared interests
              if (currentUserInterests.length > 0 && otherUserInterests.length > 0) {
                const shared = currentUserInterests.filter(interest => 
                  otherUserInterests.includes(interest)
                );
                setSharedInterests(shared);
                console.log("Shared interests:", shared);
              }
            } catch (error) {
              console.error("Error fetching shared interests:", error);
            }
          }
        } else {
          console.error('Other user not found:', otherUserId);
          setErrorDetail(`User information for participant could not be found`);
          setLoading(false);
          return;
        }
        
        // Set up real-time listener for messages
        const messagesRef = collection(db, 'messages');
        const q = query(
          messagesRef,
          where('chatId', '==', chatId),
          orderBy('timestamp', 'asc')
        );
        
        console.log("Setting up messages listener for chatId:", chatId);
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const msgs: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Message data:", data);
            msgs.push({
              id: doc.id,
              chatId: data.chatId || chatId,
              senderId: data.senderId || "unknown",
              text: data.text || "",
              timestamp: data.timestamp?.toDate() || new Date(),
              type: data.type,
              gameInvitation: data.gameInvitation,
              reactions: data.reactions
            });
          });
          
          console.log(`Found ${msgs.length} messages for chat ${chatId}`);
          setMessages(msgs);
          setLoading(false);
          
          // If this is first message exchange, show the ice breaker modal
          if (msgs.length === 0 && !isAnonymousChat && !showIceBreakerModal) {
            setShowIceBreakerModal(true);
          }
        }, (error) => {
          console.error('Error listening for messages:', error);
          setErrorDetail("Error occurred while listening for messages");
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching chat details:', error);
        setErrorDetail("Error occurred while fetching chat details");
        setLoading(false);
      }
    };
    
    const unsubscribePromise = fetchChat();
    
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [chatId, currentUser, isAnonymousChat, showIceBreakerModal]);

  // Check for game invitations in messages
  useEffect(() => {
    if (!currentUser) return;
    
    const pendingInvites = messages.filter(
      msg => msg.type === 'gameInvitation' && 
      msg.gameInvitation?.recipientId === currentUser.uid &&
      msg.gameInvitation?.status === 'pending'
    );
    
    // Get the most recent game invitation that hasn't been responded to
    if (pendingInvites.length > 0) {
      const latestInvite = pendingInvites[pendingInvites.length - 1];
      
      // Check if this invitation status is still pending in the database
      const checkInviteStatus = async () => {
        try {
          if (latestInvite.gameInvitation?.id) {
            const inviteDoc = await getDoc(doc(db, 'gameInvitations', latestInvite.gameInvitation.id));
            if (inviteDoc.exists() && inviteDoc.data().status === 'pending') {
              setPendingGameInvite(latestInvite.gameInvitation);
              setShowInviteMessage(true);
            } else {
              // Invitation was already handled
              setPendingGameInvite(null);
              setShowInviteMessage(false);
            }
          }
        } catch (error) {
          console.error('Error checking invitation status:', error);
        }
      };
      
      checkInviteStatus();
    } else {
      setPendingGameInvite(null);
      setShowInviteMessage(false);
    }
  }, [messages, currentUser]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || !chatId) return;
    
    try {
      // Show optimistic UI update
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        chatId,
        senderId: currentUser.uid,
        text: newMessage.trim(),
        timestamp: new Date()
      };
      
      // Add to local state for immediate feedback
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Clear the message input right away
      setNewMessage('');
      
      console.log("Sending message to chatId:", chatId);
      
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        chatId: chatId,
        senderId: currentUser.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      
      console.log("Message sent successfully");
      
      // Update chat's last activity timestamp
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };
  
  // Handle game invitation
  const handleGameInvite = async (gameType: 'truth-or-lie' | 'word-chain' | 'proverbs' | 'riddles') => { // Updated game types
    if (!currentUser || !otherUser || !chatId) return;

    try {
      // Create a game invitation
      const invitationData = {
        gameType,
        senderId: currentUser.uid,
        recipientId: otherUser.uid,
        chatId,
        status: 'pending',
        timestamp: serverTimestamp()
      };
      
      // Add invitation to Firestore
      const inviteRef = await addDoc(collection(db, 'gameInvitations'), invitationData);

      // Send a message about the invitation
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: `I've invited you to play ${gameTypeToName(gameType)}. Do you accept?`,
        type: 'gameInvitation',
        gameInvitation: {
          ...invitationData,
          id: inviteRef.id
        },
        timestamp: serverTimestamp()
      });

      setShowGameMenu(false);

      // Add notification of invitation sent
      alert(`Game invitation sent to ${isAnonymousChat ? 'Anonymous User' : otherUser.displayName}. Waiting for response.`);
    } catch (error) {
      console.error('Error sending game invitation:', error);
    }
  };

  // Handle accepting a game invitation
  const acceptGameInvitation = async () => {
    if (!currentUser || !chatId || !pendingGameInvite) return;

    try {
      // Hide invitation UI immediately for better UX
      setShowInviteMessage(false);

      // Determine player roles
      const player1 = pendingGameInvite.senderId; // Initiator
      const player2 = currentUser.uid;           // Accepter

      // Initialize gameData based on gameType
      let initialGameData = {};
      switch (pendingGameInvite.gameType) {
        case 'truth-or-lie':
          initialGameData = {
            rounds: [],
            currentRound: 0,
            maxRounds: 5, // Default max rounds
            scores: { [player1]: 0, [player2]: 0 },
            roundPhase: 'submitting',
            playerMakingStatements: player1, // Game initiator (P1) starts by making statements
            playerGuessing: player2,         // Accepter (P2) will be the first to guess
          };
          break;
        case 'word-chain':
          initialGameData = {
            words: [],
            lastWord: null,
            usedWords: [],
            scores: { [player1]: 0, [player2]: 0 }
          };
          break;
        case 'proverbs':
          initialGameData = {
            proverbsList: [], // Will be populated from PROVERBS constant in Games.tsx or dynamically
            currentProverbIndex: null,
            score: { [player1]: 0, [player2]: 0 }
          };
          break;
        case 'riddles':
          initialGameData = {
            riddlesList: [], // Will be populated from RIDDLES constant in Games.tsx or dynamically
            currentRiddleIndex: null,
            score: { [player1]: 0, [player2]: 0 }
          };
          break;
        default:
          initialGameData = {};
      }

      // 1. Create game session first to get its ID
      const gameSessionRef = await addDoc(collection(db, 'gameSessions'), {
        gameType: pendingGameInvite.gameType,
        player1: player1, 
        player2: player2, 
        chatId: chatId,
        status: 'active',
        currentTurn: player1, // Game creator (original inviter) goes first
        createdAt: serverTimestamp(),
        gameData: initialGameData,
        lastMoveAt: serverTimestamp()
      });
      
      // 2. Update invitation status and add gameSessionId to the invitation document
      const inviteRef = doc(db, 'gameInvitations', pendingGameInvite.id);
      await updateDoc(inviteRef, {
        status: 'accepted',
        gameSessionId: gameSessionRef.id // Save game session ID to the invitation doc
      });

      // 3. Send acceptance message with all necessary gameInvitation details
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid, // The user who accepted sends this message
        text: `I've accepted the invitation to play ${gameTypeToName(pendingGameInvite.gameType)}! Let's play!`,
        type: 'gameInvitationAccepted',
        gameInvitation: { // Construct the payload carefully
          id: pendingGameInvite.id, // ID of the invitation document
          gameType: pendingGameInvite.gameType,
          senderId: pendingGameInvite.senderId, // Original inviter
          recipientId: currentUser.uid, // Accepter
          chatId: pendingGameInvite.chatId,
          status: 'accepted',
          gameSessionId: gameSessionRef.id // Crucial: ID of the created game session
        },
        timestamp: serverTimestamp()
      });
      
      // 4. Redirect the accepter to the games page
      navigate(`/games/${gameSessionRef.id}`);

      setPendingGameInvite(null);
    } catch (error) {
      console.error('Error accepting game invitation:', error);
      setShowInviteMessage(true); // Show invitation again if there's an error
    }
  };
  
  // Handle declining a game invitation
  const declineGameInvitation = async () => {
    if (!currentUser || !chatId || !pendingGameInvite) return;
    
    try {
      // Hide invitation UI immediately for better UX
      setShowInviteMessage(false);
      
      // Update invitation status
      const inviteRef = doc(db, 'gameInvitations', pendingGameInvite.id);
      await updateDoc(inviteRef, {
        status: 'declined'
      });
      
      // Send decline message
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: `Sorry, I can't play ${gameTypeToName(pendingGameInvite.gameType)} right now. Maybe later!`,
        type: 'gameInvitationDeclined',
        gameInvitation: { // Attach the original invitation details
          ...pendingGameInvite,
          status: 'declined'
        },
        timestamp: serverTimestamp()
      });

      setPendingGameInvite(null);
    } catch (error) {
      console.error('Error declining game invitation:', error);
      setShowInviteMessage(true); // Show invitation again if there's an error
    }
  };
  
  // Handle accepting music invitation
  const handleAcceptMusicInvitation = async () => {
    if (!chatId || !currentUser || !musicInviterId) return;

    try {
      const accepted = await acceptMusicInvitation(chatId, currentUser.uid, musicInviterId);
      if (accepted) {
        setShowMusicInvitation(false);
        setShowMusicPlayer(true);
      } else {
        alert("Có lỗi xảy ra khi chấp nhận lời mời. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error('Error accepting music invitation:', error);
      alert("Không thể chấp nhận lời mời. Vui lòng thử lại sau.");
    }
  };

  // Handle declining music invitation
  const handleDeclineMusicInvitation = async () => {
    if (!chatId || !currentUser || !musicInviterId) return;
    
    try {
      //@ts-ignore
      await declineMusicInvitation(chatId, currentUser.uid, musicInviterId);
      setShowMusicInvitation(false);
    } catch (error) {
      console.error('Error declining music invitation:', error);
      alert("Không thể từ chối lời mời. Vui lòng thử lại sau.");
    } finally {
      setShowMusicInvitation(false);
    }
  };

  // Check music invitations periodically
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const checkMusicInvite = async () => {
      try {
        const invitation = await checkMusicInvitation(chatId, currentUser.uid);
        if (invitation.isPending && invitation.inviterId) {
          setMusicInviterId(invitation.inviterId);
          setShowMusicInvitation(true);
        }
      } catch (error) {
        console.error('Error checking music invitations:', error);
      }
    };

    checkMusicInvite();
    const intervalId = setInterval(checkMusicInvite, 10000); // kiểm tra mỗi 10 giây

    return () => clearInterval(intervalId);
  }, [chatId, currentUser]);

  // Helper function to convert game type to display name
  const gameTypeToName = (type: string): string => {
    switch (type) {
      case 'truth-or-lie': return 'Truth or Lie';
      case 'word-chain': return 'Word Chain';
      case 'proverbs': return 'Proverbs Game';
      case 'riddles': return 'Riddles & Puzzles';
      default: return 'a game';
    }
  };
  
  // Handle ending a game
  const handleEndGame = () => {
    setActiveGame(null);
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: Date) => {
    if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      return '';
    }
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Toggle reaction for a message
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !messageId) return;
    try {
      const msgRef = doc(db, 'messages', messageId);
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) return;
      const data = msgSnap.data();
      const reactions = data.reactions || {};
      const userList: string[] = reactions[emoji] || [];
      let newReactions = { ...reactions };
      if (userList.includes(currentUser.uid)) {
        // Remove reaction
        newReactions[emoji] = userList.filter((uid) => uid !== currentUser.uid);
        if (newReactions[emoji].length === 0) delete newReactions[emoji];
      } else {
        // Add reaction
        newReactions[emoji] = [...userList, currentUser.uid];
      }
      await updateDoc(msgRef, { reactions: newReactions });
    } catch (e) {
      console.error('Failed to toggle reaction:', e);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state if no chat or users found
  if (!chatId || !currentUser || !otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 text-xl mb-4">Could not load chat</p>
        {errorDetail && <p className="text-gray-600 mb-4 text-center max-w-md">{errorDetail}</p>}
        <div className="text-gray-500 mb-4 text-sm">
          <div>Chat ID: {chatId || 'Missing'}</div>
          <div>Logged in: {currentUser ? 'Yes' : 'No'}</div>
          <div>Other user loaded: {otherUser ? 'Yes' : 'No'}</div>
        </div>
          <Link to="/chat" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Back to Chats
          </Link>
        </div>
    );
  }

  // Render game component if a game is active
  if (activeGame) {
    return (
      <div className="flex flex-col h-screen">
        {/* Chat header */}
        <div className="bg-white border-b shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center">
            <Link to="/chat" className="mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center">
              <img
                src={isAnonymousChat 
                  ? "https://ui-avatars.com/api/?background=random&name=Anonymous&size=128"
                  : otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.displayName || 'User')}&background=random&color=fff`}
                alt={isAnonymousChat ? "Anonymous User" : otherUser.displayName}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <h2 className="text-lg font-semibold">
                  {isAnonymousChat ? "Anonymous User" : otherUser.displayName}
                </h2>
                {isAnonymousChat && (
                  <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">Anonymous Chat</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowGameMenu(!showGameMenu)}
                className="flex items-center px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors mr-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                Play Games
              </button>
              
              {/* Game menu dropdown - đã xóa Word Chain và Proverbs Game */}
              {showGameMenu && (
                <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 w-56">
                  <h3 className="px-4 py-2 text-sm font-medium text-gray-700 border-b">Choose a language game</h3>
                  <ul>
                    <li 
                      className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center" 
                      onClick={() => {
                        handleGameInvite('truth-or-lie');
                        setShowGameMenu(false);
                      }}
                    >
                      <span className="bg-indigo-100 text-indigo-700 p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3V1m0 2v2m0-2h6M9 3H6m3 0V1" />
                        </svg>
                      </span>
                      Truth or Lie
                    </li>
                    <li 
                      className="px-4 py-2 hover:bg-yellow-50 cursor-pointer flex items-center"
                      onClick={() => {
                        handleGameInvite('riddles');
                        setShowGameMenu(false);
                      }}
                    >
                      <span className="bg-yellow-100 text-yellow-700 p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      Riddles & Puzzles
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowMusicPlayer(true)}
              className="flex items-center px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg transition-colors mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Music
            </button>
          </div>
        </div>

        {/* Game invitation */}
        {showInviteMessage && pendingGameInvite && (
          <div className="bg-blue-50 p-4 flex items-center justify-between sticky top-[72px] z-10 border-b border-blue-100">
            <div>
              <p className="font-medium">Game Invitation: {gameTypeToName(pendingGameInvite.gameType)}</p>
              <p className="text-sm text-gray-600">Do you want to play?</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={acceptGameInvitation}
                className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={declineGameInvitation}
                className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Active game area */}
        {activeGame && (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {gameTypeToName(activeGame)}
                </h3>
                <button
                  onClick={handleEndGame}
                  className="bg-red-100 text-red-600 px-3 py-1 rounded-md hover:bg-red-200"
                >
                  End Game
                </button>
              </div>
              <ChatGames
                gameType={activeGame}
                onEndGame={handleEndGame}
                currentUser={currentUser}
                otherUser={otherUser}
                chatId={chatId}
              />
            </div>
          </div>
        )}

        {/* Messages container */}
        <div className={`flex-1 p-4 overflow-y-auto bg-gray-50 ${activeGame ? 'hidden md:block' : ''}`}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow-sm ${
                      message.senderId === currentUser.uid
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white border rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {/* For the original inviter: Show "Join Game" button when invitation is accepted by the other user */}
                    {message.type === 'gameInvitationAccepted' &&
                      message.gameInvitation &&
                      message.gameInvitation.senderId === currentUser.uid && // Current user is the original inviter
                      message.gameInvitation.gameSessionId && (
                        <button
                          onClick={() => navigate(`/games/${message.gameInvitation!.gameSessionId}`)}
                          className="mt-2 w-full bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 text-sm font-semibold transition-colors"
                        >
                          Join Game
                        </button>
                      )}
                    {/* Reactions UI */}
                    <div className="flex flex-wrap gap-1 mt-2 items-center">
                      {message.reactions &&
                        Object.entries(message.reactions).map(([emoji, userIds]) => (
                          <button
                            key={emoji}
                            className={`flex items-center px-2 py-0.5 rounded-full text-sm border ${userIds.includes(currentUser.uid) ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-200'} hover:bg-blue-200 transition-colors`}
                            onClick={() => handleToggleReaction(message.id!, emoji)}
                            title={userIds.length === 1 ? '1 person reacted' : `${userIds.length} people reacted`}
                          >
                            <span>{emoji}</span>
                            <span className="ml-1">{userIds.length}</span>
                          </button>
                        ))}
                      {/* Add reaction button */}
                      <div className="relative">
                        <button
                          className="px-2 py-0.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
                          onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : (message.id || null))}
                          title="Add reaction"
                          type="button"
                        >
                          +
                        </button>
                        {showReactionPicker === message.id && (
                          <div className="absolute z-30 mt-1 left-0 bg-white border rounded shadow-lg flex flex-row p-1 space-x-1 max-w-[300] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                className="text-xl p-1 hover:bg-blue-100 rounded"
                                onClick={() => {
                                  handleToggleReaction(message.id!, emoji);
                                  setShowReactionPicker(null);
                                }}
                                type="button"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        message.senderId === currentUser.uid ? 'text-blue-100' : 'text-gray-500'
                      } ${message.type === 'gameInvitationAccepted' && message.gameInvitation && message.gameInvitation.senderId === currentUser.uid ? 'text-right' : ''}`}
                    >
                      {message.timestamp ? formatTime(message.timestamp) : ''}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat suggestions - Sửa ở đây để hiển thị gợi ý mọi lúc, không chỉ khi không có tin nhắn */}
        {!activeGame && otherUser && (
          <div className="px-4 pb-2">
            <ChatSuggestions
              isAnonymousChat={isAnonymousChat}
              otherUserName={otherUser.displayName || "User"}
              sharedInterests={sharedInterests}
              onSuggestionSelect={(text) => setNewMessage(text)}
              recentMessages={messages.slice(-5).map(m => 
                `${m.senderId === currentUser?.uid ? 'Tôi' : otherUser?.displayName || 'Bạn'}: ${m.text}`
              )}
            />
          </div>
        )}

        {/* Ice breaker modal */}
        {showIceBreakerModal && currentUser && otherUser && (
          <IceBreakerModal
            chatId={chatId}
            currentUserId={currentUser.uid}
            otherUserName={isAnonymousChat ? "Anonymous User" : otherUser.displayName || "User"}
            sharedInterests={sharedInterests}
            onClose={() => setShowIceBreakerModal(false)}
            onMessageSent={() => {
              // Close the modal and don't need to set message as it's already sent to Firebase
              setShowIceBreakerModal(false);
            }}
          />
        )}

        {/* Music Player Modal */}
        {showMusicPlayer && currentUser && chatId && otherUser && (
          //@ts-ignore
          <MusicPlayer 
            chatId={chatId}
            currentUserId={currentUser.uid}
            otherUserId={otherUser.uid}
            otherUserName={otherUser.displayName || "User"}
            onClose={() => setShowMusicPlayer(false)}
          />
        )}

        {/* Music Invitation Modal */}
        {showMusicInvitation && currentUser && otherUser && musicInviterId && (
          <MusicInvitationModal
            inviterName={musicInviterId === otherUser.uid ? (otherUser.displayName || 'Người dùng khác') : 'Người dùng khác'}
            onAccept={handleAcceptMusicInvitation}
            onDecline={handleDeclineMusicInvitation}
          />
        )}

        {/* Message input */}
        <form onSubmit={handleSendMessage} className="bg-white border-t p-4 sticky bottom-0 z-10">
          <div className="flex items-center">
            <textarea
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`ml-2 rounded-full p-2 ${
                newMessage.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Main chat UI
  return (
    <div className="flex flex-col h-screen">
      {/* Chat header - Making it sticky */}
      <div className="bg-white border-b shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <Link to="/chat" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center">
            <img
              src={isAnonymousChat 
                ? "https://ui-avatars.com/api/?background=random&name=Anonymous&size=128"
                : otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.displayName || 'User')}&background=random&color=fff`}
              alt={isAnonymousChat ? "Anonymous User" : otherUser.displayName}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <h2 className="text-lg font-semibold">
                {isAnonymousChat ? "Anonymous User" : otherUser.displayName}
              </h2>
              {isAnonymousChat && (
                <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">Anonymous Chat</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="relative">
            <button
              onClick={() => setShowGameMenu(!showGameMenu)}
              className="flex items-center px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors mr-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              Play Games
            </button>
            
            {/* Game menu dropdown - đã xóa Word Chain và Proverbs Game */}
            {showGameMenu && (
              <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg z-20 w-56">
                <h3 className="px-4 py-2 text-sm font-medium text-gray-700 border-b">Choose a language game</h3>
                <ul>
                  <li 
                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center" 
                    onClick={() => {
                      handleGameInvite('truth-or-lie');
                      setShowGameMenu(false);
                    }}
                  >
                    <span className="bg-indigo-100 text-indigo-700 p-1 rounded mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3V1m0 2v2m0-2h6M9 3H6m3 0V1" />
                      </svg>
                    </span>
                    Truth or Lie
                  </li>
                  <li 
                    className="px-4 py-2 hover:bg-yellow-50 cursor-pointer flex items-center"
                    onClick={() => {
                      handleGameInvite('riddles');
                      setShowGameMenu(false);
                    }}
                  >
                    <span className="bg-yellow-100 text-yellow-700 p-1 rounded mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    Riddles & Puzzles
                  </li>
                </ul>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowMusicPlayer(true)}
            className="flex items-center px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg transition-colors mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Music
          </button>
        </div>
      </div>

      {/* Game invitation */}
      {showInviteMessage && pendingGameInvite && (
        <div className="bg-blue-50 p-4 flex items-center justify-between sticky top-[72px] z-10 border-b border-blue-100">
          <div>
            <p className="font-medium">Game Invitation: {gameTypeToName(pendingGameInvite.gameType)}</p>
            <p className="text-sm text-gray-600">Do you want to play?</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={acceptGameInvitation}
              className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={declineGameInvitation}
              className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Active game area */}
      {activeGame && (
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {gameTypeToName(activeGame)}
              </h3>
              <button
                onClick={handleEndGame}
                className="bg-red-100 text-red-600 px-3 py-1 rounded-md hover:bg-red-200"
              >
                End Game
              </button>
            </div>
            <ChatGames
              gameType={activeGame}
              onEndGame={handleEndGame}
              currentUser={currentUser}
              otherUser={otherUser}
              chatId={chatId}
            />
          </div>
        </div>
      )}

      {/* Messages container */}
      <div className={`flex-1 p-4 overflow-y-auto bg-gray-50 ${activeGame ? 'hidden md:block' : ''}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow-sm ${
                    message.senderId === currentUser.uid
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white border rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {/* For the original inviter: Show "Join Game" button when invitation is accepted by the other user */}
                  {message.type === 'gameInvitationAccepted' &&
                    message.gameInvitation &&
                    message.gameInvitation.senderId === currentUser.uid && // Current user is the original inviter
                    message.gameInvitation.gameSessionId && (
                      <button
                        onClick={() => navigate(`/games/${message.gameInvitation!.gameSessionId}`)}
                        className="mt-2 w-full bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 text-sm font-semibold transition-colors"
                      >
                        Join Game
                      </button>
                    )}
                  {/* Reactions UI */}
                  <div className="flex flex-wrap gap-1 mt-2 items-center">
                    {message.reactions &&
                      Object.entries(message.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          className={`flex items-center px-2 py-0.5 rounded-full text-sm border ${userIds.includes(currentUser.uid) ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-200'} hover:bg-blue-200 transition-colors`}
                          onClick={() => handleToggleReaction(message.id!, emoji)}
                          title={userIds.length === 1 ? '1 person reacted' : `${userIds.length} people reacted`}
                        >
                          <span>{emoji}</span>
                          <span className="ml-1">{userIds.length}</span>
                        </button>
                      ))}
                    {/* Add reaction button */}
                    <div className="relative">
                      <button
                        className="px-2 py-0.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
                        onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : (message.id || null))}
                        title="Add reaction"
                        type="button"
                      >
                        +
                      </button>
                      {showReactionPicker === message.id && (
                        <div className="absolute z-30 mt-1 left-0 bg-white border rounded shadow-lg flex flex-row p-1 space-x-1 max-w-[220px] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ WebkitOverflowScrolling: 'touch' }}>
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              className="text-xl p-1 hover:bg-blue-100 rounded"
                              onClick={() => {
                                handleToggleReaction(message.id!, emoji);
                                setShowReactionPicker(null);
                              }}
                              type="button"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === currentUser.uid ? 'text-blue-100' : 'text-gray-500'
                    } ${message.type === 'gameInvitationAccepted' && message.gameInvitation && message.gameInvitation.senderId === currentUser.uid ? 'text-right' : ''}`}
                  >
                    {message.timestamp ? formatTime(message.timestamp) : ''}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat suggestions - Sửa ở đây để hiển thị gợi ý mọi lúc, không chỉ khi không có tin nhắn */}
      {!activeGame && otherUser && (
        <div className="px-4 pb-2">
          <ChatSuggestions
            isAnonymousChat={isAnonymousChat}
            otherUserName={otherUser.displayName || "User"}
            sharedInterests={sharedInterests}
            onSuggestionSelect={(text) => setNewMessage(text)}
            recentMessages={messages.slice(-5).map(m => 
              `${m.senderId === currentUser?.uid ? 'Tôi' : otherUser?.displayName || 'Bạn'}: ${m.text}`
            )}
          />
        </div>
      )}

      {/* Ice breaker modal */}
      {showIceBreakerModal && currentUser && otherUser && (
        <IceBreakerModal
          chatId={chatId}
          currentUserId={currentUser.uid}
          otherUserName={isAnonymousChat ? "Anonymous User" : otherUser.displayName || "User"}
          sharedInterests={sharedInterests}
          onClose={() => setShowIceBreakerModal(false)}
          onMessageSent={() => {
            // Close the modal and don't need to set message as it's already sent to Firebase
            setShowIceBreakerModal(false);
          }}
        />
      )}

      {/* Music Player Modal */}
      {showMusicPlayer && currentUser && chatId && otherUser && (
       //@ts-ignore
        <MusicPlayer 
          chatId={chatId}
          currentUserId={currentUser.uid}
          otherUserId={otherUser.uid}
          otherUserName={otherUser.displayName || "User"}
          onClose={() => setShowMusicPlayer(false)}
        />
      )}

      {/* Music Invitation Modal */}
      {showMusicInvitation && currentUser && otherUser && musicInviterId && (
        <MusicInvitationModal
          inviterName={musicInviterId === otherUser.uid ? (otherUser.displayName || 'Người dùng khác') : 'Người dùng khác'}
          onAccept={handleAcceptMusicInvitation}
          onDecline={handleDeclineMusicInvitation}
        />
      )}

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t p-4 sticky bottom-0 z-10">
        <div className="flex items-center">
          <textarea
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`ml-2 rounded-full p-2 ${
              newMessage.trim()
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
