import { useState, useEffect } from 'react';
import { reportsApi, shopsApi } from '../../services/api';
import { useOperationalContext } from '../../contexts/OperationalContext';

interface SalesData {
    total_sales: number;
    total_invoices: number;
    total_items_sold: number;
    average_order_value: number;
}

interface DailySale {
    date: string;
    sales: number;
    invoices: number;
}

export default function SalesReports() {
    const { activeEntity, scope } = useOperationalContext();
    const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('daily');
    const [shops, setShops] = useState<any[]>([]);
    const [selectedShop, setSelectedShop] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [salesData, setSalesData] = useState<SalesData | null>(null);
    const [dailySales, setDailySales] = useState<DailySale[]>([]);
    const [loading, setLoading] = useState(false);

    // Auto-select shop from activeEntity
    useEffect(() => {
        if (activeEntity?.type === 'shop') {
            setSelectedShop(activeEntity.id);
        }
    }, [activeEntity]);

    useEffect(() => {
        // Only load shops if global scope (Super Admin can select any shop)
        if (scope === 'global') {
            loadShops();
        }
    }, [scope]);

    useEffect(() => {
        loadReport();
    }, [reportType, selectedShop, selectedDate, selectedMonth, selectedYear, activeEntity]);

    const loadShops = async () => {
        try {
            const response = await shopsApi.list({ size: 500 });
            setShops(response.data.items || response.data);
        } catch (error) {
            console.error('Error loading shops:', error);
        }
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            // Entity-specific shop_id - use activeEntity if shop, or selectedShop for global
            const shopId = activeEntity?.type === 'shop' ? activeEntity.id : (selectedShop || undefined);
            
            let response;
            if (reportType === 'daily') {
                response = await reportsApi.getDailySales({
                    shop_id: shopId,
                    date: selectedDate
                });
            } else if (reportType === 'monthly') {
                response = await reportsApi.getMonthlySales({
                    shop_id: shopId,
                    month: selectedMonth,
                    year: selectedYear
                });
            } else {
                response = await reportsApi.getSales({
                    shop_id: shopId,
                    date_from: dateFrom,
                    date_to: dateTo
                });
            }

            setSalesData(response.data);
            if (response.data.daily_breakdown) {
                setDailySales(response.data.daily_breakdown);
            }
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const exportReport = () => {
        // Simple CSV export
        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Sales', formatCurrency(salesData?.total_sales || 0)],
            ['Total Invoices', salesData?.total_invoices || 0],
            ['Items Sold', salesData?.total_items_sold || 0],
            ['Average Order Value', formatCurrency(salesData?.average_order_value || 0)]
        ];

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="sales-reports">
            <style>{`
                .sales-reports {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .page-header h1 {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0;
                }
                .btn-export {
                    padding: 10px 20px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .btn-export:hover {
                    background: #059669;
                }
                .filters-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 20px;
                    margin-bottom: 24px;
                }
                .filters-row {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    align-items: flex-end;
                }
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .filter-group label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #666;
                }
                .filter-group select,
                .filter-group input {
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    min-width: 160px;
                }
                .report-tabs {
                    display: flex;
                    gap: 8px;
                }
                .tab-btn {
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    background: #4a6cf7;
                    color: white;
                    border-color: #4a6cf7;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 24px;
                }
                @media (max-width: 1024px) {
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (max-width: 640px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .stat-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 24px;
                }
                .stat-card.primary {
                    background: linear-gradient(135deg, #4a6cf7, #6366f1);
                    color: white;
                }
                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin-bottom: 16px;
                }
                .stat-card:not(.primary) .stat-icon {
                    background: #f0f4ff;
                }
                .stat-card.primary .stat-icon {
                    background: rgba(255,255,255,0.2);
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .stat-label {
                    font-size: 14px;
                    opacity: 0.8;
                }
                .chart-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 24px;
                }
                .chart-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 20px 0;
                    color: #1a1a2e;
                }
                .chart-bars {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                    height: 200px;
                    padding-top: 20px;
                }
                .chart-bar-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }
                .chart-bar {
                    width: 100%;
                    max-width: 40px;
                    background: linear-gradient(135deg, #4a6cf7, #6366f1);
                    border-radius: 4px 4px 0 0;
                    min-height: 4px;
                    transition: height 0.3s ease;
                }
                .chart-label {
                    font-size: 11px;
                    color: #666;
                    text-align: center;
                }
                .loading-overlay {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    color: #666;
                }
            `}</style>

            <div className="page-header">
                <div>
                    <h1>
                        Sales Reports
                        {activeEntity?.type === 'shop' && (
                            <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                - {activeEntity.name}
                            </span>
                        )}
                    </h1>
                </div>
                <button className="btn-export" onClick={exportReport}>
                    Export CSV
                </button>
            </div>

            {/* Entity Badge */}
            {activeEntity?.type === 'shop' && (
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', background: '#e0f2fe', border: '1px solid #bae6fd' }}>
                        <span style={{ fontSize: '20px' }}>🏪</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                            Pharmacy: {activeEntity.name}
                        </span>
                    </div>
                </div>
            )}

            <div className="filters-card">
                <div className="filters-row">
                    <div className="report-tabs">
                        <button
                            className={`tab-btn ${reportType === 'daily' ? 'active' : ''}`}
                            onClick={() => setReportType('daily')}
                        >
                            Daily
                        </button>
                        <button
                            className={`tab-btn ${reportType === 'monthly' ? 'active' : ''}`}
                            onClick={() => setReportType('monthly')}
                        >
                            Monthly
                        </button>
                        <button
                            className={`tab-btn ${reportType === 'custom' ? 'active' : ''}`}
                            onClick={() => setReportType('custom')}
                        >
                            Custom Range
                        </button>
                    </div>

                    {scope === 'global' && (
                        <div className="filter-group">
                            <label>Shop</label>
                            <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}>
                                <option value="">All Shops</option>
                                {shops.map(shop => (
                                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {activeEntity?.type === 'shop' && (
                        <div className="filter-group">
                            <label>Shop</label>
                            <div style={{ 
                                padding: '10px 12px', 
                                border: '1px solid #ddd', 
                                borderRadius: '8px', 
                                background: '#f5f5f5', 
                                color: '#666',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                {activeEntity.name}
                            </div>
                        </div>
                    )}

                    {reportType === 'daily' && (
                        <div className="filter-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                    )}

                    {reportType === 'monthly' && (
                        <>
                            <div className="filter-group">
                                <label>Month</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Year</label>
                                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <option key={i} value={new Date().getFullYear() - i}>
                                            {new Date().getFullYear() - i}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {reportType === 'custom' && (
                        <>
                            <div className="filter-group">
                                <label>From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <label>To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="loading-overlay">Loading report data...</div>
            ) : (
                <>
                    <div className="stats-grid">
                        <div className="stat-card primary">
                            <div className="stat-icon">💰</div>
                            <div className="stat-value">{formatCurrency(salesData?.total_sales || 0)}</div>
                            <div className="stat-label">Total Sales</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🧾</div>
                            <div className="stat-value">{salesData?.total_invoices || 0}</div>
                            <div className="stat-label">Invoices</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📦</div>
                            <div className="stat-value">{salesData?.total_items_sold || 0}</div>
                            <div className="stat-label">Items Sold</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{formatCurrency(salesData?.average_order_value || 0)}</div>
                            <div className="stat-label">Avg Order Value</div>
                        </div>
                    </div>

                    {dailySales.length > 0 && (
                        <div className="chart-card">
                            <h3 className="chart-title">Daily Breakdown</h3>
                            <div className="chart-bars">
                                {dailySales.slice(0, 14).map((day, index) => {
                                    const maxSale = Math.max(...dailySales.map(d => d.sales));
                                    const height = maxSale > 0 ? (day.sales / maxSale) * 180 : 4;
                                    return (
                                        <div key={index} className="chart-bar-wrapper">
                                            <div
                                                className="chart-bar"
                                                style={{ height: `${height}px` }}
                                                title={`${formatCurrency(day.sales)}`}
                                            />
                                            <span className="chart-label">
                                                {new Date(day.date).getDate()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
