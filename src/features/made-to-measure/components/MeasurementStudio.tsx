'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { takenIds } from '../lib/entries';
import { GARMENTS, MEASUREMENTS, type GarmentId, type MeasurementId } from '../lib/garments';
import { convertEntry, DEFAULT_UNIT, type Unit } from '../lib/units';
import {
  buildMeasurementSchema,
  EMPTY_ENTRY,
  type MeasurementEntry,
} from '../schemas/measurement.schema';
import { GarmentFieldset } from './GarmentFieldset';
import { GarmentFlat } from './GarmentFlat';
import { GarmentTabs } from './GarmentTabs';
import { MeasurementCaption } from './MeasurementCaption';
import { MeasurementErrorSummary } from './MeasurementErrorSummary';
import { MeasurementProgress } from './MeasurementProgress';
import { UnitToggle } from './UnitToggle';

/**
 * §34.6 — the drawing and the form, in step, with the FORM leading.
 *
 * Focusing a field brings up that garment and marks the measurement on it, which
 * answers the question a customer actually has ("where do I put the tape?") at
 * the moment they have it. Clicking a mark focuses its field.
 *
 * The garment is DERIVED from the active measurement rather than held beside it.
 * Two pieces of state that both decide which garment is shown can disagree, and
 * the one that disagrees is always the drawing.
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
  const [browsing, setBrowsing] = useState<GarmentId>('KAMEEZ');
  const [activeId, setActiveId] = useState<MeasurementId | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const wantsSummaryFocus = useRef(false);
  // FORM-06, synchronously — `isSubmitting` only flips after a re-render.
  const inFlight = useRef(false);

  const form = useForm<MeasurementEntry>({
    resolver: zodResolver(buildMeasurementSchema(unit)),
    defaultValues: EMPTY_ENTRY,
    /* Nothing goes red until the customer tries to save. `onBlur` marked every
       field invalid the moment it was left, so tabbing down the form painted the
       page red before a single measurement had been taken. */
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    /* The SUMMARY takes focus, not the first bad field. React Hook Form focuses
       that field by default and runs after the effect below, so it silently won
       — and landing on one empty box says nothing about the other twelve. */
    shouldFocusError: false,
  });

  /* `useWatch` rather than `form.watch()`: the latter returns a fresh function
     each render, which makes React Compiler skip memoising this component. */
  const values = useWatch({ control: form.control });

  const active = MEASUREMENTS.find((measurement) => measurement.id === activeId) ?? null;
  const garment = active?.garment ?? browsing;

  /* One rule, in one place, so the marks, the counter and the validation cannot
     disagree about what "measured" means. */
  const filledIds = takenIds(values, unit);

  function changeUnit(next: Unit): void {
    if (next === unit) return;
    /* ADR 16: the record is the millimetres, so the toggle round-trips through
       them rather than scaling the prettier number on screen. */
    for (const measurement of MEASUREMENTS) {
      form.setValue(measurement.id, convertEntry(form.getValues(measurement.id) ?? '', unit, next));
    }
    setUnit(next);
  }

  function activate(id: MeasurementId): void {
    setActiveId(id);
    form.setFocus(id);
  }

  function browse(next: GarmentId): void {
    setBrowsing(next);
    // Or the drawing would jump straight back to the measurement in hand.
    setActiveId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    inFlight.current = true;
    /* Intent is recorded BEFORE the submit. React re-renders with the new errors
       before the promise settles, so a flag set in `.finally` arrived one render
       too late and the effect that reads it had already run. */
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

  const errorIds = MEASUREMENTS.filter((measurement) => form.formState.errors[measurement.id]).map(
    (measurement) => measurement.id,
  );

  /* Un-keyed on purpose: it runs after every render and spends a one-shot flag
     once the summary exists, so focus lands there exactly once per failed submit
     and never jumps back while the fields are being fixed. */
  useEffect(() => {
    if (!wantsSummaryFocus.current || errorIds.length === 0) return;
    wantsSummaryFocus.current = false;
    summaryRef.current?.focus();
  });

  const unitSuffix = unit === 'IN' ? t.unitShortInches : t.unitShortCentimetres;
  const entered = active !== null && filledIds.has(active.id) ? Number(values[active.id]) : null;

  return (
    <div className="mm-scene">
      <div className="mm-scene-stage">
        <GarmentTabs current={garment} onChoose={browse} messages={messages} />

        <div className="mm-flat-frame">
          <GarmentFlat
            garment={garment}
            activeId={activeId}
            filledIds={filledIds}
            labels={t.points}
            onSelect={activate}
          />
        </div>

        {/* Under the drawing, not over it. Line art has no dark ground to carry
            text, so a caption laid on top fights the very lines it explains. */}
        <div className="mm-scene-note">
          <MeasurementCaption
            active={active}
            entered={entered}
            unit={unit}
            messages={messages}
            locale={locale}
          />
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
              <MeasurementProgress
                done={filledIds.size}
                total={MEASUREMENTS.length}
                messages={messages}
                locale={locale}
              />
            </div>

            {errorIds.length === 0 ? null : (
              <MeasurementErrorSummary
                ids={errorIds}
                onJump={activate}
                summaryRef={summaryRef}
                messages={messages}
              />
            )}

            {GARMENTS.map((id) => (
              <GarmentFieldset
                key={id}
                garment={id}
                form={form}
                unit={unit}
                unitSuffix={unitSuffix}
                activeId={activeId}
                onActivate={setActiveId}
                messages={messages}
                locale={locale}
              />
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
