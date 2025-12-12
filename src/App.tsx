import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Capture from './pages/Capture';
import ManualEntry from './pages/ManualEntry';
import History from './pages/History';

function AppRoutes() {
  const { user, isLoading } = useApp();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={user ? <Home /> : <Navigate to="/onboarding" replace />} />
      <Route path="/capture" element={<Capture />} />
      <Route path="/manual-entry" element={<ManualEntry />} />
      <Route path="/history" element={<History />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

export default App;
