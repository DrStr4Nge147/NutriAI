import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getActiveProfileId, getProfile, saveProfile, setActiveProfileId } from '../lib/storage';
import type { UserProfile } from '../lib/storage';
import { AppContext } from './appContext';

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const profileId = getActiveProfileId();
            const profile = await getProfile(profileId);
            if (profile) {
                setUser(profile);
            }
            setIsLoading(false);
        })();
    }, []);

    const handleSetUser = async (newUser: UserProfile) => {
        setUser(newUser);
        await saveProfile(newUser);
        setActiveProfileId(newUser.id);
    };

    return (
        <AppContext.Provider value={{ user, isLoading, setUser: handleSetUser }}>
            {children}
        </AppContext.Provider>
    );
}
