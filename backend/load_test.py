"""
Load Testing Script - Simulates 500 concurrent users
Run: python load_test.py
"""
import asyncio
import aiohttp
import time
import statistics
from dataclasses import dataclass, field
from typing import List

# Configuration
BASE_URL = "https://host.app.npmtech.in/api/v1"
CONCURRENT_USERS = 1350        # Reduced from 500 - realistic for pool size 150
REQUESTS_PER_USER = 3
REQUEST_DELAY = 0.1          # 100ms delay between requests per user

# Mixed endpoints - all major API routes
ENDPOINTS = [
    # Masters
    "/unified-masters/all",
    "/masters/categories?page=1&size=10",
    "/masters/units?page=1&size=10",
    "/masters/hsn?page=1&size=10",
    "/masters/gst-slabs?page=1&size=10",
    "/masters/suppliers?page=1&size=10",
    "/masters/brands?page=1&size=10",
    "/masters/manufacturers?page=1&size=10",
    "/masters/medicine-types?page=1&size=10",
    "/masters/payment-methods?page=1&size=10",
    "/masters/adjustment-reasons?page=1&size=10",
    # Core Data
    "/medicines?page=1&size=10",
    "/medicines?page=2&size=10",
    "/shops?page=1&size=10",
    "/warehouses?page=1&size=10",
    "/users?page=1&size=10",
    "/customers?page=1&size=10",
    "/employees?page=1&size=10",
    # Stock & Inventory
    "/stock/movements?page=1&size=10",
    "/stock/alerts",
    # Reports
    "/reports/sales",
    "/reports/inventory",
    # Other
    "/notifications?page=1&size=10",
    "/roles",
    "/permissions",
]

@dataclass
class TestResult:
    endpoint: str
    status: int
    response_time: float
    success: bool
    error: str = ""

@dataclass
class TestStats:
    total_requests: int = 0
    successful: int = 0
    failed: int = 0
    response_times: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

async def make_request(session: aiohttp.ClientSession, endpoint: str, token: str = None) -> TestResult:
    """Make a single HTTP request and measure response time"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    start_time = time.perf_counter()
    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
            await response.read()
            elapsed = (time.perf_counter() - start_time) * 1000  # ms
            return TestResult(
                endpoint=endpoint,
                status=response.status,
                response_time=elapsed,
                success=response.status < 400
            )
    except Exception as e:
        elapsed = (time.perf_counter() - start_time) * 1000
        return TestResult(
            endpoint=endpoint,
            status=0,
            response_time=elapsed,
            success=False,
            error=str(e)
        )

async def simulate_user(session: aiohttp.ClientSession, user_id: int, stats: TestStats, token: str = None):
    """Simulate a single user making multiple requests"""
    import random
    for _ in range(REQUESTS_PER_USER):
        # Randomize endpoint order for realistic simulation
        endpoints = ENDPOINTS.copy()
        random.shuffle(endpoints)
        for endpoint in endpoints[:5]:  # Only hit 5 random endpoints per round
            result = await make_request(session, endpoint, token)
            stats.total_requests += 1
            stats.response_times.append(result.response_time)
            if result.success:
                stats.successful += 1
            else:
                stats.failed += 1
                if result.error:
                    stats.errors.append(f"User {user_id}: {result.error}")
            await asyncio.sleep(REQUEST_DELAY)  # Stagger requests

async def get_auth_token(session: aiohttp.ClientSession) -> str:
    """Get authentication token (optional - modify credentials as needed)"""
    try:
        login_url = f"{BASE_URL}/auth/login"
        data = aiohttp.FormData()
        data.add_field('username', 'admin@pharmaec.com')  # Change to valid credentials
        data.add_field('password', 'admin123')           # Change to valid credentials
        
        async with session.post(login_url, data=data) as response:
            if response.status == 200:
                json_data = await response.json()
                return json_data.get('access_token', '')
    except:
        pass
    return ""

async def run_load_test():
    """Main load test runner"""
    print(f"\n{'='*60}")
    print(f"  LOAD TEST: {CONCURRENT_USERS} Concurrent Users")
    print(f"  Requests per user: {REQUESTS_PER_USER}")
    print(f"  Endpoints: {len(ENDPOINTS)}")
    print(f"  Total expected requests: {CONCURRENT_USERS * REQUESTS_PER_USER * len(ENDPOINTS)}")
    print(f"{'='*60}\n")
    
    stats = TestStats()
    
    # Create connection pool
    connector = aiohttp.TCPConnector(limit=CONCURRENT_USERS, limit_per_host=CONCURRENT_USERS)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        # Optional: Get auth token
        print("Getting auth token...")
        token = await get_auth_token(session)
        if token:
            print("✓ Authenticated successfully\n")
        else:
            print("⚠ Running without authentication (some endpoints may fail)\n")
        
        print(f"Starting load test with {CONCURRENT_USERS} concurrent users...")
        start_time = time.perf_counter()
        
        # Create all user tasks
        tasks = [
            simulate_user(session, user_id, stats, token)
            for user_id in range(CONCURRENT_USERS)
        ]
        
        # Run all users concurrently
        await asyncio.gather(*tasks)
        
        total_time = time.perf_counter() - start_time
    
    # Print results
    print(f"\n{'='*60}")
    print("  RESULTS")
    print(f"{'='*60}")
    print(f"  Total Time:        {total_time:.2f} seconds")
    print(f"  Total Requests:    {stats.total_requests}")
    print(f"  Successful:        {stats.successful} ({100*stats.successful/stats.total_requests:.1f}%)")
    print(f"  Failed:            {stats.failed} ({100*stats.failed/stats.total_requests:.1f}%)")
    print(f"  Requests/sec:      {stats.total_requests/total_time:.2f}")
    
    if stats.response_times:
        print(f"\n  Response Times (ms):")
        print(f"    Min:             {min(stats.response_times):.2f}")
        print(f"    Max:             {max(stats.response_times):.2f}")
        print(f"    Average:         {statistics.mean(stats.response_times):.2f}")
        print(f"    Median:          {statistics.median(stats.response_times):.2f}")
        if len(stats.response_times) > 1:
            print(f"    Std Dev:         {statistics.stdev(stats.response_times):.2f}")
        
        # Percentiles
        sorted_times = sorted(stats.response_times)
        p90_idx = int(len(sorted_times) * 0.90)
        p95_idx = int(len(sorted_times) * 0.95)
        p99_idx = int(len(sorted_times) * 0.99)
        print(f"    P90:             {sorted_times[p90_idx]:.2f}")
        print(f"    P95:             {sorted_times[p95_idx]:.2f}")
        print(f"    P99:             {sorted_times[p99_idx]:.2f}")
    
    if stats.errors:
        print(f"\n  Sample Errors (first 5):")
        for err in stats.errors[:5]:
            print(f"    - {err[:80]}")
    
    print(f"{'='*60}\n")

if __name__ == "__main__":
    print("Installing required package if needed...")
    try:
        import aiohttp
    except ImportError:
        import subprocess
        subprocess.run(["pip", "install", "aiohttp"], check=True)
    
    asyncio.run(run_load_test())
