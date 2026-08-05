import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Star, Upload, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { LogoLockup } from "@/components/site/LogoLockup";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/data/portfolio";
import { submitReview } from "@/lib/submit-review.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Leave a Review | Shutter Ram" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "A private page for Shutter Ram clients to leave a review of their shoot.",
      },
      { property: "og:title", content: "Leave a Review | Shutter Ram" },
      {
        property: "og:description",
        content: "Share a few words about your shoot with Shutter Ram.",
      },
    ],
  }),
  component: ReviewPage,
});

const reviewSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  occasion: z.string().trim().min(2, "What did I photograph for you?").max(150),
  review: z.string().trim().min(20, "A couple of sentences, please").max(2000),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please allow the review to be published" }),
  }),
});

const fieldClass =
  "h-12 rounded-none border-0 border-b border-hairline bg-transparent px-0 shadow-none transition-colors duration-500 focus-visible:border-foreground focus-visible:ring-0";

type Attachment = { name: string; type: string; dataUrl: string; preview: string };

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });

function ReviewPage() {
  const [rating, setRating] = useState(5);
  const [files, setFiles] = useState<Attachment[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof reviewSchema>>({ resolver: zodResolver(reviewSchema) });

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).slice(0, 6 - files.length);
    const next: Attachment[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 6_000_000) {
        toast.error(`${file.name} is larger than 6MB`);
        continue;
      }
      const dataUrl = await readFile(file);
      next.push({ name: file.name, type: file.type, dataUrl, preview: dataUrl });
    }
    setFiles((f) => [...f, ...next].slice(0, 6));
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-28 pt-56">
      <div className="flex flex-col items-center text-center">
        <LogoLockup size="md" />
        <p className="eyebrow mt-10">{t("review.eyebrow")}</p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-tight">
          {t("review.title")}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {t("review.intro")}
        </p>
      </div>

      <form
        className="mt-14 grid gap-6 sm:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          const res = await submitReview({
            data: {
              name: values.name,
              email: values.email,
              occasion: values.occasion,
              rating,
              review: values.review,
              images: files.map(({ name, type, dataUrl }) => ({ name, type, dataUrl })),
            },
          }).catch(() => ({ ok: false, error: "Could not send your review." }) as const);

          if (res.ok) {
            toast.success(t("review.thanks"));
            reset();
            setRating(5);
            setFiles([]);
          } else {
            toast.error(res.error ?? "Could not send your review.");
          }
        })}
      >
        <div className="sm:col-span-2">
          <p className="eyebrow mb-3">{t("review.rating_label")}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                className="transition-transform duration-300 hover:scale-110"
              >
                <Star
                  className={cn(
                    "size-7",
                    n <= rating ? "fill-foreground text-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={1.2}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="r-name" className="eyebrow mb-2 block">
            Name
          </label>
          <Input id="r-name" className={fieldClass} placeholder="Your name" {...register("name")} />
          {errors.name ? <p className="mt-2 text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div>
          <label htmlFor="r-email" className="eyebrow mb-2 block">
            Email
          </label>
          <Input id="r-email" type="email" className={fieldClass} placeholder="you@example.com" {...register("email")} />
          {errors.email ? <p className="mt-2 text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="r-occasion" className="eyebrow mb-2 block">
            What did I photograph?
          </label>
          <Input id="r-occasion" className={fieldClass} placeholder="Wedding — June 2026, Hudson Valley" {...register("occasion")} />
          {errors.occasion ? <p className="mt-2 text-xs text-destructive">{errors.occasion.message}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="r-review" className="eyebrow mb-2 block">
            Your review
          </label>
          <Textarea
            id="r-review"
            rows={6}
            className="rounded-none border-0 border-b border-hairline bg-transparent px-0 shadow-none transition-colors duration-500 focus-visible:border-foreground focus-visible:ring-0"
            placeholder="What was the experience like, and how do you feel about the photographs?"
            {...register("review")}
          />
          {errors.review ? <p className="mt-2 text-xs text-destructive">{errors.review.message}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <p className="eyebrow mb-3">{t("review.photos_label")}</p>
          <div className="flex flex-wrap items-center gap-3">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative">
                <img src={f.preview} alt="" className="size-20 border border-hairline object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((list) => list.filter((_, idx) => idx !== i))}
                  className="absolute -right-2 -top-2 grid size-6 place-items-center border border-hairline bg-background"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {files.length < 6 ? (
              <label className="grid size-20 cursor-pointer place-items-center border border-dashed border-hairline text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
                <Upload className="size-4" strokeWidth={1.4} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Up to 6 photographs, 6MB each. They appear with your review once it is approved.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="r-consent" className="flex items-start gap-3 text-[0.6875rem] tracking-[0.14em] uppercase text-muted-foreground">
            <input
              id="r-consent"
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[oklch(0.94_0_0)]"
              {...register("consent")}
            />
            I'm happy for this review and my first name to appear on the Shutter Ram website.
          </label>
          {errors.consent ? <p className="mt-2 text-xs text-destructive">{errors.consent.message}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="glow-hover inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background hover:bg-transparent hover:text-foreground disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : t("review.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
