import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

export default function SessionExpiredModal() {
    const navigate = useNavigate();
    const { logout } = useUser();

    useEffect(() => {
        const handleSessionExpired = () => {
            // Auto-redirect to login page when session expires
            console.log('Session expired - redirecting to login');

            // Clear all auth data
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Logout user from context
            logout();

            // Redirect to login page
            navigate('/login', { replace: true });
        };

        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, [navigate, logout]);

    // No UI to render - just handles the event
    return null;
}
