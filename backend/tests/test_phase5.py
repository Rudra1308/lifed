from backend.app.memory.embeddings import embedding_engine
from backend.app.memory.service import memory_service
from backend.app.storage.repository import LifedRepository

def test_local_embedding_engine():
    text1 = "User prefers doing deep technical programming in the early morning."
    text2 = "Morning technical coding session preference."
    text3 = "Late night social media scrolling and snacking."

    v1 = embedding_engine.embed_text(text1)
    v2 = embedding_engine.embed_text(text2)
    v3 = embedding_engine.embed_text(text3)

    assert len(v1) == 384
    assert len(v2) == 384
    assert len(v3) == 384

    # v1 and v2 should have high similarity
    sim_tech = embedding_engine.cosine_similarity(v1, v2)
    sim_unrelated = embedding_engine.cosine_similarity(v1, v3)

    assert sim_tech > sim_unrelated
    assert sim_tech > 0.3

def test_memory_service_and_api(client, test_db):
    repo = LifedRepository(test_db)

    # 1. Create memories via API
    res1 = client.post("/api/memories", json={
        "content": "Prefers writing backend Python APIs before working on frontend UI",
        "type": "preference"
    })
    assert res1.status_code == 200
    mem1 = res1.json()
    assert mem1["type"] == "preference"

    res2 = client.post("/api/memories", json={
        "content": "Strict requirement: do not exceed 4 hours of meetings per week",
        "type": "rule"
    })
    assert res2.status_code == 200
    mem2 = res2.json()

    # 2. List memories
    list_res = client.get("/api/memories")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2

    # 3. Semantic vector search
    search_res = client.get("/api/memories/search?q=backend%20python")
    assert search_res.status_code == 200
    matches = search_res.json()
    assert len(matches) >= 1
    assert "backend Python" in matches[0]["memory"]["content"]
    assert matches[0]["similarity"] > 0.2

    # 4. Delete memory
    del_res = client.delete(f"/api/memories/{mem1['id']}")
    assert del_res.status_code == 200

    list_after = client.get("/api/memories")
    assert len(list_after.json()) == 1
