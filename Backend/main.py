from typing import Optional
from fastapi import Depends, FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.inspection import inspect as sa_inspect
from sqlalchemy.orm import Session
from database import Base, SessionLocal, engine
from datetime import date, timedelta
from sqlalchemy import func, case
from models import (User,
                    StudentProfile,
                    TeacherProfile,
                    CompanyProfile,
                    Internship,
                    SavedInternship,
                    InternshipApplication,
                    InternshipProgress,
                    StudentDeadline,
                    CertificateSubmission,
                    ProjectSubmission,
                    Roadmap,
                    RoadmapStep,
                    StudentRoadmapProgress,
                    Resource,
                    SavedResource,
                    ConsentLetter,
                    DailyReport,
                    ApplicationEvent,
                    InternshipAttendance,
                    InternshipDocument,
                    InternshipMilestone
                    )


Base.metadata.create_all(bind=engine)

# Lightweight SQLite migration for eligibility fields added after the
# internships table may already have been created.
if engine.dialect.name == "sqlite":
    with engine.begin() as connection:
        existing_columns = {
            row[1]
            for row in connection.exec_driver_sql(
                "PRAGMA table_info(internships)"
            ).fetchall()
        }
        required_columns = {
            "min_cgpa": "FLOAT",
            "eligible_departments": "VARCHAR",
            "eligible_years": "VARCHAR",
        }
        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE internships ADD COLUMN "
                    f"{column_name} {column_type}"
                )


def sa_to_dict(obj):
    """Recursively convert SQLAlchemy ORM model instances (including inside
    lists/dicts) into plain JSON-serializable data. Returning raw ORM objects
    directly from a route crashes FastAPI's default encoder because it tries
    to serialize SQLAlchemy's internal `_sa_instance_state`, so every route
    below relies on this via ORMJSONResponse instead of converting manually."""
    if isinstance(obj, list):
        return [sa_to_dict(item) for item in obj]
    if isinstance(obj, tuple):
        return [sa_to_dict(item) for item in obj]
    if isinstance(obj, dict):
        return {key: sa_to_dict(value) for key, value in obj.items()}
    if isinstance(obj, Base):
        return {column.key: sa_to_dict(getattr(obj, column.key)) for column in sa_inspect(obj).mapper.column_attrs}
    return obj


class ORMJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return super().render(jsonable_encoder(sa_to_dict(content)))


app = FastAPI(title="Intern-Veri API", default_response_class=ORMJSONResponse)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def require_user(db, user_id, roles=None):
    user = db.get(User, user_id)
    if not user: raise HTTPException(404, "User not found")
    if roles and user.role not in roles: raise HTTPException(403, "This action is not available for this role")
    return user

def company_for_user(db, user_id):
    require_user(db, user_id, ["company"])
    profile = db.query(CompanyProfile).filter_by(user_id=user_id).first()
    if not profile: raise HTTPException(404, "Create your company profile first")
    return profile

class Auth(BaseModel): email: str; password: str; role: str
class StudentProfileIn(BaseModel):
    user_id: int; full_name: Optional[str] = None; phone: Optional[str] = None; college: Optional[str] = None; department: Optional[str] = None; year: Optional[str] = None; cgpa: Optional[str] = None; skills: Optional[str] = None; github: Optional[str] = None; linkedin: Optional[str] = None; resume: Optional[str] = None
class TeacherProfileIn(BaseModel):
    user_id: int; full_name: Optional[str] = None; phone: Optional[str] = None; college: Optional[str] = None; department: Optional[str] = None; designation: Optional[str] = None; employee_id: Optional[int] = None; subjects: Optional[str] = None
class CompanyProfileIn(BaseModel):
    user_id: int; company_name: str; company_email: str; phone: Optional[str] = None; website: Optional[str] = None; industry: Optional[str] = None; location: Optional[str] = None; description: Optional[str] = None
class InternshipIn(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    mode: Optional[str] = None
    duration: Optional[str] = None
    stipend: Optional[str] = None
    skills_required: Optional[str] = None

    # Eligibility requirements
    min_cgpa: Optional[float] = None
    eligible_departments: Optional[str] = None
    eligible_years: Optional[str] = None

    deadline: Optional[str] = None
class RoadmapCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_duration: Optional[str] = None
    created_by: Optional[int] = None


class RoadmapStepCreate(BaseModel):
    step_number: int
    title: str
    description: Optional[str] = None
    duration: Optional[str] = None


class RoadmapProgressUpdate(BaseModel):
    user_id: int
    roadmap_step_id: int
    status: str

class ConsentLetterStatusUpdate(BaseModel):
    status: str


@app.get("/")
def home(): return {"message": "Intern-Veri Backend is Running!"}

@app.post("/register")
def register(data: Auth, db: Session = Depends(get_db)):
    role = {"mentor": "teacher", "training": "training"}.get(data.role.lower(), data.role.lower())
    if role not in {"student", "company", "teacher", "training"}: raise HTTPException(400, "Role must be student, company, mentor, or training")
    if db.query(User).filter_by(email=data.email).first(): raise HTTPException(400, "Email already registered")
    user = User(email=data.email, password=data.password, role=role); db.add(user); db.commit(); db.refresh(user)
    return {"message":"User registered successfully", "user_id":user.id, "email":user.email, "role":"mentor" if role == "teacher" else role}

@app.post("/login")
def login(data: Auth, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email).first()
    requested = {"mentor":"teacher"}.get(data.role.lower(), data.role.lower())
    if not user or user.password != data.password: raise HTTPException(401, "Invalid email or password")
    if user.role != requested: raise HTTPException(403, f"This account is registered as {'mentor' if user.role == 'teacher' else user.role}")
    return {"message":"Login successful", "email":user.email, "role":"mentor" if user.role == "teacher" else user.role, "user_id":user.id}

def upsert_profile(db, model, data, role):
    require_user(db, data.user_id, [role]); obj = db.query(model).filter_by(user_id=data.user_id).first()
    values = data.model_dump()
    if obj:
        for key, value in values.items():
            setattr(obj, key, value)
    else: obj = model(**values); db.add(obj)
    db.commit(); db.refresh(obj); return obj

@app.post("/student/profile")
@app.put("/student/profile/{user_id}")
def save_student_profile(data: StudentProfileIn, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    if user_id is not None and data.user_id != user_id: raise HTTPException(400, "User id does not match profile")
    return upsert_profile(db, StudentProfile, data, "student")
@app.get("/student/profile/{user_id}")
def get_student_profile(user_id: int, db: Session = Depends(get_db)):
    p = db.query(StudentProfile).filter_by(user_id=user_id).first()
    if not p: raise HTTPException(404, "Student profile not found")
    return p

@app.post("/teacher/profile")
@app.put("/teacher/profile/{user_id}")
def save_teacher_profile(data: TeacherProfileIn, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    if user_id is not None and data.user_id != user_id: raise HTTPException(400, "User id does not match profile")
    return upsert_profile(db, TeacherProfile, data, "teacher")
@app.get("/teacher/profile/{user_id}")
def get_teacher_profile(user_id: int, db: Session = Depends(get_db)):
    return db.query(TeacherProfile).filter_by(user_id=user_id).first() or {"user_id":user_id}

@app.post("/company/profile")
def save_company_profile(data: CompanyProfileIn, db: Session = Depends(get_db)): return upsert_profile(db, CompanyProfile, data, "company")
@app.get("/company/profile/{user_id}")
def get_company_profile(user_id: int, db: Session = Depends(get_db)):
    return company_for_user(db, user_id)
@app.put("/company/profile/{user_id}")
def update_company_profile(user_id: int, data: CompanyProfileIn, db: Session = Depends(get_db)):
    if data.user_id != user_id: raise HTTPException(400, "User id does not match profile")
    return upsert_profile(db, CompanyProfile, data, "company")

@app.get("/internships")
def internships(db: Session = Depends(get_db)): return db.query(Internship).filter_by(status="approved").all()
@app.get("/internships/{internship_id}")
def internship(internship_id: int, db: Session = Depends(get_db)):
    item = db.get(Internship, internship_id)
    if not item: raise HTTPException(404, "Internship not found")
    return item
@app.get("/company/internships")
def company_internships(user_id: int, db: Session = Depends(get_db)):
    company = company_for_user(db, user_id); return db.query(Internship).filter_by(company_id=company.id).all()
@app.post("/company/internships")
def create_company_internship(user_id: int, data: InternshipIn, db: Session = Depends(get_db)):
    company = company_for_user(db, user_id); item = Internship(company_id=company.id, company=company.company_name, **data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item
@app.put("/company/internships/{internship_id}")
def update_company_internship(internship_id: int, user_id: int, data: InternshipIn, db: Session = Depends(get_db)):
    company = company_for_user(db, user_id); item = db.get(Internship, internship_id)
    if not item or item.company_id != company.id: raise HTTPException(404, "Internship not found")
    for key, value in data.model_dump().items(): setattr(item, key, value)
    item.status = "pending"; db.commit(); db.refresh(item); return item
@app.delete("/company/internships/{internship_id}")
def delete_company_internship(internship_id: int, user_id: int, db: Session = Depends(get_db)):
    company = company_for_user(db, user_id); item = db.get(Internship, internship_id)
    if not item or item.company_id != company.id: raise HTTPException(404, "Internship not found")
    db.delete(item); db.commit(); return {"message":"Internship deleted"}

@app.post("/student/saved-internships")
def save_internship(user_id: int, internship_id: int, db: Session = Depends(get_db)):
    require_user(db, user_id, ["student"])
    if not db.get(Internship, internship_id): raise HTTPException(404, "Internship not found")
    if db.query(SavedInternship).filter_by(user_id=user_id, internship_id=internship_id).first(): raise HTTPException(400, "Internship already saved")
    db.add(SavedInternship(user_id=user_id, internship_id=internship_id)); db.commit(); return {"message":"Internship saved"}
@app.get("/student/saved-internships")
def saved_internships(user_id: int, db: Session = Depends(get_db)): return db.query(SavedInternship).filter_by(user_id=user_id).all()
@app.delete("/student/saved-internships")
def unsave_internship(user_id: int, internship_id: int, db: Session = Depends(get_db)):
    item = db.query(SavedInternship).filter_by(user_id=user_id, internship_id=internship_id).first()
    if not item: raise HTTPException(404, "Saved internship not found")
    db.delete(item); db.commit(); return {"message":"Internship removed"}

@app.post("/student/applications")
def apply(user_id: int, internship_id: int, db: Session = Depends(get_db)):
    require_user(db, user_id, ["student"])

    internship = db.get(Internship, internship_id)
    if not internship or internship.status != "approved":
        raise HTTPException(404, "Approved internship not found")

    if db.query(InternshipApplication).filter_by(
        user_id=user_id,
        internship_id=internship_id
    ).first():
        raise HTTPException(400, "Already applied for this internship")

    student = db.query(StudentProfile).filter_by(user_id=user_id).first()
    if not student:
        raise HTTPException(
            400,
            "Complete your student profile before applying"
        )

    reasons = []

    # CGPA check
    if internship.min_cgpa is not None:
        try:
            student_cgpa = float(student.cgpa)
        except (TypeError, ValueError):
            student_cgpa = 0.0

        if student_cgpa < internship.min_cgpa:
            reasons.append(
                f"Minimum CGPA required is {internship.min_cgpa}, "
                f"but your CGPA is {student.cgpa or 'not provided'}"
            )

    # Department check
    if internship.eligible_departments:
        allowed_departments = {
            department.strip().lower()
            for department in internship.eligible_departments.split(",")
            if department.strip()
        }

        student_department = (
            student.department.strip().lower()
            if student.department else ""
        )

        if allowed_departments and student_department not in allowed_departments:
            reasons.append(
                f"This internship is only open to: "
                f"{internship.eligible_departments}"
            )

    # Year check
    if internship.eligible_years:
        allowed_years = {
            year.strip().lower()
            for year in internship.eligible_years.split(",")
            if year.strip()
        }

        student_year = (
            student.year.strip().lower()
            if student.year else ""
        )

        if allowed_years and student_year not in allowed_years:
            reasons.append(
                f"This internship is only open to: "
                f"{internship.eligible_years}"
            )

    # Skills check
    if internship.skills_required:
        required_skills = {
            skill.strip().lower()
            for skill in internship.skills_required.split(",")
            if skill.strip()
        }

        student_skills = {
            skill.strip().lower()
            for skill in (student.skills or "").split(",")
            if skill.strip()
        }

        missing_skills = sorted(required_skills - student_skills)

        if missing_skills:
            reasons.append(
                "Missing required skills: " + ", ".join(missing_skills)
            )

    if reasons:
        raise HTTPException(
            status_code=400,
            detail={
                "eligible": False,
                "reasons": reasons
            }
        )

    application = InternshipApplication(
        user_id=user_id,
        internship_id=internship_id
    )

    db.add(application)
    db.add(
        InternshipProgress(
            user_id=user_id,
            internship_id=internship_id
        )
    )

    db.commit()
    db.refresh(application)

    return {
        "eligible": True,
        "message": "Application submitted successfully",
        "application_id": application.id
    }
@app.get("/student/applications")
def student_applications(user_id: int, db: Session = Depends(get_db)):
    rows = db.query(InternshipApplication, Internship).join(Internship).filter(InternshipApplication.user_id == user_id).all()
    return [{"application_id":a.id,"user_id":a.user_id,"internship_id":a.internship_id,"status":a.status,"company":i.company,"title":i.title,"location":i.location,"mode":i.mode,"stipend":i.stipend,"deadline":i.deadline} for a,i in rows]
@app.get("/student/internship-progress/all")
def all_progress(user_id: int, db: Session = Depends(get_db)): return db.query(InternshipProgress).filter_by(user_id=user_id).all()
@app.put("/student/internship-progress")
def update_progress(user_id: int, internship_id: int, progress_value: int, status: str, db: Session = Depends(get_db)):
    item = db.query(InternshipProgress).filter_by(user_id=user_id, internship_id=internship_id).first()
    if not item: raise HTTPException(404, "Internship progress not found")
    if not 0 <= progress_value <= 100 or status not in {"not_started","ongoing","completed"}: raise HTTPException(400, "Invalid progress update")
    item.progress=progress_value; item.status=status; db.commit(); return item
@app.get("/student/deadlines")
def deadlines(user_id: int, db: Session = Depends(get_db)): return db.query(StudentDeadline).filter_by(user_id=user_id).all()
@app.get("/student/dashboard")
def student_dashboard(user_id: int, db: Session = Depends(get_db)):
    user=require_user(db,user_id,["student"]); profile=db.query(StudentProfile).filter_by(user_id=user_id).first()
    return {"user":{"id":user.id,"email":user.email},"profile":profile,"applications":student_applications(user_id,db),"saved_internships":saved_internships(user_id,db),"deadlines":deadlines(user_id,db),"progress":all_progress(user_id,db)}

@app.get("/company/internships/{internship_id}/applications")
def company_applications(internship_id:int,user_id:int,db:Session=Depends(get_db)):
    company=company_for_user(db,user_id); internship=db.get(Internship,internship_id)
    if not internship or internship.company_id != company.id: raise HTTPException(404,"Internship not found")
    rows=db.query(InternshipApplication,StudentProfile,User).join(StudentProfile, StudentProfile.user_id==InternshipApplication.user_id, isouter=True).join(User, User.id==InternshipApplication.user_id).filter(InternshipApplication.internship_id==internship_id).all()
    return [{"id":a.id,"status":a.status,"internship_id":a.internship_id,"student_id":a.user_id,"name":p.full_name if p else u.email,"email":u.email,"skills":p.skills if p else "","resume":p.resume if p else "","github":p.github if p else "","linkedin":p.linkedin if p else "","title":internship.title} for a,p,u in rows]
@app.put("/company/applications/{application_id}")
def update_application(application_id:int,user_id:int,status:str,db:Session=Depends(get_db)):
    company=company_for_user(db,user_id); app_item=db.get(InternshipApplication,application_id); internship=db.get(Internship,app_item.internship_id) if app_item else None
    if not internship or internship.company_id != company.id: raise HTTPException(404,"Application not found")
    if status not in {"applied","shortlisted","interview","accepted","rejected"}: raise HTTPException(400,"Invalid application status")
    app_item.status=status; db.commit(); return app_item
@app.get("/company/projects")
def company_projects(user_id:int,db:Session=Depends(get_db)):
    company=company_for_user(db,user_id); ids=[i.id for i in db.query(Internship).filter_by(company_id=company.id)]
    return db.query(ProjectSubmission).filter(ProjectSubmission.internship_id.in_(ids)).all() if ids else []
@app.put("/company/projects/{project_id}")
def company_project(project_id:int,user_id:int,status:str,db:Session=Depends(get_db)):
    company=company_for_user(db,user_id); project=db.get(ProjectSubmission,project_id); internship=db.get(Internship,project.internship_id) if project else None
    if not internship or internship.company_id != company.id: raise HTTPException(404,"Project not found")
    project.status=status; db.commit(); return project

@app.get("/teacher/students")
def teacher_students(db:Session=Depends(get_db)): return db.query(StudentProfile).all()
@app.get("/teacher/student/{user_id}")
def teacher_student(user_id:int,db:Session=Depends(get_db)): return get_student_profile(user_id,db)
@app.get("/teacher/internships")
def teacher_internships(db:Session=Depends(get_db)): return db.query(Internship).all()
@app.get("/teacher/certificates")
def teacher_certificates(db:Session=Depends(get_db)): return db.query(CertificateSubmission).all()
@app.put("/teacher/certificate/{certificate_id}")
def certificate_status(certificate_id:int,status:str,db:Session=Depends(get_db)):
    c=db.get(CertificateSubmission,certificate_id)
    if not c: raise HTTPException(404,"Certificate not found")
    c.status=status; db.commit(); return c
@app.get("/teacher/projects")
def teacher_projects(db:Session=Depends(get_db)): return db.query(ProjectSubmission).all()
@app.put("/teacher/project/{project_id}")
def project_status(project_id:int,status:str,teacher_feedback:str="",db:Session=Depends(get_db)):
    p=db.get(ProjectSubmission,project_id)
    if not p: raise HTTPException(404,"Project not found")
    p.status=status; p.teacher_feedback=teacher_feedback; db.commit(); return p
@app.get("/teacher/analytics")
def teacher_analytics(db:Session=Depends(get_db)):
    return {"total_students":db.query(StudentProfile).count(),"total_internships":db.query(Internship).count(),"total_certificates":db.query(CertificateSubmission).count(),"total_projects":db.query(ProjectSubmission).count(),"pending_certificates":db.query(CertificateSubmission).filter_by(status="pending").count(),"pending_projects":db.query(ProjectSubmission).filter_by(status="pending").count()}

@app.get("/tnp/dashboard")
def tnp_dashboard(db:Session=Depends(get_db)):
    return {"total_internships":db.query(Internship).count(),"pending_internships":db.query(Internship).filter_by(status="pending").count(),"approved_internships":db.query(Internship).filter_by(status="approved").count(),"rejected_internships":db.query(Internship).filter_by(status="rejected").count(),"total_students":db.query(User).filter_by(role="student").count(),"total_companies":db.query(User).filter_by(role="company").count(),"total_applications":db.query(InternshipApplication).count()}
@app.get("/tnp/internships/pending")
def tnp_pending(db:Session=Depends(get_db)): return db.query(Internship).filter_by(status="pending").all()
@app.get("/tnp/internships")
def tnp_internships(db:Session=Depends(get_db)): return db.query(Internship).all()
@app.get("/tnp/companies")
def tnp_companies(db:Session=Depends(get_db)): return db.query(CompanyProfile).all()
@app.get("/tnp/students")
def tnp_students(db:Session=Depends(get_db)): return db.query(StudentProfile).all()
@app.get("/tnp/applications")
def tnp_applications(db:Session=Depends(get_db)): return db.query(InternshipApplication).all()
@app.get("/tnp/projects")
def tnp_projects(db:Session=Depends(get_db)): return db.query(ProjectSubmission).all()
@app.put("/tnp/internships/{internship_id}/approve")
def approve(internship_id:int,db:Session=Depends(get_db)):
    item=db.get(Internship,internship_id)
    if not item: raise HTTPException(404,"Internship not found")
    item.status="approved"; db.commit(); return item
@app.put("/tnp/internships/{internship_id}/reject")
def reject(internship_id:int,db:Session=Depends(get_db)):
    item=db.get(Internship,internship_id)
    if not item: raise HTTPException(404,"Internship not found")
    item.status="rejected"; db.commit(); return item
# Compatibility alias for earlier clients.
@app.put("/tp/internships/{internship_id}/verify")
def verify(internship_id: int, status: str, db: Session = Depends(get_db)):
    normalized_status = status.lower().strip()
    if normalized_status == "approved":
        return approve(internship_id, db)
    if normalized_status == "rejected":
        return reject(internship_id, db)
    raise HTTPException(400, "Status must be approved or rejected")


# ==========================================
# ROADMAP ROUTES
# ==========================================

@app.post("/roadmaps")
def create_roadmap(
    roadmap: RoadmapCreate,
    db: Session = Depends(get_db)
):
    new_roadmap = Roadmap(
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        difficulty=roadmap.difficulty,
        estimated_duration=roadmap.estimated_duration,
        created_by=roadmap.created_by
    )

    db.add(new_roadmap)
    db.commit()
    db.refresh(new_roadmap)

    return {
        "message": "Roadmap created successfully",
        "roadmap": new_roadmap
    }

@app.post("/roadmaps/{roadmap_id}/steps")
def add_roadmap_step(
    roadmap_id: int,
    step: RoadmapStepCreate,
    db: Session = Depends(get_db)
):
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not found"
        )

    new_step = RoadmapStep(
        roadmap_id=roadmap_id,
        step_number=step.step_number,
        title=step.title,
        description=step.description,
        duration=step.duration
    )

    db.add(new_step)
    db.commit()
    db.refresh(new_step)

    return {
        "message": "Roadmap step added successfully",
        "step": new_step
    }

@app.get("/roadmaps")
def get_all_roadmaps(
    db: Session = Depends(get_db)
):
    roadmaps = db.query(Roadmap).all()

    return {
        "roadmaps": roadmaps
    }
@app.get("/roadmaps/{roadmap_id}")
def get_roadmap(
    roadmap_id: int,
    db: Session = Depends(get_db)
):
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not found"
        )

    steps = db.query(RoadmapStep).filter(
        RoadmapStep.roadmap_id == roadmap_id
    ).order_by(
        RoadmapStep.step_number
    ).all()

    return {
        "roadmap": roadmap,
        "steps": steps
    }

@app.put("/student/roadmap-progress")
def update_roadmap_progress(
    progress: RoadmapProgressUpdate,
    db: Session = Depends(get_db)
):
    existing_progress = db.query(StudentRoadmapProgress).filter(
        StudentRoadmapProgress.user_id == progress.user_id,
        StudentRoadmapProgress.roadmap_step_id == progress.roadmap_step_id
    ).first()

    if existing_progress:
        existing_progress.status = progress.status
    else:
        new_progress = StudentRoadmapProgress(
            user_id=progress.user_id,
            roadmap_step_id=progress.roadmap_step_id,
            status=progress.status
        )

        db.add(new_progress)

    db.commit()

    return {
        "message": "Roadmap progress updated successfully"
    }

@app.get("/student/roadmap-progress/{roadmap_id}")
def get_student_roadmap_progress(
    roadmap_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not found"
        )

    steps = db.query(RoadmapStep).filter(
        RoadmapStep.roadmap_id == roadmap_id
    ).order_by(
        RoadmapStep.step_number
    ).all()

    result = []

    for step in steps:
        progress = db.query(StudentRoadmapProgress).filter(
            StudentRoadmapProgress.user_id == user_id,
            StudentRoadmapProgress.roadmap_step_id == step.id
        ).first()

        result.append({
            "step": step,
            "status": progress.status if progress else "not_started"
        })

    return {
        "roadmap": roadmap,
        "steps": result
    }
@app.get("/student/roadmap-progress/{roadmap_id}")
def get_student_roadmap_progress(
    roadmap_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not found"
        )

    steps = db.query(RoadmapStep).filter(
        RoadmapStep.roadmap_id == roadmap_id
    ).order_by(
        RoadmapStep.step_number
    ).all()

    result = []

    for step in steps:
        progress = db.query(StudentRoadmapProgress).filter(
            StudentRoadmapProgress.user_id == user_id,
            StudentRoadmapProgress.roadmap_step_id == step.id
        ).first()

        result.append({
            "step": step,
            "status": progress.status if progress else "not_started"
        })

    return {
        "roadmap": roadmap,
        "steps": result
    }
@app.delete("/roadmaps/{roadmap_id}")
def delete_roadmap(
    roadmap_id: int,
    db: Session = Depends(get_db)
):
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not found"
        )

    db.query(StudentRoadmapProgress).filter(
        StudentRoadmapProgress.roadmap_step_id.in_(
            db.query(RoadmapStep.id).filter(
                RoadmapStep.roadmap_id == roadmap_id
            )
        )
    ).delete(synchronize_session=False)

    db.query(RoadmapStep).filter(
        RoadmapStep.roadmap_id == roadmap_id
    ).delete(synchronize_session=False)

    db.delete(roadmap)
    db.commit()

    return {
        "message": "Roadmap deleted successfully"
    }
@app.put("/roadmaps/{roadmap_id}")
def update_roadmap(
    roadmap_id: int,
    roadmap_data: RoadmapCreate,
    db: Session = Depends(get_db)
):
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id
    ).first()

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="Roadmap not found"
        )

    roadmap.title = roadmap_data.title
    roadmap.description = roadmap_data.description
    roadmap.category = roadmap_data.category
    roadmap.difficulty = roadmap_data.difficulty
    roadmap.estimated_duration = roadmap_data.estimated_duration

    db.commit()
    db.refresh(roadmap)

    return {
        "message": "Roadmap updated successfully",
        "roadmap": roadmap
    }
@app.put("/roadmap-steps/{step_id}")
def update_roadmap_step(
    step_id: int,
    step_data: RoadmapStepCreate,
    db: Session = Depends(get_db)
):
    step = db.query(RoadmapStep).filter(
        RoadmapStep.id == step_id
    ).first()

    if not step:
        raise HTTPException(
            status_code=404,
            detail="Roadmap step not found"
        )

    step.step_number = step_data.step_number
    step.title = step_data.title
    step.description = step_data.description
    step.duration = step_data.duration

    db.commit()
    db.refresh(step)

    return {
        "message": "Roadmap step updated successfully",
        "step": step
    }

@app.delete("/roadmap-steps/{step_id}")
def delete_roadmap_step(
    step_id: int,
    db: Session = Depends(get_db)
):
    step = db.query(RoadmapStep).filter(
        RoadmapStep.id == step_id
    ).first()

    if not step:
        raise HTTPException(
            status_code=404,
            detail="Roadmap step not found"
        )

    # Delete any student progress associated with this step
    db.query(StudentRoadmapProgress).filter(
        StudentRoadmapProgress.roadmap_step_id == step_id
    ).delete(synchronize_session=False)

    # Delete the roadmap step
    db.delete(step)
    db.commit()

    return {
        "message": "Roadmap step deleted successfully"
    }
# ==========================================
# RESOURCE SCHEMAS
# ==========================================

class ResourceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    resource_type: Optional[str] = None
    category: Optional[str] = None
    url: str
    created_by: Optional[int] = None


class SaveResourceRequest(BaseModel):
    user_id: int
    resource_id: int

# ==========================================
# AUTO CONSENT LETTER SCHEMAS
# ==========================================

class RejectOfferRequest(BaseModel):
    application_id: int
    reason: Optional[str] = None

# ==========================================
# RESOURCE ROUTES
# ==========================================

@app.post("/resources")
def create_resource(
    resource: ResourceCreate,
    db: Session = Depends(get_db)
):
    new_resource = Resource(
        title=resource.title,
        description=resource.description,
        resource_type=resource.resource_type,
        category=resource.category,
        url=resource.url,
        created_by=resource.created_by
    )

    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)

    return {
        "message": "Resource created successfully",
        "resource": new_resource
    }
@app.get("/resources")
def get_resources(
    category: Optional[str] = None,
    resource_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Resource)

    if category:
        query = query.filter(
            Resource.category == category
        )

    if resource_type:
        query = query.filter(
            Resource.resource_type == resource_type
        )

    resources = query.all()

    return {
        "resources": resources
    }

@app.get("/resources/{resource_id}")
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id
    ).first()

    if not resource:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    return {
        "resource": resource
    }

@app.post("/resources/save")
def save_resource(
    data: SaveResourceRequest,
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == data.resource_id
    ).first()

    if not resource:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    already_saved = db.query(SavedResource).filter(
        SavedResource.user_id == data.user_id,
        SavedResource.resource_id == data.resource_id
    ).first()

    if already_saved:
        raise HTTPException(
            status_code=400,
            detail="Resource already saved"
        )

    saved_resource = SavedResource(
        user_id=data.user_id,
        resource_id=data.resource_id
    )

    db.add(saved_resource)
    db.commit()
    db.refresh(saved_resource)

    return {
        "message": "Resource saved successfully"
    }
@app.get("/resources/saved/{user_id}")
def get_saved_resources(
    user_id: int,
    db: Session = Depends(get_db)
):
    saved_resources = db.query(SavedResource).filter(
        SavedResource.user_id == user_id
    ).all()

    resources = []

    for saved in saved_resources:
        resource = db.query(Resource).filter(
            Resource.id == saved.resource_id
        ).first()

        if resource:
            resources.append(resource)

    return {
        "resources": resources
    }
@app.delete("/resources/saved/{resource_id}")
def unsave_resource(
    resource_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    saved_resource = db.query(SavedResource).filter(
        SavedResource.user_id == user_id,
        SavedResource.resource_id == resource_id
    ).first()

    if not saved_resource:
        raise HTTPException(
            status_code=404,
            detail="Saved resource not found"
        )

    db.delete(saved_resource)
    db.commit()

    return {
        "message": "Resource removed from saved resources"
    }
@app.put("/resources/{resource_id}")
def update_resource(
    resource_id: int,
    resource_data: ResourceCreate,
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id
    ).first()

    if not resource:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    resource.title = resource_data.title
    resource.description = resource_data.description
    resource.resource_type = resource_data.resource_type
    resource.category = resource_data.category
    resource.url = resource_data.url

    db.commit()
    db.refresh(resource)

    return {
        "message": "Resource updated successfully",
        "resource": resource
    }
@app.delete("/resources/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id
    ).first()

    if not resource:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    # Remove saved/bookmarked entries first
    db.query(SavedResource).filter(
        SavedResource.resource_id == resource_id
    ).delete(synchronize_session=False)

    # Delete the resource
    db.delete(resource)
    db.commit()

    return {
        "message": "Resource deleted successfully"
    }

# ==========================================
# AUTO CONSENT LETTER ROUTES
# ==========================================

@app.post("/applications/reject-offer")
def reject_offer(
    data: RejectOfferRequest,
    db: Session = Depends(get_db)
):
    application = db.query(InternshipApplication).filter(
        InternshipApplication.id == data.application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    # Get internship details
    internship = db.query(Internship).filter(
        Internship.id == application.internship_id
    ).first()

    if not internship:
        raise HTTPException(
            status_code=404,
            detail="Internship not found"
        )

    # Get student's profile for full name
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == application.user_id
    ).first()

    # Safe fallback if profile/name does not exist
    student_name = (
        student_profile.full_name
        if student_profile and student_profile.full_name
        else "Student"
    )

    # Prevent duplicate consent letters
    existing_letter = db.query(ConsentLetter).filter(
        ConsentLetter.application_id == application.id
    ).first()

    if existing_letter:
        raise HTTPException(
            status_code=400,
            detail="Consent letter already exists for this application"
        )

    # Update application status
    application.status = "rejected"

    # Generate consent letter automatically
    letter_content = f"""
To,
The Training and Placement Cell

Subject: Consent regarding rejection of internship offer

Respected Sir/Madam,

I, {student_name}, hereby wish to inform the Training and Placement Cell
that I have decided to decline the internship opportunity for the position
of {internship.title}.

Reason for rejection:
{data.reason or "Personal reasons"}

I understand and acknowledge the implications of rejecting this opportunity
and take full responsibility for my decision. I request the Training and
Placement Cell to kindly update my internship application status accordingly.

Thank you.

Sincerely,
{student_name}
"""

    # Create consent letter
    consent_letter = ConsentLetter(
        student_id=application.user_id,
        internship_id=application.internship_id,
        application_id=application.id,
        reason=data.reason or "Personal reasons",
        letter_content=letter_content,
        status="pending"
    )

    db.add(consent_letter)
    db.commit()
    db.refresh(consent_letter)

    return {
        "message": "Offer rejected and consent letter generated successfully",
        "consent_letter": {
            "id": consent_letter.id,
            "student_id": consent_letter.student_id,
            "internship_id": consent_letter.internship_id,
            "application_id": consent_letter.application_id,
            "reason": consent_letter.reason,
            "letter_content": consent_letter.letter_content,
            "status": consent_letter.status
        }
    }

@app.get("/consent-letters/student/{user_id}")
def get_student_consent_letters(
    user_id: int,
    db: Session = Depends(get_db)
):
    letters = db.query(ConsentLetter).filter(
        ConsentLetter.student_id == user_id
    ).all()

    return {
        "consent_letters": letters
    }
@app.get("/consent-letters")
def get_all_consent_letters(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ConsentLetter)

    if status:
        query = query.filter(
            ConsentLetter.status == status
        )

    letters = query.all()

    return {
        "consent_letters": letters
    }
@app.put("/consent-letters/{letter_id}/status")
def update_consent_letter_status(
    letter_id: int,
    data: ConsentLetterStatusUpdate,
    db: Session = Depends(get_db)
):
    letter = db.query(ConsentLetter).filter(
        ConsentLetter.id == letter_id
    ).first()

    if not letter:
        raise HTTPException(
            status_code=404,
            detail="Consent letter not found"
        )

    if data.status not in ["pending", "approved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )

    letter.status = data.status

    db.commit()
    db.refresh(letter)

    return {
        "message": "Consent letter status updated successfully",
        "consent_letter": letter
    }
# ============================================================
# DAILY REPORT SYSTEM
# ============================================================

class DailyReportCreate(BaseModel):
    student_id: int
    work_done: str
    challenges: str | None = None
    hours_worked: float | None = None


class DailyReportReview(BaseModel):
    status: str
    mentor_comment: str | None = None


# ------------------------------------------------------------
# STUDENT: SUBMIT DAILY REPORT
# ------------------------------------------------------------

@app.post("/student/daily-reports")
def submit_daily_report(
    data: DailyReportCreate,
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(
        User.id == data.student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    today = date.today()

    # Prevent multiple reports for the same day
    existing_report = db.query(DailyReport).filter(
        DailyReport.student_id == data.student_id,
        DailyReport.report_date == today
    ).first()

    if existing_report:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted today's report"
        )

    report = DailyReport(
        student_id=data.student_id,
        report_date=today,
        work_done=data.work_done,
        challenges=data.challenges,
        hours_worked=data.hours_worked,
        status="submitted"
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "message": "Daily report submitted successfully",
        "report": report
    }


# ------------------------------------------------------------
# STUDENT: GET OWN DAILY REPORTS
# ------------------------------------------------------------

@app.get("/student/daily-reports")
def get_student_daily_reports(
    user_id: int,
    db: Session = Depends(get_db)
):
    reports = db.query(DailyReport).filter(
        DailyReport.student_id == user_id
    ).order_by(
        DailyReport.report_date.desc()
    ).all()

    return {
        "reports": reports
    }


# ------------------------------------------------------------
# STUDENT: MY INTERNSHIP SUMMARY / STREAK / ACTIVITY
# ------------------------------------------------------------

@app.get("/student/my-internship")
def get_my_internship(
    user_id: int,
    db: Session = Depends(get_db)
):
    require_user(db, user_id, ["student"])

    applications = db.query(InternshipApplication, Internship).join(
        Internship, InternshipApplication.internship_id == Internship.id
    ).filter(
        InternshipApplication.user_id == user_id
    ).all()

    progress_rows = db.query(InternshipProgress).filter(
        InternshipProgress.user_id == user_id
    ).all()
    progress_map = {row.internship_id: row for row in progress_rows}

    internship_items = []
    active_internships = 0

    for application, internship in applications:
        progress = progress_map.get(internship.id)
        progress_value = progress.progress if progress else 0
        progress_status = progress.status if progress else "not_started"

        if progress_status == "ongoing" or progress_value > 0:
            active_internships += 1

        internship_items.append({
            "internship_id": internship.id,
            "application_id": application.id,
            "title": internship.title,
            "company": internship.company,
            "application_status": application.status,
            "progress": progress_value,
            "status": progress_status,
        })

    reports = db.query(DailyReport).filter(
        DailyReport.student_id == user_id
    ).order_by(DailyReport.report_date.asc()).all()

    report_dates = {report.report_date for report in reports}
    today = date.today()

    current_streak = 0
    cursor = today
    while cursor in report_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = 0
    running = 0
    previous = None
    for report_day in sorted(report_dates):
        if previous and report_day == previous + timedelta(days=1):
            running += 1
        else:
            running = 1
        longest_streak = max(longest_streak, running)
        previous = report_day

    start_day = today - timedelta(days=34)
    activity = []
    for offset in range(35):
        day = start_day + timedelta(days=offset)
        activity.append({
            "date": day.isoformat(),
            "label": day.strftime("%d"),
            "active": day in report_dates
        })

    return {
        "active_internships": active_internships,
        "total_internships": len(internship_items),
        "total_reports": len(reports),
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "internships": internship_items,
        "activity": activity
    }


# ------------------------------------------------------------
# TEACHER / MENTOR: GET STUDENT DAILY REPORTS
# ------------------------------------------------------------

@app.get("/teacher/daily-reports")
def get_teacher_daily_reports(
    db: Session = Depends(get_db)
):
    reports = db.query(DailyReport).order_by(
        DailyReport.report_date.desc()
    ).all()

    result = []

    for report in reports:
        student = db.query(User).filter(
            User.id == report.student_id
        ).first()

        result.append({
            "id": report.id,
            "student_id": report.student_id,
            "student_name": (
                student.full_name
                if student and hasattr(student, "full_name")
                else student.email
                if student
                else "Unknown Student"
            ),
            "report_date": report.report_date,
            "work_done": report.work_done,
            "challenges": report.challenges,
            "hours_worked": report.hours_worked,
            "status": report.status,
            "mentor_comment": report.mentor_comment,
            "created_at": report.created_at
        })

    return {
        "reports": result
    }


# ------------------------------------------------------------
# TEACHER / MENTOR: REVIEW DAILY REPORT
# ------------------------------------------------------------

@app.put("/teacher/daily-reports/{report_id}")
def review_daily_report(
    report_id: int,
    data: DailyReportReview,
    db: Session = Depends(get_db)
):
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Daily report not found"
        )

    allowed_statuses = ["reviewed", "needs_revision"]

    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {allowed_statuses}"
        )

    report.status = data.status
    report.mentor_comment = data.mentor_comment

    db.commit()
    db.refresh(report)

    return {
        "message": "Daily report reviewed successfully",
        "report": report
    }


# ------------------------------------------------------------
# T&P: VIEW ALL DAILY REPORTS
# ------------------------------------------------------------

@app.get("/tnp/daily-reports")
def get_tnp_daily_reports(
    db: Session = Depends(get_db)
):
    reports = db.query(DailyReport).order_by(
        DailyReport.report_date.desc()
    ).all()

    result = []

    for report in reports:
        student = db.query(User).filter(
            User.id == report.student_id
        ).first()

        result.append({
            "id": report.id,
            "student_id": report.student_id,
            "student_name": (
                student.full_name
                if student and hasattr(student, "full_name")
                else student.email
                if student
                else "Unknown Student"
            ),
            "report_date": report.report_date,
            "work_done": report.work_done,
            "challenges": report.challenges,
            "hours_worked": report.hours_worked,
            "status": report.status,
            "mentor_comment": report.mentor_comment,
            "created_at": report.created_at
        })

    return {
        "reports": result
    }


# ------------------------------------------------------------
# INTERNSHIP LIFECYCLE: TIMELINE, WITHDRAWAL, ATTENDANCE,
# DOCUMENTS, MILESTONES AND DAILY-REPORT LEADERBOARD
# ------------------------------------------------------------

@app.get("/student/applications/{application_id}/timeline")
def application_timeline(application_id: int, user_id: int, db: Session = Depends(get_db)):
    app_row = db.get(InternshipApplication, application_id)
    if not app_row or app_row.user_id != user_id:
        raise HTTPException(404, "Application not found")
    events = db.query(ApplicationEvent).filter_by(application_id=application_id).order_by(ApplicationEvent.created_at.asc()).all()
    base = [{"event_type": "application", "label": "Application submitted", "note": "Your application is in the InternVeri workflow.", "created_at": None}]
    return {"application": app_row, "events": base + events}

@app.post("/student/applications/{application_id}/withdraw")
def withdraw_application(application_id: int, user_id: int, reason: str = "", db: Session = Depends(get_db)):
    app_row = db.get(InternshipApplication, application_id)
    if not app_row or app_row.user_id != user_id:
        raise HTTPException(404, "Application not found")
    if app_row.status in {"accepted", "completed"}:
        raise HTTPException(400, "Accepted or completed internships cannot be withdrawn here")
    app_row.status = "withdrawn"
    db.add(ApplicationEvent(application_id=application_id, event_type="withdrawn", label="Application withdrawn", note=reason or None))
    db.commit()
    return {"message": "Application withdrawn successfully"}

class AttendanceIn(BaseModel):
    internship_id: int
    attendance_date: str
    status: str = "present"
    note: Optional[str] = None

@app.post("/student/attendance")
def mark_attendance(data: AttendanceIn, user_id: int, db: Session = Depends(get_db)):
    require_user(db, user_id, ["student"])
    try: day = date.fromisoformat(data.attendance_date)
    except ValueError: raise HTTPException(400, "attendance_date must be YYYY-MM-DD")
    row = db.query(InternshipAttendance).filter_by(student_id=user_id, internship_id=data.internship_id, attendance_date=day).first()
    if not row:
        row = InternshipAttendance(student_id=user_id, internship_id=data.internship_id, attendance_date=day)
        db.add(row)
    row.status, row.note = data.status, data.note
    db.commit(); db.refresh(row)
    return row

@app.get("/student/attendance")
def get_attendance(user_id: int, internship_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(InternshipAttendance).filter_by(student_id=user_id)
    if internship_id: q = q.filter_by(internship_id=internship_id)
    rows = q.order_by(InternshipAttendance.attendance_date.desc()).all()
    present = sum(1 for r in rows if r.status == "present")
    return {"records": rows, "summary": {"total": len(rows), "present": present, "percentage": round((present / len(rows) * 100), 1) if rows else 0}}

class DocumentIn(BaseModel):
    internship_id: Optional[int] = None
    document_type: str
    document_url: str

@app.post("/student/internship-documents")
def add_internship_document(data: DocumentIn, user_id: int, db: Session = Depends(get_db)):
    require_user(db, user_id, ["student"])
    row = InternshipDocument(student_id=user_id, **data.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row

@app.get("/student/internship-documents")
def get_internship_documents(user_id: int, db: Session = Depends(get_db)):
    return db.query(InternshipDocument).filter_by(student_id=user_id).order_by(InternshipDocument.created_at.desc()).all()

class MilestoneIn(BaseModel):
    internship_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    weight: int = 10

@app.post("/internships/milestones")
def create_milestone(data: MilestoneIn, user_id: int, db: Session = Depends(get_db)):
    # company or training users can define internship milestones
    require_user(db, user_id, ["company", "training", "teacher"])
    row = InternshipMilestone(**data.model_dump()); db.add(row); db.commit(); db.refresh(row)
    return row

@app.get("/student/internship-milestones")
def student_milestones(user_id: int, internship_id: Optional[int] = None, db: Session = Depends(get_db)):
    ids = [x.internship_id for x in db.query(InternshipApplication).filter_by(user_id=user_id).all()]
    if internship_id: ids = [internship_id]
    return db.query(InternshipMilestone).filter(InternshipMilestone.internship_id.in_(ids or [-1])).all()

@app.get("/student/milestone-leaderboard")
def milestone_leaderboard(user_id: int, db: Session = Depends(get_db)):
    # Score = daily reports submitted + mentor-reviewed reports bonus.
    rows = db.query(DailyReport.student_id, func.count(DailyReport.id).label("reports"), func.sum(case((DailyReport.status.in_(["reviewed", "approved"]), 1), else_=0)).label("reviewed")).group_by(DailyReport.student_id).order_by(func.count(DailyReport.id).desc()).all()
    leaderboard = []
    for student_id, reports, reviewed in rows:
        profile = db.query(StudentProfile).filter_by(user_id=student_id).first()
        score = int(reports or 0) * 10 + int(reviewed or 0) * 5
        leaderboard.append({"student_id": student_id, "name": (profile.full_name if profile else f"Student #{student_id}"), "reports": reports, "reviewed": reviewed or 0, "score": score, "is_you": student_id == user_id})
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    for i, row in enumerate(leaderboard, 1): row["rank"] = i
    return {"leaderboard": leaderboard[:20]}


@app.get("/teacher/internship-documents")
def teacher_internship_documents(db: Session = Depends(get_db)):
    return db.query(InternshipDocument).order_by(InternshipDocument.created_at.desc()).all()

@app.put("/teacher/internship-documents/{document_id}")
def review_internship_document(document_id: int, status: str, feedback: str = "", db: Session = Depends(get_db)):
    row = db.get(InternshipDocument, document_id)
    if not row: raise HTTPException(404, "Document not found")
    row.status, row.reviewer_feedback = status, feedback or None
    db.commit(); return row

@app.get("/tnp/internship-documents")
def tnp_internship_documents(db: Session = Depends(get_db)):
    return db.query(InternshipDocument).order_by(InternshipDocument.created_at.desc()).all()

@app.put("/tnp/internship-documents/{document_id}/verify")
def verify_internship_document(document_id: int, status: str = "verified", db: Session = Depends(get_db)):
    row = db.get(InternshipDocument, document_id)
    if not row: raise HTTPException(404, "Document not found")
    row.status = status; db.commit(); return row
