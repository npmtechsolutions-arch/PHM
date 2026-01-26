import { useState, useEffect } from 'react';
import { notificationsApi } from '../../services/api';
import { useOperationalContext } from '../../contexts/OperationalContext';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    is_read: boolean;
    created_at: string;
    reference_type?: string;
    reference_id?: string;
    shop_id?: string;
}

export default function NotificationsPage() {
    const { activeEntity } = useOperationalContext();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        loadNotifications();
    }, [filter, typeFilter]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const params: any = { size: 50 };
            if (filter === 'unread') params.is_read = false;
            if (filter === 'read') params.is_read = true;
            if (typeFilter) params.notification_type = typeFilter;

            const response = await notificationsApi.list(params);
            setNotifications(response.data?.items || response.data || []);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await notificationsApi.markRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await notificationsApi.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            low_stock: '📦',
            expiry_alert: '⏰',
            order_received: '🛒',
            dispatch_update: '🚚',
            payment_received: '💰',
            system: '⚙️',
            default: '🔔'
        };
        return icons[type] || icons.default;
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };
        return colors[priority] || colors.medium;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const getEntityContext = (notification: Notification) => {
        if (notification.reference_type === 'warehouse') {
            return 'Warehouse';
        } else if (notification.shop_id) {
            return 'Pharmacy';
        }
        return null;
    };

    const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;

    return (
        <div className="notifications-page">
            <style>{`
                .notifications-page {
                    padding: 24px;
                    max-width: 900px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .page-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .page-title h1 {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0;
                }
                .unread-badge {
                    background: #ef4444;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }
                .btn-mark-all {
                    padding: 10px 20px;
                    background: #4a6cf7;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                }
                .btn-mark-all:hover {
                    background: #3b5ce4;
                }
                .btn-mark-all:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .filters {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .filter-tabs {
                    display: flex;
                    background: #f0f4ff;
                    border-radius: 8px;
                    padding: 4px;
                }
                .filter-tab {
                    padding: 8px 16px;
                    border: none;
                    background: transparent;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    color: #666;
                    transition: all 0.2s;
                }
                .filter-tab.active {
                    background: white;
                    color: #4a6cf7;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .type-filter {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                }
                .notifications-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .notification-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 16px;
                    display: flex;
                    gap: 16px;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .notification-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                }
                .notification-card.unread {
                    border-left: 4px solid #4a6cf7;
                    background: #f8faff;
                }
                .notification-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: #f0f4ff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    flex-shrink: 0;
                }
                .notification-content {
                    flex: 1;
                    min-width: 0;
                }
                .notification-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 4px;
                }
                .notification-title {
                    font-weight: 600;
                    color: #1a1a2e;
                    font-size: 15px;
                }
                .notification-time {
                    font-size: 12px;
                    color: #999;
                    white-space: nowrap;
                }
                .notification-message {
                    color: #666;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .notification-meta {
                    display: flex;
                    gap: 12px;
                    margin-top: 8px;
                    align-items: center;
                }
                .priority-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: white;
                }
                .type-badge {
                    padding: 2px 8px;
                    background: #e0e7ff;
                    color: #4a6cf7;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 500;
                }
                .notification-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .action-btn {
                    padding: 6px 12px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                .action-btn:hover {
                    background: #f5f5f5;
                }
                .action-btn.delete:hover {
                    background: #fee2e2;
                    border-color: #ef4444;
                    color: #ef4444;
                }
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: #999;
                }
                .empty-state-icon {
                    font-size: 64px;
                    margin-bottom: 16px;
                }
                .loading {
                    text-align: center;
                    padding: 60px;
                    color: #666;
                }
            `}</style>

            <div className="page-header">
                <div className="page-title">
                    <h1>
                        🔔 Notifications
                        {activeEntity && (
                            <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                - {activeEntity.type === 'shop' ? 'Pharmacy' : 'Warehouse'}: {activeEntity.name}
                            </span>
                        )}
                    </h1>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount} unread</span>
                    )}
                </div>
                <button
                    className="btn-mark-all"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                >
                    Mark all as read
                </button>
            </div>

            <div className="filters">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Unread
                    </button>
                    <button
                        className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
                        onClick={() => setFilter('read')}
                    >
                        Read
                    </button>
                </div>

                <select
                    className="type-filter"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="expiry_alert">Expiry Alert</option>
                    <option value="order_received">Orders</option>
                    <option value="dispatch_update">Dispatch</option>
                    <option value="payment_received">Payments</option>
                    <option value="system">System</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading notifications...</div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                </div>
            ) : (
                <div className="notifications-list">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                        >
                            <div className="notification-icon">
                                {getTypeIcon(notification.type)}
                            </div>
                            <div className="notification-content">
                                <div className="notification-header">
                                    <span className="notification-title">{notification.title}</span>
                                    <span className="notification-time">{formatDate(notification.created_at)}</span>
                                </div>
                                <p className="notification-message">{notification.message}</p>
                                <div className="notification-meta">
                                    <span
                                        className="priority-badge"
                                        style={{ backgroundColor: getPriorityColor(notification.priority) }}
                                    >
                                        {notification.priority}
                                    </span>
                                    <span className="type-badge">{notification.type.replace(/_/g, ' ')}</span>
                                    {getEntityContext(notification) && (
                                        <span className="type-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                                            {getEntityContext(notification)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
                                {!notification.is_read && (
                                    <button
                                        className="action-btn"
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        ✓ Read
                                    </button>
                                )}
                                <button
                                    className="action-btn delete"
                                    onClick={() => deleteNotification(notification.id)}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
