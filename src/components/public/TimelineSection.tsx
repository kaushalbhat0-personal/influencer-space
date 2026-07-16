"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  year: string;
  title: string;
  description: string;
  imageUrl?: string;
  stats?: string;
}

const defaultMilestones: Milestone[] = [
  {
    id: "1",
    year: "2016",
    title: "Started Gaming",
    description:
      "Picked up the controller for the first time. What started as casual gaming in Hyderabad quickly turned into a passion.",
    imageUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop",
  },
  {
    id: "2",
    year: "2019",
    title: "Joined Team XO",
    description:
      "First step into organized esports. Started competing in tournaments and building a name in the Indian BGMI scene.",
    stats: "Team XO",
    imageUrl:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    year: "2020",
    title: "Team IND & Velocity Gaming",
    description:
      "Played for Team IND and later Velocity Gaming. Gained invaluable experience competing at higher levels of Indian esports.",
    stats: "2 Teams",
    imageUrl:
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=300&fit=crop",
  },
  {
    id: "4",
    year: "2022",
    title: "Joined S8UL Esports",
    description:
      "The biggest turning point. Announced at DreamHack Hyderabad — joined S8UL, one of India's most iconic esports organizations.",
    stats: "S8UL",
    imageUrl:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop",
  },
  {
    id: "5",
    year: "2022-2024",
    title: "Content Group of the Year (3x)",
    description:
      "S8UL won Content Group of the Year at the Esports Awards three years running.",
    stats: "3x Winner",
    imageUrl:
      "https://images.unsplash.com/photo-1593118247619-e2d6f056869e?w=400&h=300&fit=crop",
  },
  {
    id: "6",
    year: "2025",
    title: "Esports Content Creator of the Year Nominee",
    description:
      "Nominated at the Esports Awards 2025. A testament to the hard work, the Hyderabadi vibes, and the love from the squad.",
    stats: "Nominee",
    imageUrl:
      "https://images.unsplash.com/photo-1602939444907-6e688c594a66?w=400&h=300&fit=crop",
  },
  {
    id: "7",
    year: "2025",
    title: "Represented India at Esports World Cup Riyadh",
    description:
      "Traveled to Riyadh to represent India at the Esports World Cup as part of S8UL.",
    stats: "EWC 2025",
    imageUrl:
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop",
  },
];

interface TimelineSectionProps {
  events?: Milestone[];
}

export function TimelineSection({ events }: TimelineSectionProps) {
  const milestones = events && events.length > 0 ? events : defaultMilestones;

  return (
    <section id="journey" className="relative px-4 py-16 sm:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/95 to-black/90" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="mb-2 inline-block font-display text-xs uppercase tracking-[0.2em] text-s8ul-cyan">
            Career Timeline
          </span>
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">
            The Journey
          </h2>
          <p className="mt-4 text-white/50">
            From Hyderabad to the world stage
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-s8ul-cyan/40 via-s8ul-pink/40 to-s8ul-cyan/40 max-md:hidden" />

          {milestones.map((item, index) => {
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className={cn(
                  "relative mb-12 flex flex-col md:flex-row",
                  isEven ? "md:justify-start" : "md:justify-end",
                )}
              >
                <div
                  className={cn(
                    "w-full md:w-5/12",
                    !isEven && "md:text-right",
                  )}
                >
                  <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:border-s8ul-cyan/30 sm:p-6">
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-s8ul-cyan/5 via-transparent to-s8ul-pink/5" />
                    </div>

                    {item.imageUrl && (
                      <div
                        className={cn(
                          "mb-4 overflow-hidden rounded-lg",
                          !isEven && "md:ml-auto",
                        )}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <span className="font-display text-xl font-bold text-s8ul-cyan sm:text-2xl">
                        {item.year}
                      </span>
                      {item.stats && (
                        <span className="rounded-full border border-s8ul-pink/30 bg-s8ul-pink/10 px-2.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-s8ul-pink">
                          {item.stats}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 font-display text-base font-bold text-white sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/50">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                  <div className="h-4 w-4 rounded-full border-2 border-s8ul-cyan bg-black shadow-[0_0_10px_rgba(0,245,255,0.5)]" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
