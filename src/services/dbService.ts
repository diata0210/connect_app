import { mockUsers, mockClubs, mockChats, mockMessages } from '../mockData';
import { db, auth } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, 
  query, where, orderBy, limit, updateDoc, arrayUnion, arrayRemove,
  serverTimestamp, increment
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';

// Types for our database
export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  password?: string;
  createdAt: string;
  interests?: string[];
}

export interface UserInterest {
  uid: string;
  interest: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  createdBy: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  user1: string;
  user2: string;
  updatedAt: string;
  isAnonymous?: boolean; // New field to track if chat is from random match
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

// In-memory mock database to simulate SQLite functionality
let mockDatabase = {
  users: [] as User[],
  user_interests: [] as UserInterest[],
  clubs: [] as Club[],
  chats: [] as Chat[],
  messages: [] as Message[]
};

// Force to use Firebase, never use mock data
let useFirebase = true;

// Initialize database with mock data if not using Firebase
export const initDatabase = async (): Promise<void> => {
  if (!useFirebase) {
    // This code won't run anymore since useFirebase is always true
    // But keeping it for backward compatibility
    if (mockDatabase.users.length > 0) {
      return; // Database already initialized
    }
    
    try {
      console.log('Initializing mock database with data...');
      
      // Initialize users
      for (const user of mockUsers) {
        const newUser: User = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: user.createdAt.toISOString(),
          interests: []
        };
        
        mockDatabase.users.push(newUser);
        
        // Initialize user interests
        for (const interest of user.interests) {
          mockDatabase.user_interests.push({
            uid: user.uid,
            interest
          });
        }
      }
      
      // Initialize clubs
      for (const club of mockClubs) {
        mockDatabase.clubs.push({
          id: club.id,
          name: club.name,
          description: club.description,
          category: club.category,
          memberCount: club.memberCount,
          createdBy: club.createdBy,
          createdAt: club.createdAt.toISOString()
        });
      }
      
      // Initialize chats
      for (const chat of mockChats) {
        mockDatabase.chats.push({
          id: chat.id,
          user1: chat.users[0],
          user2: chat.users[1],
          updatedAt: chat.updatedAt.toISOString()
        });
      }
      
      // Initialize messages
      for (const [chatId, messages] of Object.entries(mockMessages)) {
        for (const message of messages) {
          mockDatabase.messages.push({
            id: message.id,
            chatId,
            senderId: message.senderId,
            text: message.text,
            timestamp: message.timestamp.toISOString()
          });
        }
      }
      
      console.log('Mock database initialized successfully');
    } catch (err) {
      console.error('Failed to initialize mock database:', err);
      throw err;
    }
  } else {
    console.log('Using Firebase, no need to initialize mock database');
  }
};

// Database service functions
export const dbService = {
  // Authentication functions
  async registerUser(email: string, password: string, displayName: string, interests: string[]): Promise<User> {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, {
        displayName: displayName,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
      });
      
      const userData: User = {
        uid: user.uid,
        displayName: displayName,
        email: email,
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
        createdAt: new Date().toISOString(),
        interests: interests
      };
      
      // Save user to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName,
        email: email,
        photoURL: userData.photoURL,
        createdAt: serverTimestamp(),
      });
      
      // Save user interests
      const userInterestsRef = doc(db, 'user_interests', user.uid);
      await setDoc(userInterestsRef, { interests: interests });
      
      return userData;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },
  
  async loginUser(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      let userData: User | null = null;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        // Get user interests
        const userInterestsDoc = await getDoc(doc(db, 'user_interests', user.uid));
        const interests = userInterestsDoc.exists() ? (userInterestsDoc.data() as { interests: string[] }).interests : [];
        
        userData = {
          uid: user.uid,
          displayName: data.displayName || user.displayName || '',
          email: data.email || user.email || '',
          photoURL: data.photoURL || user.photoURL || '',
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          interests: interests
        };
      } else {
        // If user exists in Auth but not in Firestore, create the record
        userData = {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          interests: []
        };
        
        await setDoc(doc(db, 'users', user.uid), {
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          createdAt: serverTimestamp()
        });
      }
      
      return userData;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },
  
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },
  
  // User functions
  async getUser(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) return null;
      
      const userData = userDoc.data();
      
      // Get user interests
      const userInterestsDoc = await getDoc(doc(db, 'user_interests', uid));
      const interests = userInterestsDoc.exists() ? (userInterestsDoc.data() as { interests: string[] }).interests : [];
      
      return {
        uid: uid,
        displayName: userData.displayName || '',
        email: userData.email || '',
        photoURL: userData.photoURL || '',
        createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
        interests: interests
      };
    } catch (err) {
      console.error('Error getting user:', err);
      return null;
    }
  },
  
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Get user interests
      const userInterestsDoc = await getDoc(doc(db, 'user_interests', userDoc.id));
      const interests = userInterestsDoc.exists() ? (userInterestsDoc.data() as { interests: string[] }).interests : [];
      
      return {
        uid: userDoc.id,
        displayName: userData.displayName || '',
        email: userData.email || '',
        photoURL: userData.photoURL || '',
        createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
        interests: interests
      };
    } catch (err) {
      console.error('Error getting user by email:', err);
      return null;
    }
  },
  
  async createUser(user: User, interests: string[]): Promise<User> {
    try {
      // Save user to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
      });
      
      // Save user interests
      await setDoc(doc(db, 'user_interests', user.uid), {
        interests: interests
      });
      
      return { ...user, interests };
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  },
  
  async updateUserInterests(uid: string, interests: string[]): Promise<string[]> {
    try {
      // Update user interests in Firestore
      await setDoc(doc(db, 'user_interests', uid), {
        interests: interests
      });
      
      return interests;
    } catch (err) {
      console.error('Error updating user interests:', err);
      throw err;
    }
  },
  
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users: User[] = [];
      
      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        
        // Get user interests
        const userInterestsDoc = await getDoc(doc(db, 'user_interests', userDoc.id));
        const interests = userInterestsDoc.exists() ? (userInterestsDoc.data() as { interests: string[] }).interests : [];
        
        users.push({
          uid: userDoc.id,
          displayName: userData.displayName || '',
          email: userData.email || '',
          photoURL: userData.photoURL || '',
          createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
          interests: interests
        });
      }
      
      return users;
    } catch (err) {
      console.error('Error getting all users:', err);
      return [];
    }
  },
  
  // Club functions
  async getClub(id: string): Promise<Club | null> {
    try {
      const clubDoc = await getDoc(doc(db, 'clubs', id));
      
      if (!clubDoc.exists()) return null;
      
      const clubData = clubDoc.data();
      
      return {
        id: clubDoc.id,
        name: clubData.name || '',
        description: clubData.description || '',
        category: clubData.category || '',
        memberCount: clubData.memberCount || 0,
        createdBy: clubData.createdBy || '',
        createdAt: clubData.createdAt ? clubData.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    } catch (err) {
      console.error('Error getting club:', err);
      return null;
    }
  },
  
  async getAllClubs(): Promise<Club[]> {
    try {
      const clubsRef = collection(db, 'clubs');
      const querySnapshot = await getDocs(clubsRef);
      
      const clubs: Club[] = [];
      
      for (const doc of querySnapshot.docs) {
        const clubData = doc.data();
        
        clubs.push({
          id: doc.id,
          name: clubData.name || '',
          description: clubData.description || '',
          category: clubData.category || '',
          memberCount: clubData.memberCount || 0,
          createdBy: clubData.createdBy || '',
          createdAt: clubData.createdAt ? clubData.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      }
      
      return clubs;
    } catch (err) {
      console.error('Error getting all clubs:', err);
      return [];
    }
  },
  
  async createClub(name: string, description: string, category: string, userId: string): Promise<Club> {
    try {
      // Create a new club document in Firestore
      const clubRef = collection(db, 'clubs');
      
      const newClubData = {
        name: name,
        description: description,
        category: category,
        memberCount: 1, // Creator is the first member
        createdBy: userId,
        createdAt: serverTimestamp(),
        members: [userId] // Array to track members
      };
      
      const docRef = await addDoc(clubRef, newClubData);
      
      // Return the new club with the generated ID
      return {
        id: docRef.id,
        name: name,
        description: description,
        category: category,
        memberCount: 1,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error creating club:', err);
      throw err;
    }
  },
  
  async getClubMembers(clubId: string): Promise<User[]> {
    try {
      const clubDoc = await getDoc(doc(db, 'clubs', clubId));
      
      if (!clubDoc.exists()) {
        throw new Error('Club not found');
      }
      
      const clubData = clubDoc.data();
      const memberIds = clubData.members || [];
      
      if (memberIds.length === 0) {
        return [];
      }
      
      const members: User[] = [];
      
      // Fetch each member's data
      for (const memberId of memberIds) {
        const userData = await this.getUser(memberId);
        if (userData) {
          members.push(userData);
        }
      }
      
      return members;
    } catch (err) {
      console.error('Error getting club members:', err);
      return [];
    }
  },
  
  async joinClub(clubId: string, userId: string): Promise<void> {
    try {
      const clubRef = doc(db, 'clubs', clubId);
      
      // Update the club document to add the user to members and increment member count
      await updateDoc(clubRef, {
        members: arrayUnion(userId),
        memberCount: increment(1)
      });
      
    } catch (err) {
      console.error('Error joining club:', err);
      throw err;
    }
  },
  
  async leaveClub(clubId: string, userId: string): Promise<void> {
    try {
      const clubRef = doc(db, 'clubs', clubId);
      
      // Update the club document to remove the user from members and decrement member count
      await updateDoc(clubRef, {
        members: arrayRemove(userId),
        memberCount: increment(-1)
      });
      
    } catch (err) {
      console.error('Error leaving club:', err);
      throw err;
    }
  },
  
  // Chat functions
  async getChat(id: string): Promise<Chat | null> {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', id));
      
      if (!chatDoc.exists()) return null;
      
      const chatData = chatDoc.data();
      
      return {
        id: chatDoc.id,
        user1: chatData.user1 || '',
        user2: chatData.user2 || '',
        updatedAt: chatData.updatedAt ? chatData.updatedAt.toDate().toISOString() : new Date().toISOString(),
        isAnonymous: chatData.isAnonymous || false
      };
    } catch (err) {
      console.error('Error getting chat:', err);
      return null;
    }
  },
  
  async getUserChats(uid: string): Promise<any[]> {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', uid),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const chats = [];
      
      for (const chatDoc of querySnapshot.docs) {
        const chatData = chatDoc.data();
        
        // Get other user ID
        const otherUserId = chatData.user1 === uid ? chatData.user2 : chatData.user1;
        
        // Get other user details
        let otherUser = null;
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // If chat is anonymous, mask the user details
            if (chatData.isAnonymous) {
              otherUser = {
                uid: otherUserId,
                displayName: "Anonymous User",
                photoURL: "https://ui-avatars.com/api/?background=random&name=Anonymous&size=128"
              };
            } else {
              otherUser = {
                uid: otherUserId,
                displayName: userData.displayName || '',
                photoURL: userData.photoURL || ''
              };
            }
          }
        }
        
        // Get last message
        const messagesRef = collection(db, 'messages');
        const messageQuery = query(
          messagesRef,
          where('chatId', '==', chatDoc.id),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const messageSnapshot = await getDocs(messageQuery);
        let lastMessage = null;
        
        if (!messageSnapshot.empty) {
          const messageData = messageSnapshot.docs[0].data();
          lastMessage = {
            text: messageData.text || '',
            timestamp: messageData.timestamp ? messageData.timestamp.toDate().toISOString() : new Date().toISOString()
          };
        }
        
        chats.push({
          id: chatDoc.id,
          otherUserId,
          otherUser,
          updatedAt: chatData.updatedAt ? chatData.updatedAt.toDate().toISOString() : new Date().toISOString(),
          isAnonymous: chatData.isAnonymous || false,
          lastMessage
        });
      }
      
      return chats;
    } catch (err) {
      console.error('Error getting user chats:', err);
      return [];
    }
  },
  
  async createChat(user1: string, user2: string, isAnonymous = false): Promise<string> {
    try {
      // Create a chat ID based on sorted user IDs to ensure uniqueness
      const userIds = [user1, user2].sort();
      const chatId = userIds.join('_');
      
      // Check if chat already exists
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      
      if (!chatDoc.exists()) {
        // Create a new chat
        await setDoc(doc(db, 'chats', chatId), {
          user1: userIds[0],
          user2: userIds[1],
          participants: [user1, user2],  // Array for easier querying
          updatedAt: serverTimestamp(),
          isAnonymous: isAnonymous
        });
      }
      
      return chatId;
    } catch (err) {
      console.error('Error creating chat:', err);
      throw err;
    }
  },
  
  // Specific function for creating random match (anonymous) chats
  async createRandomMatchChat(user1: string, user2: string): Promise<string> {
    return this.createChat(user1, user2, true); // Set isAnonymous to true
  },
  
  async getChatMessages(chatId: string): Promise<Message[]> {
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const messages = [];
      
      for (const msgDoc of querySnapshot.docs) {
        const msgData = msgDoc.data();
        
        // Get sender name
        let senderName = 'Unknown User';
        const userDoc = await getDoc(doc(db, 'users', msgData.senderId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          senderName = userData.displayName || 'Unknown User';
        }
        
        messages.push({
          id: msgDoc.id,
          chatId: msgData.chatId,
          senderId: msgData.senderId,
          senderName: senderName,
          text: msgData.text,
          timestamp: msgData.timestamp ? msgData.timestamp.toDate().toISOString() : new Date().toISOString()
        });
      }
      
      return messages;
    } catch (err) {
      console.error('Error getting chat messages:', err);
      return [];
    }
  },
  
  async sendMessage(message: Message): Promise<Message> {
    try {
      // Create message document in Firestore
      const messagesRef = collection(db, 'messages');
      
      const messageData = {
        chatId: message.chatId,
        senderId: message.senderId,
        text: message.text,
        timestamp: serverTimestamp()
      };
      
      const messageDoc = await addDoc(messagesRef, messageData);
      
      // Update chat's updatedAt timestamp
      await updateDoc(doc(db, 'chats', message.chatId), {
        updatedAt: serverTimestamp()
      });
      
      return {
        ...message,
        id: messageDoc.id
      };
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  },
  
  // Friends/Recommendations functions
  async getFriendRecommendations(userId: string, limit = 10): Promise<User[]> {
    try {
      // Get current user's interests
      const currentUserInterestsDoc = await getDoc(doc(db, 'user_interests', userId));
      if (!currentUserInterestsDoc.exists()) return [];
      
      const userInterests = currentUserInterestsDoc.data().interests || [];
      
      if (userInterests.length === 0) return [];
      
      // Get all users and their interests
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const usersWithCommonInterests: Record<string, User & { commonInterests: string[], commonInterestsCount: number }> = {};
      
      // Get all users and their interests (excluding current user)
      for (const userDoc of usersSnapshot.docs) {
        if (userDoc.id === userId) continue; // Skip current user
        
        const userData = userDoc.data();
        const userInterestsDoc = await getDoc(doc(db, 'user_interests', userDoc.id));
        const interests = userInterestsDoc.exists() ? userInterestsDoc.data().interests : [];
        
        // Calculate common interests
        const commonInterests = interests.filter((interest: string) => userInterests.includes(interest));
        
        if (commonInterests.length > 0) {
          usersWithCommonInterests[userDoc.id] = {
            uid: userDoc.id,
            displayName: userData.displayName || '',
            email: userData.email || '',
            photoURL: userData.photoURL || '',
            createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
            interests: interests,
            commonInterests: commonInterests,
            commonInterestsCount: commonInterests.length
          };
        }
      }
      
      // Sort by number of common interests and limit results
      return Object.values(usersWithCommonInterests)
        .sort((a, b) => b.commonInterestsCount - a.commonInterestsCount)
        .slice(0, limit);
    } catch (err) {
      console.error('Error getting friend recommendations:', err);
      return [];
    }
  },
  
  // Helper functions
  async getAllInterests(): Promise<string[]> {
    try {
      // Get interests from all users in Firestore instead of mock data
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const allInterests = new Set<string>();
      
      // Get interests from each user
      for (const userDoc of usersSnapshot.docs) {
        const userInterestsDoc = await getDoc(doc(db, 'user_interests', userDoc.id));
        if (userInterestsDoc.exists()) {
          const interests = userInterestsDoc.data().interests || [];
          interests.forEach((interest: string) => {
            if (interest) allInterests.add(interest);
          });
        }
      }
      
      console.log('Fetched interests from Firebase:', Array.from(allInterests));
      return Array.from(allInterests).sort();
    } catch (err) {
      console.error('Error getting all interests from Firebase:', err);
      return [];
    }
  },
  
  // Generate a unique ID
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  },
  
  // Close database connection (just for API compatibility)
  closeDatabase(): void {
    console.log('Mock database connection closed');
  }
};

// React hook to use database
export function useDatabaseInit() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    
    init();
  }, []);
  
  return { initialized, error };
}

import { useState, useEffect } from 'react';

export default dbService;