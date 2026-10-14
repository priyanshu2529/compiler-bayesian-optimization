import sqlite3
import json
import csv
from io import StringIO
from typing import Dict, List, Any, Optional
from datetime import datetime
from backend.app.config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    conn = get_db_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                benchmark_id TEXT NOT NULL,
                compiler_path TEXT NOT NULL,
                compiler_version TEXT,
                base_opt TEXT NOT NULL,
                budget INTEGER NOT NULL,
                init_evals INTEGER NOT NULL,
                acquisition TEXT NOT NULL,
                status TEXT NOT NULL, -- running, completed, stopped, failed
                best_time_ms REAL,
                best_pass_ids TEXT,
                baseline_o0_time REAL,
                baseline_o1_time REAL,
                baseline_o2_time REAL,
                baseline_o3_time REAL,
                speedup_vs_o2 REAL,
                speedup_vs_o3 REAL,
                total_duration_sec REAL,
                evaluations_completed INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL,
                finished_at TEXT
            );
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_id TEXT NOT NULL,
                eval_number INTEGER NOT NULL,
                pass_ids TEXT NOT NULL,
                pass_mask TEXT NOT NULL,
                compile_time_ms REAL,
                execution_time_ms REAL,
                execution_times_json TEXT,
                binary_size_bytes INTEGER,
                checksum TEXT,
                acquisition_val REAL,
                is_best INTEGER DEFAULT 0,
                status TEXT NOT NULL, -- success, compile_error, runtime_error, timeout
                error_details TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (experiment_id) REFERENCES experiments (id) ON DELETE CASCADE
            );
        """)
    conn.close()

def save_experiment(exp: Dict[str, Any]):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO experiments (
                id, name, benchmark_id, compiler_path, compiler_version, base_opt,
                budget, init_evals, acquisition, status, best_time_ms, best_pass_ids,
                baseline_o0_time, baseline_o1_time, baseline_o2_time, baseline_o3_time,
                speedup_vs_o2, speedup_vs_o3, total_duration_sec, evaluations_completed,
                error_message, created_at, finished_at
            ) VALUES (
                :id, :name, :benchmark_id, :compiler_path, :compiler_version, :base_opt,
                :budget, :init_evals, :acquisition, :status, :best_time_ms, :best_pass_ids,
                :baseline_o0_time, :baseline_o1_time, :baseline_o2_time, :baseline_o3_time,
                :speedup_vs_o2, :speedup_vs_o3, :total_duration_sec, :evaluations_completed,
                :error_message, :created_at, :finished_at
            );
        """, exp)
    conn.close()

def update_experiment_status(exp_id: str, status: str, error_message: Optional[str] = None):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            UPDATE experiments 
            SET status = ?, error_message = ?, finished_at = ?
            WHERE id = ?
        """, (status, error_message, datetime.utcnow().isoformat(), exp_id))
    conn.close()

def record_evaluation(eval_data: Dict[str, Any]):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO evaluations (
                experiment_id, eval_number, pass_ids, pass_mask, compile_time_ms,
                execution_time_ms, execution_times_json, binary_size_bytes, checksum,
                acquisition_val, is_best, status, error_details, created_at
            ) VALUES (
                :experiment_id, :eval_number, :pass_ids, :pass_mask, :compile_time_ms,
                :execution_time_ms, :execution_times_json, :binary_size_bytes, :checksum,
                :acquisition_val, :is_best, :status, :error_details, :created_at
            );
        """, eval_data)
        
        # Increment completed counter
        conn.execute("""
            UPDATE experiments
            SET evaluations_completed = evaluations_completed + 1
            WHERE id = ?
        """, (eval_data["experiment_id"],))
    conn.close()

def list_experiments(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.execute("""
        SELECT * FROM experiments
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_experiment(exp_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.execute("SELECT * FROM experiments WHERE id = ?", (exp_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    exp = dict(row)
    cur_evals = conn.execute("""
        SELECT * FROM evaluations 
        WHERE experiment_id = ? 
        ORDER BY eval_number ASC
    """, (exp_id,)).fetchall()
    conn.close()
    
    exp["evaluations"] = [dict(e) for e in cur_evals]
    return exp

def delete_experiment(exp_id: str):
    conn = get_db_connection()
    with conn:
        conn.execute("DELETE FROM evaluations WHERE experiment_id = ?", (exp_id,))
        conn.execute("DELETE FROM experiments WHERE id = ?", (exp_id,))
    conn.close()

def get_dashboard_summary() -> Dict[str, Any]:
    conn = get_db_connection()
    exp_count = conn.execute("SELECT COUNT(*) FROM experiments").fetchone()[0]
    eval_count = conn.execute("SELECT COUNT(*) FROM evaluations").fetchone()[0]
    best_speedup_row = conn.execute("""
        SELECT benchmark_id, MAX(speedup_vs_o3) as max_sp, best_time_ms, best_pass_ids, id
        FROM experiments
        WHERE speedup_vs_o3 IS NOT NULL AND status = 'completed'
    """).fetchone()
    
    latest_exp = conn.execute("""
        SELECT id, name, benchmark_id, status, created_at, best_time_ms, speedup_vs_o3
        FROM experiments
        ORDER BY created_at DESC
        LIMIT 1
    """).fetchone()
    
    conn.close()
    
    return {
        "total_experiments": exp_count,
        "total_evaluations": eval_count,
        "best_overall": {
            "benchmark_id": best_speedup_row[0] if best_speedup_row else None,
            "max_speedup_vs_o3": best_speedup_row[1] if best_speedup_row else None,
            "best_time_ms": best_speedup_row[2] if best_speedup_row else None,
            "best_pass_ids": json.loads(best_speedup_row[3]) if best_speedup_row and best_speedup_row[3] else [],
            "experiment_id": best_speedup_row[4] if best_speedup_row else None
        } if best_speedup_row and best_speedup_row[0] else None,
        "latest_experiment": dict(latest_exp) if latest_exp else None
    }

def export_experiment_csv(exp_id: str) -> str:
    exp = get_experiment(exp_id)
    if not exp:
        return ""
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Eval_Number", "Status", "Execution_Time_ms", "Compile_Time_ms",
        "Binary_Size_Bytes", "Acquisition_Score", "Is_Best", "Checksum",
        "Pass_Flags", "Created_At"
    ])
    
    for ev in exp.get("evaluations", []):
        passes = " ".join(json.loads(ev["pass_ids"])) if ev["pass_ids"] else ""
        writer.writerow([
            ev["eval_number"],
            ev["status"],
            ev["execution_time_ms"],
            ev["compile_time_ms"],
            ev["binary_size_bytes"],
            ev["acquisition_val"],
            ev["is_best"],
            ev["checksum"],
            passes,
            ev["created_at"]
        ])
        
    return output.getvalue()
