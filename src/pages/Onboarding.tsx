import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { createDefaultProfile } from '../lib/storage';

export default function Onboarding() {
    const { setUser } = useApp();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    const [name, setName] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState<'male' | 'female' | 'other'>('other');
    const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('moderate');
    const [medicalConditions, setMedicalConditions] = useState('');

    const handleComplete = async () => {
        const parsedHeight = height ? Number.parseInt(height, 10) : undefined;
        const parsedWeight = weight ? Number.parseFloat(weight) : undefined;
        const parsedAge = age ? Number.parseInt(age, 10) : undefined;

        const conditions = medicalConditions
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        const profile = createDefaultProfile({
            id: 'default',
            name: name.trim() || undefined,
            height: Number.isFinite(parsedHeight) ? parsedHeight : undefined,
            weight: Number.isFinite(parsedWeight) ? parsedWeight : undefined,
            age: Number.isFinite(parsedAge) ? parsedAge : undefined,
            sex,
            activityLevel,
            medicalConditions: conditions,
        });

        await setUser(profile);
        navigate('/');
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            {step === 0 && (
                <div>
                    <h1 className="text-2xl font-bold mb-4">Welcome</h1>
                    <p className="mb-6">Let's set up your profile. You can skip any step and use defaults.</p>
                    <button
                        onClick={() => setStep(1)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg"
                    >
                        Get Started
                    </button>
                </div>
            )}

            {step === 1 && (
                <div>
                    <h1 className="text-2xl font-bold mb-4">Body Details</h1>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name (optional)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                placeholder="e.g. Nick"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                    placeholder="170"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                    placeholder="70"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Age</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                    placeholder="30"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Sex</label>
                                <select
                                    value={sex}
                                    onChange={(e) => setSex(e.target.value as 'male' | 'female' | 'other')}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Activity</label>
                                <select
                                    value={activityLevel}
                                    onChange={(e) => setActivityLevel(e.target.value as typeof activityLevel)}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                >
                                    <option value="sedentary">Sedentary</option>
                                    <option value="light">Light</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="active">Active</option>
                                    <option value="very_active">Very active</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg"
                        >
                            Continue
                        </button>
                        <button
                            onClick={() => {
                                setName('');
                                setHeight('');
                                setWeight('');
                                setAge('');
                                setSex('other');
                                setActivityLevel('moderate');
                                setStep(2);
                            }}
                            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold py-3 px-4 rounded-lg"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h1 className="text-2xl font-bold mb-4">Health Screening</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Add any diagnosed conditions (comma-separated). Example: diabetes, hypertension
                    </p>

                    <textarea
                        value={medicalConditions}
                        onChange={(e) => setMedicalConditions(e.target.value)}
                        className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                        rows={4}
                        placeholder="Optional"
                    />

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg"
                        >
                            Continue
                        </button>
                        <button
                            onClick={() => {
                                setMedicalConditions('');
                                setStep(3);
                            }}
                            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold py-3 px-4 rounded-lg"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h1 className="text-2xl font-bold mb-4">Privacy & Storage</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                        Your data is stored locally on your device (IndexedDB/LocalStorage) and is not uploaded by default.
                    </p>

                    <button
                        onClick={handleComplete}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg"
                    >
                        Finish
                    </button>

                    <button
                        onClick={() => setStep(2)}
                        className="w-full mt-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold py-3 px-4 rounded-lg"
                    >
                        Back
                    </button>
                </div>
            )}
        </div>
    );
}
