"""
Employee and HR schemas
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"


class EmployeeStatus(str, Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LEAVE = "leave"
    HOLIDAY = "holiday"


# Employee
class EmployeeBase(BaseModel):
    employee_code: str
    name: str = Field(min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: str
    designation: str
    department: str
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    date_of_joining: date
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    emergency_contact: Optional[str] = None
    bank_account: Optional[str] = None
    pan_number: Optional[str] = None
    pf_number: Optional[str] = None
    esi_number: Optional[str] = None
    basic_salary: float = Field(gt=0)
    # Salary component percentages
    hra_percent: float = Field(default=40.0, ge=0, le=100)
    allowances_percent: float = Field(default=20.0, ge=0, le=100)
    pf_percent: float = Field(default=12.0, ge=0, le=100)
    esi_percent: float = Field(default=0.75, ge=0, le=100)
    esi_applicable: bool = True


class EmployeeCreate(EmployeeBase):
    employee_code: Optional[str] = None
    shop_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    user_id: Optional[str] = None
    password: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    address: Optional[str] = None
    city: Optional[str] = None
    emergency_contact: Optional[str] = None
    bank_account: Optional[str] = None
    basic_salary: Optional[float] = None
    status: Optional[EmployeeStatus] = None


class EmployeeResponse(EmployeeBase):
    id: str
    shop_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    status: EmployeeStatus
    created_at: datetime

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    size: int


# Attendance
class AttendanceBase(BaseModel):
    employee_id: str
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceResponse(AttendanceBase):
    id: str
    employee_name: Optional[str] = None
    working_hours: float = 0.0

    class Config:
        from_attributes = True


# Salary
class SalaryRecordBase(BaseModel):
    employee_id: str
    month: int = Field(ge=1, le=12)
    year: int
    basic_salary: float
    hra: float = 0.0
    allowances: float = 0.0
    deductions: float = 0.0
    pf_deduction: float = 0.0
    esi_deduction: float = 0.0
    tax_deduction: float = 0.0
    bonus: float = 0.0


class SalaryRecordResponse(SalaryRecordBase):
    id: str
    employee_name: Optional[str] = None
    gross_salary: float = 0.0
    net_salary: float = 0.0
    is_paid: bool = False
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessSalaryRequest(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int
    employee_ids: Optional[list[str]] = None  # None means all employees


# Performance
class PerformanceBase(BaseModel):
    employee_id: str
    period_start: date
    period_end: date
    sales_target: float = 0.0
    sales_achieved: float = 0.0
    rating: float = Field(ge=0, le=5, default=0.0)
    notes: Optional[str] = None


class PerformanceResponse(PerformanceBase):
    id: str
    employee_name: Optional[str] = None
    achievement_percent: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True
