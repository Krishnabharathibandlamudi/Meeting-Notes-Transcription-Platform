from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, select, func
import json
from .database import Base, engine, get_db, SessionLocal
from .models import Meeting, Participant, TranscriptSegment, Summary, ActionItem, MeetingRoom, RoomParticipant, RoomMessage
from .schemas import MeetingCreate, MeetingUpdate, ActionItemIn, TranscriptUpdate, LiveRoomCreate, RoomJoin, RoomMessageIn, RoomEnd

app = FastAPI(title="Fireflies Clone API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
Base.metadata.create_all(bind=engine)

def seed(db: Session):
    if db.query(Meeting).count(): return
    samples = [
        ("Q4 Product Strategy", "2026-10-06T15:30:00", 2640, "Google Meet", ["Krishna Bharathi", "Alex Morgan", "Priya Shah"], [
            ("Alex Morgan",0,24,"Thanks everyone. Today we need to align on the Q4 product strategy and decide which improvements make the roadmap."),
            ("Krishna Bharathi",25,68,"I think onboarding should be our first priority. The first-session drop-off is still our biggest funnel issue."),
            ("Priya Shah",69,116,"Agreed. We can simplify the workspace and add a guided checklist without changing the core workflow."),
            ("Alex Morgan",117,164,"Let's validate that with ten customer interviews this week, then lock the scope for the next sprint."),
            ("Krishna Bharathi",165,214,"I'll own the prototype and share the usability findings in the product channel."),
            ("Priya Shah",215,262,"I'll prepare the interview script and recruit five existing customers."),
        ], "The team aligned on a focused Q4 roadmap centered on improving onboarding. They agreed to validate a simplified first-run experience through customer interviews before committing the sprint scope.", ["Q4 roadmap","onboarding","customer research","product strategy"], ["Prioritize onboarding improvements", "Validate the guided checklist with customers", "Use interview findings to finalize sprint scope"], [("00:00","Goals & context"),("00:25","Onboarding opportunity"),("01:57","Validation plan")], [("Create onboarding prototype","Krishna Bharathi","2026-10-09"),("Prepare customer interview script","Priya Shah","2026-10-08")]),
        ("Engineering Weekly Sync", "2026-10-03T11:00:00", 1980, "Microsoft Teams", ["Krishna Bharathi", "Daniel Lee", "Maya Chen"], [
            ("Maya Chen",0,32,"Let's go through the release status and any blockers for the API migration."),
            ("Daniel Lee",33,86,"The migration is mostly complete. We have two endpoints left and the integration tests are green."),
            ("Krishna Bharathi",87,132,"Great. I noticed the transcript search endpoint is slower than expected. We should add an index before launch."),
            ("Daniel Lee",133,179,"I'll benchmark the query and add the index if the data confirms the bottleneck."),
            ("Maya Chen",180,235,"Let's target Friday for the migration and keep the rollback checklist ready."),
        ], "The API migration is nearly complete and integration tests are passing. The remaining risk is transcript search latency, with an indexing benchmark planned before Friday's release.", ["API migration","performance","release","testing"], ["Finish the final two endpoints", "Benchmark transcript search latency", "Prepare rollback checklist"], [("00:00","Release status"),("01:27","Search performance"),("03:00","Release plan")], [("Benchmark transcript search","Daniel Lee","2026-10-07"),("Prepare rollback checklist","Maya Chen","2026-10-08")]),
        ("Customer Discovery — Healthcare", "2026-09-29T16:00:00", 3120, "Google Meet", ["Krishna Bharathi", "Nina Patel", "Owen Brooks"], [
            ("Nina Patel",0,42,"We interviewed three operations managers about how they find urgent care and specialist availability."),
            ("Owen Brooks",43,98,"The common pain point is not discovery alone. They need confidence that the hospital can actually handle the case."),
            ("Krishna Bharathi",99,154,"That suggests we should show verified capabilities and availability, not just a list of nearby hospitals."),
            ("Nina Patel",155,215,"Exactly. A lightweight verification badge could make the results more useful."),
            ("Owen Brooks",216,278,"Let's prototype that flow and test whether users understand what verified means."),
        ], "Customer discovery showed that proximity is not enough for urgent healthcare decisions. Users want confidence in hospital capabilities and availability, suggesting a verified-results experience.", ["customer discovery","healthcare","verification","hospital search"], ["Show verified hospital capabilities", "Prototype a verification badge", "Test comprehension with users"], [("00:00","Research context"),("00:43","Core pain point"),("01:39","Product implication")], [("Design verified-results prototype","Krishna Bharathi","2026-10-12"),("Run comprehension test","Nina Patel","2026-10-14")])
    ]
    for title,date,duration,source,names,segments,overview,keywords,notes,outline,actions in samples:
        m=Meeting(title=title,meeting_date=date,duration_seconds=duration,source=source); db.add(m); db.flush()
        for name in names:
            p=db.query(Participant).filter_by(name=name).first() or Participant(name=name); db.add(p); db.flush(); m.participants.append(p)
        for speaker,start,end,text in segments: db.add(TranscriptSegment(meeting_id=m.id,speaker=speaker,start_seconds=start,end_seconds=end,text=text))
        db.add(Summary(meeting_id=m.id,overview=overview,keywords=json.dumps(keywords),notes=json.dumps(notes),outline=json.dumps([{"time":t,"title":x} for t,x in outline])))
        for task,owner,due in actions: db.add(ActionItem(meeting_id=m.id,task=task,owner=owner,due_date=due))
    db.commit()

@app.on_event("startup")
def startup():
    db=next(get_db()); seed(db); db.close()

def meeting_dict(m):
    return {"id":m.id,"title":m.title,"meeting_date":m.meeting_date,"duration_seconds":m.duration_seconds,"source":m.source,"participants":[{"id":p.id,"name":p.name,"email":p.email} for p in m.participants],"transcript":[{"id":s.id,"speaker":s.speaker,"start_seconds":s.start_seconds,"end_seconds":s.end_seconds,"text":s.text} for s in m.transcript],"summary": {"overview":m.summary.overview if m.summary else "","keywords":json.loads(m.summary.keywords or "[]") if m.summary else [],"notes":json.loads(m.summary.notes or "[]") if m.summary else [],"outline":json.loads(m.summary.outline or "[]") if m.summary else []},"action_items":[{"id":a.id,"task":a.task,"owner":a.owner,"due_date":a.due_date,"completed":a.completed} for a in m.action_items], "room": ({"token": m.room.token, "status": m.room.status} if m.room else None)}

@app.get("/api/health")
def health(): return {"status":"ok"}

@app.get("/api/meetings")
def list_meetings(search:str=Query(""), participant:str=Query(""), db:Session=Depends(get_db)):
    q=db.query(Meeting)
    meetings=q.order_by(Meeting.meeting_date.desc()).all()
    if search:
        needle=search.lower()
        meetings=[m for m in meetings if needle in m.title.lower() or needle in (m.source or '').lower() or any(needle in s.text.lower() for s in m.transcript) or any(needle in p.name.lower() for p in m.participants)]
    if participant: meetings=[m for m in meetings if participant.lower() in [p.name.lower() for p in m.participants]]
    return [{"id":m.id,"title":m.title,"meeting_date":m.meeting_date,"duration_seconds":m.duration_seconds,"source":m.source,"participants":[p.name for p in m.participants],"tags":json.loads(m.summary.keywords or "[]") if m.summary else []} for m in meetings]

@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id:int,db:Session=Depends(get_db)):
    m=db.get(Meeting,meeting_id)
    if not m: raise HTTPException(404,"Meeting not found")
    return meeting_dict(m)

@app.post("/api/meetings")
def create_meeting(payload:MeetingCreate,db:Session=Depends(get_db)):
    m=Meeting(title=payload.title,meeting_date=payload.meeting_date,duration_seconds=payload.duration_seconds,source=payload.source); db.add(m); db.flush()
    for p_in in payload.participants:
        p=db.query(Participant).filter_by(name=p_in.name).first() or Participant(name=p_in.name,email=p_in.email); db.add(p); db.flush(); m.participants.append(p)
    for s in payload.transcript: db.add(TranscriptSegment(meeting_id=m.id,**s.model_dump()))
    db.add(Summary(meeting_id=m.id,overview=payload.overview,keywords=json.dumps(payload.keywords),notes=json.dumps(payload.notes),outline=json.dumps(payload.outline)))
    for a in payload.action_items: db.add(ActionItem(meeting_id=m.id,**a.model_dump()))
    db.commit(); db.refresh(m); return meeting_dict(m)

@app.put("/api/meetings/{meeting_id}")
def update_meeting(meeting_id:int,payload:MeetingUpdate,db:Session=Depends(get_db)):
    m=db.get(Meeting,meeting_id)
    if not m: raise HTTPException(404,"Meeting not found")
    for k,v in payload.model_dump(exclude_unset=True,exclude={"participants"}).items(): setattr(m,k,v)
    if payload.participants is not None:
        m.participants=[]
        for p_in in payload.participants:
            p=db.query(Participant).filter_by(name=p_in.name).first() or Participant(name=p_in.name,email=p_in.email); db.add(p); db.flush(); m.participants.append(p)
    db.commit(); db.refresh(m); return meeting_dict(m)

@app.delete("/api/meetings/{meeting_id}")
def delete_meeting(meeting_id:int,db:Session=Depends(get_db)):
    m=db.get(Meeting,meeting_id)
    if not m: raise HTTPException(404,"Meeting not found")
    db.delete(m); db.commit(); return {"message":"Meeting deleted"}

@app.put("/api/meetings/{meeting_id}/transcript")
def update_transcript(meeting_id:int,payload:TranscriptUpdate,db:Session=Depends(get_db)):
    m=db.get(Meeting,meeting_id)
    if not m: raise HTTPException(404,"Meeting not found")
    for s in list(m.transcript): db.delete(s)
    db.flush()
    for s in payload.segments: db.add(TranscriptSegment(meeting_id=meeting_id,**s.model_dump()))
    db.commit(); db.refresh(m); return meeting_dict(m)

@app.post("/api/meetings/{meeting_id}/action-items")
def create_action_item(meeting_id:int,payload:ActionItemIn,db:Session=Depends(get_db)):
    if not db.get(Meeting,meeting_id): raise HTTPException(404,"Meeting not found")
    a=ActionItem(meeting_id=meeting_id,**payload.model_dump()); db.add(a); db.commit(); db.refresh(a); return {"id":a.id,"task":a.task,"owner":a.owner,"due_date":a.due_date,"completed":a.completed}

@app.put("/api/action-items/{action_id}")
def update_action_item(action_id:int,payload:ActionItemIn,db:Session=Depends(get_db)):
    a=db.get(ActionItem,action_id)
    if not a: raise HTTPException(404,"Action item not found")
    for k,v in payload.model_dump().items(): setattr(a,k,v)
    db.commit(); db.refresh(a); return {"id":a.id,"task":a.task,"owner":a.owner,"due_date":a.due_date,"completed":a.completed}

@app.delete("/api/action-items/{action_id}")
def delete_action_item(action_id:int,db:Session=Depends(get_db)):
    a=db.get(ActionItem,action_id)
    if not a: raise HTTPException(404,"Action item not found")
    db.delete(a); db.commit(); return {"message":"Action item deleted"}


# ----------------------------- Live meeting rooms -----------------------------
def room_dict(room: MeetingRoom):
    return {
        "id": room.id,
        "token": room.token,
        "meeting_id": room.meeting_id,
        "title": room.meeting.title,
        "host_name": room.host_name,
        "status": room.status,
        "created_at": room.created_at.isoformat() if room.created_at else None,
        "started_at": room.started_at.isoformat() if room.started_at else None,
        "ended_at": room.ended_at.isoformat() if room.ended_at else None,
        "participants": [{"id": p.id, "name": p.name, "joined_at": p.joined_at.isoformat() if p.joined_at else None} for p in room.participants],
        "messages": [{"id": x.id, "speaker": x.speaker, "text": x.text, "timestamp_seconds": x.timestamp_seconds, "sequence": x.sequence, "created_at": x.created_at.isoformat() if x.created_at else None} for x in room.messages],
    }

def build_ai_summary(meeting: Meeting, messages):
    texts = [m.text.strip() for m in messages if m.text.strip()]
    speakers = []
    for m in messages:
        if m.speaker not in speakers:
            speakers.append(m.speaker)
    joined = " ".join(texts).lower()
    keywords = []
    candidates = [
        ("roadmap", ["roadmap", "q4", "quarter"]),
        ("product", ["product", "feature", "prototype"]),
        ("planning", ["plan", "planning", "next steps"]),
        ("customer feedback", ["customer", "feedback", "user"]),
        ("engineering", ["api", "backend", "frontend", "release", "bug"]),
        ("timeline", ["deadline", "friday", "week", "launch"]),
        ("marketing", ["marketing", "campaign", "content"]),
    ]
    for label, words in candidates:
        if any(w in joined for w in words): keywords.append(label)
    if not keywords: keywords = ["discussion", "planning", "follow-up"]
    if len(keywords) > 5: keywords = keywords[:5]
    if texts:
        first = texts[0]
        overview = f"AI-generated meeting recap: the group discussed {', '.join(keywords[:3])} and aligned on practical next steps. The conversation included {len(speakers)} participants and {len(texts)} captured transcript segments. Key decisions and follow-ups should be reviewed before sharing externally."
    else:
        overview = "The meeting ended without any captured transcript. Add transcript lines during the live room and generate the AI recap again."
    notes = []
    for t in texts[:5]:
        if any(k in t.lower() for k in ["decide", "agreed", "will ", "let's", "next", "need to"]):
            notes.append(t)
    if not notes:
        notes = texts[:3] or ["No substantive notes were captured."]
    outline = []
    for idx, msg in enumerate(messages[:6]):
        mm, ss = divmod(msg.timestamp_seconds, 60)
        title = msg.text.strip().split(".")[0][:70] or "Discussion"
        outline.append({"time": f"{mm:02d}:{ss:02d}", "title": title})
    return overview, keywords, notes, outline

def sync_room_to_meeting(room: MeetingRoom, db: Session):
    meeting = room.meeting
    for seg in list(meeting.transcript):
        db.delete(seg)
    db.flush()
    for msg in room.messages:
        db.add(TranscriptSegment(meeting_id=meeting.id, speaker=msg.speaker, start_seconds=msg.timestamp_seconds, end_seconds=msg.timestamp_seconds + 20, text=msg.text))
    meeting.duration_seconds = max([m.timestamp_seconds for m in room.messages] + [0]) + 30
    if not meeting.summary:
        meeting.summary = Summary(meeting_id=meeting.id)
    overview, keywords, notes, outline = build_ai_summary(meeting, room.messages)
    meeting.summary.overview = overview
    meeting.summary.keywords = json.dumps(keywords)
    meeting.summary.notes = json.dumps(notes)
    meeting.summary.outline = json.dumps(outline)
    # Create sensible action items from common follow-up language.
    existing = {a.task.lower() for a in meeting.action_items}
    for msg in room.messages:
        lower = msg.text.lower().replace('’', "'")
        if ("i'll" in lower or "i will" in lower or "let's" in lower or "we should" in lower or "agreed" in lower) and len(msg.text) > 20:
            task = msg.text.strip().rstrip(".")
            if task.lower() not in existing and len(meeting.action_items) < 6:
                db.add(ActionItem(meeting_id=meeting.id, task=task, owner=msg.speaker, due_date=None))
                existing.add(task.lower())
    db.commit()
    db.refresh(meeting)
    return meeting

@app.post("/api/rooms")
def create_room(payload: LiveRoomCreate, db: Session = Depends(get_db)):
    import secrets
    token = secrets.token_urlsafe(18)
    while db.query(MeetingRoom).filter_by(token=token).first():
        token = secrets.token_urlsafe(18)
    meeting = Meeting(title=payload.title, meeting_date=__import__('datetime').datetime.now().isoformat(), duration_seconds=0, source="Live meeting room")
    db.add(meeting); db.flush()
    host = db.query(Participant).filter_by(name=payload.host_name).first() or Participant(name=payload.host_name)
    db.add(host); db.flush(); meeting.participants.append(host)
    db.add(Summary(meeting_id=meeting.id, overview="Live meeting in progress. AI summary will be generated when the meeting ends.", keywords=json.dumps(["live meeting"]), notes=json.dumps([]), outline=json.dumps([])))
    room = MeetingRoom(meeting_id=meeting.id, token=token, host_name=payload.host_name, status="live")
    db.add(room); db.flush()
    db.add(RoomParticipant(room_id=room.id, name=payload.host_name))
    db.commit(); db.refresh(room)
    return room_dict(room)

@app.get("/api/rooms/{token}")
def get_room(token: str, db: Session = Depends(get_db)):
    room = db.query(MeetingRoom).filter_by(token=token).first()
    if not room: raise HTTPException(404, "Meeting room not found")
    return room_dict(room)

@app.post("/api/rooms/{token}/join")
def join_room(token: str, payload: RoomJoin, db: Session = Depends(get_db)):
    room = db.query(MeetingRoom).filter_by(token=token).first()
    if not room: raise HTTPException(404, "Meeting room not found")
    existing = db.query(RoomParticipant).filter(RoomParticipant.room_id == room.id, RoomParticipant.name == payload.name).first()
    if not existing:
        db.add(RoomParticipant(room_id=room.id, name=payload.name))
        p = db.query(Participant).filter_by(name=payload.name).first() or Participant(name=payload.name)
        db.add(p); db.flush()
        if p not in room.meeting.participants: room.meeting.participants.append(p)
        db.commit()
    return room_dict(room)

@app.post("/api/rooms/{token}/messages")
def add_room_message(token: str, payload: RoomMessageIn, db: Session = Depends(get_db)):
    room = db.query(MeetingRoom).filter_by(token=token).first()
    if not room: raise HTTPException(404, "Meeting room not found")
    if room.status != "live": raise HTTPException(400, "This meeting has ended")
    seq = (db.query(func.max(RoomMessage.sequence)).filter(RoomMessage.room_id == room.id).scalar() or 0) + 1
    timestamp = max(0, seq * 8)
    msg = RoomMessage(room_id=room.id, speaker=payload.speaker, text=payload.text.strip(), timestamp_seconds=timestamp, sequence=seq)
    db.add(msg); db.commit(); db.refresh(msg)
    return {"id": msg.id, "speaker": msg.speaker, "text": msg.text, "timestamp_seconds": msg.timestamp_seconds, "sequence": msg.sequence, "created_at": msg.created_at.isoformat() if msg.created_at else None}

@app.post("/api/rooms/{token}/end")
def end_room(token: str, payload: RoomEnd, db: Session = Depends(get_db)):
    room = db.query(MeetingRoom).filter_by(token=token).first()
    if not room: raise HTTPException(404, "Meeting room not found")
    if room.status == "ended": return {"meeting_id": room.meeting_id, "status": "ended"}
    room.status = "ended"
    room.ended_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
    sync_room_to_meeting(room, db)
    return {"meeting_id": room.meeting_id, "status": "ended"}

@app.post("/api/meetings/{meeting_id}/generate-summary")
def regenerate_summary(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.get(Meeting, meeting_id)
    if not meeting: raise HTTPException(404, "Meeting not found")
    if not meeting.summary:
        meeting.summary = Summary(meeting_id=meeting.id)
    overview, keywords, notes, outline = build_ai_summary(meeting, meeting.transcript)
    meeting.summary.overview = overview
    meeting.summary.keywords = json.dumps(keywords)
    meeting.summary.notes = json.dumps(notes)
    meeting.summary.outline = json.dumps(outline)
    db.commit(); db.refresh(meeting)
    return meeting_dict(meeting)

# Lightweight WebRTC signaling. Media stays peer-to-peer in the browsers; the server only relays signaling messages.
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict

class RoomConnectionManager:
    def __init__(self):
        self.rooms = defaultdict(dict)

    async def connect(self, token: str, name: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms[token][name] = websocket
        await self.broadcast(token, {"type": "peer-joined", "name": name}, exclude=name)

    async def disconnect(self, token: str, name: str):
        peers = self.rooms.get(token, {})
        peers.pop(name, None)
        if peers:
            await self.broadcast(token, {"type": "peer-left", "name": name})
        else:
            self.rooms.pop(token, None)

    async def broadcast(self, token: str, payload: dict, exclude: str | None = None):
        for peer_name, ws in list(self.rooms.get(token, {}).items()):
            if peer_name == exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    async def send_to(self, token: str, target: str, payload: dict):
        ws = self.rooms.get(token, {}).get(target)
        if ws:
            await ws.send_json(payload)

manager = RoomConnectionManager()

@app.websocket("/ws/rooms/{token}")
async def room_signaling(websocket: WebSocket, token: str, name: str = Query(...)):
    db = SessionLocal()
    room = db.query(MeetingRoom).filter_by(token=token).first()
    db.close()
    if not room:
        await websocket.close(code=4404)
        return
    await manager.connect(token, name, websocket)
    # Tell the newcomer about currently connected peers.
    existing = [peer for peer in manager.rooms.get(token, {}) if peer != name]
    await websocket.send_json({"type": "existing-peers", "peers": existing})
    try:
        while True:
            message = await websocket.receive_json()
            message["from"] = name
            target = message.get("to")
            if target:
                await manager.send_to(token, target, message)
            else:
                await manager.broadcast(token, message, exclude=name)
    except WebSocketDisconnect:
        await manager.disconnect(token, name)

# ----------------------------- AI assistant -----------------------------
@app.post("/api/meetings/{meeting_id}/ask")
def ask_meeting_assistant(meeting_id: int, payload: dict, db: Session = Depends(get_db)):
    meeting = db.get(Meeting, meeting_id)
    if not meeting: raise HTTPException(404, "Meeting not found")
    question = str(payload.get("question", "")).strip()
    if not question: raise HTTPException(400, "Question is required")
    segments = meeting.transcript
    q = question.lower()
    text = " ".join(s.text for s in segments)
    # Deterministic local assistant for the assignment. This keeps the demo free of API keys.
    if any(k in q for k in ["action", "task", "todo", "follow up", "follow-up"]):
        items = [a for a in meeting.action_items]
        answer = "Here are the action items captured for this meeting:\n" + ("\n".join(f"• {a.task} — {a.owner or 'Unassigned'}" for a in items) if items else "No action items have been captured yet.")
    elif any(k in q for k in ["summary", "summarize", "what happened", "overview"]):
        answer = meeting.summary.overview if meeting.summary else "No summary is available yet."
    elif any(k in q for k in ["who", "participant", "attendee"]):
        answer = "Participants: " + ", ".join(p.name for p in meeting.participants) + "."
    elif any(k in q for k in ["topic", "topics", "discuss"]):
        keys = json.loads(meeting.summary.keywords or "[]") if meeting.summary else []
        answer = "Key topics: " + ", ".join(keys) + "."
    elif any(k in q for k in ["decision", "decided", "agree"]):
        matches = [s.text for s in segments if any(k in s.text.lower() for k in ["agreed", "decide", "we should", "i'll", "i will", "let's"])]
        answer = "Decisions and commitments I found:\n" + ("\n".join(f"• {x}" for x in matches[:6]) if matches else "I couldn't find an explicit decision phrase in the transcript.")
    else:
        # Lightweight extractive answer: return the most relevant transcript lines containing question keywords.
        words = [w for w in q.replace("?", " ").split() if len(w) > 3]
        matches = [s for s in segments if any(w in s.text.lower() for w in words)]
        if matches:
            answer = "Based on the transcript:\n" + "\n".join(f"• {s.speaker}: {s.text}" for s in matches[:5])
        else:
            answer = f"I reviewed the transcript for {meeting.title}, but I couldn't find a direct match. Try asking about the summary, decisions, action items, participants, or key topics."
    return {"answer": answer, "meeting_id": meeting_id, "question": question}
