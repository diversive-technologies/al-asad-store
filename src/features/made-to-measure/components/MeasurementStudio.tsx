'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import {
  MEASUREMENT_POINTS,
  MEASUREMENT_REGIONS,
  pointsInRegion,
  type MeasurementPointId,
} from '../lib/measurement-points';
import { convertEntry, DEFAULT_UNIT, fromMm, UNITS, type Unit } from '../lib/units';
import {
  buildMeasurementSchema,
  EMPTY_ENTRY,
  type MeasurementEntry,
} from '../schemas/measurement.schema';
import { MeasurementField } from './MeasurementField';

/**
 * The scene is WebGL and several hundred kilobytes of it. It has no business in
 * the server render, or in any other route's bundle (PERF-06).
 */
const MeasurementStage = dynamic(
  () => import('./MeasurementStage').then((module) => ({ default: module.MeasurementStage })),
  { ssr: false, loading: () => <div className="mm-stage-loading" /> },
);

/**
 * §34.6 — the model and the form, in step, with the FORM leading.
 *
 * Focusing a field turns the mannequin and brings the camera in on that
 * measurement, which answers the question a customer actually has ("where does
 * the tape go?") at the moment they have it. Clicking a marker focuses its
 * field. The form keeps order, progress and errors — a figure makes a poor
 * progress bar.
 */
export function MeasurementStudio({
  messages,
  locale,
}: {
  readonly messages: Messages;
  readonly locale: Locale;
}) {
  const t = messages.madeToMeasure;
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const [activePointId, setActivePointId] = useState<MeasurementPointId | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const wantsSummaryFocus = useRef(false);
  // FORM-06, synchronously — `isSubmitting` only flips after a re-render.
  const inFlight = useRef(false);

  const form = useForm<MeasurementEntry>({
    resolver: zodResolver(buildMeasurementSchema(unit)),
    defaultValues: EMPTY_ENTRY,
    /*
     * Nothing goes red until the customer tries to save.
     *
     * `onBlur` marked every field invalid the moment it was left, so tabbing
     * down the form — or clicking one field and then the next — painted the page
     * red before a single measurement had been taken. All thirteen are required,
     * so "empty" and "wrong" looked identical, and the form scolded people for
     * work they had not done yet. After a failed submit, `onChange` clears each
     * error as it is actually fixed.
     */
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  /* `useWatch` rather than `form.watch()`: the latter returns a fresh function
     each render, which makes React Compiler skip memoising this component. */
  const values = useWatch({ control: form.control });

  /* A point counts as measured once it holds a value the bounds accept, so the
     markers and the counter agree with the validation rather than each other. */
  const filledIds = new Set(
    MEASUREMENT_POINTS.filter((point) => {
      const raw = values[point.id];
      if (raw === undefined || raw.trim() === '') return false;
      const parsed = Number(raw);
      return (
        Number.isFinite(parsed) &&
        parsed >= fromMm(point.minMm, unit) &&
        parsed <= fromMm(point.maxMm, unit)
      );
    }).map((point) => point.id),
  );

  function changeUnit(next: Unit): void {
    if (next === unit) return;
    /* ADR 16: the record is the millimetres, so the toggle round-trips through
       them rather than scaling the prettier number on screen. */
    for (const point of MEASUREMENT_POINTS) {
      form.setValue(point.id, convertEntry(form.getValues(point.id) ?? '', unit, next));
    }
    setUnit(next);
  }

  function activate(pointId: MeasurementPointId): void {
    setActivePointId(pointId);
    form.setFocus(pointId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    inFlight.current = true;
    /* Intent is recorded BEFORE the submit, not after it. React re-renders with
       the new errors before the promise settles, so a flag set in `.finally`
       arrived one render too late and the effect that reads it had already run
       and found nothing. */
    wantsSummaryFocus.current = true;
    void form
      .handleSubmit(() => {
        wantsSummaryFocus.current = false;
        setIsReviewing(true);
      })(event)
      .finally(() => {
        inFlight.current = false;
      });
  }

  const errorIds = MEASUREMENT_POINTS.filter((point) => form.formState.errors[point.id]).map(
    (point) => point.id,
  );

  /* Deliberately un-keyed: it runs after every render and spends a one-shot
     flag once the summary actually exists, so focus lands there exactly once
     per failed submit and never jumps back while the fields are being fixed. */
  useEffect(() => {
    if (!wantsSummaryFocus.current || errorIds.length === 0) return;
    wantsSummaryFocus.current = false;
    summaryRef.current?.focus();
  });

  const activePoint = MEASUREMENT_POINTS.find((point) => point.id === activePointId) ?? null;

  /* I18N-06: a figure and its unit are assembled by the copy registry, never by
     concatenation. */
  const readout =
    activePoint === null || !filledIds.has(activePoint.id)
      ? null
      : formatTemplate(t.readout, {
          value: formatNumber(Number(values[activePoint.id]), locale),
          unit: unit === 'IN' ? t.unitShortInches : t.unitShortCentimetres,
        });

  const measured = filledIds.size;

  return (
    <div className="mm-scene">
      <div className="mm-scene-stage">
        <MeasurementStage activePointId={activePointId} filledIds={filledIds} onSelect={activate} />

        {/* Over the scene rather than in it: text drawn into WebGL is expensive,
            unselectable, and invisible to assistive technology. */}
        <div className="mm-scene-overlay">
          {activePoint === null ? (
            <p className="mm-scene-idle">{t.figureHint}</p>
          ) : (
            <div className="mm-scene-caption">
              <p className="mm-scene-name">{t.points[activePoint.id].label}</p>
              <p className="mm-scene-how">
                {activePoint.kind === 'GIRTH' ? t.girthHint : t.lengthHint}
              </p>
              {readout === null ? null : <p className="mm-scene-readout">{readout}</p>}
            </div>
          )}

          <p className="mm-scene-drag">{t.dragHint}</p>
        </div>
      </div>

      <div className="mm-scene-panel">
        <div className="mm-panel-inner">
          <nav aria-label={t.pageTitle} className="mm-crumbs">
            <Link href={ROUTES.home}>{messages.catalogue.breadcrumbHome}</Link>
            <span aria-hidden>/</span>
            <span>{t.pageTitle}</span>
          </nav>

          <h1 className="mm-title">{t.pageTitle}</h1>
          <p className="mm-lead">{t.pageLead}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-10 flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <UnitToggle unit={unit} onChange={changeUnit} messages={messages} />

              <div className="min-w-40 flex-1">
                <p className="text-fg-muted mb-1.5 text-xs tabular-nums">
                  {formatTemplate(t.progress, {
                    done: formatNumber(measured, locale),
                    total: formatNumber(MEASUREMENT_POINTS.length, locale),
                  })}
                </p>
                <div className="bg-surface-strong rounded-pill h-px overflow-hidden">
                  <div
                    className="bg-accent-400 rounded-pill h-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{
                      inlineSize: `${String((measured / MEASUREMENT_POINTS.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {errorIds.length === 0 ? null : (
              <div
                ref={summaryRef}
                tabIndex={-1}
                role="alert"
                className="border-danger-500/40 bg-danger-500/10 rounded-card border p-4"
              >
                <h2 className="text-danger-500 text-sm font-medium">{t.errorSummaryTitle}</h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {errorIds.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          activate(id);
                        }}
                        className="text-fg-muted hover:text-fg cursor-pointer text-xs underline"
                      >
                        {t.points[id].label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {MEASUREMENT_REGIONS.map((region) => (
              <fieldset key={region} className="flex flex-col gap-3">
                <legend className="text-fg-muted border-border mb-3 w-full border-b pb-2 text-xs tracking-[0.18em] uppercase">
                  {t.regions[region]}
                </legend>

                {pointsInRegion(region).map((point) => (
                  <MeasurementField
                    key={point.id}
                    id={point.id}
                    label={t.points[point.id].label}
                    instruction={t.points[point.id].instruction}
                    unitSuffix={unit === 'IN' ? t.unitShortInches : t.unitShortCentimetres}
                    error={
                      form.formState.errors[point.id] === undefined
                        ? undefined
                        : formatTemplate(t.outOfRange, {
                            min: formatNumber(fromMm(point.minMm, unit), locale),
                            max: formatNumber(fromMm(point.maxMm, unit), locale),
                          })
                    }
                    isActive={point.id === activePointId}
                    registration={form.register(point.id)}
                    onActivate={() => {
                      setActivePointId(point.id);
                    }}
                  />
                ))}
              </fieldset>
            ))}

            {/* §34.7 / Risk 8 — cloth gets cut, so the notice sits with the
                action rather than in terms nobody reads afterwards. */}
            <p className="text-fg-muted text-xs text-balance">{t.cutNotice}</p>

            <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
              {t.saveCta}
            </Button>

            {isReviewing ? (
              <p role="status" className="text-success-500 text-sm">
                {t.savedNotice}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

function UnitToggle({
  unit,
  onChange,
  messages,
}: {
  readonly unit: Unit;
  readonly onChange: (next: Unit) => void;
  readonly messages: Messages;
}) {
  const t = messages.madeToMeasure;
  const label: Readonly<Record<Unit, string>> = { IN: t.unitInches, CM: t.unitCentimetres };

  return (
    <fieldset>
      <legend className="text-fg-muted mb-1.5 text-xs">{t.unitLabel}</legend>
      <div className="border-border rounded-pill inline-flex border p-0.5">
        {UNITS.map((option) => (
          <label
            key={option}
            className={cn(
              'rounded-pill cursor-pointer px-3 py-1 text-xs transition-colors duration-200',
              'has-[:focus-visible]:ring-accent-400 has-[:focus-visible]:ring-2',
              'motion-reduce:transition-none',
              option === unit ? 'mm-unit-on' : 'text-fg-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              name="measurement-unit"
              value={option}
              checked={option === unit}
              onChange={() => {
                onChange(option);
              }}
              className="sr-only"
            />
            {label[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
