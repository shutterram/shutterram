import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SocialLinks } from "@/components/site/SocialLinks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { budgetRanges, services, site } from "@/data/portfolio";
import { submitForm } from "@/lib/submit-form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    service: typeof search['service'] === "string" ? search['service'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact & Request a Quote | Shutter Ram" },
      {
        name: "description",
        content:
          "Send Shutter Ram a message or request a tailored photography quote for your wedding, brand shoot, portrait session or event.",
      },
      { property: "og:title", content: "Contact & Request a Quote | Shutter Ram" },
      {
        property: "og:description",
        content: "Message Shutter Ram or request a tailored photography quote.",
      },
    ],
  }),
  component: Contact,
});

const messageSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  subject: z.string().trim().min(2, "Please add a subject").max(150),
  message: z.string().trim().min(10, "A little more detail, please").max(2000),
});

const quoteSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().min(6, "Enter a contact number").max(30),
  service: z.string().min(1, "Choose a service"),
  date: z.string().max(30).optional(),
  budget: z.string().min(1, "Choose a budget range"),
  details: z.string().trim().min(10, "Tell me a bit about the shoot").max(2000),
});

const fieldClass =
  "border-hairline bg-surface/40 rounded-none h-12 focus-visible:ring-0 focus-visible:border-foreground";

function Label({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="eyebrow mb-2 block">
      {children}
    </label>
  );
}

function ErrorText({ msg }: { msg?: string }) {
  return msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null;
}

function Contact() {
  const { service } = Route.useSearch();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-28 pt-40">
      <p className="eyebrow">Contact Me</p>
      <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
        Let's talk about your shoot.
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Send a message for anything general, or use the quote form below if you already
        have a date and a rough idea in mind. I reply to everything within two working days.
      </p>

      <div className="mt-12 grid gap-6 border-y border-hairline py-8 sm:grid-cols-3">
        {[
          { icon: Phone, label: site.phone, href: `tel:${site.phone.replace(/[^+\d]/g, "")}` },
          { icon: Mail, label: site.email, href: `mailto:${site.email}` },
          { icon: MapPin, label: site.location, href: undefined },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-3 text-sm text-muted-foreground">
            <c.icon className="size-4 shrink-0" strokeWidth={1.4} />
            {c.href ? (
              <a href={c.href} className="transition-colors hover:text-foreground">
                {c.label}
              </a>
            ) : (
              <span>{c.label}</span>
            )}
          </div>
        ))}
      </div>

      <MessageForm />
      <QuoteForm initialService={service} />

      <div className="mt-24 border-t border-hairline pt-12 text-center">
        <p className="eyebrow">Or find me here</p>
        <SocialLinks className="mt-6 justify-center" size="lg" />
      </div>
    </div>
  );
}

function MessageForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof messageSchema>>({ resolver: zodResolver(messageSchema) });

  return (
    <section id="message" className="mt-20 scroll-mt-40">
      <h2 className="font-display text-3xl">Send a message</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Questions, availability, or just saying hello.
      </p>

      <form
        className="mt-8 grid gap-6 sm:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          const res = await submitForm(`New message from ${values.name}`, values);
          if (res.ok) {
            toast.success(
              res.mode === "endpoint"
                ? "Message sent — I'll be in touch shortly."
                : "Opening your email app to send the message.",
            );
            reset();
          } else {
            toast.error(res.error);
          }
        })}
      >
        <div>
          <Label htmlFor="m-name">Your name</Label>
          <Input id="m-name" className={fieldClass} placeholder="Jane Doe" {...register("name")} />
          <ErrorText msg={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="m-email">Email</Label>
          <Input id="m-email" type="email" className={fieldClass} placeholder="jane@example.com" {...register("email")} />
          <ErrorText msg={errors.email?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="m-subject">Subject</Label>
          <Input id="m-subject" className={fieldClass} placeholder="Availability in October" {...register("subject")} />
          <ErrorText msg={errors.subject?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="m-message">Message</Label>
          <Textarea
            id="m-message"
            rows={6}
            className="rounded-none border-hairline bg-surface/40 focus-visible:border-foreground focus-visible:ring-0"
            placeholder="Tell me what you have in mind…"
            {...register("message")}
          />
          <ErrorText msg={errors.message?.message} />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send Message"}
          </button>
        </div>
      </form>
    </section>
  );
}

function QuoteForm({ initialService }: { initialService?: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      service: services.some((s) => s.slug === initialService) ? initialService : "",
      budget: "",
    },
  });

  return (
    <section id="quote" className="mt-24 scroll-mt-40 border border-hairline bg-surface/30 p-8 md:p-12">
      <p className="eyebrow">Request a Quote</p>
      <h2 className="mt-3 font-display text-3xl">Tell me about the shoot</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The more detail you give, the more accurate the quote comes back.
      </p>

      <form
        className="mt-8 grid gap-6 sm:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          const res = await submitForm(`Quote request — ${values.service} — ${values.name}`, {
            ...values,
            date: values.date ?? "",
          });
          if (res.ok) {
            toast.success(
              res.mode === "endpoint"
                ? "Quote request received — expect a reply within two working days."
                : "Opening your email app to send the quote request.",
            );
            reset();
          } else {
            toast.error(res.error);
          }
        })}
      >
        <div>
          <Label htmlFor="q-name">Your name</Label>
          <Input id="q-name" className={fieldClass} placeholder="Jane Doe" {...register("name")} />
          <ErrorText msg={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="q-email">Email</Label>
          <Input id="q-email" type="email" className={fieldClass} placeholder="jane@example.com" {...register("email")} />
          <ErrorText msg={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="q-phone">Phone</Label>
          <Input id="q-phone" className={fieldClass} placeholder="+1 555 000 0000" {...register("phone")} />
          <ErrorText msg={errors.phone?.message} />
        </div>
        <div>
          <Label htmlFor="q-service">Service</Label>
          <select
            id="q-service"
            className={cn(fieldClass, "w-full border px-3 text-sm text-foreground outline-none")}
            {...register("service")}
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
          <ErrorText msg={errors.service?.message} />
        </div>
        <div>
          <Label htmlFor="q-date">Event date</Label>
          <Input id="q-date" type="date" className={fieldClass} {...register("date")} />
          <ErrorText msg={errors.date?.message} />
        </div>
        <div>
          <Label htmlFor="q-budget">Budget range</Label>
          <select
            id="q-budget"
            className={cn(fieldClass, "w-full border px-3 text-sm text-foreground outline-none")}
            {...register("budget")}
          >
            <option value="">Select a range</option>
            {budgetRanges.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ErrorText msg={errors.budget?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="q-details">Details</Label>
          <Textarea
            id="q-details"
            rows={6}
            className="rounded-none border-hairline bg-surface/40 focus-visible:border-foreground focus-visible:ring-0"
            placeholder="Location, timings, number of people, anything that matters…"
            {...register("details")}
          />
          <ErrorText msg={errors.details?.message} />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Request Quote"}
          </button>
        </div>
      </form>
    </section>
  );
}
