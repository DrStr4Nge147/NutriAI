import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getProfile, saveProfile, initDB } from '../lib/storage';

interface AppState {
    user: any | null;
    isLoading: boolean;
    setUser: (user: any) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initDB().then(async () => {
            const profile = await getProfile('default');
            if (profile) {
                setUser(profile);
            }
            setIsLoading(false);
        });
    }, []);

    const handleSetUser = async (newUser: any) => {
        setUser(newUser);
        await saveProfile(newUser);
    };

    return (
        <AppContext.Provider value={{ user, isLoading, setUser: handleSetUser }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
