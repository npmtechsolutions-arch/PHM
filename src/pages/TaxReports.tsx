import { useState, useEffect } from 'react';
import api from '../services/api';
import { useOperationalContext } from '../contexts/OperationalContext';

interface TaxSummary {
    total_sales: number;
    total_tax_collected: number;
    gst_amount: number;
    vat_amount: number;
    net_taxable_value: number;
}

interface GSTReport {
    total_taxable_value: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_gst: number;
    invoice_count: number;
    period: string;
}

export default function TaxReports() {
    const { activeEntity } = useOperationalContext();
    const [reportType, setReportType] = useState<'summary' | 'gst' | 'vat'>('summary');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
    const [gstReport, setGstReport] = useState<GSTReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, [reportType, selectedMonth, selectedYear, activeEntity]);

    const loadReport = async () => {
        setLoading(true);
        try {
            // Entity-specific params - shop_id for shops
            const params: { month: number; year: number; shop_id?: string } = {
                month: selectedMonth,
                year: selectedYear
            };
            if (activeEntity?.type === 'shop') {
                params.shop_id = activeEntity.id;
            }
            
            if (reportType === 'summary') {
                const response = await api.get('/tax/summary', { params });
                setTaxSummary(response.data);
            } else if (reportType === 'gst') {
                const response = await api.get('/tax/gst', { params });
                setGstReport(response.data);
            }
        } catch (error) {
            console.error('Error loading tax report:', error);
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

    const getMonthName = (month: number) => {
        return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
    };

    const exportReport = () => {
        let data: string[][] = [];
        let filename = '';

        if (reportType === 'summary' && taxSummary) {
            data = [
                ['Tax Summary Report', `${getMonthName(selectedMonth)} ${selectedYear}`],
                [''],
                ['Metric', 'Amount'],
                ['Total Sales', formatCurrency(taxSummary.total_sales)],
                ['Net Taxable Value', formatCurrency(taxSummary.net_taxable_value)],
                ['Total Tax Collected', formatCurrency(taxSummary.total_tax_collected)],
                ['GST Amount', formatCurrency(taxSummary.gst_amount)],
                ['VAT Amount', formatCurrency(taxSummary.vat_amount)]
            ];
            filename = `tax-summary-${selectedYear}-${selectedMonth}.csv`;
        } else if (reportType === 'gst' && gstReport) {
            data = [
                ['GST Report', gstReport.period],
                [''],
                ['Component', 'Amount'],
                ['Taxable Value', formatCurrency(gstReport.total_taxable_value)],
                ['CGST', formatCurrency(gstReport.cgst_amount)],
                ['SGST', formatCurrency(gstReport.sgst_amount)],
                ['IGST', formatCurrency(gstReport.igst_amount)],
                ['Total GST', formatCurrency(gstReport.total_gst)],
                ['Invoice Count', gstReport.invoice_count.toString()]
            ];
            filename = `gst-report-${selectedYear}-${selectedMonth}.csv`;
        }

        const csv = data.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    };

    return (
        <div className="tax-reports">
            <style>{`
                .tax-reports {
                    padding: 24px;
                    max-width: 1200px;
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
                .controls-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 20px;
                    margin-bottom: 24px;
                }
                .controls-row {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    align-items: center;
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
                .period-selector {
                    display: flex;
                    gap: 8px;
                    margin-left: auto;
                }
                .period-selector select {
                    padding: 10px 16px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 24px;
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
                .stat-card.success {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }
                .stat-card.warning {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }
                .stat-icon {
                    font-size: 28px;
                    margin-bottom: 12px;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .stat-label {
                    font-size: 13px;
                    opacity: 0.8;
                }
                .gst-breakdown {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: 24px;
                }
                .breakdown-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1a1a2e;
                    margin: 0 0 20px 0;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #eee;
                }
                .breakdown-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 24px;
                }
                @media (max-width: 768px) {
                    .breakdown-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .breakdown-item {
                    text-align: center;
                    padding: 20px;
                    background: #f8f9ff;
                    border-radius: 12px;
                }
                .breakdown-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #4a6cf7;
                    margin-bottom: 8px;
                }
                .breakdown-label {
                    font-size: 14px;
                    color: #666;
                    font-weight: 500;
                }
                .info-card {
                    background: #f0f8ff;
                    border: 1px solid #bfdbfe;
                    border-radius: 12px;
                    padding: 16px 20px;
                    margin-top: 24px;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                .info-card-icon {
                    font-size: 20px;
                }
                .info-card-content h4 {
                    margin: 0 0 4px 0;
                    color: #1e40af;
                }
                .info-card-content p {
                    margin: 0;
                    color: #3b82f6;
                    font-size: 14px;
                }
                .loading {
                    text-align: center;
                    padding: 60px;
                    color: #666;
                }
            `}</style>

            <div className="page-header">
                <div>
                    <h1>
                        Tax Reports
                        {activeEntity?.type === 'shop' && (
                            <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                                - {activeEntity.name}
                            </span>
                        )}
                    </h1>
                </div>
                <button className="btn-export" onClick={exportReport}>
                    Export for CA Filing
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

            <div className="controls-card">
                <div className="controls-row">
                    <div className="report-tabs">
                        <button
                            className={`tab-btn ${reportType === 'summary' ? 'active' : ''}`}
                            onClick={() => setReportType('summary')}
                        >
                            Summary
                        </button>
                        <button
                            className={`tab-btn ${reportType === 'gst' ? 'active' : ''}`}
                            onClick={() => setReportType('gst')}
                        >
                            GST Report
                        </button>
                        <button
                            className={`tab-btn ${reportType === 'vat' ? 'active' : ''}`}
                            onClick={() => setReportType('vat')}
                        >
                            VAT Report
                        </button>
                    </div>
                    <div className="period-selector">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                            ))}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {Array.from({ length: 5 }, (_, i) => (
                                <option key={i} value={new Date().getFullYear() - i}>
                                    {new Date().getFullYear() - i}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading tax data...</div>
            ) : reportType === 'summary' && taxSummary ? (
                <>
                    <div className="stats-grid">
                        <div className="stat-card primary">
                            <div className="stat-icon">💰</div>
                            <div className="stat-value">{formatCurrency(taxSummary.total_sales)}</div>
                            <div className="stat-label">Total Sales</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{formatCurrency(taxSummary.net_taxable_value)}</div>
                            <div className="stat-label">Taxable Value</div>
                        </div>
                        <div className="stat-card success">
                            <div className="stat-icon">🏛️</div>
                            <div className="stat-value">{formatCurrency(taxSummary.total_tax_collected)}</div>
                            <div className="stat-label">Total Tax Collected</div>
                        </div>
                        <div className="stat-card warning">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{formatCurrency(taxSummary.gst_amount)}</div>
                            <div className="stat-label">GST Liability</div>
                        </div>
                    </div>

                    <div className="info-card">
                        <span className="info-card-icon">ℹ️</span>
                        <div className="info-card-content">
                            <h4>Tax Filing Reminder</h4>
                            <p>GST returns (GSTR-1, GSTR-3B) must be filed by the 11th and 20th of each month respectively.</p>
                        </div>
                    </div>
                </>
            ) : reportType === 'gst' && gstReport ? (
                <>
                    <div className="stats-grid">
                        <div className="stat-card primary">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{formatCurrency(gstReport.total_taxable_value)}</div>
                            <div className="stat-label">Taxable Value</div>
                        </div>
                        <div className="stat-card success">
                            <div className="stat-icon">🏛️</div>
                            <div className="stat-value">{formatCurrency(gstReport.total_gst)}</div>
                            <div className="stat-label">Total GST</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🧾</div>
                            <div className="stat-value">{gstReport.invoice_count}</div>
                            <div className="stat-label">Invoices</div>
                        </div>
                    </div>

                    <div className="gst-breakdown">
                        <h3 className="breakdown-title">GST Component Breakdown</h3>
                        <div className="breakdown-grid">
                            <div className="breakdown-item">
                                <div className="breakdown-value">{formatCurrency(gstReport.cgst_amount)}</div>
                                <div className="breakdown-label">CGST</div>
                            </div>
                            <div className="breakdown-item">
                                <div className="breakdown-value">{formatCurrency(gstReport.sgst_amount)}</div>
                                <div className="breakdown-label">SGST</div>
                            </div>
                            <div className="breakdown-item">
                                <div className="breakdown-value">{formatCurrency(gstReport.igst_amount)}</div>
                                <div className="breakdown-label">IGST</div>
                            </div>
                            <div className="breakdown-item">
                                <div className="breakdown-value" style={{ color: '#10b981' }}>{formatCurrency(gstReport.total_gst)}</div>
                                <div className="breakdown-label">Total Payable</div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="loading">Select a report type to view data</div>
            )}
        </div>
    );
}
