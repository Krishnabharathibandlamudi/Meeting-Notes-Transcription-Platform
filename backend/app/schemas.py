from pydantic import BaseModel, Field
from typing import Optional, List

class ParticipantIn(BaseModel):
    name: str
    email: Optional[str] = None

class TranscriptIn(BaseModel):
    speaker: str
    start_seconds: int
    end_seconds: int
    text: str

class ActionItemIn(BaseModel):
    task: str = Field(min_length=1)
    owner: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False

class MeetingCreate(BaseModel):
    title: str = Field(min_length=1)
    meeting_date: str
    duration_seconds: int = 1800
    source: str = "Uploaded transcript"
    participants: List[ParticipantIn] = []
    transcript: List[TranscriptIn] = []
    overview: str = ""
    keywords: List[str] = []
    notes: List[str] = []
    outline: List[dict] = []
    action_items: List[ActionItemIn] = []

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[str] = None
    duration_seconds: Optional[int] = None
    source: Optional[str] = None
    participants: Optional[List[ParticipantIn]] = None

class TranscriptUpdate(BaseModel):
    segments: List[TranscriptIn]

class LiveRoomCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    host_name: str = Field(min_length=1, max_length=120)

class RoomJoin(BaseModel):
    name: str = Field(min_length=1, max_length=120)

class RoomMessageIn(BaseModel):
    speaker: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=2000)

class RoomEnd(BaseModel):
    generate_demo_summary: bool = True
