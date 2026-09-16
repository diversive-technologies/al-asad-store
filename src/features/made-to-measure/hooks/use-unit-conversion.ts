'use client';

import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { NOTHING_HELD, switchUnit, typedEntriesOf, type HeldEntries } from '../lib/unit-switch';
import type { TypedEntry, Unit } from '../lib/units';
import type { MeasurementEntry } from '../schemas/measurement.schema';
import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { TypedPointEntry } from '../schemas/profile.schema';

/** A figure the studio PUT in a field, and what it was originally typed as. */
export interface PlacedFigure {
  readonly pointId: string;
  /** The figure as the customer first typed it, in the unit they typed it in. */
  readonly typed: TypedEntry;
  /** What was actually written into the field, which may be a conversion of it. */
  readonly shown: string;
}

export interface UseUnitConversionResult {
  readonly changeUnit: (next: Unit) => void;
  /** The asked points' figures as TYPED, for sending — see `typedEntriesOf`. */
  readonly typedEntries: () => readonly TypedPointEntry[];
  /**
   * Records figures the STUDIO put in fields rather than the customer.
   *
   * Without it a figure restored from a saved profile is read as freshly typed in
   * whichever unit was showing, so the next switch converts a conversion: 18.25 in
   * saved, shown as 46.4 cm, comes back as 18.27 — and that is the figure the
   * review shows and the server records. Cloth is cut from it.
   */
  readonly remember: (figures: readonly PlacedFigure[]) => void;
}

export interface ConvertedLists {
  /** The points asked: what is sent. */
  readonly points: readonly MeasurementPoint[];
  /** The whole list on screen; every list shown is remembered for a switch. */
  readonly served: readonly MeasurementPoint[];
}

/**
 * Switching between inches and centimetres without ever rewriting what was typed
 * — in every field the form holds, including figures kept from another style, a
 * finishing choice or the other way of measuring. The rules are `switchUnit`'s
 * and `typedEntriesOf`'s; this keeps what they need between switches.
 */
export function useUnitConversion(
  form: UseFormReturn<MeasurementEntry>,
  lists: ConvertedLists,
  unit: Unit,
  setUnit: (next: Unit) => void,
): UseUnitConversionResult {
  const held = useRef<HeldEntries>(NOTHING_HELD);
  /* STATE-04 — every point any list has shown in this studio, by id, so a switch
     shows a figure kept from another list at a value its own field accepts when
     that list comes back. Written after commit; read only in a switch. */
  const seen = useRef<ReadonlyMap<string, MeasurementPoint>>(new Map());
  useEffect(() => {
    seen.current = new Map([
      ...seen.current,
      ...lists.served.map((point) => [point.id, point] as const),
    ]);
  }, [lists.served]);

  return {
    changeUnit: (next: Unit): void => {
      if (next === unit) return;
      const everyPoint = [...seen.current.values()];
      const switched = switchUnit(everyPoint, form.getValues(), held.current, unit, next);
      held.current = switched.held;
      for (const [id, value] of Object.entries(switched.display)) form.setValue(id, value);
      setUnit(next);
    },
    typedEntries: () => typedEntriesOf(lists.points, form.getValues(), held.current, unit),
    remember: (figures) => {
      const typed = { ...held.current.typed };
      const shown = { ...held.current.shown };
      for (const figure of figures) {
        typed[figure.pointId] = figure.typed;
        shown[figure.pointId] = figure.shown;
      }
      held.current = { typed, shown };
    },
  };
}
