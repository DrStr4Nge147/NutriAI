import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Onboarding() {
    const { setUser } = useApp();
    const navigate = useNavigate();

    const handleComplete = () => {
        setUser({ id: 'default', name: 'User' }); // Minimal profile
        navigate('/');
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Welcome</h1>
            <p className="mb-4">Let's set up your profile.</p>
            <button onClick={handleComplete} className="bg-blue-500 text-white p-2 rounded">
                Get Started
            </button>
        </div>
    );
}
