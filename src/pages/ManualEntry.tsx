import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { getMeals, saveMeal } from '../lib/storage';

export default function ManualEntry() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [servingSize, setServingSize] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [foodSuggestions, setFoodSuggestions] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const meals = await getMeals();
                const names = new Set<string>();
                for (const meal of meals) {
                    if (meal.name) {
                        names.add(meal.name);
                    }
                    for (const item of meal.items ?? []) {
                        if (item?.name) {
                            names.add(item.name);
                        }
                    }
                }
                setFoodSuggestions(Array.from(names).sort((a, b) => a.localeCompare(b)));
            } catch {
                setFoodSuggestions([]);
            }
        })();
    }, []);

    const quantityNumber = useMemo(() => {
        const q = Number.parseFloat(quantity);
        return Number.isFinite(q) && q > 0 ? q : 1;
    }, [quantity]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsSaving(true);
        try {
            const caloriesPerUnit = Number.parseInt(calories, 10) || 0;
            const proteinPerUnit = Number.parseInt(protein, 10) || 0;
            const carbsPerUnit = Number.parseInt(carbs, 10) || 0;
            const fatPerUnit = Number.parseInt(fat, 10) || 0;

            const totalCalories = Math.round(caloriesPerUnit * quantityNumber);
            const macroProtein = Math.round(proteinPerUnit * quantityNumber);
            const macroCarbs = Math.round(carbsPerUnit * quantityNumber);
            const macroFat = Math.round(fatPerUnit * quantityNumber);

            await saveMeal({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                name: name,
                image: undefined,
                items: [
                    {
                        name: name,
                        calories: totalCalories,
                        macros: {
                            protein: macroProtein,
                            carbs: macroCarbs,
                            fat: macroFat
                        },
                        servingSize: servingSize.trim() || undefined,
                        quantity: quantityNumber,
                    }
                ],
                totalCalories: totalCalories,
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
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6">Manual Entry</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Food Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                        placeholder="e.g. Chicken Rice"
                        list="foodSuggestions"
                    />
                    <datalist id="foodSuggestions">
                        {foodSuggestions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Serving Size</label>
                        <input
                            type="text"
                            value={servingSize}
                            onChange={(e) => setServingSize(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder="e.g. 1 bowl"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input
                            type="number"
                            min={0}
                            step="0.25"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder="1"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Calories (kcal)</label>
                    <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                        placeholder="Optional"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Carbs (g)</label>
                        <input
                            type="number"
                            value={carbs}
                            onChange={(e) => setCarbs(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Protein (g)</label>
                        <input
                            type="number"
                            value={protein}
                            onChange={(e) => setProtein(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Fat (g)</label>
                        <input
                            type="number"
                            value={fat}
                            onChange={(e) => setFat(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                            placeholder="0"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                >
                    <Save size={20} />
                    {isSaving ? 'Saving...' : 'Save Record'}
                </button>
            </form>
        </div>
    );
}
