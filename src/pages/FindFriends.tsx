import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import dbService, { User } from '../services/dbService';

// Define extended user type to include common interests for UI
interface UserWithCommonInterests extends User {
  commonInterests?: string[];
  commonInterestsCount?: number;
}

const FindFriends: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<UserWithCommonInterests[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCommonInterests[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [allInterests, setAllInterests] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get full user data from Firestore
        const userData = await dbService.getUser(firebaseUser.uid);
        console.log("Current user data:", userData);
        setCurrentUser(userData);
      } else {
        console.log("No user is signed in");
        setCurrentUser(null);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Collect all interests when the component loads
  useEffect(() => {
    const fetchAllInterests = async () => {
      try {
        // Get all users to extract interests
        const users = await dbService.getAllUsers();
        console.log("All users for interests extraction:", users.length);
        const interestSet = new Set<string>();
        
        users.forEach(user => {
          user.interests?.forEach(interest => {
            if (interest) interestSet.add(interest);
          });
        });
        
        setAllInterests(Array.from(interestSet).sort());
      } catch (error) {
        console.error("Error fetching interests:", error);
      }
    };
    
    fetchAllInterests();
  }, []);
  
  // Fetch all users regardless of authentication state
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoading(true);
      
      try {
        // Get all users from Firebase
        const allUsers = await dbService.getAllUsers();
        console.log("Fetched all users:", allUsers);
        
        if (allUsers.length === 0) {
          console.log("No users found in Firebase database");
          setRecommendations([]);
          setFilteredUsers([]);
          setLoading(false);
          return;
        }
        
        // If no current user, just show all users
        if (!currentUser) {
          console.log("No current user, displaying all users");
          setRecommendations(allUsers);
          setFilteredUsers(allUsers);
          setLoading(false);
          return;
        }
        
        // With current user, filter out self and calculate common interests
        const otherUsers = allUsers.filter(user => user.uid !== currentUser.uid).map(user => {
          // Calculate common interests if any
          const commonInterests = user.interests?.filter(
            interest => currentUser.interests?.includes(interest)
          ) || [];
          
          return {
            ...user,
            commonInterests,
            commonInterestsCount: commonInterests.length
          };
        });
        
        console.log("Users to display (excluding current user):", otherUsers.length);
        
        // Sort users by commonInterestsCount (highest first)
        const sortedUsers = [...otherUsers].sort((a, b) => 
          (b.commonInterestsCount || 0) - (a.commonInterestsCount || 0)
        );
        
        setRecommendations(sortedUsers);
        
        // Apply interest filtering if selected
        let filteredUsers = sortedUsers;
        
        if (selectedInterests.length > 0) {
          console.log("Filtering by selected interests:", selectedInterests);
          filteredUsers = sortedUsers.filter(user => {
            // If user has any of the selected interests
            return user.interests?.some(interest => 
              selectedInterests.includes(interest)
            );
          });
          console.log("After filtering:", filteredUsers.length, "users remain");
        }
        
        setFilteredUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        // Still try to show something even if there's an error
        setRecommendations([]);
        setFilteredUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllUsers();
  }, [currentUser, selectedInterests]);
  
  // Filter recommendations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(recommendations);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = recommendations.filter(user => 
      user.displayName.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
  }, [searchQuery, recommendations]);
  
  const handleAddFriend = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      // Create a chat with this user (this establishes a connection)
      await dbService.createChat(currentUser.uid, userId);
      
      // Remove from recommendations after sending request
      setRecommendations(recommendations.filter(user => user.uid !== userId));
      setFilteredUsers(filteredUsers.filter(user => user.uid !== userId));
      
      // Show notification
      alert('Connection established! You can now chat with this user.');
    } catch (error) {
      console.error("Error connecting with user:", error);
      alert('Failed to connect with user. Please try again.');
    }
  };
  
  const toggleInterestFilter = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };
  
  // Rest of the component remains the same
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-10 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-4">Find Friends</h1>
          <p className="text-indigo-100 text-lg">
            Discover people who share your interests and connect with them
          </p>
          
          {/* Search bar */}
          <div className="mt-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full py-3 pl-12 pr-10 bg-white bg-opacity-90 text-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:bg-white"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button 
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      
        {/* Interests filter section */}
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="flex flex-wrap items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Filter by Interest</h2>
            {selectedInterests.length > 0 && (
              <button 
                onClick={() => setSelectedInterests([])}
                className="text-indigo-600 text-sm font-medium hover:text-indigo-500 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Clear all filters
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {allInterests.map(interest => (
              <button
                key={interest}
                onClick={() => toggleInterestFilter(interest)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedInterests.includes(interest)
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {selectedInterests.includes(interest) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {interest}
              </button>
            ))}
          </div>
        </div>
        
        {/* Results section */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">
              People You May Know
              {(selectedInterests.length > 0 || searchQuery) && ' (Filtered)'}
            </h2>
            <div className="flex items-center">
              {isFiltering && (
                <div className="flex items-center text-indigo-600 mr-4">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Filtering...
                </div>
              )}
              <div className="text-sm text-gray-500 font-medium">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'}
              </div>
            </div>
          </div>
          
          {!currentUser ? (
            <div className="text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-gray-500 text-lg mb-6">You need to be logged in to see friend recommendations.</p>
            </div>
          ) : loading && !isFiltering ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-lg mb-6">No users found matching your criteria.</p>
              {(selectedInterests.length > 0 || searchQuery) && (
                <div className="flex justify-center gap-4">
                  {selectedInterests.length > 0 && (
                    <button 
                      onClick={() => setSelectedInterests([])}
                      className="px-6 py-2 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-md"
                    >
                      Clear interest filters
                    </button>
                  )}
                  {searchQuery && (
                    <button 
                      onClick={handleClearSearch}
                      className="px-6 py-2 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-md"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map(user => (
                <div key={user.uid} className="border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`} 
                        alt={user.displayName} 
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-100"
                      />
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{user.displayName}</h3>
                        <div className="flex items-center text-indigo-600 font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                          {user.commonInterestsCount} shared {user.commonInterestsCount === 1 ? 'interest' : 'interests'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Common interests:</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.commonInterests?.map(interest => (
                          <span 
                            key={interest} 
                            className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button
                        onClick={() => handleAddFriend(user.uid)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindFriends;