from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

meeting_participants = Table(
    "meeting_participants", Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("participant_id", ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True),
)

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    meeting_date = Column(String(40), nullable=False)
    duration_seconds = Column(Integer, default=1800)
    source = Column(String(50), default="Google Meet")
    participants = relationship("Participant", secondary=meeting_participants, back_populates="meetings")
    transcript = relationship("TranscriptSegment", cascade="all, delete-orphan", back_populates="meeting", order_by="TranscriptSegment.start_seconds")
    summary = relationship("Summary", cascade="all, delete-orphan", uselist=False, back_populates="meeting")
    action_items = relationship("ActionItem", cascade="all, delete-orphan", back_populates="meeting")
    room = relationship("MeetingRoom", cascade="all, delete-orphan", uselist=False, back_populates="meeting")

class Participant(Base):
    __tablename__ = "participants"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    email = Column(String(255), nullable=True)
    meetings = relationship("Meeting", secondary=meeting_participants, back_populates="participants")

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    speaker = Column(String(120), nullable=False)
    start_seconds = Column(Integer, nullable=False)
    end_seconds = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    meeting = relationship("Meeting", back_populates="transcript")

class Summary(Base):
    __tablename__ = "summaries"
    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False)
    overview = Column(Text, default="")
    keywords = Column(Text, default="")
    notes = Column(Text, default="")
    outline = Column(Text, default="")
    meeting = relationship("Meeting", back_populates="summary")

class ActionItem(Base):
    __tablename__ = "action_items"
    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    task = Column(String(500), nullable=False)
    owner = Column(String(120), nullable=True)
    due_date = Column(String(40), nullable=True)
    completed = Column(Boolean, default=False)
    meeting = relationship("Meeting", back_populates="action_items")

class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"
    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False)
    token = Column(String(80), unique=True, nullable=False, index=True)
    host_name = Column(String(120), nullable=False)
    status = Column(String(30), default="live")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    meeting = relationship("Meeting", back_populates="room")
    participants = relationship("RoomParticipant", cascade="all, delete-orphan", back_populates="room")
    messages = relationship("RoomMessage", cascade="all, delete-orphan", back_populates="room", order_by="RoomMessage.sequence")

class RoomParticipant(Base):
    __tablename__ = "room_participants"
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("meeting_rooms.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(120), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    room = relationship("MeetingRoom", back_populates="participants")

class RoomMessage(Base):
    __tablename__ = "room_messages"
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("meeting_rooms.id", ondelete="CASCADE"), nullable=False)
    speaker = Column(String(120), nullable=False)
    text = Column(Text, nullable=False)
    timestamp_seconds = Column(Integer, default=0)
    sequence = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    room = relationship("MeetingRoom", back_populates="messages")
