import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Clubs from './pages/Clubs';
import CreateClub from './pages/CreateClub';
import ViewClub from './pages/ViewClub';
import RandomMatch from './pages/RandomMatch';
import FindFriends from './pages/FindFriends';
import Chat from './components/chat/Chat';
import ChatList from './components/chat/ChatList';
import Games from './pages/Games.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/create" element={<CreateClub />} />
            <Route path="/clubs/:clubId" element={<ViewClub />} />
            <Route path="/random-match" element={<RandomMatch />} />
            <Route path="/find-friends" element={<FindFriends />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/games" element={<Games />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
