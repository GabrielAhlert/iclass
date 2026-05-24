import pytest

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
TASKS_URL = "/api/v1/tasks/"

TEACHER = {"name": "Prof", "email": "prof@iclass.com", "password": "pass123", "role": "teacher"}
STUDENT = {"name": "Aluno", "email": "aluno@iclass.com", "password": "pass123", "role": "student"}


async def get_token(client, user: dict) -> str:
    await client.post(REGISTER_URL, json=user)
    resp = await client.post(LOGIN_URL, json={"email": user["email"], "password": user["password"]})
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_teacher_can_create_task(client):
    token = await get_token(client, TEACHER)
    resp = await client.post(
        TASKS_URL,
        json={"title": "Atividade 1", "weight_index": 3},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["weight"] == 3  # FIBONACCI[3] = 3


@pytest.mark.asyncio
async def test_student_cannot_create_task(client):
    token = await get_token(client, STUDENT)
    resp = await client.post(
        TASKS_URL,
        json={"title": "Hack", "weight_index": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_fibonacci_weights(client):
    token = await get_token(client, TEACHER)
    fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
    for idx, expected_weight in enumerate(fib):
        resp = await client.post(
            TASKS_URL,
            json={"title": f"Task {idx}", "weight_index": idx},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.json()["weight"] == expected_weight
