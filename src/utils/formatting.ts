/**
 * Formatting Utilities
 * Centralized formatting functions for consistency
 */

/**
 * Format currency (INR)
 */
export function formatCurrency(amount: number, showSymbol = true): string {
    return new Intl.NumberFormat('en-IN', {
        style: showSymbol ? 'currency' : 'decimal',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, decimals = 0): string {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Format date
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'full' = 'short'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    const options: Intl.DateTimeFormatOptions = {
        short: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    };

    return new Intl.DateTimeFormat('en-IN', options[format]).format(dateObj);
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return formatDate(dateObj);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
    if (!phone) return '';
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Format as +91 XXXXX XXXXX
    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format title case
 */
export function titleCase(text: string): string {
    if (!text) return '';
    return text
        .split(/[\s_-]+/)
        .map(word => capitalize(word))
        .join(' ');
}
