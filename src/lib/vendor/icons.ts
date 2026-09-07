/**
 * SSOT-08 — THE icon surface. A third-party library used in more than three
 * files is re-exported through a project-owned module, so swapping it is a
 * one-file change instead of forty.
 *
 * I18N-05: directional glyphs (chevrons, arrows) must mirror with `dir`. Call
 * sites apply `rtl:rotate-180`; non-directional glyphs (bag, heart, search)
 * must not mirror.
 */
export {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  Loader2,
  LogOut,
  Menu,
  Minus,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Sun,
  User,
  Trash2,
  X,
} from 'lucide-react';
