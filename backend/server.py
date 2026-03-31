"""
Backend del Panel InfoObras.

Llama a motor-OCR como subprocess (caja negra) via subprocess_wrapper.py.

Arrancar desde Panel-InfoObras/backend/:
    uvicorn server:app --port 8000

Requiere .env con MOTOR_OCR_PYTHON y MOTOR_OCR_WRAPPER configurados.
"""

import json
import logging
import os
import sqlite3
import subprocess
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
MOTOR_OCR_PYTHON = os.getenv("MOTOR_OCR_PYTHON")
MOTOR_OCR_WRAPPER = os.getenv("MOTOR_OCR_WRAPPER")
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(Path(__file__).parent / "uploads")))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", str(Path(__file__).parent / "ocr_outputs")))
DB_PATH = Path(__file__).parent / "jobs.db"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

if not MOTOR_OCR_PYTHON or not MOTOR_OCR_WRAPPER:
    raise RuntimeError(
        "Faltan variables de entorno: MOTOR_OCR_PYTHON y MOTOR_OCR_WRAPPER "
        "deben estar definidas en .env"
    )

# ── App ───────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Panel InfoObras API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Un solo worker: GPU única en el servidor
_executor = ThreadPoolExecutor(max_workers=1)


# ── DB ────────────────────────────────────────────────────────────────────────
def _init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id          TEXT PRIMARY KEY,
                filename    TEXT NOT NULL,
                pages_from  INTEGER,
                pages_to    INTEGER,
                status      TEXT NOT NULL DEFAULT 'pending',
                created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                result      TEXT,
                error       TEXT
            )
        """)


_init_db()


def _update_job(job_id: str, **fields) -> None:
    sets = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [job_id]
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(f"UPDATE jobs SET {sets} WHERE id = ?", values)


# ── Job runner ────────────────────────────────────────────────────────────────
def _run_job(job_id: str, pdf_path: Path, pages: Optional[list]) -> None:
    _update_job(job_id, status="running")

    job_output_dir = str(OUTPUT_DIR / job_id)
    args_file = results_file = None

    try:
        # Preparar argumentos para subprocess_wrapper.py
        args = {
            "mode": "segmentation",
            "pdf_path": str(pdf_path),
            "pages": pages,
            "output_dir": job_output_dir,
            "keep_images": False,
        }

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, encoding="utf-8"
        ) as f:
            json.dump(args, f)
            args_file = f.name

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            results_file = f.name

        logger.info("Job %s: llamando a motor-OCR...", job_id)
        subprocess.run(
            [MOTOR_OCR_PYTHON, MOTOR_OCR_WRAPPER, args_file, results_file],
            check=True,
            timeout=9000,  # 2.5 horas — documentos grandes toman hasta 1h40m
        )

        with open(results_file, encoding="utf-8") as f:
            raw = json.load(f)

        # Transformar al formato del panel
        doc = raw["doc"]
        result = {
            "total_pages": doc["total_pages"],
            "pages_paddle": doc["pages_paddle"],
            "pages_qwen": doc["pages_qwen"],
            "pages_error": doc["pages_error"],
            "conf_promedio": round(doc["conf_promedio_documento"], 3),
            "tiempo_total": round(doc["tiempo_total"], 1),
            "secciones": [
                {
                    "index": s["section_index"],
                    "cargo": s["cargo"],
                    "numero": s["numero"],
                    "total_pages": s["total_pages"],
                }
                for s in raw["secciones"]
            ],
        }
        _update_job(
            job_id,
            status="done",
            result=json.dumps(result, ensure_ascii=False),
        )
        logger.info(
            "Job %s completado: %d págs, %d profesionales",
            job_id,
            doc["total_pages"],
            len(raw["secciones"]),
        )

    except subprocess.CalledProcessError as e:
        logger.error("Job %s: subprocess falló con código %d", job_id, e.returncode)
        _update_job(job_id, status="error", error=f"motor-OCR terminó con error (código {e.returncode})")
    except subprocess.TimeoutExpired:
        logger.error("Job %s: timeout", job_id)
        _update_job(job_id, status="error", error="Timeout: el procesamiento superó el límite de tiempo")
    except Exception as e:
        logger.exception("Job %s: error inesperado", job_id)
        _update_job(job_id, status="error", error=str(e))
    finally:
        if args_file:
            Path(args_file).unlink(missing_ok=True)
        if results_file:
            Path(results_file).unlink(missing_ok=True)
        pdf_path.unlink(missing_ok=True)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.post("/api/jobs", status_code=201)
async def create_job(
    file: UploadFile = File(...),
    pages_from: Optional[int] = Form(None),
    pages_to: Optional[int] = Form(None),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Solo se aceptan archivos PDF")

    if pages_from is not None and pages_to is not None:
        if pages_from < 1 or pages_to < pages_from:
            raise HTTPException(400, "Rango de páginas inválido")
        pages: Optional[list] = list(range(pages_from, pages_to + 1))
    elif pages_from is not None:
        pages = [pages_from]
    else:
        pages = None

    job_id = uuid.uuid4().hex[:8]
    pdf_path = UPLOADS_DIR / f"{job_id}_{file.filename}"
    pdf_path.write_bytes(await file.read())

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO jobs (id, filename, pages_from, pages_to) VALUES (?,?,?,?)",
            (job_id, file.filename, pages_from, pages_to),
        )

    _executor.submit(_run_job, job_id, pdf_path, pages)
    return {"id": job_id, "status": "pending"}


@app.get("/api/jobs")
async def list_jobs():
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT id, filename, pages_from, pages_to, status, created_at "
            "FROM jobs ORDER BY created_at DESC LIMIT 50"
        ).fetchall()
    return [
        {
            "id": r[0],
            "filename": r[1],
            "pages_from": r[2],
            "pages_to": r[3],
            "status": r[4],
            "created_at": r[5],
        }
        for r in rows
    ]


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT id, filename, pages_from, pages_to, status, created_at, result, error "
            "FROM jobs WHERE id = ?",
            (job_id,),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Job no encontrado")
    return {
        "id": row[0],
        "filename": row[1],
        "pages_from": row[2],
        "pages_to": row[3],
        "status": row[4],
        "created_at": row[5],
        "result": json.loads(row[6]) if row[6] else None,
        "error": row[7],
    }
