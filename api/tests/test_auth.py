import pytest

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

USER_PAYLOAD = {
    "name": "Test Teacher",
    "email": "teacher@iclass.com",
    "password": "secret123",
    "role": "teacher",
}


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post(REGISTER_URL, json=USER_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == USER_PAYLOAD["email"]
    assert body["role"] == "teacher"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post(REGISTER_URL, json=USER_PAYLOAD)
    resp = await client.post(REGISTER_URL, json=USER_PAYLOAD)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(REGISTER_URL, json=USER_PAYLOAD)
    resp = await client.post(LOGIN_URL, json={"email": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(REGISTER_URL, json=USER_PAYLOAD)
    resp = await client.post(LOGIN_URL, json={"email": USER_PAYLOAD["email"], "password": "wrong"})
    assert resp.status_code == 401
