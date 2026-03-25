from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import creatives, tiktok, meta, insights, settings
from services.database import init_db

init_db()
app = FastAPI(title="Allu Ads API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(creatives.router)
app.include_router(tiktok.router)
app.include_router(meta.router)
app.include_router(insights.router)
app.include_router(settings.router)

@app.get("/")
def root():
    return {"status": "ok", "app": "Allu Ads API"}
