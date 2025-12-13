import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import { useApp } from './context/useApp';
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
      <Route path="/capture" element={user ? <Capture /> : <Navigate to="/onboarding" replace />} />
      <Route path="/manual-entry" element={user ? <ManualEntry /> : <Navigate to="/onboarding" replace />} />
      <Route path="/history" element={user ? <History /> : <Navigate to="/onboarding" replace />} />
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
