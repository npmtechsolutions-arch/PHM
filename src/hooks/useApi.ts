import { useState, useCallback } from 'react';
import { useErrorHandler, ApiError } from './useErrorHandler';

/**
 * Generic API hook for common CRUD operations
 * Provides loading, error states and standardized handlers
 */
export function useApi<T = unknown>() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { handleError, handleSuccess } = useErrorHandler();

    const execute = useCallback(
        async <R = T>(
            apiCall: () => Promise<R>,
            options?: {
                successMessage?: string;
                errorMessage?: string;
                onSuccess?: (data: R) => void;
                onError?: (error: ApiError) => void;
                silent?: boolean;
            }
        ): Promise<R | null> => {
            setLoading(true);
            setError(null);

            try {
                const data = await apiCall();
                
                if (options?.successMessage && !options.silent) {
                    handleSuccess(options.successMessage);
                }
                
                if (options?.onSuccess) {
                    options.onSuccess(data);
                }

                return data;
            } catch (err) {
                const apiError = err as ApiError;
                const errorMsg = options?.errorMessage || handleError(apiError);
                setError(errorMsg);

                if (options?.onError) {
                    options.onError(apiError);
                }

                return null;
            } finally {
                setLoading(false);
            }
        },
        [handleError, handleSuccess]
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        loading,
        error,
        execute,
        clearError,
        setLoading,
    };
}
