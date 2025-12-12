import { openDB } from 'idb';
import type { DBSchema } from 'idb';

interface UserProfile {
    id: string; // 'default' or uuid
    name: string;
    height: number;
    weight: number;
    age: number;
    sex: 'male' | 'female' | 'other';
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    dietaryGoals: string[];
    medicalConditions: string[];
}

interface Meal {
    id: string;
    date: string; // ISO string
    image?: Blob; // Stored directly or separate store? IDB can store Blobs.
    name: string;
    items: { name: string; calories: number; macros: { protein: number; carbs: number; fat: number } }[];
    totalCalories: number;
}

interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    useOnlineAI: boolean;
}

interface NutritionDB extends DBSchema {
    users: {
        key: string;
        value: UserProfile;
    };
    meals: {
        key: string;
        value: Meal;
        indexes: { 'by-date': string };
    };
    settings: {
        key: string;
        value: AppSettings;
    };
}

const DB_NAME = 'ai-nutritionist-db';
const DB_VERSION = 1;

export async function initDB() {
    const db = await openDB<NutritionDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('meals')) {
                const mealStore = db.createObjectStore('meals', { keyPath: 'id' });
                mealStore.createIndex('by-date', 'date');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'theme' });
            }
        },
    });
    return db;
}

export const dbPromise = initDB();

export async function saveProfile(profile: UserProfile) {
    const db = await dbPromise;
    await db.put('users', profile);
}

export async function getProfile(id: string = 'default') {
    const db = await dbPromise;
    return db.get('users', id);
}

export async function saveMeal(meal: Meal) {
    const db = await dbPromise;
    await db.put('meals', meal);
}

export async function getMeals() {
    const db = await dbPromise;
    return db.getAll('meals');
}
