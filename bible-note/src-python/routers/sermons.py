import random
from functools import lru_cache
from youtube_search import YoutubeSearch # type: ignore
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter # type: ignore

router = APIRouter()

# returns list of json video metadata
@lru_cache(maxsize=256)
def search_youtube(url: str, max_results: int):
    try:
        return YoutubeSearch(url, max_results=max_results).videos
    except Exception as e:
        print(f"Search failed for '{url}': {e}")
        return []

@router.get("/sermons/{book}/{chapter}")
def get_sermons(book: str, chapter: int):

    urls = [
        f"grace to you {book} {chapter}",
        f"the gospel coalition {book} {chapter}",
        f"ligoneer ministries {book} {chapter}",
    ]
    
    sermons = []
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(search_youtube, url, 4) for url in urls]

        # get result from each thread
        for future in futures:
            sermons.extend(future.result())
    
    random.shuffle(sermons)
    
    return {
        "book_abbrev": book,
        "chapter": chapter,
        "videos": [
            {
                "video_id": s["id"],
                "title": s["title"],
                "channel": s["channel"],
                "duration": s["duration"],
                "thumbnail": s["thumbnails"][0],
                "embed_html": f'<iframe width="fit-content" height="200" src="https://www.youtube.com/embed/{s["id"]}" frameborder="0" allowfullscreen></iframe>'
            }
            for s in sermons
        ]
    }