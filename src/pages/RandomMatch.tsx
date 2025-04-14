import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dbService from '../services/dbService';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface User {
  uid: string;
  displayName: string;
  email: string;
  interests: string[];
  photoURL?: string;
  commonInterests?: string[];
  gender?: string;
  location?: string;
  age?: number;
}

interface MatchOptions {
  byInterests: boolean;
  byLocation: boolean;
  byGender: boolean;
  preferredGender: string;
  maxDistance: number;
  location: string;
  anonymous: boolean;
}

const RandomMatch = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [commonInterests, setCommonInterests] = useState<string[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [revealIdentity, setRevealIdentity] = useState(false);
  const [matchOptions, setMatchOptions] = useState<MatchOptions>({
    byInterests: true,
    byLocation: false,
    byGender: false,
    preferredGender: 'any',
    maxDistance: 50,
    location: 'Hanoi',
    anonymous: false
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [matchInProgress, setMatchInProgress] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch current user and all users from Firebase
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoading(true);
        
        // Listen to authentication state
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Get current user details from Firestore
            const userData = await dbService.getUser(user.uid);
            if (userData) {
              setCurrentUser({
                uid: userData.uid,
                displayName: userData.displayName,
                email: userData.email,
                interests: userData.interests || [],
                photoURL: userData.photoURL,
                gender: 'not specified', // These fields can be updated if you add them to your user profile
                location: 'not specified',
                age: 0
              });
            }
            
            // Get all users for potential matches
            const users = await dbService.getAllUsers();
            // Filter out current user
            const filteredUsers = users.filter(u => u.uid !== user.uid);
            setAllUsers(filteredUsers.map(u => ({
              ...u,
              gender: 'not specified', // Adding default values
              location: 'not specified',
              age: 0,
              interests: u.interests || [] // Ensure interests is always defined as array
            })));
            
            setIsLoading(false);
          } else {
            // Not logged in, redirect to login
            navigate('/login');
          }
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching user data:", error);
        setIsLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, [navigate]);

  const findMatch = async (anonymous: boolean) => {
    if (!currentUser || !currentUser.interests || currentUser.interests.length === 0) {
      alert('Please update your profile with some interests first!');
      return;
    }

    setIsMatching(true);
    setMatchedUser(null);
    setCommonInterests([]);
    setIsAnonymous(anonymous);
    setRevealIdentity(false);
    setMatchInProgress(true);

    // Use the matchOptions when finding a match
    const options = {
      ...matchOptions,
      anonymous
    };

    // Simulate API delay
    setTimeout(() => {
      // Check if we have any users to work with
      if (allUsers.length === 0) {
        setIsMatching(false);
        setMatchInProgress(false);
        alert('No other users found in the system. Invite some friends to join!');
        return;
      }

      console.log("Finding match among", allUsers.length, "users");
      
      // Get all users who match our criteria
      const potentialMatches: User[] = [];
      
      // Enhanced filtering based on selected criteria
      allUsers.forEach((userData) => {
        // Skip if user has no interests array at all (shouldn't happen but for safety)
        if (!userData.interests) return;
        
        // Calculate common interests regardless of filters
        const common = currentUser.interests.filter(interest => 
          userData.interests && userData.interests.includes(interest)
        );
        
        // Apply filters if selected
        let passesFilters = true;
        
        // Filter by gender if enabled
        if (options.byGender && options.preferredGender !== 'any') {
          const userGender = userData.gender || 'not specified';
          if (options.preferredGender !== userGender) {
            passesFilters = false;
          }
        }
        
        // Filter by location if enabled
        if (passesFilters && options.byLocation) {
          const userLocation = userData.location || 'not specified';
          if (options.location !== userLocation && options.maxDistance < 100) {
            passesFilters = false;
          }
        }
        
        // Filter by interests if enabled
        if (passesFilters && options.byInterests && common.length === 0) {
          passesFilters = false;
        }
        
        // User passed all filters, add them to potential matches
        if (passesFilters) {
          potentialMatches.push({
            ...userData,
            commonInterests: common
          });
        }
      });
      
      setMatchInProgress(false);
      
      if (potentialMatches.length === 0) {
        // If no matches found with current filters, find a match without any filters
        console.log("No matches with filters, finding any match");
        
        // Choose a random user from all users
        const randomIndex = Math.floor(Math.random() * allUsers.length);
        const randomUser = allUsers[randomIndex];
        const common = currentUser.interests.filter(interest => 
          randomUser.interests && randomUser.interests.includes(interest)
        );
        
        setMatchedUser({
          ...randomUser,
          commonInterests: common
        });
        setCommonInterests(common || []);
        
        // Show a message indicating filters were relaxed
        alert('No matches found with your criteria. We found someone else you might like to chat with!');
      } else {
        // Randomly select a match from filtered users
        const randomIndex = Math.floor(Math.random() * potentialMatches.length);
        const match = potentialMatches[randomIndex];
        
        setMatchedUser(match);
        setCommonInterests(match.commonInterests || []);
      }
    }, 1000);
  };

  const handleOptionChange = (option: keyof MatchOptions, value: any) => {
    setMatchOptions({
      ...matchOptions,
      [option]: value
    });
  };

  const startChat = async () => {
    if (!currentUser || !matchedUser) return;
    
    try {
      // First create the chat record in the database
      const chatId = await dbService.createChat(
        currentUser.uid, 
        matchedUser.uid,
        isAnonymous // Pass the anonymous flag to create proper anonymous chat
      );
      
      // Then navigate to the chat
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };

  const findNewMatch = () => {
    setMatchedUser(null);
    setCommonInterests([]);
    setIsMatching(false);
    setRevealIdentity(false);
  };

  const handleRevealIdentity = () => {
    setRevealIdentity(true);
  };

  // Generate anonymous ID for completely anonymous users
  const generateAnonymousId = () => {
    const randomNum = Math.floor(Math.random() * 10000);
    return `Anonymous User ${randomNum}`;
  };

  // Show loading state when initializing data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
        <p className="mt-4 text-lg text-gray-600">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-10 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-4">Random Matching</h1>
          <p className="text-indigo-100 text-lg">
            Connect with others based on your preferences and discover new friends
          </p>
        </div>
        
        {!currentUser ? (
          <div className="text-center py-10 bg-white rounded-xl shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        ) : !isMatching ? (
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Connect with others</h2>
            
            <div className="mb-8">
              <button 
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className={`flex items-center text-indigo-600 text-sm font-medium mb-4 transition-colors ${showAdvancedOptions ? 'text-purple-600' : 'text-indigo-600'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 transition-transform duration-300 ${showAdvancedOptions ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Matching Options
              </button>
              
              {showAdvancedOptions && (
                <div className="bg-indigo-50 rounded-xl p-6 mb-8 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <div className={`relative w-10 h-5 transition-colors duration-200 ease-linear rounded-full ${matchOptions.byInterests ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={matchOptions.byInterests}
                              onChange={(e) => handleOptionChange('byInterests', e.target.checked)}
                            />
                            <span className={`absolute left-0.5 top-0.5 w-4 h-4 transition-transform duration-200 ease-linear transform bg-white rounded-full ${matchOptions.byInterests ? 'translate-x-5' : ''}`}></span>
                          </div>
                          <span className="text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Match by interests</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-12 mt-1">Find people who share your interests</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <div className={`relative w-10 h-5 transition-colors duration-200 ease-linear rounded-full ${matchOptions.byLocation ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={matchOptions.byLocation}
                              onChange={(e) => handleOptionChange('byLocation', e.target.checked)}
                            />
                            <span className={`absolute left-0.5 top-0.5 w-4 h-4 transition-transform duration-200 ease-linear transform bg-white rounded-full ${matchOptions.byLocation ? 'translate-x-5' : ''}`}></span>
                          </div>
                          <span className="text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Match by location</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-12 mt-1">Find people near you</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <div className={`relative w-10 h-5 transition-colors duration-200 ease-linear rounded-full ${matchOptions.byGender ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={matchOptions.byGender}
                              onChange={(e) => handleOptionChange('byGender', e.target.checked)}
                            />
                            <span className={`absolute left-0.5 top-0.5 w-4 h-4 transition-transform duration-200 ease-linear transform bg-white rounded-full ${matchOptions.byGender ? 'translate-x-5' : ''}`}></span>
                          </div>
                          <span className="text-gray-700 font-medium group-hover:text-indigo-600 transition-colors">Match by gender</span>
                        </label>
                        <p className="text-xs text-gray-500 ml-12 mt-1">Find people of specific gender</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {matchOptions.byLocation && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Your Location
                            </label>
                            <select
                              value={matchOptions.location}
                              onChange={(e) => handleOptionChange('location', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="Hanoi">Hanoi</option>
                              <option value="Ho Chi Minh City">Ho Chi Minh City</option>
                              <option value="Da Nang">Da Nang</option>
                              <option value="Hai Phong">Hai Phong</option>
                              <option value="Can Tho">Can Tho</option>
                            </select>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center">
                              <label className="block text-sm font-medium text-gray-700">
                                Maximum Distance
                              </label>
                              <span className="text-sm text-indigo-600 font-medium">{matchOptions.maxDistance} km</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="500"
                              step="5"
                              value={matchOptions.maxDistance}
                              onChange={(e) => handleOptionChange('maxDistance', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>5 km</span>
                              <span>500 km</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {matchOptions.byGender && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Gender
                          </label>
                          <select
                            value={matchOptions.preferredGender}
                            onChange={(e) => handleOptionChange('preferredGender', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="any">Any</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="non-binary">Non-binary</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center text-indigo-600 mb-4">
                  <span className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-bold text-gray-800">Regular Match</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Match based on your selected criteria. Your name and details will be visible to your match.
                </p>
                <button
                  onClick={() => findMatch(false)}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Find a Match
                </button>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-center text-purple-600 mb-4">
                  <span className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-bold text-gray-800">Anonymous Match</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Connect anonymously based on your criteria. Your identity will remain hidden until you choose to reveal it.
                </p>
                <button
                  onClick={() => findMatch(true)}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium shadow-md hover:from-purple-700 hover:to-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Anonymous Match
                </button>
              </div>
            </div>
          </div>
        ) : matchedUser ? (
          <div className="bg-white rounded-xl shadow-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100 rounded-full -mr-20 -mt-20 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-100 rounded-full -ml-20 -mb-20 opacity-50"></div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center relative">You've been matched!</h2>
            
            <div className="flex flex-col items-center mb-8 relative">
              <div className="w-32 h-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                {(!isAnonymous || revealIdentity) && matchedUser.photoURL ? (
                  <img 
                    src={matchedUser.photoURL} 
                    alt={matchedUser.displayName} 
                    className="w-28 h-28 rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-1">
                {isAnonymous && !revealIdentity 
                  ? generateAnonymousId()
                  : matchedUser.displayName}
              </h3>
              
              {(!isAnonymous || revealIdentity) && (
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  <span className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {matchedUser.age} years
                  </span>
                  <span className="inline-flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      {matchedUser.gender === 'male' ? (
                        <path fillRule="evenodd" d="M9 4a4 4 0 100 8 4 4 0 000-8zM4 9a5 5 0 1110 0A5 5 0 014 9zm10 4a1 1 0 00-1-1h-1v-1a1 1 0 00-2 0v1H9a1 1 0 000 2h1v1a1 1 0 102 0v-1h1a1 1 0 001-1z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M9 4a4 4 0 100 8 4 4 0 000-8zM4 9a5 5 0 1110 0A5 5 0 014 9zm4 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                      )}
                    </svg>
                    {matchedUser.gender}
                  </span>
                  <span className="inline-flex items-center bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {matchedUser.location}
                  </span>
                </div>
              )}
            </div>
            
            {(!isAnonymous || revealIdentity) && commonInterests.length > 0 && (
              <div className="bg-indigo-50 p-6 rounded-lg mb-8">
                <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Common Interests
                </h4>
                <div className="flex flex-wrap gap-2">
                  {commonInterests.map((interest) => (
                    <span 
                      key={interest} 
                      className="bg-white text-indigo-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {isAnonymous && !revealIdentity && (
              <div className="bg-purple-50 p-6 rounded-lg mb-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-purple-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-purple-800 mb-1 font-medium">Anonymous Match</p>
                <p className="text-gray-600">
                  This is a completely anonymous match. To see their profile and interests, you need to reveal your identity first.
                </p>
              </div>
            )}
            
            <div className="flex flex-wrap justify-center gap-3 relative">
              {isAnonymous && !revealIdentity ? (
                <>
                  <button
                    onClick={handleRevealIdentity}
                    className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium shadow-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Reveal My Identity
                  </button>
                  <button
                    onClick={startChat}
                    className="px-6 py-3 rounded-lg bg-purple-600 text-white font-medium shadow-md hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    Chat Anonymously
                  </button>
                  <button
                    onClick={findNewMatch}
                    className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Find Another Match
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={startChat}
                    className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium shadow-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    Start Chat
                  </button>
                  <button
                    onClick={findNewMatch}
                    className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Find Another Match
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="relative mx-auto w-32 h-32 mb-6">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-25"></div>
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">Finding your perfect match...</h3>
            <p className="text-gray-600 mb-8">This might take a moment. We're searching for someone who matches your criteria.</p>
            
            <div className="flex justify-center items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-4 h-4 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-4 h-4 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            {matchInProgress && (
              <div className="mt-8">
                <button
                  onClick={() => {
                    setIsMatching(false);
                    setMatchInProgress(false);
                  }}
                  className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors focus:outline-none"
                >
                  Cancel Search
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RandomMatch;