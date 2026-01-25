/**
 * Validation Utilities
 * Centralized validation functions
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
export function isValidPhone(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 12;
}

/**
 * Validate GST number (Indian format)
 */
export function isValidGST(gst: string): boolean {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
}

/**
 * Validate pincode (Indian format)
 */
export function isValidPincode(pincode: string): boolean {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
}

/**
 * Validate required field
 */
export function isRequired(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

/**
 * Validate minimum length
 */
export function minLength(value: string, min: number): boolean {
    return value.length >= min;
}

/**
 * Validate maximum length
 */
export function maxLength(value: string, max: number): boolean {
    return value.length <= max;
}

/**
 * Validate number range
 */
export function inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * Validate positive number
 */
export function isPositive(value: number): boolean {
    return value > 0;
}

/**
 * Validate non-negative number
 */
export function isNonNegative(value: number): boolean {
    return value >= 0;
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: number): boolean {
    return value >= 0 && value <= 100;
}

/**
 * Validate date is in the past
 */
export function isPastDate(date: string | Date): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
}

/**
 * Validate date is in the future
 */
export function isFutureDate(date: string | Date): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj > new Date();
}

/**
 * Validate date range
 */
export function isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    return start <= end;
}
