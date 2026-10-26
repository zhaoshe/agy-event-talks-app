#!/usr/bin/env python3
"""
BigQuery Release Notes Viewer
A Flask web application that fetches, parses, and displays Google BigQuery release notes
with interactive refresh and 1-click sharing to Twitter / X.
"""

import os
import re
import time
from datetime import datetime
from html import unescape
import xml.etree.ElementTree as ET

from flask import Flask, jsonify, render_template, request
import requests

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_TTL_SECONDS = 60

# In-memory cache
_cache = {
    "data": None,
    "last_fetched": 0,
    "error": None,
}


def clean_html_to_text(html_str: str) -> str:
    """Convert HTML string into clean plain text."""
    if not html_str:
        return ""
    # Replace paragraph and header tags with newlines
    text = re.sub(r'</?(?:p|h[1-6]|li|div)[^>]*>', ' ', html_str)
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = unescape(text)
    # Normalize whitespaces
    return " ".join(text.split())


def ensure_external_links(html_str: str) -> str:
    """Ensure all <a> tags open in new tab and have rel security attributes."""
    if not html_str:
        return ""

    def replace_a(match):
        attrs = match.group(1)
        # Remove existing target and rel to avoid duplicates
        attrs = re.sub(r'\s*target=([\'"]).*?\1', '', attrs, flags=re.IGNORECASE)
        attrs = re.sub(r'\s*rel=([\'"]).*?\1', '', attrs, flags=re.IGNORECASE)
        return f'<a {attrs.strip()} target="_blank" rel="noopener noreferrer">'

    return re.sub(r'<a\s+([^>]+)>', replace_a, html_str, flags=re.IGNORECASE)


def parse_atom_feed(xml_content: bytes):
    """Parse Atom XML feed from Google Cloud documentation."""
    root = ET.fromstring(xml_content)
    ns = {"atom": "http://www.w3.org/2005/Atom"}

    feed_title = root.findtext("atom:title", "BigQuery Release Notes", ns).strip()
    feed_updated = root.findtext("atom:updated", "", ns).strip()

    entries = []
    entry_nodes = root.findall("atom:entry", ns)

    for entry_idx, entry in enumerate(entry_nodes):
        date_title = entry.findtext("atom:title", f"Release {entry_idx + 1}", ns).strip()
        updated = entry.findtext("atom:updated", "", ns).strip()

        link_node = entry.find("atom:link", ns)
        entry_link = link_node.attrib.get("href", "") if link_node is not None else ""
        content_html = entry.findtext("atom:content", "", ns).strip()

        # Split content by heading tags (<h3>Feature</h3>, <h3>Fixed</h3>, etc.)
        heading_matches = list(re.finditer(r'<h[1-6][^>]*>(.*?)</h[1-6]>', content_html, re.IGNORECASE))
        updates = []

        if heading_matches:
            for i, match in enumerate(heading_matches):
                heading_type = re.sub(r'<[^>]+>', '', match.group(1)).strip() or "Update"
                start_body = match.end()
                end_body = heading_matches[i + 1].start() if i + 1 < len(heading_matches) else len(content_html)
                body_html = content_html[start_body:end_body].strip()

                plain_text = clean_html_to_text(body_html)
                # Generate clean headline from first sentence
                sentences = re.split(r'(?<=[.!?])\s+', plain_text)
                first_sentence = sentences[0] if sentences else plain_text
                headline = first_sentence if len(first_sentence) <= 120 else (first_sentence[:117] + "...")

                # Format pre-filled tweet draft
                tweet_intro = f"🚀 BigQuery {heading_type} ({date_title}): {headline}"
                if len(tweet_intro) > 200:
                    tweet_intro = tweet_intro[:197] + "..."
                tweet_draft = f"{tweet_intro}\n\nRead more: {entry_link}\n#BigQuery #GoogleCloud #DataEngineering"

                updates.append({
                    "id": f"update-{entry_idx}-{i}",
                    "type": heading_type,
                    "html": ensure_external_links(body_html),
                    "plain_text": plain_text,
                    "headline": headline,
                    "tweet_draft": tweet_draft,
                    "link": entry_link,
                    "date": date_title
                })
        else:
            # Single update without explicit <h3>
            plain_text = clean_html_to_text(content_html)
            sentences = re.split(r'(?<=[.!?])\s+', plain_text)
            first_sentence = sentences[0] if sentences else plain_text
            headline = first_sentence if len(first_sentence) <= 120 else (first_sentence[:117] + "...")

            tweet_intro = f"🚀 BigQuery Update ({date_title}): {headline}"
            if len(tweet_intro) > 200:
                tweet_intro = tweet_intro[:197] + "..."
            tweet_draft = f"{tweet_intro}\n\nRead more: {entry_link}\n#BigQuery #GoogleCloud #DataEngineering"

            updates.append({
                "id": f"update-{entry_idx}-0",
                "type": "Update",
                "html": ensure_external_links(content_html),
                "plain_text": plain_text,
                "headline": headline,
                "tweet_draft": tweet_draft,
                "link": entry_link,
                "date": date_title
            })

        entries.append({
            "id": f"entry-{entry_idx}",
            "date": date_title,
            "updated": updated,
            "link": entry_link,
            "updates_count": len(updates),
            "updates": updates
        })

    return {
        "title": feed_title,
        "updated": feed_updated,
        "feed_url": FEED_URL,
        "entries": entries,
        "total_entries": len(entries),
        "total_updates": sum(e["updates_count"] for e in entries)
    }


def fetch_release_notes(force_refresh: bool = False):
    """Fetch feed with caching."""
    now = time.time()
    if not force_refresh and _cache["data"] and (now - _cache["last_fetched"] < CACHE_TTL_SECONDS):
        return _cache["data"], None

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; BigQueryReleaseNotesApp/1.0)",
            "Accept": "application/atom+xml, application/xml, text/xml, */*"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=12)
        response.raise_for_status()

        parsed = parse_atom_feed(response.content)
        _cache["data"] = parsed
        _cache["last_fetched"] = now
        _cache["error"] = None
        return parsed, None
    except Exception as exc:
        _cache["error"] = str(exc)
        # If we have stale cache, return it along with warning
        if _cache["data"]:
            return _cache["data"], f"Using cached data (Fetch error: {exc})"
        return None, str(exc)


@app.route("/")
def index():
    """Main application dashboard."""
    return render_template("index.html")


@app.route("/api/releases")
def api_releases():
    """API endpoint to get release notes. Supports ?refresh=true."""
    force = request.args.get("refresh", "").lower() in ("true", "1", "yes")
    data, error = fetch_release_notes(force_refresh=force)

    if not data:
        return jsonify({
            "success": False,
            "error": error or "Failed to fetch BigQuery release notes"
        }), 502

    return jsonify({
        "success": True,
        "warning": error,
        "last_fetched": datetime.fromtimestamp(_cache["last_fetched"]).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "feed": data
    })


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "BigQuery Release Notes Viewer"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("1", "true")
    print(f"Starting BigQuery Release Notes App on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
