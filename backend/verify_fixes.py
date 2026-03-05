import httpx
import time

BASE_URL = "http://127.0.0.1:8000"

def verify_fixes():
    time.sleep(3.0)  # Wait for uvicorn to bind the port fully
    with httpx.Client(timeout=60.0) as client:
        # 1. Register & Login
        email = f"festive_test_{int(time.time())}@example.com"
        print(f"Testing with user: {email}")
        client.post(f"{BASE_URL}/auth/register", json={"email": email, "password": "password123"})
        login_resp = client.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "password123"})
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test Religious Diet + Memory
        print("Sending religious diet preference...")
        chat_resp = client.post(f"{BASE_URL}/aromi/chat", headers=headers, json={
            "message": "I am Hindu. I don't eat beef or bacon. Please remember this."
        })
        print(f"AROMI Reply: {chat_resp.json()['reply'][:100]}...")
        
        # 3. Check Memory
        print("Verifying memory storage...")
        mem_resp = client.get(f"{BASE_URL}/aromi/memory", headers=headers)
        mems = mem_resp.json()
        print(f"Stored Memories: {mems}")
        
        # 4. Check History Persistence
        print("Checking chat history endpoint...")
        hist_resp = client.get(f"{BASE_URL}/aromi/history", headers=headers)
        hist = hist_resp.json()
        print(f"History Length: {len(hist['history'])}")
        if len(hist['history']) >= 2:
            print("SUCCESS: History persisted and retrieved.")
        else:
            print("FAILURE: History missing.")

        # 5. Test JSON Robustness (Simulated by asking for complex output)
        print("Testing plan generation with diet rules...")
        plan_resp = client.post(f"{BASE_URL}/aromi/chat", headers=headers, json={
            "message": "Generate a 1-day sample nutrition plan for me."
        })
        reply = plan_resp.json()['reply'].lower()
        if "beef" in reply or "bacon" in reply:
            print("FAILURE: Diet rule violated!")
        else:
            print("SUCCESS: Diet rule respected in plan generation.")

if __name__ == "__main__":
    verify_fixes()
