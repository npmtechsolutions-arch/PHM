import { useState, useEffect } from 'react';
import { rolesApi, usersApi } from '../services/api';

interface Role {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
    is_system?: boolean;
    created_at: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

const AVAILABLE_PERMISSIONS = [
    { key: 'dashboard.view', label: 'View Dashboard', category: 'Dashboard' },
    { key: 'users.view', label: 'View Users', category: 'Users' },
    { key: 'users.create', label: 'Create Users', category: 'Users' },
    { key: 'users.edit', label: 'Edit Users', category: 'Users' },
    { key: 'users.delete', label: 'Delete Users', category: 'Users' },
    { key: 'warehouses.view', label: 'View Warehouses', category: 'Warehouses' },
    { key: 'warehouses.manage', label: 'Manage Warehouses', category: 'Warehouses' },
    { key: 'shops.view', label: 'View Shops', category: 'Shops' },
    { key: 'shops.manage', label: 'Manage Shops', category: 'Shops' },
    { key: 'medicines.view', label: 'View Medicines', category: 'Medicines' },
    { key: 'medicines.manage', label: 'Manage Medicines', category: 'Medicines' },
    { key: 'inventory.view', label: 'View Inventory', category: 'Inventory' },
    { key: 'inventory.manage', label: 'Manage Inventory', category: 'Inventory' },
    { key: 'reports.view', label: 'View Reports', category: 'Reports' },
    { key: 'reports.export', label: 'Export Reports', category: 'Reports' },
    { key: 'settings.view', label: 'View Settings', category: 'Settings' },
    { key: 'settings.manage', label: 'Manage Settings', category: 'Settings' },
];

export default function RolesPermissionsPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[]
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesRes, usersRes] = await Promise.all([
                rolesApi.list(),
                usersApi.list({ size: 100 })
            ]);
            setRoles(rolesRes.data.items || []);
            setUsers(usersRes.data.items || []);
        } catch (err) {
            console.error('Failed to load roles:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingRole(null);
        setFormData({ name: '', description: '', permissions: [] });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions || []
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Role name is required');
            return;
        }

        setSaving(true);
        setError('');
        try {
            if (editingRole) {
                await rolesApi.update(editingRole.id, formData);
            } else {
                await rolesApi.create(formData);
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (role: Role) => {
        if (!confirm(`Are you sure you want to delete "${role.name}"?`)) return;
        try {
            await rolesApi.delete(role.id);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete role');
        }
    };

    const togglePermission = (permission: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter(p => p !== permission)
                : [...prev.permissions, permission]
        }));
    };

    const getUsersWithRole = (roleName: string) => {
        return users.filter(u => u.role === roleName);
    };

    const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Roles & Permissions
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage user roles and their permissions.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Create Role
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600">admin_panel_settings</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{roles.length}</p>
                            <p className="text-xs text-slate-500">Total Roles</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">shield</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {roles.filter(r => r.is_system).length}
                            </p>
                            <p className="text-xs text-slate-500">System Roles</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">tune</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {roles.filter(r => !r.is_system).length}
                            </p>
                            <p className="text-xs text-slate-500">Custom Roles</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Roles Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                    </div>
                ) : roles.length === 0 ? (
                    <div className="py-16 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">admin_panel_settings</span>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No roles found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Create your first role to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {roles.map((role, index) => {
                            const roleUsers = getUsersWithRole(role.name);
                            return (
                                <div
                                    key={role.id}
                                    className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors animate-fadeIn"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.is_system
                                                    ? 'bg-blue-100 dark:bg-blue-900/30'
                                                    : 'bg-purple-100 dark:bg-purple-900/30'
                                                }`}>
                                                <span className={`material-symbols-outlined ${role.is_system ? 'text-blue-600' : 'text-purple-600'
                                                    }`}>
                                                    {role.is_system ? 'shield' : 'badge'}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 dark:text-white capitalize">
                                                    {role.name.replace(/_/g, ' ')}
                                                </h3>
                                                {role.is_system && (
                                                    <span className="text-xs text-blue-600 dark:text-blue-400">System Role</span>
                                                )}
                                            </div>
                                        </div>
                                        {!role.is_system && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openEditModal(role)}
                                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(role)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                                        {role.description || 'No description'}
                                    </p>

                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <span className="material-symbols-outlined text-[16px]">key</span>
                                            <span>{role.permissions?.length || 0} permissions</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <span className="material-symbols-outlined text-[16px]">group</span>
                                            <span>{roleUsers.length} users</span>
                                        </div>
                                    </div>

                                    {role.permissions && role.permissions.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <div className="flex flex-wrap gap-1">
                                                {role.permissions.slice(0, 3).map(perm => (
                                                    <span key={perm} className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                                                        {perm.split('.').pop()}
                                                    </span>
                                                ))}
                                                {role.permissions.length > 3 && (
                                                    <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                                                        +{role.permissions.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Role Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Sales Manager"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of this role..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    Permissions
                                </label>
                                <div className="space-y-4">
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <div key={category} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{category}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map(perm => (
                                                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions.includes(perm.key)}
                                                            onChange={() => togglePermission(perm.key)}
                                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm text-slate-600 dark:text-slate-400">{perm.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
