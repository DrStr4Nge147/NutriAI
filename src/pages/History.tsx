import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { exportAppData, getMeals, importAppData } from '../lib/storage';
import type { Meal } from '../lib/storage';
import { Download, Upload } from 'lucide-react';

export default function History() {
    const [meals, setMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');

    const loadMeals = async () => {
        setLoading(true);
        const data = await getMeals();
        // Sort by date desc
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMeals(data);
        setLoading(false);
    };

    useEffect(() => {
        const t = window.setTimeout(() => {
            void loadMeals();
        }, 0);
        return () => window.clearTimeout(t);
    }, []);

    const filteredMeals = meals.filter((meal) => {
        if (!filterDate) return true;
        const d = new Date(meal.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const localDate = `${yyyy}-${mm}-${dd}`;
        return localDate === filterDate;
    });

    const handleExport = async () => {
        const data = await exportAppData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nutrition-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    if (confirm('This will overwrite existing data with the same IDs. Continue?')) {
                        await importAppData(json);
                        alert('Import successful!');
                        loadMeals();
                    }
                } catch (err) {
                    console.error(err);
                    alert('Failed to parse or import data.');
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">History</h1>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="px-2 py-1 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                        title="Filter by date"
                    />
                    <label className="cursor-pointer p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600" title="Import Data">
                        <Upload size={20} />
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                    <button onClick={handleExport} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600" title="Export Data">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : filteredMeals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No meals recorded yet.</p>
            ) : (
                <div className="space-y-4">
                    {filteredMeals.map((meal) => (
                        <div key={meal.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex gap-4">
                            {meal.image && (
                                <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                    <img
                                        src={URL.createObjectURL(meal.image)}
                                        alt={meal.name}
                                        className="w-full h-full object-cover"
                                        onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                    />
                                </div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{meal.name}</h3>
                                <p className="text-sm text-gray-500">{new Date(meal.date).toLocaleString()}</p>
                                <p className="text-sm font-medium mt-1">
                                    {meal.totalCalories} kcal
                                </p>
                                <div className="text-xs text-gray-400 mt-1">
                                    {meal.items.flatMap(i => i.macros ?
                                        Object.entries(i.macros).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}g`).join(' • ')
                                        : []
                                    ).join(' | ')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
