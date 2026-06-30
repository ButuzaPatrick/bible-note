import json
import re
import sys
import os
from sqlmodel import Session
from database import engine, Verse, create_db

ABBREV_MAP = {
    "Genesis": "gn",
    "Exodus": "ex",
    "Leviticus": "lv",
    "Numbers": "nm",
    "Deuteronomy": "dt",
    "Joshua": "js",
    "Judges": "jg",
    "Ruth": "rt",
    "1 Samuel": "1sm",
    "2 Samuel": "2sm",
    "1 Kings": "1kg",
    "2 Kings": "2kg",
    "1 Chronicles": "1ch",
    "2 Chronicles": "2ch",
    "Ezra": "er",
    "Nehemiah": "ne",
    "Esther": "et",
    "Job": "jb",
    "Psalms": "ps",
    "Proverbs": "pv",
    "Ecclesiastes": "ec",
    "Song of Solomon": "so",
    "Isaiah": "is",
    "Jeremiah": "jr",
    "Lamentations": "lm",
    "Ezekiel": "ez",
    "Daniel": "dn",
    "Hosea": "hs",
    "Joel": "jl",
    "Amos": "am",
    "Obadiah": "ob",
    "Jonah": "jn",
    "Micah": "mi",
    "Nahum": "na",
    "Habakkuk": "hb",
    "Zephaniah": "zp",
    "Haggai": "hg",
    "Zechariah": "zc",
    "Malachi": "ml",
    "Matthew": "mt",
    "Mark": "mk",
    "Luke": "lk",
    "John": "jo",
    "Acts": "ac",
    "Romans": "ro",
    "1 Corinthians": "1co",
    "2 Corinthians": "2co",
    "Galatians": "gl",
    "Ephesians": "ep",
    "Philippians": "ph",
    "Colossians": "cl",
    "1 Thessalonians": "1ts",
    "2 Thessalonians": "2ts",
    "1 Timothy": "1tm",
    "2 Timothy": "2tm",
    "Titus": "tt",
    "Philemon": "pm",
    "Hebrews": "hb2",
    "James": "jm",
    "1 Peter": "1pe",
    "2 Peter": "2pe",
    "1 John": "1jo",
    "2 John": "2jo",
    "3 John": "3jo",
    "Jude": "jd",
    "Revelation": "re",
}


def load_esv(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        bible = json.load(f)

    create_db()

    with Session(engine) as session:
        for book_name, chapters in bible.items():
            abbrev = ABBREV_MAP.get(book_name, book_name[:3].lower())
            for chapter_str, verses in chapters.items():
                for verse_str, text in verses.items():
                    verse = Verse(
                        book=book_name,
                        book_abbrev=abbrev,
                        chapter=int(chapter_str),
                        verse_number=int(verse_str),
                        text=text.strip(),
                        translation="ESV",
                    )
                    session.add(verse)
        session.commit()
        print("ESV loaded successfully.")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "src-python/en_esv.json"
    load_esv(path)
