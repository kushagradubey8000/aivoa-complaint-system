import json
import re
from groq import Groq

from app.config import settings

_client = Groq(api_key=settings.groq_api_key)


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


def call_groq_json(system_prompt: str, user_prompt: str, model: str) -> dict:
    """Call Groq chat completion and parse a JSON object out of the response.

    Falls back to an empty dict if parsing fails, rather than raising, so a
    single bad model response never crashes the whole agent graph.
    """
    completion = _client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    try:
        return json.loads(_strip_code_fences(raw))
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}
        return {}


def call_groq_text(system_prompt: str, user_prompt: str, model: str) -> str:
    completion = _client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
    )
    return completion.choices[0].message.content.strip()
