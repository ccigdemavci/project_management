from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from .. import models, schemas
from ..db import get_db
from ..core.auth import get_current_user

router = APIRouter(prefix="/phase-details", tags=["phase_details"])

@router.get("/phase/{phase_id}", response_model=List[schemas.PhaseDetail])
def get_phase_details(
    phase_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify the phase exists and user has access
    phase = db.query(models.ProjectPhase).filter(
        models.ProjectPhase.id == phase_id
    ).first()
    
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    # Get all details for this phase, ordered by sort_order
    details = db.query(models.PhaseDetail)\
        .filter(models.PhaseDetail.phase_id == phase_id)\
        .order_by(models.PhaseDetail.sort_order)\
        .all()
    
    return details

@router.post("/", response_model=schemas.PhaseDetail)
def create_phase_detail(
    detail: schemas.PhaseDetailCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify the phase exists
    phase = db.query(models.ProjectPhase).filter(
        models.ProjectPhase.id == detail.phase_id
    ).first()
    
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    # Create new detail
    db_detail = models.PhaseDetail(**detail.dict())
    db.add(db_detail)
    db.commit()
    db.refresh(db_detail)
    
    return db_detail

@router.put("/{detail_id}", response_model=schemas.PhaseDetail)
def update_phase_detail(
    detail_id: int,
    detail_update: schemas.PhaseDetailUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Get existing detail
    db_detail = db.query(models.PhaseDetail)\
        .filter(models.PhaseDetail.id == detail_id)\
        .first()
    
    if not db_detail:
        raise HTTPException(status_code=404, detail="Detail not found")
    
    # Update fields
    update_data = detail_update.dict(exclude_unset=True)
    
    # Handle completion logic
    if "is_completed" in update_data:
        if update_data["is_completed"]:
            # If marking as complete, set completed_at if not already set
            if not db_detail.completed_at:
                db_detail.completed_at = datetime.utcnow()
        else:
            # If marking as incomplete, clear completed_at
            db_detail.completed_at = None

    for field, value in update_data.items():
        setattr(db_detail, field, value)
    
    db_detail.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_detail)
    
    return db_detail

@router.delete("/{detail_id}")
def delete_phase_detail(
    detail_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_detail = db.query(models.PhaseDetail)\
        .filter(models.PhaseDetail.id == detail_id)\
        .first()
    
    if not db_detail:
        raise HTTPException(status_code=404, detail="Detail not found")
    
    db.delete(db_detail)
    db.commit()
    
    return {"message": "Detail deleted successfully"}

# ======================
# NOTES
# ======================

@router.get("/{detail_id}/notes", response_model=List[schemas.PhaseDetailNoteOut])
def get_phase_detail_notes(
    detail_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notes = db.query(models.PhaseDetailNote)\
        .filter(models.PhaseDetailNote.detail_id == detail_id)\
        .order_by(models.PhaseDetailNote.created_at.desc())\
        .all()
    return notes

@router.post("/notes", response_model=schemas.PhaseDetailNoteOut)
def create_phase_detail_note(
    note: schemas.PhaseDetailNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify detail exists
    detail = db.query(models.PhaseDetail).filter(
        models.PhaseDetail.id == note.detail_id
    ).first()
    
    if not detail:
        raise HTTPException(status_code=404, detail="Phase Detail not found")
    
    db_note = models.PhaseDetailNote(**note.dict())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    return db_note
