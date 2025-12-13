import { createContext } from 'react';
import type { UserProfile } from '../lib/storage';

export interface AppState {
    user: UserProfile | null;
    isLoading: boolean;
    setUser: (user: UserProfile) => Promise<void>;
}

export const AppContext = createContext<AppState | undefined>(undefined);
