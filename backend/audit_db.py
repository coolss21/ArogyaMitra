import sqlite3
import json

db_path = "arogyamitra.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Latest Agent Error ---")
cursor.execute("SELECT event_type, error, created_at FROM agent_events WHERE error IS NOT NULL ORDER BY created_at DESC LIMIT 1;")
row = cursor.fetchone()
if row:
    print(f"Error Type: {row[0]}\nError Msg: {row[1]}\nTime: {row[2]}")
else:
    print("No errors found.")

print("\n--- Latest History State ---")
cursor.execute("SELECT session_id, history FROM conversation_state ORDER BY updated_at DESC LIMIT 1;")
row = cursor.fetchone()
if row:
    print(f"Session: {row[0]}")
    try:
        hist = json.loads(row[1])
        print(f"History Type: {type(hist)}, Length: {len(hist)}")
    except Exception as e:
        print(f"Failed to parse history JSON in DB: {e}\nRaw DB history: {row[1][:100]}...")
else:
    print("No conversation state found.")

conn.close()
