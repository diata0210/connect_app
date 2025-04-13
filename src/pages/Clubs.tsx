import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dbService, { Club } from '../services/dbService';

const Clubs = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Fetch clubs from database
    const fetchClubs = async () => {
      try {
        const clubsData = await dbService.getAllClubs();
        setClubs(clubsData);
        setFilteredClubs(clubsData);
        
        // Extract unique categories
        const categoriesSet = new Set<string>();
        clubsData.forEach(club => {
          if (club.category) {
            categoriesSet.add(club.category);
          }
        });
        
        setCategories(Array.from(categoriesSet));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching clubs:', error);
        setLoading(false);
      }
    };

    // Fetch first user for demo purposes (in a real app, this would be from auth)
    const fetchUser = async () => {
      try {
        const users = await dbService.getAllUsers();
        if (users.length > 0) {
          setUser(users[0]);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchClubs();
    fetchUser();
  }, []);

  useEffect(() => {
    filterClubs();
  }, [selectedCategory, searchQuery, clubs]);

  const filterClubs = () => {
    let result = [...clubs];
    
    if (selectedCategory) {
      result = result.filter(club => club.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(club => 
        club.name.toLowerCase().includes(query) || 
        club.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredClubs(result);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Interest Clubs</h1>
          <Link 
            to="/clubs/create" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
          >
            Create New Club
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Clubs
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or description"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading clubs...</p>
          </div>
        ) : filteredClubs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <div key={club.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                    {club.category}
                  </span>
                  <span className="text-gray-500 text-sm">{club.memberCount} members</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{club.name}</h3>
                <p className="text-gray-600 mb-4">{club.description}</p>
                <Link 
                  to={`/clubs/${club.id}`} 
                  className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500 w-full text-center"
                >
                  View Club
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 mb-4">No clubs found matching your criteria.</p>
            <Link 
              to="/clubs/create" 
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-500"
            >
              Create a New Club
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clubs;