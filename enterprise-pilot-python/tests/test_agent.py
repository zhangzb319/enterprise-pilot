from app.schemas.agent import AgentChatRequest


def test_agent_request_accepts_message() -> None:
    assert AgentChatRequest(message="查询我的会议").message == "查询我的会议"
