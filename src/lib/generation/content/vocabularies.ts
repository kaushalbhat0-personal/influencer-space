import type { ContentVocabulary } from "./types";

export const DEFAULT_VOCABULARY: ContentVocabulary = {
  niche: "default", label: "Default",
  hero: { headlineTemplate: "{name}'s Store", subheadlineTemplate: "{description}", cta: "Shop Now", secondaryCta: "Learn More" },
  products: { sectionTitle: "Featured Products", categoryLabel: "Products", emptyMessage: "No products yet" },
  gallery: { sectionTitle: "Gallery", albumLabel: "Featured" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Get In Touch", messagePlaceholder: "Send us a message", successMessage: "Thanks! We'll be in touch soon." },
  faq: { sectionTitle: "FAQ", items: [{ q: "What products do you offer?", a: "Explore our collection of products curated just for you." }, { q: "How can I contact you?", a: "Reach out through our contact form or follow us on social media." }] },
  navigation: { homeLabel: "Home", productsLabel: "Products", galleryLabel: "Gallery", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Shop Now", learnMore: "Learn More", subscribe: "Subscribe", getStarted: "Get Started" },
  emptyState: { noProducts: "No products available yet. Check back soon!", noGallery: "Gallery coming soon.", noContent: "No content yet." },
  meta: { titleSuffix: "— Official Store", descriptionPrefix: "Shop official" },
};

export const EDUCATION_VOCABULARY: ContentVocabulary = {
  niche: "education", label: "Education",
  hero: { headlineTemplate: "Master skills that move your career forward", subheadlineTemplate: "Learn from {name}'s expert-led courses and start building your future today.", cta: "Browse Courses", secondaryCta: "View Curriculum" },
  products: { sectionTitle: "Featured Courses", categoryLabel: "Courses", emptyMessage: "New courses launching soon" },
  gallery: { sectionTitle: "Student Success", albumLabel: "Student Work" },
  about: { sectionTitle: "Meet {name}" },
  contact: { sectionTitle: "Get In Touch", messagePlaceholder: "Ask about courses and programs", successMessage: "Thanks for your interest! We'll share course details soon." },
  faq: { sectionTitle: "Questions & Answers", items: [{ q: "What will I learn?", a: "Our courses are designed to take you from beginner to confident practitioner." }, { q: "How long are the courses?", a: "Most courses are self-paced with 10-20 hours of content." }, { q: "Do you offer certificates?", a: "Yes! Every course includes a certificate of completion." }] },
  navigation: { homeLabel: "Home", productsLabel: "Courses", galleryLabel: "Student Work", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Enroll Now", learnMore: "See Curriculum", subscribe: "Join Newsletter", getStarted: "Start Learning" },
  emptyState: { noProducts: "Courses are being developed. Join the waitlist!", noGallery: "Student projects coming soon.", noContent: "Lessons and updates coming." },
  meta: { titleSuffix: "— Learn with {name}", descriptionPrefix: "Learn from" },
};

export const PHOTOGRAPHY_VOCABULARY: ContentVocabulary = {
  niche: "photography", label: "Photography",
  hero: { headlineTemplate: "Moments worth remembering", subheadlineTemplate: "Explore {name}'s portfolio — where every frame tells a story.", cta: "View Portfolio", secondaryCta: "Shop Prints" },
  products: { sectionTitle: "Prints & Presets", categoryLabel: "Prints", emptyMessage: "New prints arriving soon" },
  gallery: { sectionTitle: "Portfolio", albumLabel: "Collection" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Book a Session", messagePlaceholder: "Tell me about your project", successMessage: "Thanks! I'll review your message and get back to you within 24 hours." },
  faq: { sectionTitle: "Common Questions", items: [{ q: "What type of photography do you specialize in?", a: "I specialize in portrait, landscape, and commercial photography." }, { q: "How do I order prints?", a: "Browse the gallery and select the image you'd like. Choose size and finish at checkout." }, { q: "Do you offer editing presets?", a: "Yes! My custom Lightroom presets are available for purchase." }] },
  navigation: { homeLabel: "Home", productsLabel: "Prints", galleryLabel: "Portfolio", aboutLabel: "About", contactLabel: "Book" },
  cta: { shopNow: "Shop Prints", learnMore: "View Gallery", subscribe: "Follow Along", getStarted: "Book a Session" },
  emptyState: { noProducts: "Prints and presets coming soon.", noGallery: "Portfolio being curated.", noContent: "Behind-the-scenes content coming." },
  meta: { titleSuffix: "— Photography by {name}", descriptionPrefix: "Portfolio of" },
};

export const GAMING_VOCABULARY: ContentVocabulary = {
  niche: "gaming", label: "Gaming",
  hero: { headlineTemplate: "Everything {name} creates, in one place", subheadlineTemplate: "Join the community. Catch the streams. Grab exclusive gear.", cta: "Watch Now", secondaryCta: "Join Discord" },
  products: { sectionTitle: "Creator Gear", categoryLabel: "Gear", emptyMessage: "New drops coming soon" },
  gallery: { sectionTitle: "Highlights", albumLabel: "Streams" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Get In Touch", messagePlaceholder: "Business inquiries", successMessage: "Message received! Expect a response within 48 hours." },
  faq: { sectionTitle: "FAQ", items: [{ q: "What platform do you stream on?", a: "Catch me live on Twitch and YouTube — schedule is posted weekly." }, { q: "Do you have a Discord server?", a: "Yes! Join the community for exclusive content and giveaways." }, { q: "What gear do you use?", a: "Check the Creator Gear section for my full setup and recommendations." }] },
  navigation: { homeLabel: "Home", productsLabel: "Gear", galleryLabel: "Clips", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Shop Gear", learnMore: "Watch Latest", subscribe: "Subscribe", getStarted: "Join the Club" },
  emptyState: { noProducts: "Merch drop coming soon. Stay tuned!", noGallery: "Stream highlights being edited.", noContent: "New content every week." },
  meta: { titleSuffix: "— {name} Gaming", descriptionPrefix: "Official store of" },
};

export const MUSIC_VOCABULARY: ContentVocabulary = {
  niche: "music", label: "Music",
  hero: { headlineTemplate: "The sound of {name}", subheadlineTemplate: "Latest releases, exclusive merch, and everything music.", cta: "Listen Now", secondaryCta: "See Tour Dates" },
  products: { sectionTitle: "Latest Release", categoryLabel: "Music", emptyMessage: "New music dropping soon" },
  gallery: { sectionTitle: "Gallery", albumLabel: "Behind the Scenes" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Booking and press inquiries", successMessage: "Thanks for reaching out! We'll respond within 48 hours." },
  faq: { sectionTitle: "Q&A", items: [{ q: "Where can I listen to your music?", a: "My music is available on Spotify, Apple Music, YouTube, and all major platforms." }, { q: "Do you sell merchandise?", a: "Yes! Check the Latest Release section for exclusive merch drops." }, { q: "How can I book you for a show?", a: "Fill out the contact form with event details and we'll be in touch." }] },
  navigation: { homeLabel: "Home", productsLabel: "Music", galleryLabel: "Photos", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Shop Merch", learnMore: "Listen", subscribe: "Follow", getStarted: "Stream Now" },
  emptyState: { noProducts: "New merch dropping with the next release.", noGallery: "Photos and videos coming soon.", noContent: "New content on the way." },
  meta: { titleSuffix: "— {name} Music", descriptionPrefix: "Official music store of" },
};

export const TECHNOLOGY_VOCABULARY: ContentVocabulary = {
  niche: "technology", label: "Technology",
  hero: { headlineTemplate: "Tools that make you more productive", subheadlineTemplate: "Build better with {name}'s templates, tools, and tutorials.", cta: "Explore Tools", secondaryCta: "Read Blog" },
  products: { sectionTitle: "Featured Tools", categoryLabel: "Tools", emptyMessage: "New tools in development" },
  gallery: { sectionTitle: "Projects", albumLabel: "Projects" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Tech support and inquiries", successMessage: "Got it! We'll respond within 24 hours." },
  faq: { sectionTitle: "FAQ", items: [{ q: "What tools do you offer?", a: "I build templates, SaaS products, and developer tools to streamline your workflow." }, { q: "Do you offer custom development?", a: "Yes — reach out through the contact form with your project details." }, { q: "Is there a community?", a: "Join the newsletter for early access to new tools and tutorials." }] },
  navigation: { homeLabel: "Home", productsLabel: "Tools", galleryLabel: "Projects", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Get Access", learnMore: "See How It Works", subscribe: "Subscribe", getStarted: "Start Building" },
  emptyState: { noProducts: "Tools launching soon. Join the waitlist!", noGallery: "Project showcase coming.", noContent: "Tutorials and updates in progress." },
  meta: { titleSuffix: "— {name} Tech", descriptionPrefix: "Tools and templates by" },
};

export const FITNESS_VOCABULARY: ContentVocabulary = {
  niche: "fitness", label: "Fitness",
  hero: { headlineTemplate: "Transform your body, transform your life", subheadlineTemplate: "Train with {name}'s proven programs and start seeing real results.", cta: "Start Now", secondaryCta: "See Results" },
  products: { sectionTitle: "Programs", categoryLabel: "Programs", emptyMessage: "New programs in development" },
  gallery: { sectionTitle: "Transformations", albumLabel: "Results" },
  about: { sectionTitle: "Meet {name}" },
  contact: { sectionTitle: "Get In Touch", messagePlaceholder: "Share your fitness goals", successMessage: "Let's get started! Check your email for next steps." },
  faq: { sectionTitle: "FAQ", items: [{ q: "What level are these programs for?", a: "Programs range from beginner to advanced with modifications for every level." }, { q: "Do I need equipment?", a: "Some programs require basic equipment, but bodyweight options are always included." }, { q: "Can I get a refund?", a: "Yes — all programs come with a 30-day satisfaction guarantee." }] },
  navigation: { homeLabel: "Home", productsLabel: "Programs", galleryLabel: "Results", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Join Now", learnMore: "See Results", subscribe: "Subscribe", getStarted: "Start Training" },
  emptyState: { noProducts: "Programs coming soon. Join the waitlist!", noGallery: "Transformation photos being collected.", noContent: "Workout tips and updates coming." },
  meta: { titleSuffix: "— Fitness with {name}", descriptionPrefix: "Train with" },
};

export const FOOD_VOCABULARY: ContentVocabulary = {
  niche: "food", label: "Food",
  hero: { headlineTemplate: "Recipes you'll actually cook", subheadlineTemplate: "Simple, delicious recipes from {name}'s kitchen to yours.", cta: "Browse Recipes", secondaryCta: "See What's Cooking" },
  products: { sectionTitle: "Featured Recipes", categoryLabel: "Recipes", emptyMessage: "New recipes being tested" },
  gallery: { sectionTitle: "Kitchen Gallery", albumLabel: "Dishes" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Recipe requests and inquiries", successMessage: "Thanks for reaching out! Check your inbox for a response soon." },
  faq: { sectionTitle: "FAQ", items: [{ q: "Are your recipes beginner-friendly?", a: "Absolutely! Every recipe includes step-by-step instructions and tips." }, { q: "Do you accommodate dietary restrictions?", a: "Many recipes include gluten-free, vegan, and dairy-free variations." }, { q: "Can I suggest a recipe?", a: "Yes! Drop your request in the contact form." }] },
  navigation: { homeLabel: "Home", productsLabel: "Recipes", galleryLabel: "Food Gallery", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Get the Recipe", learnMore: "See Recipes", subscribe: "Subscribe", getStarted: "Start Cooking" },
  emptyState: { noProducts: "New recipes being tested in the kitchen.", noGallery: "Food photography coming soon.", noContent: "Cooking tips and videos coming." },
  meta: { titleSuffix: "— {name}'s Kitchen", descriptionPrefix: "Recipes from" },
};

export const FASHION_VOCABULARY: ContentVocabulary = {
  niche: "lifestyle", label: "Fashion & Lifestyle",
  hero: { headlineTemplate: "Style that speaks for itself", subheadlineTemplate: "Curated collections by {name}. Wear your story.", cta: "Shop Collection", secondaryCta: "View Lookbook" },
  products: { sectionTitle: "Collections", categoryLabel: "Collections", emptyMessage: "New collection dropping soon" },
  gallery: { sectionTitle: "Lookbook", albumLabel: "Editorial" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Collaborations and inquiries", successMessage: "Thanks for reaching out! We'll be in touch within 48 hours." },
  faq: { sectionTitle: "FAQ", items: [{ q: "What sizes are available?", a: "Collections range from XS to XL with detailed size guides for each piece." }, { q: "Do you ship internationally?", a: "Yes! We ship to most countries worldwide." }, { q: "What is the return policy?", a: "Free returns within 30 days of delivery." }] },
  navigation: { homeLabel: "Home", productsLabel: "Collections", galleryLabel: "Lookbook", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Shop Now", learnMore: "View Lookbook", subscribe: "Follow", getStarted: "Explore" },
  emptyState: { noProducts: "New collection launching soon. Join the waitlist!", noGallery: "Lookbook being styled.", noContent: "Style inspiration coming." },
  meta: { titleSuffix: "— {name} Style", descriptionPrefix: "Style by" },
};

export const TRAVEL_VOCABULARY: ContentVocabulary = {
  niche: "travel", label: "Travel",
  hero: { headlineTemplate: "Discover the world through my lens", subheadlineTemplate: "Follow {name}'s adventures and explore curated travel guides.", cta: "Explore", secondaryCta: "View Guides" },
  products: { sectionTitle: "Travel Guides", categoryLabel: "Guides", emptyMessage: "New destinations being explored" },
  gallery: { sectionTitle: "Destinations", albumLabel: "Adventures" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Travel questions and collaborations", successMessage: "Thanks for reaching out! I'll get back to you before your next trip." },
  faq: { sectionTitle: "Travel Tips", items: [{ q: "Where should I travel next?", a: "Check out the Destinations gallery for inspiration and detailed guides." }, { q: "Do you offer custom itineraries?", a: "Yes! Contact me with your budget and preferences for a personalized plan." }, { q: "What photography gear do you use?", a: "Full gear list available in the Travel Guides section." }] },
  navigation: { homeLabel: "Home", productsLabel: "Guides", galleryLabel: "Destinations", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Get the Guide", learnMore: "View Destinations", subscribe: "Follow the Journey", getStarted: "Start Exploring" },
  emptyState: { noProducts: "Travel guides being written. Subscribe for updates!", noGallery: "New destinations being added.", noContent: "Adventure stories coming soon." },
  meta: { titleSuffix: "— {name} Travels", descriptionPrefix: "Travel guides by" },
};

export const ART_VOCABULARY: ContentVocabulary = {
  niche: "art", label: "Art",
  hero: { headlineTemplate: "Where creativity meets the canvas", subheadlineTemplate: "Original art, commissions, and prints by {name}.", cta: "View Gallery", secondaryCta: "Commission Work" },
  products: { sectionTitle: "Shop Art", categoryLabel: "Art", emptyMessage: "New artwork being created" },
  gallery: { sectionTitle: "Portfolio", albumLabel: "Series" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Commissions", messagePlaceholder: "Tell me about your project", successMessage: "Thanks for your interest! I'll respond within 48 hours to discuss your commission." },
  faq: { sectionTitle: "FAQ", items: [{ q: "Do you sell original pieces?", a: "Yes! Browse the Shop Art section for available originals and limited editions." }, { q: "How do commissions work?", a: "Reach out with your vision, budget, and timeline. I'll create a custom piece just for you." }, { q: "Do you ship internationally?", a: "Yes, with secure packaging and tracking for all shipments." }] },
  navigation: { homeLabel: "Home", productsLabel: "Shop", galleryLabel: "Portfolio", aboutLabel: "About", contactLabel: "Commission" },
  cta: { shopNow: "Buy Art", learnMore: "View Portfolio", subscribe: "Follow", getStarted: "Commission Me" },
  emptyState: { noProducts: "New artwork dropping soon. Follow for updates!", noGallery: "Portfolio being curated.", noContent: "Studio updates coming." },
  meta: { titleSuffix: "— Art by {name}", descriptionPrefix: "Original art by" },
};

export const SPORTS_VOCABULARY: ContentVocabulary = {
  niche: "sports", label: "Sports",
  hero: { headlineTemplate: "Train harder, go further", subheadlineTemplate: "{name}'s training programs, gear, and game-day mindset.", cta: "Shop Gear", secondaryCta: "See Programs" },
  products: { sectionTitle: "Training Gear", categoryLabel: "Gear", emptyMessage: "New gear dropping this season" },
  gallery: { sectionTitle: "Highlights", albumLabel: "Season" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Sponsorships and inquiries", successMessage: "Got it! We'll respond within 48 hours." },
  faq: { sectionTitle: "FAQ", items: [{ q: "What training programs do you offer?", a: "Programs for all levels — from off-season conditioning to competition prep." }, { q: "Do you offer one-on-one coaching?", a: "Yes! Limited slots available for personal coaching." }, { q: "What gear do you recommend?", a: "Check the Training Gear section for my personal recommendations." }] },
  navigation: { homeLabel: "Home", productsLabel: "Gear", galleryLabel: "Highlights", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Shop Gear", learnMore: "See Programs", subscribe: "Subscribe", getStarted: "Start Training" },
  emptyState: { noProducts: "New gear dropping this season.", noGallery: "Season highlights being edited.", noContent: "Training tips and updates coming." },
  meta: { titleSuffix: "— {name} Sports", descriptionPrefix: "Train with" },
};

export const NEWS_VOCABULARY: ContentVocabulary = {
  niche: "news", label: "News",
  hero: { headlineTemplate: "Stay informed, stay ahead", subheadlineTemplate: "The latest stories, insights, and analysis from {name}.", cta: "Read More", secondaryCta: "Subscribe" },
  products: { sectionTitle: "Featured", categoryLabel: "Articles", emptyMessage: "New stories coming" },
  gallery: { sectionTitle: "Press", albumLabel: "Coverage" },
  about: { sectionTitle: "About {name}" },
  contact: { sectionTitle: "Contact", messagePlaceholder: "Tips and press inquiries", successMessage: "Thanks for reaching out. We'll review your message." },
  faq: { sectionTitle: "FAQ", items: [{ q: "How often do you publish?", a: "New stories published daily with in-depth analysis weekly." }, { q: "Can I submit a tip?", a: "Absolutely — use the contact form for confidential tips and leads." }, { q: "Do you accept guest posts?", a: "Yes! Reach out with your pitch and writing samples." }] },
  navigation: { homeLabel: "Home", productsLabel: "Articles", galleryLabel: "Press", aboutLabel: "About", contactLabel: "Contact" },
  cta: { shopNow: "Subscribe", learnMore: "Read More", subscribe: "Subscribe", getStarted: "Follow" },
  emptyState: { noProducts: "New stories being reported.", noGallery: "Press coverage archive coming.", noContent: "Breaking news coming soon." },
  meta: { titleSuffix: "— {name} Reports", descriptionPrefix: "Reporting by" },
};

export const ALL_VOCABULARIES: ContentVocabulary[] = [
  DEFAULT_VOCABULARY,
  EDUCATION_VOCABULARY,
  PHOTOGRAPHY_VOCABULARY,
  GAMING_VOCABULARY,
  MUSIC_VOCABULARY,
  TECHNOLOGY_VOCABULARY,
  FITNESS_VOCABULARY,
  FOOD_VOCABULARY,
  FASHION_VOCABULARY,
  TRAVEL_VOCABULARY,
  ART_VOCABULARY,
  SPORTS_VOCABULARY,
  NEWS_VOCABULARY,
];

const VOCAB_MAP = new Map<string, ContentVocabulary>();
for (const v of ALL_VOCABULARIES) VOCAB_MAP.set(v.niche, v);

export function getVocabulary(niche: string): ContentVocabulary {
  return VOCAB_MAP.get(niche) ?? DEFAULT_VOCABULARY;
}
