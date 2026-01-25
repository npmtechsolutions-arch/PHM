# How to Add New Permissions for New Modules

## ✅ Yes, you can add all permissions to `src/types/permissions.ts`

When you create a new module, follow these steps:

---

## Step 1: Add Permissions to `PERMISSIONS` Constant

Edit `src/types/permissions.ts` and add your new module permissions:

```typescript
export const PERMISSIONS = {
    // ... existing permissions ...
    
    // Your New Module
    NEW_MODULE_VIEW: 'new_module.view',
    NEW_MODULE_CREATE: 'new_module.create',
    NEW_MODULE_EDIT: 'new_module.edit',
    NEW_MODULE_DELETE: 'new_module.delete',
    
    // If your module has scoped permissions (warehouse/shop)
    NEW_MODULE_VIEW_GLOBAL: 'new_module.view.global',
    NEW_MODULE_VIEW_WAREHOUSE: 'new_module.view.warehouse',
    NEW_MODULE_VIEW_SHOP: 'new_module.view.shop',
    NEW_MODULE_MANAGE_WAREHOUSE: 'new_module.manage.warehouse',
    NEW_MODULE_MANAGE_SHOP: 'new_module.manage.shop',
} as const;
```

---

## Step 2: Use Permissions in Components

### Option A: Using PERMISSIONS constant (Recommended)
```typescript
import { PERMISSIONS } from '../types/permissions';
import { usePermissions } from '../contexts/PermissionContext';

function MyNewModulePage() {
    const { hasPermission } = usePermissions();
    
    return (
        <>
            {hasPermission(PERMISSIONS.NEW_MODULE_VIEW) && (
                <div>View content</div>
            )}
            {hasPermission(PERMISSIONS.NEW_MODULE_CREATE) && (
                <Button>Create</Button>
            )}
        </>
    );
}
```

### Option B: Using permission strings directly (Also works)
```typescript
import { usePermissions } from '../contexts/PermissionContext';

function MyNewModulePage() {
    const { hasPermission } = usePermissions();
    
    return (
        <>
            {hasPermission('new_module.view') && (
                <div>View content</div>
            )}
            {hasPermission('new_module.create') && (
                <Button>Create</Button>
            )}
        </>
    );
}
```

---

## Step 3: Add to Sidebar

Edit `src/components/Sidebar.tsx` and add your new module to the navigation:

```typescript
const operationalItems: NavItemType[] = [
    // ... existing items ...
    
    {
        path: '/new-module',
        label: 'New Module',
        icon: 'your_icon',
        permissions: ['new_module.view', 'new_module.view.warehouse', 'new_module.view.shop'],
        excludeFromSuperAdmin: true  // If needed
    },
];
```

---

## Step 4: Use in PermissionGate

```typescript
import { PermissionGate } from '../components/PermissionGate';

function MyComponent() {
    return (
        <PermissionGate permission="new_module.create">
            <Button>Create New Item</Button>
        </PermissionGate>
    );
}
```

---

## Important Notes

### ✅ The PERMISSIONS constant is OPTIONAL but RECOMMENDED

**Benefits of using PERMISSIONS constant:**
- ✅ Type safety (TypeScript will catch typos)
- ✅ Autocomplete in your IDE
- ✅ Easy refactoring (rename permission → all usages update)
- ✅ Consistency across codebase
- ✅ Self-documenting code

**You can also use strings directly:**
- ✅ `hasPermission('new_module.view')` works fine
- ✅ No need to add to PERMISSIONS if you don't want to
- ✅ Backend permissions are the source of truth

### 🔑 Backend is the Source of Truth

**Important:** The actual permissions come from the **backend** when a user logs in:
```typescript
const permissions = user?.permissions ?? [];  // From backend API
```

The `PERMISSIONS` constant in the frontend is just for:
- Type safety
- Autocomplete
- Consistency
- Documentation

---

## Example: Adding a "Products" Module

```typescript
// src/types/permissions.ts
export const PERMISSIONS = {
    // ... existing ...
    
    // Products Module
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',
    PRODUCTS_VIEW_WAREHOUSE: 'products.view.warehouse',
    PRODUCTS_VIEW_SHOP: 'products.view.shop',
} as const;
```

```typescript
// src/components/Sidebar.tsx
{
    path: '/products',
    label: 'Products',
    icon: 'inventory',
    permissions: ['products.view', 'products.view.warehouse', 'products.view.shop'],
}
```

```typescript
// src/pages/ProductsPage.tsx
import { PERMISSIONS } from '../types/permissions';
import { usePermissions } from '../contexts/PermissionContext';

export default function ProductsPage() {
    const { hasPermission } = usePermissions();
    
    return (
        <div>
            {hasPermission(PERMISSIONS.PRODUCTS_VIEW) && (
                <div>Products List</div>
            )}
            {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
                <Button>Add Product</Button>
            )}
        </div>
    );
}
```

---

## Summary

✅ **Yes, you can and should add new permissions to `PERMISSIONS` constant**

✅ **Benefits:**
- Type safety
- Autocomplete
- Consistency
- Easy refactoring

✅ **But remember:**
- Backend permissions are the source of truth
- You can also use strings directly: `hasPermission('new_module.view')`
- The constant is optional but recommended

✅ **When creating a new module:**
1. Add permissions to `PERMISSIONS` constant
2. Add sidebar item with permissions
3. Use `hasPermission()` or `PermissionGate` in components
4. Make sure backend has matching permissions

---

*The system is fully permission-based, so adding new modules is straightforward!*
