import os
import logging
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from routers import creatives, tiktok, meta, insights, settings, auth
from services.database import init_db
from services.auth import get_current_user

logging.basicConfig(level=logging.INFO)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

init_db()
app = FastAPI(title="Allu Ads API", version="1.0.0")

origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas públicas
app.include_router(auth.router)

# Rotas protegidas
_auth = [Depends(get_current_user)]
app.include_router(creatives.router, dependencies=_auth)
app.include_router(tiktok.router,    dependencies=_auth)
app.include_router(meta.router,      dependencies=_auth)
app.include_router(insights.router,  dependencies=_auth)
app.include_router(settings.router,  dependencies=_auth)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Erro interno: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": origin},
    )


@app.get("/")
def root():
    return {"status": "ok", "app": "Allu Ads API"}
