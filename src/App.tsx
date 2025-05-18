import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RandomMatch from './pages/RandomMatch';
import Chat from './components/chat/Chat';
import ChatList from './components/chat/ChatList';
import Games from './pages/Games.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1 pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/random-match" element={<RandomMatch />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            
            {/* Game Routes */}
            <Route path="/games" element={<Games />} /> {/* Lobby */}
            <Route path="/games/session/:sessionId" element={<Games />} /> {/* Active game session */}
            <Route path="/games/:gameType" element={<Games />} /> {/* Specific game type page e.g. /games/truth-or-lie */}
            
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
