import json
import logging
import requests
import re
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any
from backend.services.llm_service import MistralService, OLLAMA_BASE_URL

logger = logging.getLogger(__name__)

# ── Max parallel LLM calls. Keep <= 3 to avoid Ollama OOM on local hardware ──
MAX_WORKERS = 3


class CorrectiveRAGService:
    def __init__(self):
        """
        Days 69-72 Tasks: CorrectiveRAGService implementation
        """
        self.llm_service = MistralService()
        self.api_url = f"{OLLAMA_BASE_URL}/api/generate"

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _call_llm(self, prompt: str) -> str:
        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": self.llm_service.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.0, "num_predict": 256},  # cap token output
                },
                timeout=45,
            )
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except Exception as e:
            logger.warning(f"[CRAG] LLM call failed: {e}")
            return ""

    def _parse_json(self, raw_text: str) -> dict:
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0].strip()
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            return {}

    def _prepare_relevance_prompt(self, complaint_text: str, document_text: str) -> str:
        # Truncate doc to 400 chars to keep prompt short and fast
        doc_snippet = document_text[:400]
        return (
            f"You are a fraud investigator. Score how relevant the historical case is to the new complaint.\n"
            f"[NEW COMPLAINT]: \"{complaint_text[:300]}\"\n"
            f"[HISTORICAL TEXT]: \"{doc_snippet}\"\n"
            f"Return ONLY JSON: {{\"relevance_score\": <float 0-1>, \"reasoning\": \"<1 sentence>\"}}"
        )

    def _score_single_doc(self, complaint_text: str, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Score one document. Designed to be called from a thread pool."""
        doc_text = doc.get("text", "")
        if not doc_text:
            doc["relevance_score"] = 0.0
            return doc
        prompt = self._prepare_relevance_prompt(complaint_text, doc_text)
        raw = self._call_llm(prompt)
        parsed = self._parse_json(raw)
        try:
            score = float(parsed.get("relevance_score", 0.0))
        except (ValueError, TypeError):
            score = 0.0
        doc["relevance_score"] = score
        return doc

    def _extract_knowledge_strips(self, text: str) -> List[str]:
        """Decompose doc into sentence-level strips."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 10]

    def _batch_score_strips(self, complaint_text: str, strips: List[str]) -> List[str]:
        """
        FIX: Instead of one LLM call per strip (20-50 calls), ask the LLM to
        score ALL strips in one batched prompt and return a JSON list.
        """
        if not strips:
            return []

        numbered = "\n".join(f"{i+1}. {s[:200]}" for i, s in enumerate(strips))
        prompt = (
            f"You are a fraud investigator. Rate each sentence 0-1 for relevance to the complaint.\n"
            f"[COMPLAINT]: \"{complaint_text[:300]}\"\n"
            f"[SENTENCES]:\n{numbered}\n"
            f"Return ONLY JSON array: [{{\"id\": 1, \"score\": 0.7}}, ...] — one object per sentence."
        )
        raw = self._call_llm(prompt)
        # Parse the list
        try:
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            scores_list = json.loads(raw)
            # Keep strips where score >= 0.5
            relevant = []
            for item in scores_list:
                idx = int(item.get("id", 0)) - 1
                score = float(item.get("score", 0.0))
                if 0 <= idx < len(strips) and score >= 0.5:
                    relevant.append(strips[idx])
            return relevant
        except Exception as e:
            logger.warning(f"[CRAG] Batch strip scoring parse failed: {e}")
            # Fallback: return all strips
            return strips

    def _generate_k_ex(self, complaint_text: str) -> str:
        """General knowledge supplement for AMBIGUOUS path."""
        prompt = (
            f"You are a cybersecurity analyst. In 3-4 sentences, explain the typical fraud mechanism "
            f"in the following complaint and what investigators should look for.\n"
            f"[COMPLAINT]: \"{complaint_text[:300]}\"\n"
            f"Return ONLY the supplementary text. Do not use JSON."
        )
        return self._call_llm(prompt)

    def _rewrite_query(self, complaint_text: str) -> str:
        """Rewrite complaint as short KB search keywords for INCORRECT path."""
        prompt = (
            f"Extract 3-5 search keywords from this cybercrime complaint for a legal knowledge base.\n"
            f"[COMPLAINT]: \"{complaint_text[:300]}\"\n"
            f"Return ONLY space-separated keywords."
        )
        return self._call_llm(prompt)

    def _search_knowledge_base(self, query: str) -> str:
        """Search local static KB files for matching paragraphs."""
        kb_dir = "backend/knowledge_base"
        if not os.path.exists(kb_dir):
            return ""

        keywords = [k.strip().lower() for k in query.split() if len(k.strip()) > 3]
        k_ex_results = []

        for filename in os.listdir(kb_dir):
            if not filename.endswith(".txt"):
                continue
            filepath = os.path.join(kb_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    for line in f:
                        p = line.strip()
                        if p and any(kw in p.lower() for kw in keywords):
                            k_ex_results.append(p)
            except Exception as e:
                logger.warning(f"[CRAG] Error reading KB file {filename}: {e}")

        unique_results = list(dict.fromkeys(k_ex_results))  # preserve order, deduplicate
        return " ".join(unique_results[:5])

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def evaluate_retrieval(
        self, complaint_text: str, retrieved_docs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        CRAG pipeline:
          - FIX: Score all docs in PARALLEL (ThreadPoolExecutor) instead of sequentially
          - FIX: Score knowledge strips with ONE batched LLM call instead of N calls
        """
        if not retrieved_docs:
            return {"verdict": "INCORRECT", "avg_score": 0.0, "k_in": "", "k_ex": ""}

        # ── FIX 1: Parallel doc scoring ──────────────────────────────────────
        scored_docs = []
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {
                pool.submit(self._score_single_doc, complaint_text, dict(doc)): i
                for i, doc in enumerate(retrieved_docs)
                if doc.get("text")
            }
            for future in as_completed(futures):
                try:
                    scored_docs.append(future.result())
                except Exception as e:
                    logger.warning(f"[CRAG] Doc scoring thread error: {e}")

        if not scored_docs:
            return {"verdict": "INCORRECT", "avg_score": 0.0, "k_in": "", "k_ex": ""}

        avg_score = sum(d["relevance_score"] for d in scored_docs) / len(scored_docs)

        # ── Verdict ───────────────────────────────────────────────────────────
        if avg_score > 0.8:
            verdict = "CORRECT"
        elif avg_score >= 0.4:
            verdict = "AMBIGUOUS"
        else:
            verdict = "INCORRECT"

        logger.info(f"[CRAG] Avg relevance: {avg_score:.2f} -> Verdict: {verdict}")

        k_in = ""
        k_ex = ""

        if verdict in ["CORRECT", "AMBIGUOUS"]:
            # ── FIX 2: Batch strip scoring (1 LLM call instead of N) ─────────
            all_strips = []
            for doc in scored_docs:
                all_strips.extend(self._extract_knowledge_strips(doc.get("text", "")))

            # Cap at 20 strips to keep the batch prompt manageable
            relevant_strips = self._batch_score_strips(complaint_text, all_strips[:20])
            k_in = " ".join(relevant_strips)

            if verdict == "AMBIGUOUS":
                k_ex = self._generate_k_ex(complaint_text)

        elif verdict == "INCORRECT":
            rewritten_query = self._rewrite_query(complaint_text)
            k_ex = self._search_knowledge_base(rewritten_query)

        return {
            "verdict": verdict,
            "avg_score": round(avg_score, 4),
            "k_in": k_in,
            "k_ex": k_ex,
        }

    def _generate_final_recommendation(
        self,
        complaint_text: str,
        k_in: str,
        k_ex: str,
        retrieved_docs: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Day 75: Generate final officer recommendation."""
        related_ids = [doc.get("complaint_id") for doc in retrieved_docs]

        prompt = (
            f"You are an AI assistant for a cyber crime unit. Generate an actionable officer recommendation.\n"
            f"[COMPLAINT]: \"{complaint_text[:400]}\"\n"
            f"[PAST CASES CONTEXT]: \"{k_in[:600]}\"\n"
            f"[LEGAL/SOP CONTEXT]: \"{k_ex[:400]}\"\n"
            f"Return ONLY JSON:\n"
            f"{{\"officer_recommendation\": \"<paragraph>\", "
            f"\"suggested_actions\": [\"<step1>\", \"<step2>\"], "
            f"\"related_case_ids\": {related_ids}, "
            f"\"fraud_network_alert\": <true/false>, "
            f"\"confidence_score\": <0.0-1.0>}}"
        )
        raw = self._call_llm(prompt)
        parsed = self._parse_json(raw)

        return {
            "officer_recommendation": parsed.get("officer_recommendation", "No recommendation generated."),
            "suggested_actions": parsed.get("suggested_actions", []),
            "related_case_ids": parsed.get("related_case_ids", []),
            "fraud_network_alert": bool(parsed.get("fraud_network_alert", False)),
            "confidence_score": float(parsed.get("confidence_score", 0.0)),
        }

    def process(
        self, complaint_id: str, complaint_text: str, retrieved_docs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Day 76: Full pipeline entry point."""
        eval_results = self.evaluate_retrieval(complaint_text, retrieved_docs)
        recommendation = self._generate_final_recommendation(
            complaint_text,
            eval_results.get("k_in", ""),
            eval_results.get("k_ex", ""),
            retrieved_docs,
        )
        return {
            "complaint_id": complaint_id,
            "crag_verdict": eval_results.get("verdict"),
            "crag_avg_score": eval_results.get("avg_score"),
            "insights": recommendation,
        }
