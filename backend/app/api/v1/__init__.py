"""
API v1 Router - Aggregates all route modules
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.warehouses import router as warehouses_router
from app.api.v1.shops import router as shops_router
from app.api.v1.medicines import router as medicines_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.purchase_requests import router as purchase_requests_router
from app.api.v1.dispatches import router as dispatches_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.customers import router as customers_router
from app.api.v1.employees import router as employees_router
from app.api.v1.reports import router as reports_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.settings import router as settings_router
from app.api.v1.roles import router as roles_router
from app.api.v1.permissions import router as permissions_router  # NEW
from app.api.v1.tax import router as tax_router
# New Super Admin Dashboard Routes
from app.api.v1.racks import router as racks_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.login_activity import router as login_activity_router
from app.api.v1.masters import router as masters_router
from app.api.v1.master_options import router as master_options_router
from app.api.v1.unified_masters import router as unified_masters_router  # SSOT Masters
from app.api.v1.inventory_alerts import router as inventory_alerts_router

router = APIRouter()

# Mount all routers
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(users_router, prefix="/users", tags=["Users"])
router.include_router(roles_router, prefix="/roles", tags=["Roles"])
router.include_router(permissions_router, prefix="/permissions", tags=["Permissions"])  # NEW
router.include_router(warehouses_router, prefix="/warehouses", tags=["Warehouses"])
router.include_router(shops_router, prefix="/shops", tags=["Medical Shops"])
router.include_router(medicines_router, prefix="/medicines", tags=["Medicines"])
router.include_router(inventory_router, prefix="/stock", tags=["Inventory"])
router.include_router(inventory_alerts_router, prefix="/inventory/alerts", tags=["Inventory Alerts"])
router.include_router(purchase_requests_router, prefix="/purchase-requests", tags=["Purchase Requests"])
router.include_router(dispatches_router, prefix="/dispatches", tags=["Dispatches"])
router.include_router(invoices_router, prefix="/invoices", tags=["Invoices"])
router.include_router(customers_router, prefix="/customers", tags=["Customers"])
router.include_router(employees_router, prefix="/employees", tags=["Employees"])
router.include_router(reports_router, prefix="/reports", tags=["Reports"])
router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
router.include_router(settings_router, prefix="/settings", tags=["Settings"])
router.include_router(tax_router, prefix="/tax", tags=["Tax & Accounting"])
# New Super Admin Dashboard Routes
router.include_router(racks_router, prefix="/racks", tags=["Rack Master"])
router.include_router(audit_logs_router, prefix="/audit-logs", tags=["Audit Logs"])
router.include_router(login_activity_router, prefix="/login-activity", tags=["Login Activity"])
router.include_router(masters_router, prefix="/masters", tags=["Masters"])
router.include_router(master_options_router)  # Already has /master-options prefix
router.include_router(unified_masters_router, prefix="/unified-masters", tags=["SSOT Masters"])
