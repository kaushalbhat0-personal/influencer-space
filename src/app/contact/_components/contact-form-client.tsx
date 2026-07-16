"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { submitContact } from "@/actions/contact.actions";
import type { ContactActionState } from "@/actions/contact.actions";

export function ContactFormClient() {
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
    <>
      {state.success ? (
        <div className="rounded-lg bg-green-500/20 p-4 text-green-300 backdrop-blur-sm">
          <p className="font-medium">Thanks for reaching out! We&apos;ll get back to you within 24 hours.</p>
        </div>
      ) : (
        <form ref={formRef} action={handleSubmit} className="space-y-4">
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
            placeholder="How can we help you with your creator storefront?"
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
            className="w-full bg-s8ul-cyan/20 text-s8ul-cyan hover:bg-s8ul-cyan/30 sm:w-auto"
          >
            {pending ? "Sending..." : "Send Message →"}
          </Button>
        </form>
      )}
    </>
  );
}
