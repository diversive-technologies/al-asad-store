'use client';

import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import {
  NOTHING_HELD,
  switchUnit,
  typedEntriesOf,
  type HeldEntries,
} from '../lib/unit-switch';
import type { Unit } from '../lib/units';
import type { MeasurementEntry } from '../schemas/measurement.schema';
import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { TypedPointEntry } from '../schemas/profile.schema';

export interface UseUnitConversionResult {
  readonly changeUnit: (next: Unit) => void;
  /** The asked points' figures as TYPED, for sending — see `typedEntriesOf`. */
  readonly typedEntries: () => readonly TypedPointEntry[];
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
  };
}
