"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminClient, AdminRequestError } from "@/lib/admin-client";
import { sanitizeTeenPattiAdminConfigPayload } from "@/lib/admin-teen-patti-config-payload";
import type {
  CreateTeenPattiAdminConfigInput,
  TeenPattiConfigValidationPreview,
} from "@/types/admin";

export const TEEN_PATTI_MIN_RESULT_DURATION_MS = 5000;

const timingFields = [
  {
    name: "betting_duration_ms" as const,
    label: "Betting duration",
    min: 3,
    max: 120,
  },
  {
    name: "lock_duration_ms" as const,
    label: "Lock duration",
    min: 0.25,
    max: 10,
  },
  {
    name: "drawing_duration_ms" as const,
    label: "Drawing duration",
    min: 1,
    max: 30,
  },
  {
    name: "result_duration_ms" as const,
    label: "Result duration",
    min: TEEN_PATTI_MIN_RESULT_DURATION_MS / 1000,
    max: 30,
  },
];

function secondsToMilliseconds(value: number) {
  return Math.round(value * 1000);
}

function formatSecondsFromMilliseconds(valueMs: number) {
  const seconds = valueMs / 1000;
  return Number.isInteger(seconds) ? String(seconds) : String(seconds);
}

function formatRakePercent(rakeBps: number) {
  return `${(rakeBps / 100).toFixed(2)}%`;
}

function DurationSecondsField({
  id,
  label,
  min,
  max,
  valueMs,
  disabled,
  onChangeMs,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  valueMs: number;
  disabled?: boolean;
  onChangeMs: (valueMs: number) => void;
}) {
  const [draft, setDraft] = useState(() =>
    formatSecondsFromMilliseconds(valueMs),
  );
  const committedMs = useRef(valueMs);

  useEffect(() => {
    if (committedMs.current !== valueMs) {
      committedMs.current = valueMs;
      setDraft(formatSecondsFromMilliseconds(valueMs));
    }
  }, [valueMs]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={draft}
          className="pr-10"
          onChange={(event) => {
            const raw = event.target.value;
            if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
            setDraft(raw);
            if (raw === "" || raw === ".") return;
            const next = Number(raw);
            if (Number.isFinite(next)) {
              const ms = secondsToMilliseconds(next);
              committedMs.current = ms;
              onChangeMs(ms);
            }
          }}
          onBlur={() => {
            if (draft === "" || draft === ".") {
              setDraft(formatSecondsFromMilliseconds(valueMs));
              return;
            }
            const next = Number(draft);
            if (!Number.isFinite(next)) {
              setDraft(formatSecondsFromMilliseconds(valueMs));
              return;
            }
            const clamped = Math.min(max, Math.max(min, next));
            const ms = secondsToMilliseconds(clamped);
            committedMs.current = ms;
            onChangeMs(ms);
            setDraft(formatSecondsFromMilliseconds(ms));
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
          sec
        </span>
      </div>
    </div>
  );
}

export const newTeenPattiConfigDefaults: CreateTeenPattiAdminConfigInput = {
  betting_duration_ms: 15000,
  lock_duration_ms: 1500,
  drawing_duration_ms: 5500,
  result_duration_ms: 5000,
  min_bet: "10",
  max_single_bet: "10000",
  max_round_bet: "50000",
  rake_bps: 500,
  notes: "",
  options: [
    {
      code: "DECK_A",
      name: "Hand 1",
      image_url: null,
      asset_id: null,
      display_order: 1,
      is_enabled: true,
    },
    {
      code: "DECK_B",
      name: "Hand 2",
      image_url: null,
      asset_id: null,
      display_order: 2,
      is_enabled: true,
    },
    {
      code: "DECK_C",
      name: "Hand 3",
      image_url: null,
      asset_id: null,
      display_order: 3,
      is_enabled: true,
    },
  ],
  chip_values: [10, 50, 100, 500, 1000, 5000].map((amount, index) => ({
    amount: String(amount),
    display_order: index + 1,
    is_enabled: true,
  })),
};

export function TeenPattiConfigEditor({
  initial,
  submitLabel,
  onSave,
  readOnly = false,
}: {
  initial: CreateTeenPattiAdminConfigInput;
  submitLabel: string;
  onSave: (payload: CreateTeenPattiAdminConfigInput) => Promise<void>;
  readOnly?: boolean;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CreateTeenPattiAdminConfigInput>({ defaultValues: initial });
  const deckFields = useFieldArray({ control, name: "options" });
  const chipFields = useFieldArray({ control, name: "chip_values" });
  const values = useWatch({ control }) as CreateTeenPattiAdminConfigInput;
  const [preview, setPreview] =
    useState<TeenPattiConfigValidationPreview | null>(null);
  const [error, setError] = useState("");

  async function validate(payload: CreateTeenPattiAdminConfigInput) {
    const result = await adminClient.teenPatti.validateConfig(
      sanitizeTeenPattiAdminConfigPayload(payload),
    );
    setPreview(result);
    return result;
  }

  async function submit(payload: CreateTeenPattiAdminConfigInput) {
    setError("");
    try {
      const sanitized = sanitizeTeenPattiAdminConfigPayload(payload);
      const result = await validate(sanitized);
      if (!result.valid) {
        setError(
          result.failures.length
            ? result.failures
                .map((failure) => `${failure.field}: ${failure.message}`)
                .join("; ")
            : "Resolve all validation errors before saving this configuration.",
        );
        return;
      }
      await onSave(sanitized);
    } catch (reason) {
      if (reason instanceof AdminRequestError && reason.errors?.length)
        setError(reason.errors.join("; "));
      else
        setError(
          reason instanceof Error
            ? reason.message
            : "Configuration could not be saved",
        );
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={
        readOnly ? (event) => event.preventDefault() : handleSubmit(submit)
      }
    >
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Configuration blocked</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Round timing, betting limits, and rake</CardTitle>
          <CardDescription>
            Round phase durations are shown in seconds. Rake is stored in basis
            points (500 = 5.00%).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {timingFields.map(({ name, label, min, max }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field }) => (
                <DurationSecondsField
                  id={name}
                  label={label}
                  min={min}
                  max={max}
                  disabled={readOnly}
                  valueMs={field.value}
                  onChangeMs={field.onChange}
                />
              )}
            />
          ))}
          {(["min_bet", "max_single_bet", "max_round_bet"] as const).map(
            (name) => (
              <div className="space-y-2" key={name}>
                <Label htmlFor={name}>{name.replaceAll("_", " ")}</Label>
                <Input
                  id={name}
                  inputMode="numeric"
                  disabled={readOnly}
                  {...register(name)}
                />
              </div>
            ),
          )}
          <div className="space-y-2">
            <Label htmlFor="rake_bps">Rake (basis points)</Label>
            <Input
              id="rake_bps"
              type="number"
              min={0}
              max={2000}
              disabled={readOnly}
              {...register("rake_bps", { valueAsNumber: true })}
            />
            <p className="text-xs text-slate-500">
              {Number.isFinite(values.rake_bps)
                ? formatRakePercent(values.rake_bps)
                : "0.00%"}{" "}
              house take from the pot
            </p>
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-4">
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea
              id="notes"
              rows={3}
              disabled={readOnly}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decks</CardTitle>
          <CardDescription>
            Teen Patti requires exactly three enabled decks. Highest hand wins
            the pot minus rake.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          {deckFields.fields.map((field, index) => (
            <Card className="gap-4 bg-slate-50 py-4 shadow-none" key={field.id}>
              <CardHeader className="flex flex-row items-center justify-between px-4">
                <div>
                  <CardTitle className="text-base">Deck {index + 1}</CardTitle>
                  <CardDescription>
                    {values.options?.[index]?.code || "Unconfigured"}
                  </CardDescription>
                </div>
                <Controller
                  control={control}
                  name={`options.${index}.is_enabled`}
                  render={({ field: enabled }) => (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`deck-${index}-enabled`}>Enabled</Label>
                      <Switch
                        id={`deck-${index}-enabled`}
                        checked={enabled.value}
                        disabled={readOnly}
                        onCheckedChange={enabled.onChange}
                      />
                    </div>
                  )}
                />
              </CardHeader>
              <CardContent className="space-y-4 px-4">
                <input
                  type="hidden"
                  {...register(`options.${index}.asset_id`)}
                />
                <input
                  type="hidden"
                  {...register(`options.${index}.image_url`)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      disabled={readOnly}
                      {...register(`options.${index}.code`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      disabled={readOnly}
                      {...register(`options.${index}.name`)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Display order</Label>
                    <Input
                      type="number"
                      disabled={readOnly}
                      {...register(`options.${index}.display_order`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Chip presets</CardTitle>
            <CardDescription>
              These values update the chip selector on the player panel after
              publication.
            </CardDescription>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              disabled={chipFields.fields.length >= 12}
              onClick={() =>
                chipFields.append({
                  amount: "1000",
                  display_order: chipFields.fields.length + 1,
                  is_enabled: true,
                })
              }
            >
              <Plus /> Add chip
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {chipFields.fields.map((field, index) => (
            <div
              className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_160px_auto_auto]"
              key={field.id}
            >
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  inputMode="numeric"
                  disabled={readOnly}
                  {...register(`chip_values.${index}.amount`)}
                />
              </div>
              <div className="space-y-2">
                <Label>Display order</Label>
                <Input
                  type="number"
                  disabled={readOnly}
                  {...register(`chip_values.${index}.display_order`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <Controller
                control={control}
                name={`chip_values.${index}.is_enabled`}
                render={({ field: enabled }) => (
                  <div className="flex h-9 items-center gap-2">
                    <Switch
                      checked={enabled.value}
                      disabled={readOnly}
                      onCheckedChange={enabled.onChange}
                    />
                    <Label>Enabled</Label>
                  </div>
                )}
              />
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => chipFields.remove(index)}
                >
                  <Trash2 className="text-red-600" />
                  <span className="sr-only">Remove chip</span>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validation preview</CardTitle>
          <CardDescription>
            {readOnly
              ? "Rake and enabled decks for this configuration."
              : "Verify deck setup and rake before saving."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Rake: {formatRakePercent(preview.rake_bps)}
                </Badge>
                <Badge variant="outline">
                  Decks: {preview.decks.join(", ") || "None"}
                </Badge>
                <Badge variant={preview.valid ? "success" : "destructive"}>
                  {preview.valid ? "Ready" : "Blocked"}
                </Badge>
              </div>
              {preview.failures.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Validation errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {preview.failures.map((failure) => (
                        <li key={`${failure.field}-${failure.message}`}>
                          {failure.field}: {failure.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              {readOnly
                ? "Validation preview is not available in read-only mode."
                : "Run validation to confirm this configuration is ready."}
            </p>
          )}
          {!readOnly && (
            <>
              <Separator />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void validate(sanitizeTeenPattiAdminConfigPayload(values))
                  }
                >
                  <CheckCircle2 /> Validate
                </Button>
                <Button disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save />
                  )}
                  {isSubmitting ? "Saving…" : submitLabel}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
