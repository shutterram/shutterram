import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SocialLinks } from "@/components/site/SocialLinks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { budgetRanges, hourOptions, services, site } from "@/data/portfolio";
import { submitForm } from "@/lib/submit-form";
import { cn } from "@/lib/utils";

type FormKind = "message" | "quote";
type ContactSearch = { service?: string; form?: FormKind };

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>): ContactSearch => {
    const out: ContactSearch = {};
    if (typeof search["service"] === "string") out.service = search["service"];
    if (search["form"] === "quote" || search["form"] === "message") out.form = search["form"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Contact & Book Your Date | Shutter Ram" },
      {
        name: "description",
        content:
          "Send Shutter Ram a message or request a tailored photography quote for your wedding, brand shoot, portrait session or event.",
      },
      { property: "og:title", content: "Contact & Book Your Date | Shutter Ram" },
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

const CUSTOM = "__custom";

const quoteSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(100),
    email: z.string().trim().email("Enter a valid email address").max(255),
    phone: z.string().trim().min(6, "Enter a contact number").max(30),
    eventType: z.string().min(1, "Choose an event type"),
    eventTypeCustom: z.string().trim().max(120).optional(),
    eventDate: z.string().max(30).optional(),
    hours: z.string().min(1, "Choose the coverage you need"),
    hoursCustom: z.string().trim().max(120).optional(),
    budget: z.string().min(1, "Choose a budget range"),
    budgetCustom: z.string().trim().max(120).optional(),
    location: z.string().trim().min(2, "Where is the shoot?").max(150),
    details: z.string().trim().min(10, "Tell me a bit about the shoot").max(2000),
    acknowledged: z.literal(true, {
      errorMap: () => ({ message: "Please acknowledge the booking terms" }),
    }),
  })
  .superRefine((v, ctx) => {
    const pairs = [
      ["eventType", "eventTypeCustom", "Describe your event type"],
      ["hours", "hoursCustom", "Enter the hours you need"],
      ["budget", "budgetCustom", "Enter your budget"],
    ] as const;
    for (const [select, custom, msg] of pairs) {
      if (v[select] === CUSTOM && !v[custom]?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [custom], message: msg });
      }
    }
  });


const fieldClass =
  "h-12 rounded-none border-0 border-b border-hairline bg-transparent px-0 shadow-none transition-colors duration-500 focus-visible:border-foreground focus-visible:ring-0";
const areaClass =
  "rounded-none border-0 border-b border-hairline bg-transparent px-0 shadow-none transition-colors duration-500 focus-visible:border-foreground focus-visible:ring-0";

function Label({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="eyebrow mb-2 block">
      {children}
    </label>
  );
}

function ErrorText({ msg }: { msg?: string | undefined }) {
  return msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null;
}

function Contact() {
  const { service, form } = Route.useSearch();
  const navigate = useNavigate({ from: "/contact" });
  const active: FormKind = form ?? "quote";

  const setActive = (kind: FormKind) =>
    navigate({ search: (prev: ContactSearch) => ({ ...prev, form: kind }), replace: true });

  return (
    <div className="mx-auto max-w-6xl px-6 pb-28 pt-56">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
        Let's talk about your shoot.
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Pick whichever suits you — a quick message for anything general, or the booking
        enquiry if you already have a date in mind. I reply to everything within two
        working days.
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

      {/* ------------------------------------------------------- form toggle */}
      <div
        className="mt-14 inline-flex border border-hairline p-1"
        role="tablist"
        aria-label="Choose a form"
      >
        {(
          [
            { key: "quote" as const, label: "Request a Quote" },
            { key: "message" as const, label: "Send a Message" },
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "px-6 py-3 text-[0.6875rem] tracking-[0.24em] uppercase transition-all duration-500",
              active === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={active} className="page-in">
        {active === "message" ? <MessageForm /> : <QuoteForm initialService={service} />}
      </div>

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
    <section id="message" className="mt-12 scroll-mt-40">
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
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" className={fieldClass} placeholder="Your name" {...register("name")} />
          <ErrorText msg={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="m-email">Email</Label>
          <Input id="m-email" type="email" className={fieldClass} placeholder="you@example.com" {...register("email")} />
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
            className={areaClass}
            placeholder="Tell me what you have in mind…"
            {...register("message")}
          />
          <ErrorText msg={errors.message?.message} />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="glow-hover inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background hover:bg-transparent hover:text-foreground disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send Message"}
          </button>
        </div>
      </form>
    </section>
  );
}

function QuoteForm({ initialService }: { initialService?: string | undefined }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      eventType: services.some((s) => s.slug === initialService) ? (initialService ?? "") : "",
      hours: "",
      budget: "",
    },
  });

  const typeVal = watch("eventType");
  const hoursVal = watch("hours");
  const budgetVal = watch("budget");

  return (
    <section id="quote" className="mt-12 scroll-mt-40 border border-hairline bg-surface/30 p-8 md:p-12">
      <p className="eyebrow">Book Your Date</p>
      <h2 className="mt-3 font-display text-3xl">Tell me about the shoot</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The more detail you give, the more accurate the quote comes back.
      </p>

      <form
        className="mt-8 grid gap-6 sm:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          const pick = (v: string, custom?: string) => (v === CUSTOM ? (custom ?? "") : v);
          const eventType = pick(values.eventType, values["eventTypeCustom"]);
          const res = await submitForm(`Booking enquiry — ${eventType} — ${values.name}`, {
            name: values.name,
            email: values.email,
            phone: values.phone,
            eventType,
            eventDate: values["eventDate"] ?? "",
            hours: pick(values.hours, values["hoursCustom"]),
            budget: pick(values.budget, values["budgetCustom"]),
            location: values.location,
            details: values.details,
          });

          if (res.ok) {
            toast.success(
              res.mode === "endpoint"
                ? "Enquiry received — I'll confirm availability within 24 hours."
                : "Opening your email app to send the enquiry.",
            );
            reset();
          } else {
            toast.error(res.error);
          }
        })}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="q-name">Name</Label>
          <Input id="q-name" className={fieldClass} placeholder="Your name" {...register("name")} />
          <ErrorText msg={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="q-email">Email</Label>
          <Input id="q-email" type="email" className={fieldClass} placeholder="you@example.com" {...register("email")} />
          <ErrorText msg={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="q-phone">Phone</Label>
          <Input id="q-phone" className={fieldClass} placeholder="(555) 555-5555" {...register("phone")} />
          <ErrorText msg={errors.phone?.message} />
        </div>
        <div>
          <Label htmlFor="q-type">Event type</Label>
          <select
            id="q-type"
            className={cn(fieldClass, "w-full bg-transparent text-sm text-foreground outline-none")}
            {...register("eventType")}
          >
            <option value="">Select event type</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
            <option value={CUSTOM}>Something else (enter my own)</option>
          </select>
          <ErrorText msg={errors.eventType?.message} />
          {typeVal === CUSTOM ? (
            <>
              <Input
                className={cn(fieldClass, "mt-3")}
                placeholder="Describe your event type"
                aria-label="Custom event type"
                {...register("eventTypeCustom")}
              />
              <ErrorText msg={errors.eventTypeCustom?.message} />
            </>
          ) : null}
        </div>
        <div>
          <Label htmlFor="q-date">Event date</Label>
          <Input id="q-date" type="date" className={fieldClass} {...register("eventDate")} />
          <ErrorText msg={errors.eventDate?.message} />
        </div>
        <div>
          <Label htmlFor="q-hours">Hours needed</Label>
          <select
            id="q-hours"
            className={cn(fieldClass, "w-full bg-transparent text-sm text-foreground outline-none")}
            {...register("hours")}
          >
            <option value="">Select coverage</option>
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
            <option value={CUSTOM}>Custom hours (enter my own)</option>
          </select>
          <ErrorText msg={errors.hours?.message} />
          {hoursVal === CUSTOM ? (
            <>
              <Input
                className={cn(fieldClass, "mt-3")}
                placeholder="e.g. 6.5 hours across two days"
                aria-label="Custom hours needed"
                {...register("hoursCustom")}
              />
              <ErrorText msg={errors.hoursCustom?.message} />
            </>
          ) : null}
        </div>
        <div>
          <Label htmlFor="q-budget">Estimated budget</Label>
          <select
            id="q-budget"
            className={cn(fieldClass, "w-full bg-transparent text-sm text-foreground outline-none")}
            {...register("budget")}
          >
            <option value="">Select budget</option>
            {budgetRanges.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value={CUSTOM}>Custom amount (enter my own)</option>
          </select>
          <ErrorText msg={errors.budget?.message} />
          {budgetVal === CUSTOM ? (
            <>
              <Input
                className={cn(fieldClass, "mt-3")}
                placeholder="e.g. $3,200"
                aria-label="Custom budget"
                {...register("budgetCustom")}
              />
              <ErrorText msg={errors.budgetCustom?.message} />
            </>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="q-location">Location</Label>
          <Input id="q-location" className={fieldClass} placeholder="City or venue" {...register("location")} />
          <ErrorText msg={errors.location?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="q-details">Tell me about your plans</Label>
          <Textarea
            id="q-details"
            rows={5}
            className={areaClass}
            placeholder="What are you celebrating?"
            {...register("details")}
          />
          <ErrorText msg={errors.details?.message} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="q-ack" className="flex items-start gap-3 text-[0.6875rem] tracking-[0.14em] uppercase text-muted-foreground">
            <input
              id="q-ack"
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[oklch(0.94_0_0)]"
              {...register("acknowledged")}
            />
            I understand my booking is not confirmed until the contract is signed and the
            deposit is received.
          </label>
          <ErrorText msg={errors.acknowledged?.message} />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="glow-hover inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background hover:bg-transparent hover:text-foreground disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send Inquiry"}
          </button>
          <p className="mt-4 text-xs text-muted-foreground">
            I'll respond within 24 hours to confirm availability.
          </p>
        </div>
      </form>
    </section>
  );
}
