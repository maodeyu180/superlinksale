from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from pathlib import Path
import os
import html

from .database import get_db, init_db
from . import models, schemas
from .auth import verify_password, create_access_token, verify_token
from .utils import generate_short_code

app = FastAPI(title="SuperLinkSale API", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:18080").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

frontend_path = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(frontend_path / "static")), name="static")

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/", response_class=HTMLResponse)
async def home():
    index_file = frontend_path / "index.html"
    with open(index_file, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/admin", response_class=HTMLResponse)
async def admin():
    admin_file = frontend_path / "admin.html"
    with open(admin_file, "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/auth/login", response_model=schemas.LoginResponse)
def login(request: schemas.LoginRequest):
    if not verify_password(request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    access_token = create_access_token(data={"sub": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/links", response_model=schemas.LinkResponse)
def create_link(
    link: schemas.LinkCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    short_code = generate_short_code()
    while db.query(models.Link).filter(models.Link.short_code == short_code).first():
        short_code = generate_short_code()

    db_link = models.Link(
        short_code=short_code,
        original_url=link.original_url,
        title=link.title,
        description=link.description,
        expire_at=link.expire_at,
        max_clicks=link.max_clicks
    )
    db.add(db_link)
    db.commit()
    db.refresh(db_link)
    return db_link

@app.get("/api/links", response_model=list[schemas.LinkResponse])
def get_links(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    links = db.query(models.Link).filter(models.Link.is_deleted == False).offset(skip).limit(limit).all()
    return links

@app.get("/api/links/{short_code}", response_model=schemas.LinkResponse)
def get_link(
    short_code: str,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    link = db.query(models.Link).filter(models.Link.short_code == short_code).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total_links = db.query(models.Link).count()
    total_clicks = db.query(models.Link).with_entities(
        models.Link.click_count
    ).all()
    total_clicks_sum = sum(link[0] for link in total_clicks)

    return {
        "total_links": total_links,
        "total_clicks": total_clicks_sum
    }

@app.put("/api/links/{short_code}", response_model=schemas.LinkResponse)
def update_link(
    short_code: str,
    link_update: schemas.LinkUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    link = db.query(models.Link).filter(models.Link.short_code == short_code).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    update_data = link_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(link, key, value)
    
    link.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(link)
    return link

@app.delete("/api/links/{short_code}")
def delete_link(
    short_code: str,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    link = db.query(models.Link).filter(models.Link.short_code == short_code).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.is_deleted = True
    link.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Link deleted successfully"}

@app.post("/api/templates", response_model=schemas.TemplateResponse)
def create_template(
    template: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    db_template = models.Template(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@app.get("/api/templates", response_model=list[schemas.TemplateResponse])
def get_templates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    templates = db.query(models.Template).offset(skip).limit(limit).all()
    return templates

@app.get("/api/templates/{template_id}", response_model=schemas.TemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@app.put("/api/templates/{template_id}", response_model=schemas.TemplateResponse)
def update_template(
    template_id: int,
    template_update: schemas.TemplateUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    
    db.commit()
    db.refresh(template)
    return template

@app.delete("/api/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token)
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}

@app.get("/l/{short_code}", response_class=HTMLResponse)
async def link_preview(short_code: str, db: Session = Depends(get_db)):
    link = db.query(models.Link).filter(models.Link.short_code == short_code).first()

    if not link or link.is_deleted:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.expire_at and link.expire_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Link has expired")

    if link.max_clicks is not None and link.click_count >= link.max_clicks:
        raise HTTPException(status_code=403, detail="Link has reached maximum clicks")

    link.click_count += 1
    db.commit()

    preview_file = frontend_path / "preview.html"
    with open(preview_file, "r", encoding="utf-8") as f:
        html_content = f.read()

    html_content = html_content.replace("{{SHORT_CODE}}", html.escape(short_code))
    html_content = html_content.replace("{{TITLE}}", html.escape(link.title or "提货信息"))
    html_content = html_content.replace("{{DESCRIPTION}}", html.escape(link.description or ""))
    html_content = html_content.replace("{{ORIGINAL_URL}}", html.escape(link.original_url or ""))
    html_content = html_content.replace("{{CLICK_COUNT}}", str(link.click_count))

    return html_content

@app.get("/{short_code}", response_class=HTMLResponse)
async def view_link(short_code: str, db: Session = Depends(get_db)):
    link = db.query(models.Link).filter(models.Link.short_code == short_code).first()

    if not link or link.is_deleted:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.expire_at and link.expire_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Link has expired")

    if link.max_clicks is not None and link.click_count >= link.max_clicks:
        raise HTTPException(status_code=403, detail="Link has reached maximum clicks")

    link.click_count += 1
    db.commit()

    preview_file = frontend_path / "preview.html"
    with open(preview_file, "r", encoding="utf-8") as f:
        html_content = f.read()

    html_content = html_content.replace("{{SHORT_CODE}}", html.escape(short_code))
    html_content = html_content.replace("{{TITLE}}", html.escape(link.title or "提货信息"))
    html_content = html_content.replace("{{DESCRIPTION}}", html.escape(link.description or ""))
    html_content = html_content.replace("{{ORIGINAL_URL}}", html.escape(link.original_url or ""))
    html_content = html_content.replace("{{CLICK_COUNT}}", str(link.click_count))

    return html_content
