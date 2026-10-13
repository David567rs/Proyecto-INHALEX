import { createContext } from 'react';
import type { ProfileViewModel } from '../viewModels/ProfileController';

export const ProfileContext = createContext<ProfileViewModel | null>(null);
