import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..core.auth import get_current_user
from ..models import Project, ProjectMember, ProjectFile, User
from ..schemas import ProjectFileOut
from ..core.config import UPLOAD_DIR  # 4. adımda tanımladık

router = APIRouter(prefix="/projects", tags=["Project Files"])

MAX_SIZE = 20 * 1024 * 1024  # 20 MB

def _require_read(db: Session, pid: int, user: User) -> Project:
    proj = db.query(Project).filter(Project.id == pid).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin":
        is_owner = (proj.owner_id == user.id)
        is_member = db.query(ProjectMember).filter_by(project_id=pid, user_id=user.id).first() is not None
        if not (is_owner or is_member):
            raise HTTPException(status_code=403, detail="No access to this project")
    return proj

def _require_manage(db: Session, pid: int, user: User) -> Project:
    proj = _require_read(db, pid, user)
    if user.role != "admin" and proj.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only admin/owner can delete files")
    return proj

@router.get("/{pid}/files", response_model=List[ProjectFileOut])
def list_files(
    pid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_read(db, pid, current_user)
    files = (
        db.query(ProjectFile)
        .filter(ProjectFile.project_id == pid)
        .order_by(ProjectFile.created_at.desc())
        .all()
    )
    return files

@router.post("/{pid}/files", response_model=ProjectFileOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    pid: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_read(db, pid, current_user)

    # boyut kontrolü (UploadFile'ta stream var; hızlı kontrol için size_bytes'ı len(await file.read()) yapıp sonra seek(0))
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")
    await file.seek(0)

    # proje klasörü
    proj_dir = os.path.join(UPLOAD_DIR, "projects", str(pid))
    os.makedirs(proj_dir, exist_ok=True)

    # benzersiz dosya adı
    rnd = uuid.uuid4().hex
    stored_name = f"{rnd}"
    stored_path = os.path.join(proj_dir, stored_name)

    # diske yaz
    with open(stored_path, "wb") as f:
        f.write(await file.read())

    pf = ProjectFile(
        project_id=pid,
        uploader_id=current_user.id,
        filename=file.filename,
        stored_path=stored_path,
        content_type=file.content_type,
        size_bytes=os.path.getsize(stored_path),
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)
    return pf

@router.get("/{pid}/files/{file_id}")
def download_file(
    pid: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_read(db, pid, current_user)

    pf = db.query(ProjectFile).filter_by(id=file_id, project_id=pid).first()
    if not pf:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(pf.stored_path):
        raise HTTPException(status_code=410, detail="File missing on server")

    return FileResponse(
        pf.stored_path,
        media_type=pf.content_type or "application/octet-stream",
        filename=pf.filename,
    )

@router.delete("/{pid}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    pid: int,
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manage(db, pid, current_user)

    pf = db.query(ProjectFile).filter_by(id=file_id, project_id=pid).first()
    if not pf:
        raise HTTPException(status_code=404, detail="File not found")

    # DB'den sil
    db.delete(pf)
    db.commit()

    # dosyayı diskte sil (varsa)
    try:
        if os.path.exists(pf.stored_path):
            os.remove(pf.stored_path)
    except Exception:
        # dosya yoksa ya da izin hatası varsa DB silinmiş olduğu için 204 dönüyoruz
        pass

    return