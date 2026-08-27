import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Header, Status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(
    title="SentinelFin Threat Shield API",
    description="Python FastAPI backend powering SentinelFin AI Threat Intercept & Payment Shield.",
    version="1.0.0"
)

# Enable CORS for Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    phone: str
    city: Optional[str] = "Bengaluru"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    fullName: str
    phone: str
    phoneVerified: bool = True
    onboardingCompleted: bool = False
    city: Optional[str] = "Bengaluru"
    profilePhoto: Optional[str] = None

class FinancialProfile(BaseModel):
    monthlyIncome: int = 75000
    spendingTarget: int = 35000
    savingsGoal: int = 15000
    currency: str = "INR ₹"

class SecurityProfile(BaseModel):
    protectionLevel: str = "High Protection"
    securityAlertsEnabled: bool = True
    newDeviceAlerts: bool = True
    transactionAlerts: bool = True

class Transaction(BaseModel):
    id: str
    userId: str
    title: str
    recipientVpa: Optional[str] = None
    recipientPhone: Optional[str] = None
    amount: float
    category: str
    type: str  # 'debit' | 'credit'
    status: str  # 'completed' | 'flagged' | 'blocked'
    timestamp: str
    threatScore: int = 0
    riskReason: Optional[str] = None

class Device(BaseModel):
    id: str
    userId: str
    name: str
    browser: str
    isCurrent: bool = False
    isTrusted: bool = True
    lastActive: str
    location: Optional[str] = "Bengaluru, KA, India"
    fingerprint: Optional[str] = None

class Contact(BaseModel):
    id: str
    userId: str
    name: str
    phone: str
    email: Optional[str] = None
    vpa: Optional[str] = None
    isFavorite: bool = False
    isNew: bool = True

class OnboardingRequest(BaseModel):
    personalInfo: Optional[dict] = None
    financialProfile: Optional[dict] = None
    budgetSetup: Optional[dict] = None
    securityPreferences: Optional[dict] = None

# ------------------------------------------------------------------------------
# In-Memory Database Simulation
# ------------------------------------------------------------------------------

db_users = {}
db_tokens = {}
db_transactions = []
db_devices = []
db_contacts = []
db_alerts = []

# Pre-seed demo user
demo_user = UserProfile(
    id="usr-1",
    email="sujan@sentinelfin.ai",
    fullName="Sujan Kumar",
    phone="+919876543210",
    phoneVerified=True,
    onboardingCompleted=True,
    city="Bengaluru, KA",
)
db_users[demo_user.id] = {
    "profile": demo_user,
    "financial": FinancialProfile(),
    "security": SecurityProfile(),
    "password_hash": "demo123"
}
db_tokens["sentinel-demo-token-123"] = demo_user.id

# Seed initial transaction
db_transactions.append(
    Transaction(
        id="tx-101",
        userId=demo_user.id,
        title="Swiggy Food Delivery",
        amount=480.0,
        category="Food & Dining",
        type="debit",
        status="completed",
        timestamp="2026-08-12T08:30:00Z",
        threatScore=12
    )
)

# Seed initial device
db_devices.append(
    Device(
        id="dev-1",
        userId=demo_user.id,
        name="Chrome on Windows",
        browser="Chrome 122",
        isCurrent=True,
        isTrusted=True,
        lastActive="2026-08-12T09:00:00Z",
        location="Bengaluru, KA, India"
    )
)

# ------------------------------------------------------------------------------
# Auth Helper Dependency
# ------------------------------------------------------------------------------

def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: Missing Bearer Token")
    token = authorization.split(" ")[1]
    user_id = db_tokens.get(token)
    if not user_id or user_id not in db_users:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Session Token")
    return db_users[user_id]["profile"]

# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "framework": "FastAPI", "version": "1.0.0"}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    for u in db_users.values():
        if u["profile"].email == req.email:
            raise HTTPException(status_code=400, detail="Account with this email already exists.")
    
    user_id = f"usr-{int(time.time())}"
    token = f"stkn-{user_id}-{int(time.time())}"
    
    new_user = UserProfile(
        id=user_id,
        email=req.email,
        fullName=req.fullName,
        phone=req.phone,
        phoneVerified=True,
        onboardingCompleted=False,
        city=req.city or "Bengaluru"
    )
    
    db_users[user_id] = {
        "profile": new_user,
        "financial": FinancialProfile(),
        "security": SecurityProfile(),
        "password_hash": req.password
    }
    db_tokens[token] = user_id
    
    return {
        "token": token,
        "user": new_user,
        "financialProfile": db_users[user_id]["financial"],
        "securityProfile": db_users[user_id]["security"]
    }

@app.post("/api/auth/login")
def login(req: LoginRequest):
    found_id = None
    for uid, udata in db_users.items():
        if udata["profile"].email == req.email:
            if udata["password_hash"] == req.password:
                found_id = uid
                break
            else:
                raise HTTPException(status_code=400, detail="Invalid credentials.")
    
    if not found_id:
        raise HTTPException(status_code=400, detail="User account not found.")
    
    token = f"stkn-{found_id}-{int(time.time())}"
    db_tokens[token] = found_id
    
    return {
        "token": token,
        "user": db_users[found_id]["profile"],
        "financialProfile": db_users[found_id]["financial"],
        "securityProfile": db_users[found_id]["security"]
    }

@app.get("/api/auth/me")
def get_me(user: UserProfile = Depends(get_current_user)):
    udata = db_users[user.id]
    return {
        "user": user,
        "financialProfile": udata["financial"],
        "securityProfile": udata["security"]
    }

@app.post("/api/users/me/onboarding")
def complete_onboarding(req: OnboardingRequest, user: UserProfile = Depends(get_current_user)):
    user.onboardingCompleted = True
    if req.personalInfo:
        if "fullName" in req.personalInfo:
            user.fullName = req.personalInfo["fullName"]
        if "city" in req.personalInfo:
            user.city = req.personalInfo["city"]
        if "profilePhoto" in req.personalInfo:
            user.profilePhoto = req.personalInfo["profilePhoto"]
    
    return {"success": True, "user": user}

@app.get("/api/transactions")
def get_transactions(user: UserProfile = Depends(get_current_user)):
    return [t for t in db_transactions if t.userId == user.id]

@app.get("/api/devices")
def get_devices(user: UserProfile = Depends(get_current_user)):
    user_devs = [d for d in db_devices if d.userId == user.id]
    current = [d for d in user_devs if d.isCurrent]
    return current[:1] if current else user_devs[:1]

@app.get("/api/contacts")
def get_contacts(user: UserProfile = Depends(get_current_user)):
    return [c for c in db_contacts if c.userId == user.id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
