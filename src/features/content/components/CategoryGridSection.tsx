import Image from 'next/image';
import Link from 'next/link';

import type { CategoryGridSection as CategoryGridSectionData } from '../schemas/homepage.schema';

export interface CategoryGridSectionProps {
  section: CategoryGridSectionData;
}

/**
 * Tiles into filtered catalogue views. The hrefs are built by the backend from
 * the same filter vocabulary the listing page reads (section 28.1), so a tile
 * cannot point at a filter that does not exist.
 */
export function CategoryGridSection({ section }: CategoryGridSectionProps) {
  if (section.tiles.length === 0) return null;

  return (
    <section className="page-shell flex flex-col gap-4 py-12">
      <h2 className="text-fg text-xl font-semibold">{section.title}</h2>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {section.tiles.map((tile) => (
          <li key={tile.id}>
            <Link
              href={tile.href}
              className="group rounded-card relative flex aspect-square items-end overflow-hidden"
            >
              <Image
                src={tile.imageUrl}
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              <span className="bg-media-scrim/35 absolute inset-0" aria-hidden />
              {/* I18N-04: `start-3` is logical, so the label hugs the reading edge. */}
              <span className="text-on-media relative start-3 pb-3 text-sm font-medium">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
