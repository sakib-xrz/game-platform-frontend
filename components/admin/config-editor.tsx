"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { CheckCircle2, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminClient, AdminRequestError } from "@/lib/admin-client";
import { sanitizeAdminConfigPayload } from "@/lib/admin-config-payload";
import type { ConfigValidationPreview } from "@/lib/admin-config-validation";
import type { CreateAdminConfigInput } from "@/types/admin";

const timingFields = [
  { name: "betting_duration_ms" as const, label: "Betting duration", min: 3, max: 120 },
  { name: "lock_duration_ms" as const, label: "Lock duration", min: 0.25, max: 10 },
  { name: "drawing_duration_ms" as const, label: "Drawing duration", min: 1, max: 30 },
  { name: "result_duration_ms" as const, label: "Result duration", min: 1, max: 30 },
];

function secondsToMilliseconds(value: number) {
  return Math.round(value * 1000);
}

function formatSecondsFromMilliseconds(valueMs: number) {
  const seconds = valueMs / 1000;
  return Number.isInteger(seconds) ? String(seconds) : String(seconds);
}

function DurationSecondsField({ id, label, min, max, valueMs, disabled, onChangeMs }: { id: string; label: string; min: number; max: number; valueMs: number; disabled?: boolean; onChangeMs: (valueMs: number) => void }) {
  const [draft, setDraft] = useState(() => formatSecondsFromMilliseconds(valueMs));
  const committedMs = useRef(valueMs);

  useEffect(() => {
    if (committedMs.current !== valueMs) {
      committedMs.current = valueMs;
      setDraft(formatSecondsFromMilliseconds(valueMs));
    }
  }, [valueMs]);

  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type="text" inputMode="decimal" disabled={disabled} value={draft} className="pr-10" onChange={(event) => { const raw = event.target.value; if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return; setDraft(raw); if (raw === "" || raw === ".") return; const next = Number(raw); if (Number.isFinite(next)) { const ms = secondsToMilliseconds(next); committedMs.current = ms; onChangeMs(ms); } }} onBlur={() => { if (draft === "" || draft === ".") { setDraft(formatSecondsFromMilliseconds(valueMs)); return; } const next = Number(draft); if (!Number.isFinite(next)) { setDraft(formatSecondsFromMilliseconds(valueMs)); return; } const clamped = Math.min(max, Math.max(min, next)); const ms = secondsToMilliseconds(clamped); committedMs.current = ms; onChangeMs(ms); setDraft(formatSecondsFromMilliseconds(ms)); }} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">sec</span></div></div>;
}

export const newConfigDefaults: CreateAdminConfigInput = {
  betting_duration_ms: 10000, lock_duration_ms: 1000, drawing_duration_ms: 3000, result_duration_ms: 4000,
  min_bet: "10", max_single_bet: "10000", max_round_bet: "50000", notes: "",
  options: ["HOT_DOG", "KEBAB", "HAM", "STEAK", "CARROT", "CORN", "CABBAGE", "TOMATO"].map((code, index) => ({ code, name: code.replaceAll("_", " ").toLowerCase().replace(/^./, (value) => value.toUpperCase()), image_url: null, asset_id: null, display_order: index + 1, payout_numerator: ["4", "5", "6", "7", "8", "10", "15", "20"][index]!, payout_denominator: "1", probability_weight: "1", is_enabled: true })),
  chip_values: [10, 50, 100, 500].map((amount, index) => ({ amount: String(amount), display_order: index + 1, is_enabled: true })),
};

export function ConfigEditor({ initial, submitLabel, onSave, readOnly = false, validateConfig = adminClient.validateConfig, uploadAsset = adminClient.uploadAsset }: { initial: CreateAdminConfigInput; submitLabel: string; onSave: (payload: CreateAdminConfigInput) => Promise<void>; readOnly?: boolean; validateConfig?: (payload: CreateAdminConfigInput) => Promise<ConfigValidationPreview>; uploadAsset?: (file: File) => Promise<import("@/types/admin").AdminAsset> }) {
  const { register, control, setValue, handleSubmit, formState: { isSubmitting } } = useForm<CreateAdminConfigInput>({ defaultValues: initial });
  const optionFields = useFieldArray({ control, name: "options" });
  const chipFields = useFieldArray({ control, name: "chip_values" });
  const values = useWatch({ control }) as CreateAdminConfigInput;
  const [preview, setPreview] = useState<ConfigValidationPreview | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<number | null>(null);

  async function validate(payload: CreateAdminConfigInput) {
    const result = await validateConfig(sanitizeAdminConfigPayload(payload));
    setPreview(result);
    return result;
  }
  async function submit(payload: CreateAdminConfigInput) {
    setError("");
    try {
      const sanitized = sanitizeAdminConfigPayload(payload);
      const result = await validate(sanitized);
      if (!result.valid) {
        setError(result.failures.length ? result.failures.map((failure) => `${failure.field}: ${failure.message}`).join("; ") : "Resolve all validation errors before saving this configuration.");
        return;
      }
      await onSave(sanitized);
    } catch (reason) {
      if (reason instanceof AdminRequestError && reason.errors?.length) setError(reason.errors.join("; "));
      else setError(reason instanceof Error ? reason.message : "Configuration could not be saved");
    }
  }
  async function upload(index: number, file?: File) { if (!file) return; setUploading(index); setError(""); try { const asset = await uploadAsset(file); setValue(`options.${index}.asset_id`, asset.id, { shouldDirty: true }); setValue(`options.${index}.image_url`, asset.cdn_url, { shouldDirty: true }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Artwork upload failed"); } finally { setUploading(null); } }

  return <form className="space-y-6" onSubmit={readOnly ? (event) => event.preventDefault() : handleSubmit(submit)}>
    {error && <Alert variant="destructive"><AlertTitle>Configuration blocked</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <Card><CardHeader><CardTitle>Round timing and betting limits</CardTitle><CardDescription>Round phase durations are shown in seconds. Monetary values are positive whole coins.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {timingFields.map(({ name, label, min, max }) => <Controller key={name} control={control} name={name} render={({ field }) => <DurationSecondsField id={name} label={label} min={min} max={max} disabled={readOnly} valueMs={field.value} onChangeMs={field.onChange} />} />)}
      {(["min_bet", "max_single_bet", "max_round_bet"] as const).map((name) => <div className="space-y-2" key={name}><Label htmlFor={name}>{name.replaceAll("_", " ")}</Label><Input id={name} inputMode="numeric" disabled={readOnly} {...register(name)} /></div>)}
      <div className="space-y-2 md:col-span-2 xl:col-span-4"><Label htmlFor="notes">Internal notes</Label><Textarea id="notes" rows={3} disabled={readOnly} {...register("notes")} /></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Greedy options</CardTitle><CardDescription>Manage every outcome, probability weight, payout multiplier, display order and artwork.</CardDescription></CardHeader><CardContent className="grid gap-4 xl:grid-cols-2">
      {optionFields.fields.map((field, index) => <Card className="gap-4 bg-slate-50 py-4 shadow-none" key={field.id}><CardHeader className="flex flex-row items-center justify-between px-4"><div><CardTitle className="text-base">Option {index + 1}</CardTitle><CardDescription>{values.options?.[index]?.code || "Unconfigured"}</CardDescription></div><Controller control={control} name={`options.${index}.is_enabled`} render={({ field: enabled }) => <div className="flex items-center gap-2"><Label htmlFor={`option-${index}-enabled`}>Enabled</Label><Switch id={`option-${index}-enabled`} checked={enabled.value} disabled={readOnly} onCheckedChange={enabled.onChange} /></div>} /></CardHeader><CardContent className="space-y-4 px-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-lg font-bold text-slate-500">{values.options?.[index]?.image_url ? <Image className="size-full object-cover" src={values.options[index].image_url || ""} alt="" width={56} height={56} unoptimized /> : values.options?.[index]?.code?.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{values.options?.[index]?.name || "Unnamed option"}</p><p className="text-xs text-slate-500">{values.options?.[index]?.asset_id ? "Managed artwork connected" : "Using the game fallback artwork"}</p></div>{!readOnly && <Button type="button" variant="outline" size="sm" asChild><label className="cursor-pointer"><Upload />{uploading === index ? "Uploading" : "Upload"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading !== null} onChange={(event) => void upload(index, event.target.files?.[0])} /></label></Button>}</div>
        <input type="hidden" {...register(`options.${index}.asset_id`)} /><input type="hidden" {...register(`options.${index}.image_url`)} />
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Code</Label><Input disabled={readOnly} {...register(`options.${index}.code`)} /></div><div className="space-y-2"><Label>Name</Label><Input disabled={readOnly} {...register(`options.${index}.name`)} /></div><div className="space-y-2"><Label>Display order</Label><Input type="number" disabled={readOnly} {...register(`options.${index}.display_order`, { valueAsNumber: true })} /></div><div className="space-y-2"><Label>Probability weight</Label><Input inputMode="numeric" disabled={readOnly} {...register(`options.${index}.probability_weight`)} /></div><div className="space-y-2"><Label>Payout numerator</Label><Input inputMode="numeric" disabled={readOnly} {...register(`options.${index}.payout_numerator`)} /></div><div className="space-y-2"><Label>Payout denominator</Label><Input inputMode="numeric" disabled={readOnly} {...register(`options.${index}.payout_denominator`)} /></div></div>
      </CardContent></Card>)}
    </CardContent></Card>

    <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Chip presets</CardTitle><CardDescription>These values update the chip selector on the user panel after publication.</CardDescription></div>{!readOnly && <Button type="button" variant="outline" disabled={chipFields.fields.length >= 12} onClick={() => chipFields.append({ amount: "1000", display_order: chipFields.fields.length + 1, is_enabled: true })}><Plus /> Add chip</Button>}</CardHeader><CardContent className="space-y-3">{chipFields.fields.map((field, index) => <div className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_160px_auto_auto]" key={field.id}><div className="space-y-2"><Label>Amount</Label><Input inputMode="numeric" disabled={readOnly} {...register(`chip_values.${index}.amount`)} /></div><div className="space-y-2"><Label>Display order</Label><Input type="number" disabled={readOnly} {...register(`chip_values.${index}.display_order`, { valueAsNumber: true })} /></div><Controller control={control} name={`chip_values.${index}.is_enabled`} render={({ field: enabled }) => <div className="flex h-9 items-center gap-2"><Switch checked={enabled.value} disabled={readOnly} onCheckedChange={enabled.onChange} /><Label>Enabled</Label></div>} />{!readOnly && <Button type="button" variant="ghost" size="icon" onClick={() => chipFields.remove(index)}><Trash2 className="text-red-600" /><span className="sr-only">Remove chip</span></Button>}</div>)}</CardContent></Card>

    <Card><CardHeader><CardTitle>Validation preview</CardTitle><CardDescription>{readOnly ? "Probability distribution and per-option return for this configuration." : "Verify win chances and per-option return before saving. Each option is checked independently."}</CardDescription></CardHeader><CardContent className="space-y-4">{preview ? <><div className="flex flex-wrap gap-2"><Badge variant="outline">Total weight: {preview.total_weight}</Badge><Badge variant={preview.valid ? "success" : "destructive"}>Max option return: {preview.theoretical_return_percent.toFixed(2)}%</Badge><Badge variant={preview.valid ? "success" : "destructive"}>{preview.valid ? "Ready" : "Blocked"}</Badge></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{preview.options.map((option) => <div className="rounded-lg border border-slate-200 p-3 text-xs" key={option.code}><p className="font-semibold">{option.code}</p><p className="mt-1 text-slate-500">{option.probability_percent.toFixed(2)}% win chance · {option.payout_contribution_percent.toFixed(2)}% option RTP</p></div>)}</div>{preview.failures.length > 0 && <Alert variant="destructive"><AlertTitle>Validation errors</AlertTitle><AlertDescription><ul className="list-disc space-y-1 pl-4">{preview.failures.map((failure) => <li key={`${failure.field}-${failure.message}`}>{failure.field}: {failure.message}</li>)}</ul></AlertDescription></Alert>}</> : <p className="text-sm text-slate-500">{readOnly ? "Validation preview is not available in read-only mode." : "Run validation to preview the exact game math."}</p>}{!readOnly && <><Separator /><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => void validate(sanitizeAdminConfigPayload(values))}><CheckCircle2 /> Validate</Button><Button disabled={isSubmitting || uploading !== null}>{isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}{isSubmitting ? "Saving…" : submitLabel}</Button></div></>}</CardContent></Card>
  </form>;
}
