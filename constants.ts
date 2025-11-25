import { DeveloperRecord, UserRole, AdminUser } from './types';

export const CURRENT_USER_ROLE = UserRole.SUPER_ADMIN;

// No mock data for developers. The app relies on CSV upload.
export const GENERATE_MOCK_DEVELOPERS = (): DeveloperRecord[] => [];

export const MOCK_ADMIN_TEAM: AdminUser[] = [
    {
        id: 'admin_1',
        name: 'Alice Director',
        email: 'alice@hedera.com',
        role: UserRole.SUPER_ADMIN,
        assignedCodes: [], // All
        lastLogin: new Date().toISOString(),
        status: 'Active'
    }
];