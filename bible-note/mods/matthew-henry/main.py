import httpx

BOOK_ID_MAP = {
    "gn": "GEN",
    "ex": "EXO",
    "lv": "LEV",
    "nm": "NUM",
    "dt": "DEU",
    "js": "JOS",
    "jg": "JDG",
    "rt": "RUT",
    "1sm": "1SA",
    "2sm": "2SA",
    "1kg": "1KI",
    "2kg": "2KI",
    "1ch": "1CH",
    "2ch": "2CH",
    "er": "EZR",
    "ne": "NEH",
    "et": "EST",
    "jb": "JOB",
    "ps": "PSA",
    "pv": "PRO",
    "ec": "ECC",
    "so": "SNG",
    "is": "ISA",
    "jr": "JER",
    "lm": "LAM",
    "ez": "EZK",
    "dn": "DAN",
    "hs": "HOS",
    "jl": "JOL",
    "am": "AMO",
    "ob": "OBA",
    "jn": "JON",
    "mi": "MIC",
    "na": "NAM",
    "hb": "HAB",
    "zp": "ZEP",
    "hg": "HAG",
    "zc": "ZEC",
    "ml": "MAL",
    "mt": "MAT",
    "mk": "MRK",
    "lk": "LUK",
    "jo": "JHN",
    "ac": "ACT",
    "ro": "ROM",
    "1co": "1CO",
    "2co": "2CO",
    "gl": "GAL",
    "ep": "EPH",
    "ph": "PHP",
    "cl": "COL",
    "1ts": "1TH",
    "2ts": "2TH",
    "1tm": "1TI",
    "2tm": "2TI",
    "tt": "TIT",
    "pm": "PHM",
    "hb2": "HEB",
    "jm": "JAS",
    "1pe": "1PE",
    "2pe": "2PE",
    "1jo": "1JN",
    "2jo": "2JN",
    "3jo": "3JN",
    "jd": "JUD",
    "re": "REV",
}


def run(book=None, chapter=None):
    if not book or not chapter:
        return "Missing book or chapter."

    book_id = BOOK_ID_MAP.get(book)
    if not book_id:
        return f"Unknown book abbreviation: {book}"

    url = f"https://bible.helloao.org/api/c/matthew-henry/{book_id}/{chapter}.json"
    print("Fetching:", url)

    try:
        response = httpx.get(url, timeout=10)
    except Exception as e:
        print("Request failed:", e)
        return f"Error reaching commentary API: {e}"

    if response.status_code != 200:
        return "No commentary available for this chapter."

    data = response.json()
    verses_content = data.get("chapter", {}).get("content", [])

    paragraphs = []
    for item in verses_content:
        if isinstance(item, dict) and "content" in item:
            text = " ".join(str(c) for c in item["content"] if isinstance(c, str))
            if text.strip():
                paragraphs.append(text)
        elif isinstance(item, str):
            paragraphs.append(item)

    content = (
        "<br><br>".join(paragraphs)
        if paragraphs
        else "No commentary available for this chapter."
    )
    content += "<br><br><em>Source: Matthew Henry's Commentary, public domain, via HelloAO Free Use Bible API.</em>"

    return content
