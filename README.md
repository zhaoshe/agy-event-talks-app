# BigQuery Release Notes Web App & Tweet Sharer

A web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches Google BigQuery release notes from the official Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`), renders them in an interactive dashboard, and lets you select any update to tweet directly on Twitter / 𝕏.

---

## Features

1. **Live XML Feed Fetching & Parsing:**
   - Fetches and parses the official BigQuery Atom release feed.
   - Segregates updates by release date and categorizes individual updates (`Feature`, `Change`, `Fixed`, `Announcement`).
   - Ensures all outbound documentation links open safely in external tabs.

2. **Interactive Refresh with Spinner:**
   - One-click **Refresh Feed** button equipped with an animated SVG spinner.
   - Dynamically re-fetches the latest feed without a full page reload.
   - Real-time status indicator showing feed connectivity and last fetched timestamp.

3. **Select & Tweet:**
   - **Card Selection:** Click any update or select its radio button to mark it as the active update.
   - **Sticky Selection Banner:** Appears with a direct **"Tweet this Update"** button.
   - **Pre-formatted Tweet Draft:** Automatically drafts a tweet containing:
     - Headline & summary
     - Official release notes link
     - Relevant hashtags (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`)
   - **Tweet Composer Modal:**
     - Live character count (up to 280 chars) with warning indicators.
     - Quick tag insertion buttons (`#SQL`, `#AI`, etc.).
     - **Post on 𝕏 / Twitter:** Opens a pre-populated Twitter Web Intent dialog in a new tab.
     - **Copy to Clipboard:** One-click copy with visual confirmation.
   - **Highlight to Tweet:** Highlight any text on the page to trigger a floating "Tweet highlighted text" button.

4. **Search & Category Filters:**
   - Real-time keyword filter across titles, summaries, and dates.
   - Quick filter pills with badge counts for each category.

---

## Project Structure

```
agy-cli-projects/
├── app.py                  # Flask backend with XML feed parser and REST APIs
├── requirements.txt        # Python dependencies (Flask, requests)
├── templates/
│   └── index.html          # Clean vanilla HTML5 markup
├── static/
│   ├── css/
│   │   └── style.css       # Responsive dark & slate styling with modern animations
│   └── js/
│       └── app.js          # Vanilla JS state management, modal, & Twitter integration
└── README.md
```

---

## Quick Start

### 1. Set Up Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the Application
```bash
python3 app.py
```

By default, the server runs at:
👉 **[http://127.0.0.1:5050](http://127.0.0.1:5050)**

*(You can customize the port via the `PORT` environment variable, e.g., `PORT=8080 python3 app.py`)*
