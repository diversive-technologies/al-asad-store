/**
 * What to say under a field that has a problem.
 *
 * Two sources, one voice: the field's own range (an affordance the browser can
 * state for itself) and a finding from the server (the authority, §34.7). The
 * server sends a REASON, never a sentence; the words are ours and the customer's
 * language's.
 *
 * MOD-04 — pure.
 */

import type { Locale } from '@/i18n/locales';
import type { MeasurementPointId } from '@/lib/domain/ids';
import { assertNever } from '@/lib/result';
import { formatList, formatNumber, formatTemplate } from '@/lib/utils/format';

import type { CaptureSource } from '../schemas/measurement-set.schema';
import type { Finding } from '../schemas/profile.schema';
import { enteredBounds, writtenOtherWay } from './conversion';
import type { StudioPoint } from './studio-set';
import { unitSuffix, type Unit } from './units';

/** A finding from the server, or the field's own range. */
export type FieldProblem = Finding | 'RANGE';

export interface ProblemCopy {
  readonly outOfRange: string;
  readonly findingRequired: string;
  readonly findingUnreadable: string;
  readonly findingOrder: string;
  readonly findingOrderBelow: string;
  readonly findingOrderAbove: string;
  readonly findingDeviation: string;
  /* Off a card the fix is to the figure copied, so nothing ever says "measure". */
  readonly findingOrderCard: string;
  readonly findingOrderBelowCard: string;
  readonly findingOrderAboveCard: string;
  readonly findingDeviationCard: string;
  readonly findingLooksWhole: string;
  readonly findingLooksWholeCard: string;
  readonly findingLooksHalf: string;
  readonly findingLooksHalfCard: string;
  readonly checkStale: string;
  readonly unitShortInches: string;
  readonly unitShortCentimetres: string;
}

/** What the words depend on besides the problem itself. */
export interface ProblemContext {
  readonly unit: Unit;
  readonly locale: Locale;
  /** The figures as typed, to tell one written the other way. */
  readonly values: Readonly<Record<string, string | undefined>>;
  /** Off a card the fix is to the figure copied, not to the tape. */
  readonly source: CaptureSource;
}

/*
 * A figure out of range is often one written the OTHER way — a whole chest where
 * the half is read, a card's half where the whole is. Said so, rather than the
 * bare range, because the fix is to halve or double it, not to measure again.
 */
function rangeText(point: StudioPoint, context: ProblemContext, copy: ProblemCopy): string {
  const onCard = context.source === 'TAILOR_CARD';
  const otherWay = writtenOtherWay(point, context.values[point.id] ?? '', context.unit);
  if (otherWay === 'LOOKS_WHOLE') return onCard ? copy.findingLooksWholeCard : copy.findingLooksWhole;
  if (otherWay === 'LOOKS_HALF') return onCard ? copy.findingLooksHalfCard : copy.findingLooksHalf;

  const { min, max } = enteredBounds(point, context.unit);
  return formatTemplate(copy.outOfRange, {
    min: formatNumber(min, context.locale),
    max: formatNumber(max, context.locale),
    unit: unitSuffix(context.unit, copy),
  });
}

/* A rule need not say which way a figure is wrong; the words then say only that
   the two do not agree. */
function orderTemplate(
  direction: Finding['direction'],
  copy: ProblemCopy,
  onCard: boolean,
): string {
  switch (direction) {
    case 'ABOVE':
      return onCard ? copy.findingOrderAboveCard : copy.findingOrderAbove;
    case 'BELOW':
      return onCard ? copy.findingOrderBelowCard : copy.findingOrderBelow;
    case null:
      return onCard ? copy.findingOrderCard : copy.findingOrder;
    default:
      return assertNever(direction);
  }
}

function findingText(
  finding: Finding,
  rangeFallback: () => string,
  related: string,
  copy: ProblemCopy,
  onCard: boolean,
): string {
  switch (finding.reason) {
    case 'OUT_OF_RANGE':
      return rangeFallback();
    case 'UNREADABLE':
      return copy.findingUnreadable;
    case 'REQUIRED':
      return copy.findingRequired;
    case 'ORDER':
      // With no measurement on this page to name, it is simply an unusual figure.
      return related === ''
        ? deviationText(copy, onCard)
        : formatTemplate(orderTemplate(finding.direction, copy, onCard), { related });
    case 'DEVIATION':
      return deviationText(copy, onCard);
    /* About the list, not the figure — `judgeCheck` turns these into the page's
       own notice before any field is asked. */
    case 'UNKNOWN_POINT':
    case 'POINT_NOT_ASKED':
    case 'OPTION_UNKNOWN':
    case 'OPTION_NOT_APPLICABLE':
    case 'SET_VERSION_UNKNOWN':
    case 'SET_VERSION_SUPERSEDED':
      return copy.checkStale;
    default:
      return assertNever(finding.reason);
  }
}

const deviationText = (copy: ProblemCopy, onCard: boolean): string =>
  onCard ? copy.findingDeviationCard : copy.findingDeviation;

/** The names of the measurements a finding is also about, as this page's list has them. */
export function relatedLabels(finding: Finding, points: readonly StudioPoint[]): string[] {
  return finding.relatedPoints.flatMap((id) => {
    const label = points.find((other) => other.id === id)?.label;
    return label === undefined ? [] : [label];
  });
}

export function describeProblems(
  points: readonly StudioPoint[],
  problems: ReadonlyMap<MeasurementPointId, FieldProblem>,
  context: ProblemContext,
  copy: ProblemCopy,
): ReadonlyMap<MeasurementPointId, string> {
  const described = new Map<MeasurementPointId, string>();

  for (const point of points) {
    const problem = problems.get(point.id);
    if (problem === undefined) continue;
    const range = (): string => rangeText(point, context, copy);
    if (problem === 'RANGE') {
      described.set(point.id, range());
      continue;
    }
    // I18N-06: several related measurements are a LIST, joined by the language.
    const related = formatList(relatedLabels(problem, points), context.locale);
    described.set(
      point.id,
      findingText(problem, range, related, copy, context.source === 'TAILOR_CARD'),
    );
  }

  return described;
}
