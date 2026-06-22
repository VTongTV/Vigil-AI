"""GET /api/v1/scraper/feed — Social media scraper for traffic violation reports.

Returns a feed of scraped social media posts related to Bengaluru
traffic violations. For demo purposes, returns mock data.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.schemas import (
    ScrapedFeedItem,
    ScraperFeedResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock scraped items
_DEMO_ITEMS = [
    {
        "id": "sc-001",
        "platform": "twitter",
        "source_url": "https://twitter.com/btp_traffic/status/123",
        "thumbnail_url": "/demo/demo_no_helmet_mgroad-01.jpg",
        "caption": "No helmet rider near MG Road signal. #BengaluruTraffic",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": "MG Road, Bengaluru",
        "analysis_status": "pending",
    },
    {
        "id": "sc-002",
        "platform": "reddit",
        "source_url": "https://reddit.com/r/bangalore/comments/abc",
        "thumbnail_url": "/demo/demo_triple_riding_whitefield-01.jpg",
        "caption": "Triple riding on ITPL road, Whitefield. Daily sight.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": "Whitefield, Bengaluru",
        "analysis_status": "pending",
    },
    {
        "id": "sc-003",
        "platform": "instagram",
        "source_url": "https://instagram.com/p/xyz",
        "thumbnail_url": "/demo/demo_wrong_side_driving_bannerghatta-01.jpg",
        "caption": "Wrong side driving on Bannerghatta Road",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": "Bannerghatta Road, Bengaluru",
        "analysis_status": "analyzed",
    },
    {
        "id": "sc-004",
        "platform": "twitter",
        "source_url": "https://twitter.com/btp_traffic/status/456",
        "thumbnail_url": "/demo/demo_illegal_parking_kormangala-01.jpg",
        "caption": "Car parked on no-parking zone near Koramangala 100ft Rd",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": "Koramangala, Bengaluru",
        "analysis_status": "pending",
    },
    {
        "id": "sc-005",
        "platform": "facebook",
        "source_url": "https://facebook.com/groups/bengalurutraffic/posts/789",
        "thumbnail_url": "/demo/demo_red_light_violation_silkboard-01.jpg",
        "caption": "Red light jump at Silk Board. When will this stop?",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "location": "Silk Board, Bengaluru",
        "analysis_status": "analyzed",
    },
]


@router.get("/scraper/feed", response_model=ScraperFeedResponse)
async def get_scraper_feed() -> ScraperFeedResponse:
    """Get scraped social media feed for traffic violation reports.

    Returns:
        Feed of social media posts with violation-related content.
    """
    logger.info("Serving scraper feed with %d items", len(_DEMO_ITEMS))

    items = [
        ScrapedFeedItem(
            id=item["id"],
            platform=item["platform"],
            source_url=item["source_url"],
            thumbnail_url=item["thumbnail_url"],
            caption=item["caption"],
            timestamp=item["timestamp"],
            location=item["location"],
            analysis_status=item["analysis_status"],
        )
        for item in _DEMO_ITEMS
    ]

    return ScraperFeedResponse(
        total=len(items),
        items=items,
        last_scraped=datetime.now(timezone.utc).isoformat(),
    )
