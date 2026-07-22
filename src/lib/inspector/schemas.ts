import type { ComponentSchema } from "./types";

/** Schema for every registered component — drives the Property Inspector UI */
export const COMPONENT_SCHEMAS: Record<string, ComponentSchema> = {
  "hero.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Welcome", aiEditable: true, aiRegenerate: true },
          { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "", aiEditable: true, aiRegenerate: true },
          { key: "buttonText", label: "Button Text", type: "text", defaultValue: "Get Started" },
          { key: "buttonLink", label: "Button Link", type: "url", defaultValue: "#" },
        ],
      },
      {
        id: "style", label: "Style",
        fields: [
          { key: "alignment", label: "Alignment", type: "select", defaultValue: "center", options: [
            { label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" },
          ]},
          { key: "overlay", label: "Overlay", type: "boolean", defaultValue: true },
        ],
      },
      {
        id: "animation", label: "Animation",
        fields: [
          { key: "animation", label: "Entrance", type: "select", defaultValue: "fade", options: [
            { label: "None", value: "none" }, { label: "Fade In", value: "fade" }, { label: "Slide Up", value: "slide" },
          ]},
        ],
      },
    ],
  },
  "hero.gaming": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Live Now", aiEditable: true, aiRegenerate: true },
          { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "", aiEditable: true },
          { key: "showLiveBadge", label: "Live Badge", type: "boolean", defaultValue: true },
        ],
      },
      {
        id: "animation", label: "Animation",
        fields: [
          { key: "animation", label: "Entrance", type: "select", defaultValue: "fade", options: [
            { label: "None", value: "none" }, { label: "Fade In", value: "fade" },
          ]},
        ],
      },
    ],
  },
  "hero.fitness": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Transform Your Body", aiEditable: true, aiRegenerate: true },
          { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "", aiEditable: true },
          { key: "cta", label: "CTA", type: "text", defaultValue: "Join Now" },
        ],
      },
    ],
  },
  "hero.education": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Learn Something New", aiEditable: true, aiRegenerate: true },
          { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "", aiEditable: true },
          { key: "cta", label: "CTA", type: "text", defaultValue: "Start Learning" },
        ],
      },
    ],
  },
  "about.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "About Me", aiEditable: true },
          { key: "content", label: "Bio", type: "textarea", defaultValue: "", aiEditable: true, aiRegenerate: true },
          { key: "imageUrl", label: "Profile Image", type: "url", defaultValue: "" },
        ],
      },
    ],
  },
  "footer.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "copyright", label: "Copyright", type: "text", defaultValue: "© All rights reserved" },
        ],
      },
    ],
  },
  "gallery.grid": {
    groups: [
      {
        id: "layout", label: "Layout",
        fields: [
          { key: "columns", label: "Columns", type: "number", defaultValue: 3, validation: { min: 1, max: 6 } },
          { key: "layout", label: "Layout Style", type: "select", defaultValue: "grid", options: [
            { label: "Grid", value: "grid" }, { label: "Masonry", value: "masonry" },
          ]},
        ],
      },
    ],
  },
  "products.grid": {
    groups: [
      {
        id: "layout", label: "Layout",
        fields: [
          { key: "columns", label: "Columns", type: "number", defaultValue: 3, validation: { min: 1, max: 6 } },
        ],
      },
    ],
  },
  "timeline.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "My Journey", aiEditable: true },
        ],
      },
    ],
  },
  "links.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Connect With Me", aiEditable: true },
        ],
      },
    ],
  },
  "testimonials.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "What People Say", aiEditable: true },
        ],
      },
    ],
  },
  "faq.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "FAQ", aiEditable: true },
        ],
      },
    ],
  },
  "contact.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Get In Touch", aiEditable: true },
          { key: "email", label: "Email", type: "text", defaultValue: "" },
        ],
      },
    ],
  },
  "newsletter.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Subscribe", aiEditable: true },
          { key: "placeholder", label: "Placeholder", type: "text", defaultValue: "Your email" },
        ],
      },
    ],
  },
  "pricing.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "Plans", aiEditable: true },
        ],
      },
    ],
  },
  "courses.default": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "title", label: "Title", type: "text", defaultValue: "My Courses", aiEditable: true },
        ],
      },
    ],
  },
  "embed.spotify": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "url", label: "Spotify URL", type: "url", defaultValue: "" },
          { key: "height", label: "Height", type: "number", defaultValue: 352 },
        ],
      },
    ],
  },
  "embed.youtube": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "url", label: "YouTube URL", type: "url", defaultValue: "" },
          { key: "autoplay", label: "Autoplay", type: "boolean", defaultValue: false },
        ],
      },
    ],
  },
  "social.discord": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "serverId", label: "Server ID", type: "text", defaultValue: "" },
          { key: "label", label: "Button Label", type: "text", defaultValue: "Join Discord" },
        ],
      },
    ],
  },
  "social.instagram": {
    groups: [
      {
        id: "content", label: "Content",
        fields: [
          { key: "username", label: "Username", type: "text", defaultValue: "" },
          { key: "limit", label: "Max Images", type: "number", defaultValue: 6, validation: { min: 1, max: 30 } },
        ],
      },
    ],
  },
};

export function getComponentSchema(componentId: string): ComponentSchema | undefined {
  return COMPONENT_SCHEMAS[componentId];
}
