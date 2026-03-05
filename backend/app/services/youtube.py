"""YouTube search URL helper for exercise videos."""
import urllib.parse


def get_exercise_video_url(exercise: str) -> str:
    """Return a YouTube search URL for the given exercise name."""
    query = urllib.parse.quote_plus(f"{exercise} proper form tutorial")
    return f"https://www.youtube.com/results?search_query={query}"
