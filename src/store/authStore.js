import {create} from 'zustand';
import {persist} from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set) => ({
            user : null,
            isAuthenticated: false,

            setUser: (user) => set({user, isAuthenticated:true}),
            logout: () => set({user:null, isAuthenticated: false}),

            updateUser: (userData) => set((state) => ({
                user: {...state.user, ...userData}
            })),
        }),
        {
            name: 'auth-storage',
        }
    )
);

export default useAuthStore;