import { useState, useCallback, useRef } from 'react';
import { useErrorHandler } from './useErrorHandler';

export interface UseFormOptions<T> {
    initialValues: T;
    onSubmit: (values: T) => Promise<void> | void;
    validate?: (values: T) => Partial<Record<keyof T, string>>;
    onSuccess?: () => void;
    successMessage?: string;
}

/**
 * Generic form hook with validation and error handling
 */
export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>) {
    const { initialValues, onSubmit, validate, onSuccess, successMessage } = options;
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { handleError, handleSuccess } = useErrorHandler();
    const formRef = useRef<HTMLFormElement>(null);

    const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    const setFieldError = useCallback(<K extends keyof T>(field: K, error: string) => {
        setErrors(prev => ({ ...prev, [field]: error }));
    }, []);

    const setFieldTouched = useCallback(<K extends keyof T>(field: K) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    }, []);

    const validateForm = useCallback((): boolean => {
        if (!validate) return true;
        
        const validationErrors = validate(values);
        setErrors(validationErrors);
        
        return Object.keys(validationErrors).length === 0;
    }, [values, validate]);

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        // Validate form
        if (validate && !validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(values);
            
            if (successMessage) {
                handleSuccess(successMessage);
            }
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: unknown) {
            handleError(error as any);
        } finally {
            setIsSubmitting(false);
        }
    }, [values, onSubmit, validate, validateForm, onSuccess, successMessage, handleError, handleSuccess]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    const resetField = useCallback(<K extends keyof T>(field: K) => {
        setValue(field, initialValues[field]);
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
        setTouched(prev => {
            const newTouched = { ...prev };
            delete newTouched[field];
            return newTouched;
        });
    }, [initialValues, setValue]);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        setValue,
        setValues,
        setFieldError,
        setFieldTouched,
        handleSubmit,
        reset,
        resetField,
        validateForm,
        formRef,
    };
}
