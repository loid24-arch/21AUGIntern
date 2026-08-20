from database import Base
from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Text, Float,UniqueConstraint
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String)
    phone = Column(String)
    college = Column(String)
    department = Column(String)
    year = Column(String)
    cgpa = Column(String)
    skills = Column(String)
    github = Column(String)
    linkedin = Column(String)
    resume = Column(String)


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String)
    phone = Column(String)
    college = Column(String)
    department = Column(String)
    designation = Column(String)
    employee_id = Column(Integer)
    subjects = Column(String)


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    company_name = Column(String, nullable=False)
    company_email = Column(String, nullable=False)
    phone = Column(String)
    website = Column(String)
    industry = Column(String)
    location = Column(String)
    description = Column(String)


class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True)

    company_id = Column(
        Integer,
        ForeignKey("company_profiles.id"),
        nullable=False
    )

    company = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)

    location = Column(String)
    mode = Column(String)
    duration = Column(String)
    stipend = Column(String)

    # Eligibility requirements
    skills_required = Column(String)
    min_cgpa = Column(Float, nullable=True)
    eligible_departments = Column(String)
    eligible_years = Column(String)

    deadline = Column(String)

    status = Column(
        String,
        nullable=False,
        default="pending"
    )


class SavedInternship(Base):
    __tablename__ = "saved_internships"

    __table_args__ = (
        UniqueConstraint("user_id", "internship_id"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )


class InternshipApplication(Base):
    __tablename__ = "internship_applications"

    __table_args__ = (
        UniqueConstraint("user_id", "internship_id"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )
    status = Column(
        String,
        nullable=False,
        default="applied"
    )


class InternshipProgress(Base):
    __tablename__ = "internship_progress"

    __table_args__ = (
        UniqueConstraint("user_id", "internship_id"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )
    progress = Column(
        Integer,
        nullable=False,
        default=0
    )
    status = Column(
        String,
        nullable=False,
        default="not_started"
    )


class StudentDeadline(Base):
    __tablename__ = "student_deadlines"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )
    title = Column(String, nullable=False)
    deadline = Column(String, nullable=False)
    description = Column(String)


class CertificateSubmission(Base):
    __tablename__ = "certificate_submissions"

    id = Column(Integer, primary_key=True)
    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    internship_id = Column(
        Integer,
        ForeignKey("internships.id")
    )
    certificate_url = Column(String)
    submitted_at = Column(String)
    status = Column(
        String,
        nullable=False,
        default="pending"
    )


class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(Integer, primary_key=True)
    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    internship_id = Column(
        Integer,
        ForeignKey("internships.id")
    )
    title = Column(String, nullable=False)
    description = Column(String)
    github_url = Column(String)
    project_url = Column(String)
    report_url = Column(String)
    submitted_at = Column(String)
    status = Column(
        String,
        nullable=False,
        default="pending"
    )
    teacher_feedback = Column(String)


class InternshipRecord(Base):
    __tablename__ = "internship_records"

    id = Column(Integer, primary_key=True)
    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    company = Column(String)
    role = Column(String)
    status = Column(String)

class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True)

    title = Column(String, nullable=False)
    description = Column(String)

    category = Column(String)

    difficulty = Column(String)

    estimated_duration = Column(String)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

class RoadmapStep(Base):
    __tablename__ = "roadmap_steps"

    id = Column(Integer, primary_key=True)

    roadmap_id = Column(
        Integer,
        ForeignKey("roadmaps.id"),
        nullable=False
    )

    step_number = Column(Integer, nullable=False)

    title = Column(String, nullable=False)

    description = Column(String)

    duration = Column(String)

class StudentRoadmapProgress(Base):
    __tablename__ = "student_roadmap_progress"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "roadmap_step_id"
        ),
    )

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    roadmap_step_id = Column(
        Integer,
        ForeignKey("roadmap_steps.id"),
        nullable=False
    )

    status = Column(
        String,
        nullable=False,
        default="not_started"
    )

# ==========================================
# RESOURCE MODELS
# ==========================================

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True)

    title = Column(String, nullable=False)

    description = Column(String)

    resource_type = Column(String)
    # video, article, course, pdf, website, etc.

    category = Column(String)
    # DSA, AI/ML, Web Development, Data Science, etc.

    url = Column(String, nullable=False)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )


class SavedResource(Base):
    __tablename__ = "saved_resources"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "resource_id"
        ),
    )

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    resource_id = Column(
        Integer,
        ForeignKey("resources.id"),
        nullable=False
    )
# ==========================================
# AUTO CONSENT LETTER
# ==========================================

class ConsentLetter(Base):
    __tablename__ = "consent_letters"

    id = Column(Integer, primary_key=True)

    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    internship_id = Column(
        Integer,
        ForeignKey("internships.id"),
        nullable=False
    )

    application_id = Column(
        Integer,
        ForeignKey("internship_applications.id"),
        nullable=False
    )

    reason = Column(String, nullable=True)

    letter_content = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        nullable=False,
        default="pending"
    )
"============================================"
''' DAILY REPORT MODEL'''

class DailyReport(Base):
    __tablename__ = "daily_reports"

    __table_args__ = (
        UniqueConstraint("student_id", "report_date"),
    )

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    report_date = Column(
        Date,
        nullable=False
    )

    work_done = Column(
        Text,
        nullable=False
    )

    challenges = Column(
        Text,
        nullable=True
    )

    hours_worked = Column(
        Float,
        nullable=True
    )

    status = Column(
        String,
        default="submitted"
    )

    mentor_comment = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

# Internship lifecycle extensions
class ApplicationEvent(Base):
    __tablename__ = "application_events"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("internship_applications.id"), nullable=False)
    event_type = Column(String, nullable=False)
    label = Column(String, nullable=False)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class InternshipAttendance(Base):
    __tablename__ = "internship_attendance"
    __table_args__ = (UniqueConstraint("student_id", "internship_id", "attendance_date"),)
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="present")
    note = Column(Text)

class InternshipDocument(Base):
    __tablename__ = "internship_documents"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=True)
    document_type = Column(String, nullable=False)
    document_url = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    reviewer_feedback = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class InternshipMilestone(Base):
    __tablename__ = "internship_milestones"
    id = Column(Integer, primary_key=True)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    due_date = Column(String)
    weight = Column(Integer, default=10)
    status = Column(String, nullable=False, default="open")
