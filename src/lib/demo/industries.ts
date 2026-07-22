/**
 * Demo Industry Catalog
 *
 * Predefined industry presets for demo website generation.
 * Each industry includes brand defaults, content templates, and product suggestions.
 */

export interface DemoIndustry {
  id: string;
  name: string;
  icon: string;
  brand: { primary: string; secondary: string; tone: string; };
  content: { bio: string; hero: string; about: string; tagline: string; seoTitle: string; seoDesc: string; categories: string[]; };
  products: { name: string; price: number; description: string; }[];
}

export const INDUSTRIES: DemoIndustry[] = [
  {
    id: "fitness-coach", name: "Fitness Coach", icon: "💪",
    brand: { primary: "#EF4444", secondary: "#F97316", tone: "Energetic, motivational" },
    content: {
      bio: "Certified personal trainer helping people transform their bodies and lives through science-backed fitness programs.",
      hero: "Transform Your Body. Transform Your Life.",
      about: "With over 8 years of experience, I've helped 500+ clients achieve their fitness goals through personalized training, nutrition coaching, and accountability.",
      tagline: "Your Fitness Journey Starts Here",
      seoTitle: "Fitness Coach | Personal Training & Nutrition",
      seoDesc: "Certified personal trainer offering customized workout plans, nutrition coaching, and online fitness programs.",
      categories: ["fitness", "health", "wellness"],
    },
    products: [
      { name: "12-Week Transformation Program", price: 2999, description: "Complete body transformation with workout plans, meal guides, and weekly check-ins." },
      { name: "Custom Meal Plan", price: 999, description: "Personalized nutrition plan tailored to your goals, preferences, and lifestyle." },
      { name: "1-on-1 Coaching (Monthly)", price: 4999, description: "Weekly personal training sessions with progress tracking and accountability." },
    ],
  },
  {
    id: "photographer", name: "Photographer", icon: "📸",
    brand: { primary: "#18181B", secondary: "#71717A", tone: "Artistic, editorial" },
    content: {
      bio: "Professional photographer specializing in weddings, portraits, and commercial photography with a cinematic style.",
      hero: "Capturing Moments That Last Forever.",
      about: "With a passion for visual storytelling, I capture the beauty in everyday moments. My work has been featured in leading publications.",
      tagline: "Every Frame Tells a Story",
      seoTitle: "Professional Photographer | Wedding & Portrait Photography",
      seoDesc: "Award-winning photographer offering wedding, portrait, and commercial photography services.",
      categories: ["photography", "wedding", "portrait"],
    },
    products: [
      { name: "Wedding Photography Package", price: 49999, description: "Full-day coverage with 500+ edited photos, online gallery, and album." },
      { name: "Portrait Session", price: 4999, description: "1-hour session with 20 edited photos, perfect for headshots and personal branding." },
      { name: "Lightroom Preset Pack", price: 1499, description: "25 professional Lightroom presets for cinematic photo editing." },
    ],
  },
  {
    id: "yoga-studio", name: "Yoga Studio", icon: "🧘",
    brand: { primary: "#8B5CF6", secondary: "#06B6D4", tone: "Calm, mindful, welcoming" },
    content: {
      bio: "Certified yoga instructor helping people find balance, strength, and inner peace through traditional yoga practice.",
      hero: "Find Your Inner Peace.",
      about: "Our studio offers classes for all levels — from complete beginners to advanced practitioners. Join our community and discover the transformative power of yoga.",
      tagline: "Breathe. Move. Transform.",
      seoTitle: "Yoga Studio | Online & In-Person Classes",
      seoDesc: "Join our yoga community for online and in-person classes. All levels welcome.",
      categories: ["yoga", "wellness", "meditation"],
    },
    products: [
      { name: "Monthly Unlimited Classes", price: 1999, description: "Access all online and in-person yoga classes." },
      { name: "21-Day Yoga Challenge", price: 999, description: "Daily guided yoga sessions for complete beginners." },
      { name: "Meditation Course", price: 799, description: "Learn meditation techniques for stress relief and focus." },
    ],
  },
  {
    id: "fashion-brand", name: "Fashion Brand", icon: "👗",
    brand: { primary: "#D946EF", secondary: "#FB923C", tone: "Bold, stylish, aspirational" },
    content: {
      bio: "Contemporary fashion brand creating statement pieces for the modern individual who values quality and design.",
      hero: "Wear Your Confidence.",
      about: "We design for those who dare to stand out. Each piece is crafted with premium materials and attention to detail that speaks for itself.",
      tagline: "Style Without Compromise",
      seoTitle: "Contemporary Fashion Brand | Premium Apparel",
      seoDesc: "Discover our latest collection of contemporary fashion. Premium materials, bold designs.",
      categories: ["fashion", "apparel", "lifestyle"],
    },
    products: [
      { name: "Signature Collection Tee", price: 1499, description: "Premium cotton tee with our signature design." },
      { name: "Limited Edition Jacket", price: 4999, description: "Handcrafted jacket available in limited quantities." },
      { name: "Accessories Bundle", price: 2499, description: "Curated set of accessories to complete your look." },
    ],
  },
  {
    id: "digital-agency", name: "Digital Agency", icon: "💻",
    brand: { primary: "#6366F1", secondary: "#8B5CF6", tone: "Professional, innovative, results-driven" },
    content: {
      bio: "Full-service digital agency helping brands grow through strategic design, development, and marketing.",
      hero: "We Build Digital Experiences That Convert.",
      about: "From startups to enterprises, we partner with ambitious brands to create digital products that drive real business results.",
      tagline: "Digital Growth, Delivered",
      seoTitle: "Digital Agency | Web Design, Development & Marketing",
      seoDesc: "Full-service digital agency offering web design, development, and digital marketing services.",
      categories: ["agency", "design", "development"],
    },
    products: [
      { name: "Website Design Package", price: 49999, description: "Custom website design with 5 pages, responsive, and SEO-ready." },
      { name: "SEO Audit & Strategy", price: 14999, description: "Comprehensive SEO audit with actionable recommendations." },
      { name: "Social Media Management", price: 9999, description: "Monthly social media content creation and management." },
    ],
  },
  {
    id: "teacher-coach", name: "Teacher / Coach", icon: "📚",
    brand: { primary: "#2563EB", secondary: "#06B6D4", tone: "Educational, supportive, clear" },
    content: {
      bio: "Experienced educator helping students master complex subjects through structured courses and personalized mentorship.",
      hero: "Learn With Confidence.",
      about: "With a decade of teaching experience, I've developed proven methods that make learning engaging, effective, and enjoyable.",
      tagline: "Knowledge That Transforms",
      seoTitle: "Online Teacher | Courses & Coaching",
      seoDesc: "Learn from an experienced educator. Structured courses and personalized coaching.",
      categories: ["education", "coaching", "courses"],
    },
    products: [
      { name: "Complete Course Bundle", price: 2999, description: "Full access to all courses with lifetime updates." },
      { name: "1-on-1 Mentorship", price: 7999, description: "Monthly personalized coaching sessions with progress tracking." },
      { name: "Study Guide & Templates", price: 599, description: "Comprehensive study materials and practice templates." },
    ],
  },
];
