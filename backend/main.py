"""
PharmaEC Management System - FastAPI Backend
Production-grade pharmacy management API
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
import os
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - runs on startup/shutdown"""
    # Startup: Initialize database tables
    print("Initializing database tables...")
    init_db()
    print("Database initialized successfully!")
    yield
    # Shutdown
    print("Application shutting down...")


app = FastAPI(
    title="PharmaEC Management System API",
    description="Production-grade Pharmacy Management API with comprehensive modules for warehouses, shops, inventory, billing, and more.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Custom Validation Error Handler for debugging
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log detailed validation errors"""
    print("=" * 80)
    print("VALIDATION ERROR DETAILS:")
    print(f"URL: {request.url}")
    print(f"Method: {request.method}")
    print(f"Errors: {exc.errors()}")
    print("=" * 80)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# CORS Configuration - Allow all origins (temporary for testing)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",  # Allow all origins temporarily
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0", "database": "connected"}


# --- SPA Fallback Configuration ---
# Mount static assets from the frontend build directory
# Assuming main.py is in backend/ and dist/ is in the project root
# Use abspath to ensure it works regardless of CWD of execution
current_file = os.path.abspath(__file__)
project_root = os.path.dirname(os.path.dirname(current_file))
dist_dir = os.path.join(project_root, "dist")

if os.path.exists(dist_dir):
    # Mount /assets to serve JS/CSS/Images
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    # Mount other static files if necessary (e.g. vite.svg)
    # Note: For root level files like favicon.ico, we might need specific handlers or just rely on catch-all if they are in dist root.

    # Catch-all route to serve index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_app(full_path: str):
        # Allow API routes to pass through (though they should be matched by routers above)
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc"):
             from fastapi import HTTPException
             raise HTTPException(status_code=404, detail="Not Found")
        
        # Check if file exists in dist (e.g. favicon.ico, manifest.json)
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fallback to index.html
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    print(f"WARNING: Frontend build directory not found at {dist_dir}. SPA serving disabled.")


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, proxy_headers=True, forwarded_allow_ips="*")
