"""
LangGraph agent graph definition.

Graph:
  START
    → validate_input
    → load_tenant_context
    → build_prompt
    → call_llm
    → validate_response
  END

The graph is compiled once at startup and reused for all requests.
This is a linear pipeline — no conditional branching needed for this use case.
"""

from langgraph.graph import StateGraph, END, START

from app.graph.state import AgentState
from app.graph.nodes import (
    validate_input,
    load_tenant_context,
    build_prompt_node,
    call_llm_node,
    validate_response_node,
)


def build_agent_graph():
    """
    Compile and return the LangGraph agent.

    Returns a compiled graph that can be invoked with an AgentState dict.
    """
    graph = StateGraph(AgentState)

    # Register nodes
    graph.add_node("validate_input", validate_input)
    graph.add_node("load_tenant_context", load_tenant_context)
    graph.add_node("build_prompt", build_prompt_node)
    graph.add_node("call_llm", call_llm_node)
    graph.add_node("validate_response", validate_response_node)

    # Define edges (linear pipeline)
    graph.add_edge(START, "validate_input")
    graph.add_edge("validate_input", "load_tenant_context")
    graph.add_edge("load_tenant_context", "build_prompt")
    graph.add_edge("build_prompt", "call_llm")
    graph.add_edge("call_llm", "validate_response")
    graph.add_edge("validate_response", END)

    return graph.compile()


# Singleton — compiled once at module load time
agent_graph = build_agent_graph()
