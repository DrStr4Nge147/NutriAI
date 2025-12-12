import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Home</h1>
            <div className="grid grid-cols-1 gap-4">
                <Link to="/capture" className="bg-blue-500 text-white p-4 rounded text-center">
                    Take Photo / Upload
                </Link>
                <Link to="/manual-entry" className="bg-green-500 text-white p-4 rounded text-center">
                    Manual Entry
                </Link>
                <Link to="/history" className="bg-gray-500 text-white p-4 rounded text-center">
                    History
                </Link>
            </div>
        </div>
    );
}
