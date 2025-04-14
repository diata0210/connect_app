import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import ContentSharing from './ContentSharing';
import FriendshipJournal from './FriendshipJournal';

interface Message {
  id?: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: any;
  type?: string;
  gameInvitation?: GameInvitation;
}

interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface GameInvitation {
  id: string;
  gameType: 'tictactoe' | 'connect4' | 'wordgame';
  senderId: string;
  recipientId: string;
  chatId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: any;
}

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [activeGame, setActiveGame] = useState<'tictactoe' | 'connect4' | 'wordgame' | null>(null);
  const [pendingGameInvite, setPendingGameInvite] = useState<GameInvitation | null>(null);
  const [showInviteMessage, setShowInviteMessage] = useState(false);
  const [isAnonymousChat, setIsAnonymousChat] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [showIceBreakerModal, setShowIceBreakerModal] = useState(false);
  const [showContentSharing, setShowContentSharing] = useState(false);
  const [showFriendshipJournal, setShowFriendshipJournal] = useState(false);
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

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
        const q = query(
          collection(db, 'messages'),
          where('chatId', '==', chatId),
          orderBy('timestamp', 'asc')
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const msgs: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            msgs.push({
              id: doc.id,
              chatId: data.chatId,
              senderId: data.senderId,
              text: data.text,
              timestamp: data.timestamp?.toDate() || new Date(),
              type: data.type,
              gameInvitation: data.gameInvitation
            });
          });
          
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
    
    if (pendingInvites.length > 0) {
      const latestInvite = pendingInvites[pendingInvites.length - 1];
      setPendingGameInvite(latestInvite.gameInvitation || null);
      setShowInviteMessage(true);
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
      
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        chatId,
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
  const handleGameInvite = async (gameType: 'tictactoe' | 'connect4' | 'wordgame') => {
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
    } catch (error) {
      console.error('Error sending game invitation:', error);
    }
  };
  
  // Handle accepting a game invitation
  const acceptGameInvitation = async () => {
    if (!currentUser || !chatId || !pendingGameInvite) return;
    
    try {
      // Update invitation status
      const inviteRef = doc(db, 'gameInvitations', pendingGameInvite.id);
      await updateDoc(inviteRef, {
        status: 'accepted'
      });
      
      // Send acceptance message
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: `I've accepted the invitation to play ${gameTypeToName(pendingGameInvite.gameType)}!`,
        type: 'gameInvitationAccepted',
        timestamp: serverTimestamp()
      });
      
      // Start the game
      setActiveGame(pendingGameInvite.gameType);
      setPendingGameInvite(null);
      setShowInviteMessage(false);
    } catch (error) {
      console.error('Error accepting game invitation:', error);
    }
  };
  
  // Handle declining a game invitation
  const declineGameInvitation = async () => {
    if (!currentUser || !chatId || !pendingGameInvite) return;
    
    try {
      // Update invitation status
      const inviteRef = doc(db, 'gameInvitations', pendingGameInvite.id);
      await updateDoc(inviteRef, {
        status: 'declined'
      });
      
      // Send decline message
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: `Sorry, I don't want to play ${gameTypeToName(pendingGameInvite.gameType)} right now.`,
        type: 'gameInvitationDeclined',
        timestamp: serverTimestamp()
      });
      
      setPendingGameInvite(null);
      setShowInviteMessage(false);
    } catch (error) {
      console.error('Error declining game invitation:', error);
    }
  };
  
  // Helper function to convert game type to display name
  const gameTypeToName = (type: string): string => {
    switch (type) {
      case 'tictactoe': return 'Tic Tac Toe';
      case 'connect4': return 'Connect 4';
      case 'wordgame': return 'Word Game';
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
        <div className="bg-white border-b shadow-sm p-4 flex justify-between items-center">
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
            <button
              onClick={handleEndGame}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center mr-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              End Game
            </button>
            <div>
              <button
                onClick={() => setShowGameMenu(!showGameMenu)}
                className="flex items-center px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                Play Games
              </button>
              {showGameMenu && (
                <div className="absolute right-5 mt-2 bg-white border rounded-lg shadow-lg z-10 w-48">
                  <h3 className="px-4 py-2 text-sm font-medium text-gray-700 border-b">Choose a game</h3>
                  <ul>
                    <li className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center" onClick={() => handleGameInvite('tictactoe')}>
                      <span className="bg-indigo-100 text-indigo-700 p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                      Tic Tac Toe
                    </li>
                    <li className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center" onClick={() => handleGameInvite('connect4')}>
                      <span className="bg-blue-100 text-blue-700 p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                        </svg>
                      </span>
                      Connect 4
                    </li>
                    <li className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center" onClick={() => handleGameInvite('wordgame')}>
                      <span className="bg-green-100 text-green-700 p-1 rounded mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                      </span>
                      Word Game
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Game panel */}
          <div className="w-2/3 overflow-y-auto p-2">
            <ChatGames
              gameType={activeGame}
              onEndGame={handleEndGame}
              currentUser={currentUser}
              otherUser={otherUser}
              chatId={chatId}
            />
          </div>
          
          {/* Chat panel */}
          <div className="w-1/3 flex flex-col border-l">
            {/* Game invitation */}
            {showInviteMessage && pendingGameInvite && (
              <div className="bg-blue-50 p-4 flex flex-col items-center">
                <div className="mb-2 text-center">
                  <p className="font-medium">Game Invitation: {gameTypeToName(pendingGameInvite.gameType)}</p>
                  <p className="text-sm text-gray-600">Do you want to play?</p>
                </div>
                <div className="flex">
                  <button
                    onClick={acceptGameInvitation}
                    className="bg-green-500 text-white px-4 py-1 rounded mr-2 hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declineGameInvitation}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Messages container */}
            <div className="flex-1 p-2 overflow-y-auto bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-full px-3 py-2 rounded-lg text-sm ${
                          message.senderId === currentUser.uid
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-white border rounded-bl-none'
                        }`}
                      >
                        {message.text}
                        <div
                          className={`text-xs mt-1 ${
                            message.senderId === currentUser.uid ? 'text-blue-100' : 'text-gray-500'
                          }`}
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

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="bg-white border-t p-2">
              <div className="flex items-center">
                <textarea
                  className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  className={`ml-1 rounded-full p-1.5 ${
                    newMessage.trim()
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main chat UI
  return (
    <div className="flex flex-col h-screen">
      {/* Chat header */}
      <div className="bg-white border-b shadow-sm p-4 flex justify-between items-center">
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
          <button
            onClick={() => setShowGameMenu(!showGameMenu)}
            className="flex items-center px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
            Play Games
          </button>
          <button
            onClick={() => setShowContentSharing(!showContentSharing)}
            className="flex items-center px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V4H4zm8 14H6v-4h6v4zm0-6H6V8h6v4zm8 6h-6v-4h6v4zm0-6h-6V8h6v4z" />
            </svg>
            Share Content
          </button>
          <button
            onClick={() => setShowFriendshipJournal(!showFriendshipJournal)}
            className="flex items-center px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Friendship Journal
          </button>
        </div>
      </div>

      {/* Game invitation */}
      {showInviteMessage && pendingGameInvite && (
        <div className="bg-blue-50 p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Game Invitation: {gameTypeToName(pendingGameInvite.gameType)}</p>
            <p className="text-sm text-gray-600">Do you want to play?</p>
          </div>
          <div>
            <button
              onClick={acceptGameInvitation}
              className="bg-green-500 text-white px-4 py-1 rounded mr-2 hover:bg-green-600"
            >
              Accept
            </button>
            <button
              onClick={declineGameInvitation}
              className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
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
                  className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                    message.senderId === currentUser.uid
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white border rounded-bl-none'
                  }`}
                >
                  {message.text}
                  <div
                    className={`text-xs mt-1 ${
                      message.senderId === currentUser.uid ? 'text-blue-100' : 'text-gray-500'
                    }`}
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

      {/* Chat suggestions for conversations with no messages */}
      {messages.length === 0 && otherUser && (
        <div className="px-4">
          <ChatSuggestions
            isAnonymousChat={isAnonymousChat}
            otherUserName={otherUser.displayName || "User"}
            sharedInterests={sharedInterests}
            onSuggestionSelect={(text) => setNewMessage(text)}
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

      {/* Content sharing modal */}
      {showContentSharing && (
        <ContentSharing
          onClose={() => setShowContentSharing(false)}
          currentUser={currentUser}
          otherUser={otherUser}
          chatId={chatId}
        />
      )}

      {/* Friendship journal modal */}
      {showFriendshipJournal && (
        <FriendshipJournal
          onClose={() => setShowFriendshipJournal(false)}
          currentUser={currentUser}
          otherUser={otherUser}
          chatId={chatId}
        />
      )}

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
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
