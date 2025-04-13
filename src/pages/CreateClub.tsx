import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dbService from '../services/dbService';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const CreateClub = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  // Get current user and suggested categories
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch user data from Firestore
        try {
          const userData = await dbService.getUser(firebaseUser.uid);
          setCurrentUser(userData);
        } catch (error) {
          console.error('Error fetching current user:', error);
        }
      } else {
        // User is not signed in, redirect to login
        navigate('/login');
      }
    });

    // Get all existing club categories for suggestions
    const fetchCategories = async () => {
      try {
        const clubs = await dbService.getAllClubs();
        const categoriesSet = new Set<string>();
        clubs.forEach(club => {
          if (club.category) {
            categoriesSet.add(club.category);
          }
        });
        
        setSuggestedCategories(Array.from(categoriesSet));
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!name.trim()) {
      setError('Club name is required');
      return;
    }
    
    if (!description.trim()) {
      setError('Club description is required');
      return;
    }
    
    if (!category.trim()) {
      setError('Club category is required');
      return;
    }
    
    if (!currentUser) {
      setError('You must be logged in to create a club');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Create the club in Firebase
      const newClub = await dbService.createClub(
        name, 
        description, 
        category, 
        currentUser.uid
      );
      
      setLoading(false);
      navigate(`/clubs`);
    } catch (err: any) {
      setError(err.message || 'Failed to create club. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Club</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Club Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  list="categories"
                />
                <datalist id="categories">
                  {suggestedCategories.map((cat, index) => (
                    <option key={index} value={cat} />
                  ))}
                </datalist>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Choose from existing categories or create a new one
              </p>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              ></textarea>
            </div>
            
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/clubs')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Club'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateClub;