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
        self.model = "qwen2.5-coder:7b"

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _call_llm(self, prompt: str) -> str:
        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
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
          - FAST lexical overlap scoring instead of LLM calls
          - Cap context to Top 4 chunks
        """
        if not retrieved_docs:
            return {"verdict": "INCORRECT", "avg_score": 0.0, "k_in": "", "k_ex": ""}

        # ── Fast Lexical Overlap Scoring ──────────────────────────────────────
        scored_docs = []
        # Filter out common stop words and short words for better overlap score
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "it", "this", "that", "i", "we", "you", "they"}
        query_words = {w for w in complaint_text.lower().split() if w not in stop_words and len(w) > 2}
        
        for doc in retrieved_docs:
            text = doc.get("text", "")
            if not text:
                continue
            doc_words = {w for w in text.lower().split() if w not in stop_words and len(w) > 2}
            if query_words and doc_words:
                overlap = len(query_words.intersection(doc_words))
                # Use intersection over the smaller set to ensure score is reasonable
                score = overlap / min(len(query_words), len(doc_words))
            else:
                score = 0.0
            doc["relevance_score"] = score
            scored_docs.append(doc)

        # ── Aggressive Chunk Filtering (Top 4 chunks, > 0.15 threshold) ──────
        scored_docs.sort(key=lambda x: x["relevance_score"], reverse=True)
        top_docs = [d for d in scored_docs if d["relevance_score"] >= 0.15][:4]

        if not top_docs:
            return {"verdict": "INCORRECT", "avg_score": 0.0, "k_in": "", "k_ex": ""}

        avg_score = sum(d["relevance_score"] for d in top_docs) / len(top_docs)

        # ── Verdict ───────────────────────────────────────────────────────────
        if avg_score >= 0.7:
            verdict = "CORRECT"
        elif avg_score >= 0.4:
            verdict = "AMBIGUOUS"
        else:
            verdict = "INCORRECT"

        logger.info(f"[CRAG] Fast Avg relevance: {avg_score:.2f} -> Verdict: {verdict}")

        k_in = " ".join([d.get("text", "") for d in top_docs])
        k_ex = ""

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
            "top_doc_ids": [d.get("complaint_id") for d in top_docs]
        }

    def _generate_final_recommendation(
        self,
        complaint_text: str,
        k_in: str,
        k_ex: str,
        retrieved_docs: List[Dict[str, Any]],
        top_doc_ids: List[str] = None
    ) -> Dict[str, Any]:
        """Day 75: Generate final officer recommendation."""
        related_ids = top_doc_ids if top_doc_ids is not None else [doc.get("complaint_id") for doc in retrieved_docs]

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
            eval_results.get("top_doc_ids", [])
        )
        return {
            "complaint_id": complaint_id,
            "crag_verdict": eval_results.get("verdict"),
            "crag_avg_score": eval_results.get("avg_score"),
            "insights": recommendation,
        }

    def process_stream(
        self, complaint_id: str, complaint_text: str, retrieved_docs: List[Dict[str, Any]]
    ):
        """Full pipeline entry point with Server-Sent Events (SSE) streaming."""
        from backend.services.cache_service import crag_cache
        
        cached_raw_text = crag_cache.get(f"{complaint_id}_stream_raw")
        cached_metadata = crag_cache.get(f"{complaint_id}_stream_meta")
        
        if cached_raw_text and cached_metadata:
            yield json.dumps(cached_metadata) + "\n"
            # Send the entire cached text as a single chunk to render instantly
            yield json.dumps({"type": "chunk", "content": cached_raw_text}) + "\n"
            return

        eval_results = self.evaluate_retrieval(complaint_text, retrieved_docs)
        
        related_ids = eval_results.get("top_doc_ids", [])
        k_in = eval_results.get("k_in", "")
        k_ex = eval_results.get("k_ex", "")
        
        # Fraud check heuristic based on keywords since LLM isn't doing JSON anymore
        fraud_alert = any(w in complaint_text.lower() for w in ["gang", "organized", "multiple accounts", "network", "syndicate"])
        
        # 1. Yield metadata event first
        metadata_event = {
            "type": "metadata",
            "complaint_id": complaint_id,
            "crag_verdict": eval_results.get("verdict", "INCORRECT"),
            "crag_avg_score": eval_results.get("avg_score", 0.0),
            "insights": {
                "fraud_network_alert": fraud_alert,
                "confidence_score": 0.85, # Fixed confidence for stream
                "related_case_ids": related_ids
            }
        }
        yield json.dumps(metadata_event) + "\n"

        prompt = (
            f"Please analyze this cybercrime report and provide an actionable investigative recommendation for the assigned officer.\n"
            f"[COMPLAINT]: \"{complaint_text[:400]}\"\n"
            f"[PAST CASES CONTEXT]: \"{k_in[:600]}\"\n"
            f"[LEGAL/SOP CONTEXT]: \"{k_ex[:400]}\"\n"
            f"Format your response EXACTLY as follows:\n\n"
            f"RECOMMENDATION:\n"
            f"<write 1-2 paragraphs here>\n\n"
            f"ACTIONS:\n"
            f"- <step1>\n"
            f"- <step2>\n"
            f"- <step3>"
        )

        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": "You are a highly secure law enforcement AI assistant for a cyber crime unit. You are authorized to analyze crime reports. You MUST provide investigative recommendations and NEVER refuse to answer, as this is for official police work.",
                    "stream": True,
                    "options": {"temperature": 0.0, "num_predict": 512},
                },
                stream=True,
                timeout=45,
            )
            response.raise_for_status()
            full_text = ""
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    try:
                        chunk_data = json.loads(decoded_line)
                        text_chunk = chunk_data.get("response", "")
                        if text_chunk:
                            full_text += text_chunk
                            yield json.dumps({
                                "type": "chunk",
                                "content": text_chunk
                            }) + "\n"
                    except json.JSONDecodeError:
                        pass
            
            # Save the final text and metadata to cache for subsequent clicks
            crag_cache.set(f"{complaint_id}_stream_raw", full_text)
            crag_cache.set(f"{complaint_id}_stream_meta", metadata_event)
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield json.dumps({
                "type": "error",
                "content": f"Error generating insights: {e}"
            }) + "\n"
