"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { submitContact } from "@/actions/contact.actions";
import type { InfluencerDataType } from "@/config/influencer";
import type { ContactActionState } from "@/actions/contact.actions";

export function ContactFormClient({
  config,
}: {
  config: InfluencerDataType;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ContactActionState>({ success: false });
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false });
    const result = await submitContact(state, formData);
    setState(result);
    setPending(false);

    if (result.success) {
      formRef.current?.reset();
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/90 to-amber-950/30" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard withGoldBorder className="p-6 sm:p-8 md:p-10">
            <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
              Get in Touch with {config.name}
            </h1>
            <p className="mb-6 text-sm text-white/60 sm:text-base">
              Have a question about fitness, fat loss, hormonal health, or
              postpartum recovery? Or want to collaborate? Fill out the form
              below and I&apos;ll get back to you soon.
            </p>

            {state.success ? (
              <div className="rounded-lg bg-green-500/20 p-4 text-green-300 backdrop-blur-sm">
                <p className="font-medium">Message sent! I&apos;ll get back to you soon.</p>
              </div>
            ) : (
              <form ref={formRef} action={handleSubmit} className="space-y-5">
                <Input
                  id="name"
                  name="name"
                  label="Your Name"
                  placeholder="John Doe"
                  error={state.fieldErrors?.name?.[0]}
                  required
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="john@example.com"
                  error={state.fieldErrors?.email?.[0]}
                  required
                />
                <Textarea
                  id="message"
                  name="message"
                  label="Your Message"
                  placeholder="Tell me about your fitness goals, questions, or collaboration ideas..."
                  error={state.fieldErrors?.message?.[0]}
                  rows={5}
                  required
                />
                {state.error && (
                  <p className="text-sm text-red-400">{state.error}</p>
                )}
                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full bg-amber-500/30 text-amber-300 hover:bg-amber-500/40 sm:w-auto"
                >
                  {pending ? "Sending..." : "Send Message →"}
                </Button>
              </form>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </main>
  );
}
