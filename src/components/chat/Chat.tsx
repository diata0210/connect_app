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
    if (!chatId || !currentUser) return;

    setLoading(true);

    const fetchChat = async () => {
      try {
        // Get chat details
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
          console.error('Chat not found');
          setLoading(false);
          return;
        }
        
        const chatData = chatSnap.data();
        setIsAnonymousChat(chatData.isAnonymous || false);
        
        // Determine the other user in the chat
        const otherUserId = chatData.user1 === currentUser.uid ? chatData.user2 : chatData.user1;
        
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
          }
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
        }, (error) => {
          console.error('Error listening for messages:', error);
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error fetching chat details:', error);
        setLoading(false);
      }
    };
    
    const unsubscribePromise = fetchChat();
    
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [chatId, currentUser]);

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
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: currentUser.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      
      // Update chat's last activity timestamp
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        updatedAt: serverTimestamp()
      });
      
      // Clear the message input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
        <Link to="/chat" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Back to Chats
        </Link>
      </div>
    );
  }

  // Render game component if a game is active
  if (activeGame) {
    return (
      <ChatGames
        gameType={activeGame}
        onEndGame={handleEndGame}
        currentUser={currentUser}
        otherUser={otherUser}
        chatId={chatId}
      />
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
              src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.displayName || 'User')}&background=random&color=fff`}
              alt={otherUser.displayName}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <h2 className="text-lg font-semibold">{otherUser.displayName}</h2>
              {isAnonymousChat && (
                <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">Anonymous Chat</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowGameMenu(!showGameMenu)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showGameMenu && (
            <div className="absolute right-5 mt-2 bg-white border rounded-lg shadow-lg z-10">
              <ul>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleGameInvite('tictactoe')}>
                  Tic Tac Toe
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleGameInvite('connect4')}>
                  Connect 4
                </li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleGameInvite('wordgame')}>
                  Word Game
                </li>
              </ul>
            </div>
          )}
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
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
