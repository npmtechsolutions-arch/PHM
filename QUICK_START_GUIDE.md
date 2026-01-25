# Quick Start Guide - Using New Utilities

## 🚀 Quick Reference

### 1. Error Handling (Replace all `alert()` and `window.toast`)

**Before:**
```typescript
try {
    await api.create(data);
    window.toast?.success('Success!');
} catch (err: any) {
    alert(err.response?.data?.detail || 'Failed');
}
```

**After:**
```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

const { handleError, handleSuccess } = useErrorHandler();

try {
    await api.create(data);
    handleSuccess('Item created successfully');
} catch (error) {
    handleError(error, 'Failed to create item');
}
```

### 2. Formatting (Replace inline formatting)

**Before:**
```typescript
const price = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(1234.56);
const date = new Date(item.created_at).toLocaleDateString();
```

**After:**
```typescript
import { formatCurrency, formatDate } from '../utils/formatting';

const price = formatCurrency(1234.56); // ₹1,234.56
const date = formatDate(item.created_at, 'long'); // January 25, 2026
```

### 3. Routes (Replace hardcoded paths)

**Before:**
```typescript
navigate('/medicines');
navigate(`/medicines/${id}/edit`);
```

**After:**
```typescript
import { ROUTES } from '../constants/routes';

navigate(ROUTES.MEDICINES);
navigate(ROUTES.MEDICINE_EDIT(id));
```

### 4. Status Colors (Replace hardcoded classes)

**Before:**
```typescript
<Badge className={item.status === 'active' ? 'bg-green-50' : 'bg-red-50'}>
    {item.status}
</Badge>
```

**After:**
```typescript
import { STATUS, STATUS_COLORS } from '../constants/statuses';

<Badge className={STATUS_COLORS[item.status as StatusKey]?.bg || ''}>
    {item.status}
</Badge>
```

### 5. Validation (Replace inline validation)

**Before:**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    setError('Invalid email');
}
```

**After:**
```typescript
import { isValidEmail, isValidPhone, isValidGST } from '../utils/validation';

if (!isValidEmail(email)) {
    setError('Invalid email');
}
```

## 📝 Migration Checklist

When updating a page:

- [ ] Import `useErrorHandler` hook
- [ ] Replace all `alert()` calls with `handleError()`
- [ ] Replace all `window.toast` with `handleSuccess()` / `handleError()`
- [ ] Replace inline formatting with utility functions
- [ ] Replace hardcoded routes with `ROUTES` constants
- [ ] Replace hardcoded status colors with `STATUS_COLORS`
- [ ] Use validation utilities instead of inline regex
- [ ] Remove `any` types where possible
- [ ] Use `useApi` hook for common API patterns
- [ ] Use `useForm` hook for form management

## 🎯 Priority Order

1. **Error Handling** - Most impactful, improves UX immediately
2. **Constants** - Prevents bugs from typos, improves maintainability
3. **Formatting** - Reduces code duplication
4. **Validation** - Improves code readability
5. **Hooks** - Advanced patterns for complex forms
