import urllib.request
import json

print("=" * 60)
print("EMAIL VALIDATION AND REGISTRATION TESTS")
print("=" * 60)

# Test registration with different email domains
test_emails = [
    ("student@gmail.com", "Gmail"),
    ("coordinator@outlook.com", "Outlook"),
    ("student.name@example.org", "Example.org"),
    ("test@yahoo.com", "Yahoo"),
]

for email, domain_name in test_emails:
    data = json.dumps({
        "name": f"Test {domain_name} User",
        "email": email,
        "password": "TestPass123",
        "roll_number": f"MIT-2024-{domain_name.upper()}-001",
        "prn_number": f"PRN2024{domain_name.upper()}001",
        "department_id": 1
    }).encode()
    req = urllib.request.Request("http://127.0.0.1:8000/api/auth/register/", data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print("PASS: " + domain_name + " (" + email + "): " + result["message"][:50] + "...")
    except Exception as e:
        if hasattr(e, 'code'):
            print("FAIL: " + domain_name + " (" + email + "): HTTP " + str(e.code) + " - " + e.read().decode()[:100])
        else:
            print("FAIL: " + domain_name + " (" + email + "): " + str(e)[:100])

# Test duplicate email rejection
print("\n--- Duplicate Email Test ---")
data = json.dumps({
    "name": "Duplicate Test",
    "email": "student@gmail.com",
    "password": "TestPass123",
    "roll_number": "MIT-2024-DUP-001",
    "prn_number": "PRN2024DUP001",
    "department_id": 1
}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/register/", data=data, headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req)
    print("FAIL: Duplicate email: UNEXPECTED - Got 201 Created")
except Exception as e:
    if hasattr(e, 'code'):
        print("PASS: Duplicate email correctly rejected: HTTP " + str(e.code))
    else:
        print("FAIL: Duplicate email test failed: " + str(e))

# Test invalid email format
print("\n--- Invalid Email Format Test ---")
data = json.dumps({
    "name": "Invalid Email",
    "email": "not-an-email",
    "password": "TestPass123",
    "roll_number": "MIT-2024-BAD-001",
    "prn_number": "PRN2024BAD001",
    "department_id": 1
}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/register/", data=data, headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req)
    print("FAIL: Invalid email: UNEXPECTED - Got 201 Created")
except Exception as e:
    if hasattr(e, 'code'):
        body = e.read().decode()
        print("PASS: Invalid email correctly rejected: HTTP " + str(e.code) + " - " + body[:100])
    else:
        print("FAIL: Invalid email test failed: " + str(e))

# Test login with newly registered Gmail user
print("\n--- Login with Gmail User ---")
data = json.dumps({"email": "student@gmail.com", "password": "TestPass123"}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/auth/login/", data=data, headers={"Content-Type": "application/json"})
try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print("PASS: Gmail login: " + result["message"])
except Exception as e:
    if hasattr(e, 'code'):
        print("FAIL: Gmail login failed: HTTP " + str(e.code) + " - " + e.read().decode()[:100])
    else:
        print("FAIL: Gmail login test failed: " + str(e))

print("\n" + "=" * 60)
print("ALL EMAIL VALIDATION TESTS COMPLETED")
print("=" * 60)