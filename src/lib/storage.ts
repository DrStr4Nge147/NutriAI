import { openDB } from 'idb';
import type { DBSchema } from 'idb';

export interface UserProfile {
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

export interface FoodItem {
    name: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
    servingSize?: string;
    quantity?: number;
}

export interface Meal {
    id: string;
    date: string; // ISO string
    image?: Blob; // Stored directly or separate store? IDB can store Blobs.
    name: string;
    items: FoodItem[];
    totalCalories: number;
}

export interface AppSettings {
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

export async function getAllData() {
    const db = await dbPromise;
    const users = await db.getAll('users');
    const meals = await db.getAll('meals');
    const settings = await db.getAll('settings');
    return { users, meals, settings };
}

export async function restoreData(data: { users: UserProfile[], meals: Meal[], settings: AppSettings[] }) {
    const db = await dbPromise;
    const tx = db.transaction(['users', 'meals', 'settings'], 'readwrite');

    await Promise.all([
        ...data.users.map(u => tx.objectStore('users').put(u)),
        ...data.meals.map(m => tx.objectStore('meals').put(m)),
        ...data.settings.map(s => tx.objectStore('settings').put(s)),
        tx.done
    ]);
}

const ACTIVE_PROFILE_ID_KEY = 'ai-nutritionist.activeProfileId';

export function getActiveProfileId() {
    const id = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
    return id ?? 'default';
}

export function setActiveProfileId(id: string) {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
}

export function createDefaultProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        id: overrides.id ?? 'default',
        name: overrides.name ?? 'User',
        height: overrides.height ?? 170,
        weight: overrides.weight ?? 70,
        age: overrides.age ?? 30,
        sex: overrides.sex ?? 'other',
        activityLevel: overrides.activityLevel ?? 'moderate',
        dietaryGoals: overrides.dietaryGoals ?? [],
        medicalConditions: overrides.medicalConditions ?? [],
    };
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(header ?? '');
    const mime = mimeMatch?.[1] ?? 'application/octet-stream';
    const binary = atob(base64 ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export async function exportAppData() {
    const data = await getAllData();
    const meals = await Promise.all(
        data.meals.map(async (meal) => {
            const { image, ...rest } = meal;
            return {
                ...rest,
                imageDataUrl: image ? await blobToDataUrl(image) : undefined,
            };
        })
    );

    return {
        users: data.users,
        meals,
        settings: data.settings,
    };
}

export async function importAppData(raw: unknown) {
    if (!isRecord(raw)) {
        throw new Error('Invalid import file.');
    }

    const users = Array.isArray(raw.users) ? (raw.users as UserProfile[]) : [];
    const settings = Array.isArray(raw.settings) ? (raw.settings as AppSettings[]) : [];
    const mealsRaw = Array.isArray(raw.meals) ? (raw.meals as Array<Record<string, unknown>>) : [];

    const meals: Meal[] = mealsRaw
        .filter((m) => typeof m.id === 'string' && typeof m.date === 'string' && typeof m.name === 'string')
        .map((m) => {
            const imageDataUrl = typeof m.imageDataUrl === 'string' ? m.imageDataUrl : undefined;
            const image = imageDataUrl ? dataUrlToBlob(imageDataUrl) : undefined;
            return {
                id: m.id as string,
                date: m.date as string,
                name: m.name as string,
                image,
                items: Array.isArray(m.items) ? (m.items as Meal['items']) : [],
                totalCalories: typeof m.totalCalories === 'number' ? m.totalCalories : 0,
            };
        });

    await restoreData({ users, meals, settings });
}
