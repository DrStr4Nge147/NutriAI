import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save } from 'lucide-react';
import { saveMeal } from '../lib/storage';
import { resizeImageToMaxDimension } from '../lib/image';

export default function Capture() {
    const navigate = useNavigate();
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!image) return;

        setIsSaving(true);
        try {
            const resized = await resizeImageToMaxDimension(image, 1024, 0.85);
            await saveMeal({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                name: 'Captured Meal ' + new Date().toLocaleTimeString(),
                image: resized,
                items: [],
                totalCalories: 0,
            });
            navigate('/history');
        } catch (error) {
            console.error('Failed to save meal', error);
            alert('Failed to save meal.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-4">Capture Meal</h1>

            <div className="w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-lg h-64 flex items-center justify-center mb-4 overflow-hidden relative">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-500">
                        <Camera size={48} className="mx-auto mb-2" />
                        <p>No image selected</p>
                    </div>
                )}
            </div>

            <input
                type="file"
                accept="image/*"
                capture="environment"
                id="cameraInput"
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="flex gap-4 w-full max-w-md">
                <label
                    htmlFor="cameraInput"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-center cursor-pointer flex items-center justify-center gap-2"
                >
                    <Camera size={20} />
                    {preview ? 'Retake Photo' : 'Take Photo'}
                </label>

                {preview && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={20} />
                        {isSaving ? 'Saving...' : 'Save Meal'}
                    </button>
                )}
            </div>
        </div>
    );
}
