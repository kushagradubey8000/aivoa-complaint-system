from langgraph.graph import StateGraph, END

from app.agents.nodes import (
    AgentState,
    classify_intent,
    extract_fields,
    merge_fields,
    run_risk_assessment,
    compose_reply,
)


def build_complaint_agent():
    graph = StateGraph(AgentState)

    graph.add_node("classify_intent", classify_intent)
    graph.add_node("extract_fields", extract_fields)
    graph.add_node("merge_fields", merge_fields)
    graph.add_node("assess_risk", run_risk_assessment)
    graph.add_node("compose_reply", compose_reply)

    graph.set_entry_point("classify_intent")
    graph.add_edge("classify_intent", "extract_fields")
    graph.add_edge("extract_fields", "merge_fields")
    graph.add_edge("merge_fields", "assess_risk")
    graph.add_edge("assess_risk", "compose_reply")
    graph.add_edge("compose_reply", END)

    return graph.compile()


# Compiled once at import time and reused across requests
complaint_agent = build_complaint_agent()
