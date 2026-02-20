import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from job_applier.models.application import Application, GenerationConfig
from job_applier.models.chat import ChatHistory, ChatMessage
from job_applier.models.job import JobPosting
from job_applier.models.skill import SkillLibrary
from job_applier.services.generator import generator
from job_applier.services.llm import llm
from job_applier.services.storage import storage

router = APIRouter(prefix="/api/chat", tags=["chat"])

CHAT_SYSTEM_PROMPT = """\
You are a professional career assistant helping refine job application documents.
The user is working on an application for: {job_title} at {company}.

Current document ({doc_type}):
---
{current_doc}
---

Help the user refine this document. When they request changes:
1. Acknowledge their request
2. Suggest specific improvements
3. If they ask you to regenerate or edit the document, provide the updated HTML content
   wrapped in <updated-document> tags.

Keep responses concise and focused on the document.
"""


def _load_chat_history(app_id: str) -> ChatHistory:
    path = Path("applications") / app_id / "chat_history.json"
    history = storage.load_model(path, ChatHistory)
    if not history:
        history = ChatHistory(application_id=app_id)
    return history


def _save_chat_history(history: ChatHistory) -> None:
    path = Path("applications") / history.application_id / "chat_history.json"
    storage.save_model(path, history)


@router.websocket("/{app_id}")
async def chat_websocket(websocket: WebSocket, app_id: str):
    await websocket.accept()

    # Load context
    application = storage.load_model(
        storage.base_dir / "applications" / app_id / "application.json", Application
    )
    if not application:
        await websocket.send_json({"type": "error", "content": "Application not found"})
        await websocket.close()
        return

    job = storage.load_model(
        storage.base_dir / "jobs" / application.job_id / "posting.json", JobPosting
    )

    # Load current document content
    doc_type = "letter"  # Default to letter for chat refinement
    for dt in ("letter", "cv"):
        html_path = storage.base_dir / "applications" / app_id / f"{dt}.html"
        if html_path.exists():
            doc_type = dt
            break

    current_doc = ""
    html_path = storage.base_dir / "applications" / app_id / f"{doc_type}.html"
    if html_path.exists():
        current_doc = html_path.read_text(encoding="utf-8")

    system_prompt = CHAT_SYSTEM_PROMPT.format(
        job_title=job.title if job else "Unknown",
        company=job.company if job else "Unknown",
        doc_type=doc_type,
        current_doc=current_doc[:3000],
    )

    history = _load_chat_history(app_id)

    # Send existing history
    for msg in history.messages:
        await websocket.send_json({
            "type": "history",
            "role": msg.role,
            "content": msg.content,
        })

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            user_content = message.get("content", "")

            # Save user message
            history.messages.append(
                ChatMessage(role="user", content=user_content)
            )

            # Build messages for LLM
            llm_messages = [
                {"role": m.role, "content": m.content}
                for m in history.messages
            ]

            # Stream response
            full_response = ""
            async for token in llm.stream_chat(llm_messages, system=system_prompt):
                full_response += token
                await websocket.send_json({"type": "token", "content": token})

            # Save assistant message
            history.messages.append(
                ChatMessage(role="assistant", content=full_response)
            )
            _save_chat_history(history)

            # Check if response contains updated document
            if "<updated-document>" in full_response:
                start = full_response.index("<updated-document>") + len("<updated-document>")
                end = full_response.index("</updated-document>")
                updated_html = full_response[start:end].strip()

                # Save updated document
                storage.save_file(
                    Path("applications") / app_id / f"{doc_type}.html",
                    updated_html.encode("utf-8"),
                )

                # Regenerate PDF
                full_html = generator.render_full_html(updated_html)
                generator.generate_pdf(
                    full_html,
                    Path("applications") / app_id / f"{doc_type}.pdf",
                )

                await websocket.send_json({
                    "type": "document_updated",
                    "doc_type": doc_type,
                    "html": updated_html,
                })

            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        _save_chat_history(history)
