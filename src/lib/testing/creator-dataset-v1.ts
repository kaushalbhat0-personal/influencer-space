import type { ContentSource, ContentItem } from "@/lib/generation/intelligence/types";
import type { BusinessModel, CreatorStage, AudienceType, BrandStrength, CommerceStage } from "@/lib/generation/persona/types";

export type DatasetNiche =
  | "gaming" | "education" | "finance" | "technology" | "photography"
  | "fitness" | "food" | "travel" | "comedy" | "music" | "art"
  | "lifestyle" | "sports" | "news" | "celebrity";

export interface CreatorValidationEntry {
  id: string;
  niche: DatasetNiche;
  creatorName: string;
  youtubeUrl: string;
  expectedPersonaName?: string;
  expectedBusinessModel?: BusinessModel;
  expectedCreatorStage?: CreatorStage;
  expectedAudienceType?: AudienceType;
  expectedBrandStrength?: BrandStrength;
  expectedCommerceStage?: CommerceStage;
  screenshotDirectory: string;
  bioHint: string;
  contentKeywords: string[];
}

const CREATORS: CreatorValidationEntry[] = [
  // ════════════════════════════════════════════
  // GAMING (4 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-gaming-001", niche: "gaming", creatorName: "Wiffey Gamer",
    youtubeUrl: "https://www.youtube.com/@Wiffeygamer_8",
    screenshotDirectory: "docs/alpha/screenshots/gaming/wiffey-gamer",
    bioHint: "Gaming streamer and content creator. Official channel. Live streams and gameplay highlights. Join our community on Discord!",
    contentKeywords: ["gaming", "stream", "gameplay", "twitch", "fortnite", "minecraft", "esports", "gamer"],
  },
  {
    id: "v1-gaming-002", niche: "gaming", creatorName: "Techno Gamerz",
    youtubeUrl: "https://www.youtube.com/@TechnoGamerzOfficial",
    screenshotDirectory: "docs/alpha/screenshots/gaming/techno-gamerz",
    bioHint: "Official Techno Gamerz channel. Gaming content, walkthroughs, and gameplay videos. Join millions of subscribers for epic gaming entertainment.",
    contentKeywords: ["gaming", "walkthrough", "gameplay", "gamer", "minecraft", "lets play", "stream"],
  },
  {
    id: "v1-gaming-003", niche: "gaming", creatorName: "Total Gaming",
    youtubeUrl: "https://www.youtube.com/@TotalGaming093",
    screenshotDirectory: "docs/alpha/screenshots/gaming/total-gaming",
    bioHint: "Total Gaming official channel. Live streamer and gaming content creator. Bringing you the best gaming moments and entertainment.",
    contentKeywords: ["gaming", "stream", "live", "gameplay", "gamer", "entertainment"],
  },
  {
    id: "v1-gaming-004", niche: "gaming", creatorName: "Desi Gamers",
    youtubeUrl: "https://www.youtube.com/@DesiGamers",
    screenshotDirectory: "docs/alpha/screenshots/gaming/desi-gamers",
    bioHint: "Desi Gamers official channel. Gaming content with a desi twist. Gameplay, live streams, and entertainment for the Indian gaming community.",
    contentKeywords: ["gaming", "gamer", "stream", "gameplay", "live", "entertainment", "community"],
  },

  // ════════════════════════════════════════════
  // EDUCATION (6 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-education-001", niche: "education", creatorName: "Class 9 Maths & Science",
    youtubeUrl: "https://www.youtube.com/@Class9MathsScience",
    screenshotDirectory: "docs/alpha/screenshots/education/class9-maths-science",
    bioHint: "Free educational content for Class 9 students. Learn maths and science with easy tutorials. Official educational channel.",
    contentKeywords: ["educational", "learn", "tutorial", "class", "study", "maths", "science", "lesson"],
  },
  {
    id: "v1-education-002", niche: "education", creatorName: "Physics Wallah",
    youtubeUrl: "https://www.youtube.com/@PhysicsWallah",
    screenshotDirectory: "docs/alpha/screenshots/education/physics-wallah",
    bioHint: "Physics Wallah official educational channel. Learn physics, chemistry, and maths with expert teachers. Courses and tutorials for competitive exams.",
    contentKeywords: ["educational", "learn", "course", "tutorial", "class", "study", "lecture", "teaching"],
  },
  {
    id: "v1-education-003", niche: "education", creatorName: "Dear Sir",
    youtubeUrl: "https://www.youtube.com/@DearSir",
    screenshotDirectory: "docs/alpha/screenshots/education/dear-sir",
    bioHint: "Dear Sir official channel. English learning and communication skills. Educational content for students preparing for exams and improving language.",
    contentKeywords: ["educational", "learn", "course", "tutorial", "class", "study", "lesson", "training"],
  },
  {
    id: "v1-education-004", niche: "education", creatorName: "Study IQ Education",
    youtubeUrl: "https://www.youtube.com/@StudyIQEducation",
    screenshotDirectory: "docs/alpha/screenshots/education/study-iq",
    bioHint: "Study IQ Education official channel. Competitive exam preparation and educational content. Learn current affairs, history, geography and more.",
    contentKeywords: ["educational", "study", "learn", "class", "course", "tutorial", "guide", "training"],
  },
  {
    id: "v1-education-005", niche: "education", creatorName: "Drishti IAS",
    youtubeUrl: "https://www.youtube.com/@DrishtiIAS",
    screenshotDirectory: "docs/alpha/screenshots/education/drishti-ias",
    bioHint: "Drishti IAS official channel. IAS exam preparation and civil services coaching. Educational content for aspiring bureaucrats and government job seekers.",
    contentKeywords: ["educational", "study", "learn", "course", "class", "training", "guide", "tutorial"],
  },
  {
    id: "v1-education-006", niche: "education", creatorName: "Science and Fun",
    youtubeUrl: "https://www.youtube.com/@ScienceandFun",
    screenshotDirectory: "docs/alpha/screenshots/education/science-and-fun",
    bioHint: "Science and Fun official channel. Making science education fun and accessible. Experiments, explanations, and engaging educational content.",
    contentKeywords: ["educational", "learn", "science", "tutorial", "class", "lesson", "experiment"],
  },

  // ════════════════════════════════════════════
  // FINANCE (5 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-finance-001", niche: "finance", creatorName: "CA Rachana Ranade",
    youtubeUrl: "https://www.youtube.com/@CARachanaRanade",
    screenshotDirectory: "docs/alpha/screenshots/finance/ca-rachana-ranade",
    bioHint: "Official channel of CA Rachana Ranade. Personal finance education, stock market investing, and financial literacy. Learn budgeting and wealth building.",
    contentKeywords: ["finance", "invest", "money", "stock", "financial", "saving", "wealth", "budget"],
  },
  {
    id: "v1-finance-002", niche: "finance", creatorName: "Asset Yogi",
    youtubeUrl: "https://www.youtube.com/@AssetYogi",
    screenshotDirectory: "docs/alpha/screenshots/finance/asset-yogi",
    bioHint: "Asset Yogi official channel. Financial education and investment guidance. Learn about stocks, mutual funds, insurance, and personal finance management.",
    contentKeywords: ["finance", "invest", "money", "financial", "wealth", "saving", "budget", "economy"],
  },
  {
    id: "v1-finance-003", niche: "finance", creatorName: "Pranjal Kamra",
    youtubeUrl: "https://www.youtube.com/@PranjalKamra",
    screenshotDirectory: "docs/alpha/screenshots/finance/pranjal-kamra",
    bioHint: "Official channel of Pranjal Kamra. Stock market analysis, investing strategies, and financial planning. Expert guidance for wealth creation.",
    contentKeywords: ["finance", "invest", "stock", "money", "trading", "wealth", "financial", "market"],
  },
  {
    id: "v1-finance-004", niche: "finance", creatorName: "FinnovationZ",
    youtubeUrl: "https://www.youtube.com/@FinnovationZ",
    screenshotDirectory: "docs/alpha/screenshots/finance/finnovationz",
    bioHint: "FinnovationZ official channel. Financial innovation and investment education. Making finance simple with practical investing and money management tips.",
    contentKeywords: ["finance", "invest", "money", "financial", "saving", "budget", "wealth", "economy"],
  },
  {
    id: "v1-finance-005", niche: "finance", creatorName: "Akshat Shrivastava",
    youtubeUrl: "https://www.youtube.com/@AkshatShrivastava",
    screenshotDirectory: "docs/alpha/screenshots/finance/akshat-shrivastava",
    bioHint: "Official channel of Akshat Shrivastava. Global finance, investing, and economic analysis. Expert insights on money management and wealth building.",
    contentKeywords: ["finance", "invest", "money", "economy", "wealth", "financial", "trading", "global"],
  },

  // ════════════════════════════════════════════
  // TECHNOLOGY (5 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-tech-001", niche: "technology", creatorName: "Tech Burner",
    youtubeUrl: "https://www.youtube.com/@TechBurner",
    screenshotDirectory: "docs/alpha/screenshots/technology/tech-burner",
    bioHint: "Tech Burner official channel. Tech reviews, gadget unboxings, and the latest in technology. Your go-to source for everything tech and innovation.",
    contentKeywords: ["tech", "gadget", "innovation", "app", "review", "software", "digital", "startup"],
  },
  {
    id: "v1-tech-002", niche: "technology", creatorName: "Geeky Ranjit",
    youtubeUrl: "https://www.youtube.com/@GeekyRanjit",
    screenshotDirectory: "docs/alpha/screenshots/technology/geeky-ranjit",
    bioHint: "Geeky Ranjit official channel. Tech tutorials, coding guides, and programming education. Learn software development and tech skills.",
    contentKeywords: ["tech", "coding", "programming", "software", "developer", "tutorial", "ai", "app"],
  },
  {
    id: "v1-tech-003", niche: "technology", creatorName: "Trakin Tech",
    youtubeUrl: "https://www.youtube.com/@TrakinTech",
    screenshotDirectory: "docs/alpha/screenshots/technology/trakin-tech",
    bioHint: "Trakin Tech official channel. Tech news, smartphone reviews, and gadget comparisons. Stay updated with the latest in technology and innovation.",
    contentKeywords: ["tech", "gadget", "innovation", "review", "app", "software", "digital"],
  },
  {
    id: "v1-tech-004", niche: "technology", creatorName: "Beebom",
    youtubeUrl: "https://www.youtube.com/@BeebomCo",
    screenshotDirectory: "docs/alpha/screenshots/technology/beebom",
    bioHint: "Beebom official channel. Tech news, how-to guides, and app recommendations. Your daily dose of technology updates and digital tips.",
    contentKeywords: ["tech", "app", "digital", "software", "gadget", "innovation", "how to", "guide"],
  },
  {
    id: "v1-tech-005", niche: "technology", creatorName: "Gyan Therapy",
    youtubeUrl: "https://www.youtube.com/@GyanTherapy",
    screenshotDirectory: "docs/alpha/screenshots/technology/gyan-therapy",
    bioHint: "Gyan Therapy official channel. Tech career guidance, programming tutorials, and software development education. Learn to code and build your career in tech.",
    contentKeywords: ["tech", "coding", "programming", "developer", "software", "ai", "tutorial", "career"],
  },

  // ════════════════════════════════════════════
  // PHOTOGRAPHY (4 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-photo-001", niche: "photography", creatorName: "PiXimperfect",
    youtubeUrl: "https://www.youtube.com/@PiXimperfect",
    screenshotDirectory: "docs/alpha/screenshots/photography/piximperfect",
    bioHint: "PiXimperfect official channel. Photoshop tutorials, photo editing tips, and photography techniques. Master the art of photo manipulation and editing.",
    contentKeywords: ["photography", "photo", "edit", "tutorial", "camera", "photoshop", "lightroom", "photographer"],
  },
  {
    id: "v1-photo-002", niche: "photography", creatorName: "Mango Street",
    youtubeUrl: "https://www.youtube.com/@MangoStreet",
    screenshotDirectory: "docs/alpha/screenshots/photography/mango-street",
    bioHint: "Mango Street official channel. Photography tutorials, portrait tips, and camera gear reviews. Learn to take better photos with practical photography education.",
    contentKeywords: ["photography", "photo", "camera", "portrait", "photographer", "tutorial", "lens", "shot"],
  },
  {
    id: "v1-photo-003", niche: "photography", creatorName: "Nigel Danson",
    youtubeUrl: "https://www.youtube.com/@NigelDanson",
    screenshotDirectory: "docs/alpha/screenshots/photography/nigel-danson",
    bioHint: "Nigel Danson official channel. Landscape photography tutorials and techniques. Capture stunning nature photos with expert guidance and camera tips.",
    contentKeywords: ["photography", "landscape", "nature", "camera", "photo", "photographer", "lens", "edit"],
  },
  {
    id: "v1-photo-004", niche: "photography", creatorName: "Saurav Sinha Photography",
    youtubeUrl: "https://www.youtube.com/@SauravSinhaPhotography",
    screenshotDirectory: "docs/alpha/screenshots/photography/saurav-sinha",
    bioHint: "Saurav Sinha Photography official channel. Wedding and portrait photography. Professional photography tutorials and behind the scenes content.",
    contentKeywords: ["photography", "photo", "wedding", "portrait", "camera", "photographer", "edit", "behind the scenes"],
  },

  // ════════════════════════════════════════════
  // FITNESS (4 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-fitness-001", niche: "fitness", creatorName: "BeerBiceps",
    youtubeUrl: "https://www.youtube.com/@BeerBiceps",
    screenshotDirectory: "docs/alpha/screenshots/fitness/beerbiceps",
    bioHint: "BeerBiceps official channel. Fitness motivation, workout routines, and health tips. Transform your body and mind with expert fitness guidance.",
    contentKeywords: ["fitness", "workout", "gym", "exercise", "health", "training", "motivation", "bodybuilding"],
  },
  {
    id: "v1-fitness-002", niche: "fitness", creatorName: "Fit Tuber",
    youtubeUrl: "https://www.youtube.com/@FitTuber",
    screenshotDirectory: "docs/alpha/screenshots/fitness/fit-tuber",
    bioHint: "Fit Tuber official channel. Health and fitness tips, home workouts, and nutrition advice. Achieve your fitness goals with simple and effective exercises.",
    contentKeywords: ["fitness", "workout", "exercise", "health", "gym", "diet", "nutrition", "training"],
  },
  {
    id: "v1-fitness-003", niche: "fitness", creatorName: "Simrun Chopra",
    youtubeUrl: "https://www.youtube.com/@SimrunChopra",
    screenshotDirectory: "docs/alpha/screenshots/fitness/simrun-chopra",
    bioHint: "Simrun Chopra official channel. Personal training and fitness coaching. Expert workout programs and nutrition guidance for a healthier lifestyle.",
    contentKeywords: ["fitness", "workout", "training", "health", "exercise", "personal trainer", "nutrition", "diet"],
  },
  {
    id: "v1-fitness-004", niche: "fitness", creatorName: "Satvic Yoga",
    youtubeUrl: "https://www.youtube.com/@SatvicYoga",
    screenshotDirectory: "docs/alpha/screenshots/fitness/satvic-yoga",
    bioHint: "Satvic Yoga official channel. Yoga and meditation for mind-body wellness. Learn yoga poses, breathing exercises, and holistic health practices.",
    contentKeywords: ["fitness", "yoga", "meditation", "wellness", "health", "exercise", "mindfulness", "training"],
  },

  // ════════════════════════════════════════════
  // FOOD (4 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-food-001", niche: "food", creatorName: "Kabita's Kitchen",
    youtubeUrl: "https://www.youtube.com/@KabitasKitchen",
    screenshotDirectory: "docs/alpha/screenshots/food/kabitas-kitchen",
    bioHint: "Kabita's Kitchen official channel. Delicious recipes and cooking tutorials. Learn to cook authentic Indian and international cuisine at home.",
    contentKeywords: ["food", "recipe", "cooking", "kitchen", "delicious", "cuisine", "baking", "chef"],
  },
  {
    id: "v1-food-002", niche: "food", creatorName: "Nisha Madhulika",
    youtubeUrl: "https://www.youtube.com/@NishaMadhulika",
    screenshotDirectory: "docs/alpha/screenshots/food/nisha-madhulika",
    bioHint: "Nisha Madhulika official channel. Traditional Indian cooking recipes and kitchen tips. Easy to follow cooking tutorials for delicious home cooked meals.",
    contentKeywords: ["food", "recipe", "cooking", "kitchen", "delicious", "cuisine", "chef", "meal"],
  },
  {
    id: "v1-food-003", niche: "food", creatorName: "Your Food Lab",
    youtubeUrl: "https://www.youtube.com/@YourFoodLab",
    screenshotDirectory: "docs/alpha/screenshots/food/your-food-lab",
    bioHint: "Your Food Lab official channel. Food science and cooking experiments. Creative recipes, baking tutorials, and culinary adventures in the kitchen.",
    contentKeywords: ["food", "recipe", "cooking", "baking", "kitchen", "delicious", "cuisine", "gourmet"],
  },
  {
    id: "v1-food-004", niche: "food", creatorName: "Cook With Parul",
    youtubeUrl: "https://www.youtube.com/@CookWithParul",
    screenshotDirectory: "docs/alpha/screenshots/food/cook-with-parul",
    bioHint: "Cook With Parul official channel. Easy and quick recipes for busy people. Cooking tips, meal prep ideas, and delicious food for every occasion.",
    contentKeywords: ["food", "recipe", "cooking", "kitchen", "cook", "meal", "delicious", "baking"],
  },

  // ════════════════════════════════════════════
  // TRAVEL (4 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-travel-001", niche: "travel", creatorName: "Mountain Trekker",
    youtubeUrl: "https://www.youtube.com/@MountainTrekker",
    screenshotDirectory: "docs/alpha/screenshots/travel/mountain-trekker",
    bioHint: "Mountain Trekker official channel. Adventure travel and trekking expeditions. Explore the world's most beautiful mountains and trekking destinations.",
    contentKeywords: ["travel", "adventure", "trekking", "destination", "explore", "trek", "wanderlust", "mountains"],
  },
  {
    id: "v1-travel-002", niche: "travel", creatorName: "Visa2Explore",
    youtubeUrl: "https://www.youtube.com/@Visa2Explore",
    screenshotDirectory: "docs/alpha/screenshots/travel/visa2explore",
    bioHint: "Visa2Explore official channel. Travel guides, visa information, and destination tips. Plan your next adventure with expert travel advice and insights.",
    contentKeywords: ["travel", "trip", "vacation", "destination", "explore", "guide", "wanderlust", "travel tips"],
  },
  {
    id: "v1-travel-003", niche: "travel", creatorName: "Traveling Desi",
    youtubeUrl: "https://www.youtube.com/@TravelingDesi",
    screenshotDirectory: "docs/alpha/screenshots/travel/traveling-desi",
    bioHint: "Traveling Desi official channel. Indian traveler exploring the world. Travel vlogs, destination guides, and cultural experiences from around the globe.",
    contentKeywords: ["travel", "trip", "vacation", "adventure", "explore", "destination", "wanderlust", "travel vlog"],
  },
  {
    id: "v1-travel-004", niche: "travel", creatorName: "Nomadic Indian",
    youtubeUrl: "https://www.youtube.com/@NomadicIndian",
    screenshotDirectory: "docs/alpha/screenshots/travel/nomadic-indian",
    bioHint: "Nomadic Indian official channel. Solo travel and backpacking adventures. Offbeat destinations, travel tips, and nomadic lifestyle inspiration.",
    contentKeywords: ["travel", "adventure", "backpack", "destination", "explore", "trip", "wanderlust", "road trip"],
  },

  // ════════════════════════════════════════════
  // COMEDY (4 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-comedy-001", niche: "comedy", creatorName: "Samay Raina",
    youtubeUrl: "https://www.youtube.com/@SamayRainaOfficial",
    screenshotDirectory: "docs/alpha/screenshots/comedy/samay-raina",
    bioHint: "Samay Raina official channel. Standup comedian and content creator. Comedy sketches, standup performances, and entertaining content.",
    contentKeywords: ["comedy", "standup", "funny", "comedian", "joke", "humor", "entertainment", "sketch"],
  },
  {
    id: "v1-comedy-002", niche: "comedy", creatorName: "Harsh Beniwal",
    youtubeUrl: "https://www.youtube.com/@HarshBeniwal",
    screenshotDirectory: "docs/alpha/screenshots/comedy/harsh-beniwal",
    bioHint: "Harsh Beniwal official channel. Comedy sketches and funny videos. Entertaining content with hilarious characters and relatable comedy situations.",
    contentKeywords: ["comedy", "funny", "sketch", "comedy sketch", "humor", "entertainment", "comedian", "parody"],
  },
  {
    id: "v1-comedy-003", niche: "comedy", creatorName: "Ashish Chanchlani",
    youtubeUrl: "https://www.youtube.com/@AshishChanchlani",
    screenshotDirectory: "docs/alpha/screenshots/comedy/ashish-chanchlani",
    bioHint: "Ashish Chanchlani official channel. Comedy videos and entertainment. One of India's top comedians creating viral funny content and sketches.",
    contentKeywords: ["comedy", "funny", "comedian", "entertainment", "sketch", "humor", "joke", "laugh"],
  },
  {
    id: "v1-comedy-004", niche: "comedy", creatorName: "Triggered Insaan",
    youtubeUrl: "https://www.youtube.com/@TriggeredInsaan",
    screenshotDirectory: "docs/alpha/screenshots/comedy/triggered-insaan",
    bioHint: "Triggered Insaan official channel. Comedy and entertainment content. Funny videos, roasting, and entertaining sketches for the Indian audience.",
    contentKeywords: ["comedy", "funny", "entertainment", "comedian", "roast", "humor", "sketch", "joke"],
  },

  // ════════════════════════════════════════════
  // MUSIC (3 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-music-001", niche: "music", creatorName: "Darshan Raval",
    youtubeUrl: "https://www.youtube.com/@DarshanRavalDZ",
    screenshotDirectory: "docs/alpha/screenshots/music/darshan-raval",
    bioHint: "Darshan Raval official YouTube channel. Singer and songwriter. Original music, covers, and music videos. Official music store and merchandise.",
    contentKeywords: ["music", "song", "singer", "album", "concert", "music video", "artist", "performance"],
  },
  {
    id: "v1-music-002", niche: "music", creatorName: "Sanam",
    youtubeUrl: "https://www.youtube.com/@Sanam",
    screenshotDirectory: "docs/alpha/screenshots/music/sanam",
    bioHint: "Sanam official channel. Indian fusion band performing classic hits. Original music, covers, and live concert performances. Official music merchandise.",
    contentKeywords: ["music", "song", "band", "album", "concert", "guitar", "performance", "artist"],
  },
  {
    id: "v1-music-003", niche: "music", creatorName: "King",
    youtubeUrl: "https://www.youtube.com/@King",
    screenshotDirectory: "docs/alpha/screenshots/music/king",
    bioHint: "King official channel. Singer, rapper, and music producer. Original songs, music videos, and behind the scenes content. Official merchandise store.",
    contentKeywords: ["music", "song", "singer", "rapper", "producer", "album", "concert", "beat"],
  },

  // ════════════════════════════════════════════
  // ART (2 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-art-001", niche: "art", creatorName: "Proko",
    youtubeUrl: "https://www.youtube.com/@Proko",
    screenshotDirectory: "docs/alpha/screenshots/art/proko",
    bioHint: "Proko official channel. Learn drawing, anatomy, and figure drawing. Art education with professional artist tutorials and courses for all skill levels.",
    contentKeywords: ["art", "drawing", "sketch", "illustration", "design", "artist", "painting", "creative"],
  },
  {
    id: "v1-art-002", niche: "art", creatorName: "Draw With Jazza",
    youtubeUrl: "https://www.youtube.com/@DrawWithJazza",
    screenshotDirectory: "docs/alpha/screenshots/art/draw-with-jazza",
    bioHint: "Draw With Jazza official channel. Fun drawing tutorials and art challenges. Creative content for artists of all ages. Learn to draw and create art.",
    contentKeywords: ["art", "drawing", "sketch", "illustration", "artist", "creative", "design", "digital art"],
  },

  // ════════════════════════════════════════════
  // FASHION (2 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-fashion-001", niche: "lifestyle", creatorName: "Komal Pandey",
    youtubeUrl: "https://www.youtube.com/@KomalPandeyOfficial",
    screenshotDirectory: "docs/alpha/screenshots/fashion/komal-pandey",
    bioHint: "Komal Pandey official channel. Fashion influencer and style icon. Outfit inspiration, fashion trends, beauty tips, and lifestyle content.",
    contentKeywords: ["fashion", "style", "lifestyle", "beauty", "outfit", "lookbook", "wardrobe", "trendy"],
  },
  {
    id: "v1-fashion-002", niche: "lifestyle", creatorName: "Santoshi Shetty",
    youtubeUrl: "https://www.youtube.com/@SantoshiShetty",
    screenshotDirectory: "docs/alpha/screenshots/fashion/santoshi-shetty",
    bioHint: "Santoshi Shetty official channel. Fashion and lifestyle content creator. Style inspiration, beauty tutorials, and daily lifestyle vlogs.",
    contentKeywords: ["fashion", "style", "lifestyle", "beauty", "outfit", "vlog", "daily", "inspiration"],
  },

  // ════════════════════════════════════════════
  // SPORTS (3 creators) — use niche sport content keywords
  // Note: Original task didn't list sports, using for future expansion
  // ════════════════════════════════════════════

  // ════════════════════════════════════════════
  // CELEBRITY (1 creator)
  // ════════════════════════════════════════════
  {
    id: "v1-celebrity-001", niche: "celebrity", creatorName: "Farah Khan",
    youtubeUrl: "https://www.youtube.com/@FarahKhanK",
    screenshotDirectory: "docs/alpha/screenshots/celebrity/farah-khan",
    bioHint: "Official Farah Khan channel. Celebrity lifestyle, fashion, and entertainment. Bollywood icon sharing exclusive content, brand collaborations, and glamour.",
    contentKeywords: ["celebrity", "star", "famous", "bollywood", "official", "brand", "entertainment", "glamour"],
  },

  // ════════════════════════════════════════════
  // NEWS (2 creators)
  // ════════════════════════════════════════════
  {
    id: "v1-news-001", niche: "news", creatorName: "Dhruv Rathee",
    youtubeUrl: "https://www.youtube.com/@DhruvRathee",
    screenshotDirectory: "docs/alpha/screenshots/news/dhruv-rathee",
    bioHint: "Dhruv Rathee official channel. News analysis, current affairs, and educational content. In-depth reporting on politics, environment, and social issues.",
    contentKeywords: ["news", "analysis", "report", "politics", "current", "world", "environment", "journalism"],
  },
  {
    id: "v1-news-002", niche: "news", creatorName: "Nitish Rajput",
    youtubeUrl: "https://www.youtube.com/@NitishRajput",
    screenshotDirectory: "docs/alpha/screenshots/news/nitish-rajput",
    bioHint: "Nitish Rajput official channel. News and current affairs analysis. Investigative journalism covering politics, economy, and social issues in India.",
    contentKeywords: ["news", "analysis", "report", "politics", "current", "investigation", "journalism", "media"],
  },
];

export const CREATOR_DATASET_V1: readonly CreatorValidationEntry[] = Object.freeze(CREATORS);

export function getCreatorsByNiche(niche: DatasetNiche): CreatorValidationEntry[] {
  return CREATORS.filter((c) => c.niche === niche);
}

export function findCreator(id: string): CreatorValidationEntry | undefined {
  return CREATORS.find((c) => c.id === id);
}

export function findCreatorByUrl(url: string): CreatorValidationEntry | undefined {
  return CREATORS.find((c) => c.youtubeUrl === url);
}

export function getNiches(): DatasetNiche[] {
  const seen: Record<string, boolean> = {};
  const result: DatasetNiche[] = [];
  for (const c of CREATORS) {
    if (!seen[c.niche]) {
      seen[c.niche] = true;
      result.push(c.niche);
    }
  }
  return result;
}

export function getNicheCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of CREATORS) {
    counts[c.niche] = (counts[c.niche] ?? 0) + 1;
  }
  return counts;
}

export function buildContentSource(entry: CreatorValidationEntry): ContentSource {
  const items: ContentItem[] = [
    { id: `${entry.id}-1`, type: "post", text: `${entry.bioHint} ${entry.contentKeywords.slice(0, 3).join(" ")}`, hashtags: entry.contentKeywords.map((k) => `#${k}`), mentions: [], likes: 100, comments: 10, shares: 5, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), url: entry.youtubeUrl },
    { id: `${entry.id}-2`, type: "post", text: `Latest content update about ${entry.contentKeywords.slice(2, 5).join(", ")}`, hashtags: entry.contentKeywords.slice(3, 6).map((k) => `#${k}`), mentions: [], likes: 85, comments: 8, shares: 3, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), url: entry.youtubeUrl },
    { id: `${entry.id}-3`, type: "post", text: `Check out my newest video about ${entry.contentKeywords[0] || "featured topic"}`, hashtags: [`#${entry.contentKeywords[0]}`, "#viral"], mentions: [], likes: 200, comments: 20, shares: 15, createdAt: new Date(Date.now() - 86400000).toISOString(), url: entry.youtubeUrl },
    { id: `${entry.id}-4`, type: "post", text: `Community update: Thank you for ${entry.contentKeywords[0] || "the support"}!`, hashtags: [`#${entry.contentKeywords[0]}`, "#community"], mentions: [], likes: 150, comments: 12, shares: 8, createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), url: entry.youtubeUrl },
    { id: `${entry.id}-5`, type: "post", text: `Behind the scenes: ${entry.contentKeywords.slice(1, 4).join(", ")}`, hashtags: entry.contentKeywords.slice(0, 3).map((k) => `#${k}`), mentions: [], likes: 120, comments: 15, shares: 10, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), url: entry.youtubeUrl },
  ];

  return {
    platform: "youtube",
    username: entry.youtubeUrl.split("/@").pop() ?? entry.creatorName.toLowerCase().replace(/\s+/g, ""),
    displayName: entry.creatorName,
    bio: entry.bioHint,
    avatarUrl: "",
    followers: 50000,
    following: 500,
    posts: 100,
    engagement: 0.05,
    content: items,
    categories: [entry.niche],
    links: [entry.youtubeUrl],
  };
}
