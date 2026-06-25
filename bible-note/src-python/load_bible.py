import json
from sqlmodel import Session
from database import engine, Verse, create_db

def load_bible():
    with open("src-python/en_kjv.json", "r", encoding="utf-8-sig") as f:
        bible = json.load(f)

    print(bible[0].keys())
    # print(bible[0])

    create_db()

    with Session(engine) as session:
        for book in bible:
            for chapter_index, chapter in enumerate(book["chapters"]):
                for verse_index, verse_text in enumerate(chapter):
                    verse = Verse(
                        book=book["name"],
                        book_abbrev=book["abbrev"],
                        chapter=chapter_index + 1,
                        verse_number=verse_index + 1,
                        text=verse_text
                    )
                    session.add(verse)
        session.commit()
        print("Bible loaded successfully.")

if __name__ == "__main__":
    load_bible()