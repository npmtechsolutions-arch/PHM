import { useCallback } from 'react';

export interface ApiError {
    response?: {
        data?: {
            detail?: string | Array<{ loc: string[]; msg: string; type: string }>;
            message?: string;
        };
        status?: number;
    };
    message?: string;
    code?: string;
}

/**
 * Unified error handler hook
 * Provides consistent error handling across the application
 */
export function useErrorHandler() {
    const extractErrorMessage = useCallback((error: ApiError): string => {
        // Handle network errors
        if (!error.response) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                return 'Request timed out. Please check your connection and try again.';
            }
            return 'Network error. Please check your connection.';
        }

        const detail = error.response.data?.detail;

        // Handle Pydantic validation errors (array format)
        if (Array.isArray(detail)) {
            return detail
                .map((err) => {
                    const field = err.loc?.slice(1).join('.') || 'Unknown field';
                    return `${field}: ${err.msg}`;
                })
                .join(', ');
        }

        // Handle string error messages
        if (typeof detail === 'string') {
            return detail;
        }

        // Handle object error messages
        if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
            const errorObj = detail as Record<string, unknown>;
            return (typeof errorObj.msg === 'string' ? errorObj.msg : JSON.stringify(detail));
        }

        // Handle message field
        if (error.response.data?.message) {
            return error.response.data.message;
        }

        // Fallback to HTTP status messages
        const status = error.response.status;
        if (status === 401) return 'Unauthorized. Please login again.';
        if (status === 403) return 'You do not have permission to perform this action.';
        if (status === 404) return 'Resource not found.';
        if (status === 409) return 'Conflict. This resource already exists.';
        if (status === 422) return 'Validation error. Please check your input.';
        if (status === 500) return 'Server error. Please try again later.';
        if (status && status >= 500) return 'Server error. Please try again later.';

        return error.message || 'An unexpected error occurred.';
    }, []);

    const handleError = useCallback(
        (error: ApiError, customMessage?: string): string => {
            const message = customMessage || extractErrorMessage(error);
            
            // Log error for debugging
            console.error('API Error:', {
                message,
                status: error.response?.status,
                data: error.response?.data,
                originalError: error,
            });

            // Show toast notification
            if (window.toast) {
                window.toast.error(message);
            } else {
                // Fallback to alert if toast is not available
                alert(message);
            }

            return message;
        },
        [extractErrorMessage]
    );

    const handleSuccess = useCallback((message: string) => {
        if (window.toast) {
            window.toast.success(message);
        }
    }, []);

    return {
        handleError,
        handleSuccess,
        extractErrorMessage,
    };
}
