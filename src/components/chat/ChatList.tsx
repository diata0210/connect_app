import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dbService from '../../services/dbService';
import { auth } from '../../firebase';

interface ChatInfo {
  id: string;
  otherUserId: string;
  otherUser: {
    uid: string;
    displayName: string;
    photoURL: string;
    isOnline?: boolean;
  };
  lastMessage: {
    text: string;
    timestamp: string;
  } | null;
  updatedAt: string;
  isAnonymous?: boolean;
  unreadCount: number;
}

const ChatList: React.FC = () => {
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch chats from database
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error('User not authenticated');
          setLoading(false);
          return;
        }
        
        // Get current user's chats
        const userChats = await dbService.getUserChats(currentUser.uid);
        
        // Add unread count for demo purposes
        const enhancedChats = userChats.map((chat, index) => ({
          ...chat,
          unreadCount: index % 3 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
        }));
        
        setChats(enhancedChats);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setLoading(false);
      }
    };
    
    fetchChats();
  }, []);

  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Check if same week
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    if (date > weekAgo) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise return date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter chats based on activeFilter and searchTerm
  const filteredChats = chats.filter(chat => {
    // Filter by chat type
    if (activeFilter === 'unread' && chat.unreadCount === 0) {
      return false;
    }
    // For demo purposes, we'll consider every 3rd chat as archived
    if (activeFilter === 'archived' && chats.indexOf(chat) % 3 !== 0) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && chat.otherUser) {
      return chat.otherUser.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (chat.lastMessage && chat.lastMessage.text.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return true;
  });

  // Mark a chat as read
  const markAsRead = (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              unreadCount: 0,
            } 
          : chat
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
            
            {/* Search bar */}
            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Filters */}
            <div className="mt-4 flex border-b border-gray-200">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeFilter === 'all'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Messages
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeFilter === 'unread'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setActiveFilter('archived')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeFilter === 'archived'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
          
          {/* Chat list */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              ))
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                {searchTerm ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No results found</h3>
                    <p className="text-gray-500">We couldn't find any conversations matching "{searchTerm}"</p>
                  </>
                ) : activeFilter === 'unread' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No unread messages</h3>
                    <p className="text-gray-500">You've read all your messages</p>
                  </>
                ) : activeFilter === 'archived' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No archived conversations</h3>
                    <p className="text-gray-500">You haven't archived any conversations yet</p>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
                    <p className="text-gray-500">Start a conversation with someone</p>
                  </>
                )}
              </div>
            ) : (
              filteredChats.map(chat => {
                const isUnread = chat.unreadCount > 0;
                const isFromMe = chat.lastMessage && chat.otherUserId !== chat.id.split('_')[0]; // Simplified check
                
                return (
                  <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className="block hover:bg-gray-50 transition-colors relative"
                  >
                    <div className="p-4 sm:px-6 flex items-center">
                      {/* User avatar with online indicator */}
                      <div className="relative">
                        <img 
                          src={chat.otherUser.photoURL}
                          alt={chat.otherUser.displayName}
                          className="h-12 w-12 rounded-full object-cover border border-gray-200"
                        />
                        <span 
                          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${
                            chat.otherUser.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        ></span>
                      </div>
                      
                      {/* Chat details */}
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {chat.otherUser.displayName}
                            {chat.isAnonymous && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Anonymous
                              </span>
                            )}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {chat.lastMessage ? formatMessageTime(chat.lastMessage.timestamp) : formatMessageTime(chat.updatedAt)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-sm truncate ${isUnread ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                            {isFromMe && chat.lastMessage && (
                              <span className="text-gray-400 mr-1">You: </span>
                            )}
                            {chat.lastMessage ? chat.lastMessage.text : 'Start a conversation'}
                          </p>
                          
                          <div className="flex items-center space-x-2">
                            {isUnread && (
                              <span className="inline-flex items-center justify-center h-5 w-5 text-xs font-medium text-white bg-indigo-600 rounded-full">
                                {chat.unreadCount}
                              </span>
                            )}
                            
                            <button
                              onClick={(e) => markAsRead(chat.id, e)}
                              className={`${isUnread ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 flex items-center justify-center h-6 w-6 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100`}
                              aria-label="Mark as read"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
          
          {/* New message button */}
          <div className="sticky bottom-4 flex justify-center mt-4">
            <Link
              to="/find-friends"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatList;