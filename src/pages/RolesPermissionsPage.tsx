import { useState, useEffect } from 'react';
import { rolesApi, usersApi, permissionsApi } from '../services/api';
import { usePermissions } from '../contexts/PermissionContext';
import { useUser } from '../contexts/UserContext';
import { PERMISSIONS } from '../types/permissions';
import ConfirmationModal from '../components/ConfirmationModal';

interface Permission {
    id: string;
    code: string;
    module: string;
    action: string;
    scope: string;
    description: string | null;
}

interface Role {
    id: string;
    name: string;
    description: string | null;
    entity_type: string | null;
    is_system: boolean;
    is_creatable: boolean;
    permissions: Permission[];
    created_at: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function RolesPermissionsPage() {
    const { hasPermission } = usePermissions();
    const { user } = useUser();
    const canView = hasPermission(PERMISSIONS.ROLES_VIEW);
    const canManage = hasPermission(PERMISSIONS.ROLES_MANAGE);

    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        entity_type: '' as string | null,
        permission_ids: [] as string[]
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (canView && user) {
            loadData();
        } else if (!canView) {
            setLoading(false);
        }
    }, [canView, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permissionsRes, usersRes] = await Promise.all([
                rolesApi.list(),
                permissionsApi.list(),
                usersApi.list({ size: 500 })
            ]);

            let fetchedRoles = rolesRes.data.items || [];

            // Filter roles for Warehouse Admin
            if (user?.role === 'warehouse_admin') {
                fetchedRoles = fetchedRoles.filter((r: any) =>
                    r.name !== 'super_admin' &&
                    r.entity_type !== 'shop'
                );
            }

            setRoles(fetchedRoles);
            setAllPermissions(permissionsRes.data.items || []);
            setUsers(usersRes.data.items || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingRole(null);
        setFormData({ name: '', description: '', entity_type: null, permission_ids: [] });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            entity_type: role.entity_type,
            permission_ids: role.permissions.map(p => p.id)
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

    // Delete Confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const handleDeleteClick = (role: Role) => {
        setRoleToDelete(role);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;

        try {
            await rolesApi.delete(roleToDelete.id);
            window.toast?.success('Role deleted successfully');
            loadData();
        } catch (err: any) {
            console.error('Failed to delete role:', err);
            window.toast?.error(err.response?.data?.detail || 'Failed to delete role');
        } finally {
            setIsDeleteModalOpen(false);
            setRoleToDelete(null);
        }
    };

    const togglePermission = (permissionId: string) => {
        setFormData(prev => ({
            ...prev,
            permission_ids: prev.permission_ids.includes(permissionId)
                ? prev.permission_ids.filter(id => id !== permissionId)
                : [...prev.permission_ids, permissionId]
        }));
    };

    const getUsersWithRole = (roleName: string) => {
        return users.filter(u => u.role === roleName);
    };

    // Group permissions by module
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const getScopeColor = (scope: string) => {
        switch (scope) {
            case 'global': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'warehouse': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'shop': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    // Access denied if user doesn't have view permission
    if (!canView) {
        return (
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <span className="material-symbols-outlined text-6xl text-red-500 mb-4">block</span>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        You don't have permission to view roles and permissions.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                        Contact your administrator if you need access.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Roles & Permissions
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage user roles and their permissions. System roles cannot be modified.
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Create Role
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600">key</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{allPermissions.length}</p>
                            <p className="text-xs text-slate-500">Total Permissions</p>
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
                                                <div className="flex gap-1 mt-0.5">
                                                    {role.is_system && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                            System
                                                        </span>
                                                    )}
                                                    {role.entity_type && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${getScopeColor(role.entity_type)}`}>
                                                            {role.entity_type}
                                                        </span>
                                                    )}
                                                    {!role.entity_type && !role.is_system && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                                            Custom
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {!role.is_system && canManage && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openEditModal(role)}
                                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(role)}
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
                                                {role.permissions.slice(0, 4).map(perm => (
                                                    <span
                                                        key={perm.id}
                                                        className={`px-2 py-0.5 text-xs rounded-full ${getScopeColor(perm.scope)}`}
                                                        title={perm.code}
                                                    >
                                                        {perm.action}
                                                    </span>
                                                ))}
                                                {role.permissions.length > 4 && (
                                                    <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                                                        +{role.permissions.length - 4} more
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
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scaleIn">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                            {editingRole?.is_system && (
                                <p className="text-sm text-amber-600 mt-1">
                                    ⚠️ System roles have limited editing options
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Role Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Sales Manager"
                                        disabled={editingRole?.is_system}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Entity Type
                                    </label>
                                    <select
                                        value={formData.entity_type || ''}
                                        onChange={(e) => setFormData({ ...formData, entity_type: e.target.value || null })}
                                        disabled={editingRole?.is_system}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                                    >
                                        <option value="">None (Global)</option>
                                        <option value="warehouse">Warehouse</option>
                                        <option value="shop">Shop</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of this role..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    Permissions ({formData.permission_ids.length} selected)
                                </label>
                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                                        <div key={module} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                                    {module.replace(/_/g, ' ')}
                                                </h4>
                                                <span className="text-xs text-slate-400">{perms.length} permissions</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map(perm => (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-center gap-2 cursor-pointer group"
                                                        title={perm.description || perm.code}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permission_ids.includes(perm.id)}
                                                            onChange={() => togglePermission(perm.id)}
                                                            disabled={editingRole?.is_system && editingRole?.name === 'super_admin'}
                                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                        />
                                                        <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                                                            {perm.action}
                                                        </span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getScopeColor(perm.scope)}`}>
                                                            {perm.scope}
                                                        </span>
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
                                disabled={saving || (editingRole?.is_system && editingRole?.name === 'super_admin')}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Role"
                message={`Are you sure you want to delete "${roleToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete Role"
            />
        </div>
    );
}
