

## Plan: UI Refinements (No Progress Bar)

### 1. Toast Notifications — Positioning, Swipe Up, Close Button

**Files:** `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx`

- **Swipe direction:** Change `ToastProvider` to use `swipeDirection="up"`. Update swipe animation classes on the toast variant to use vertical (`slide-out-to-top-full` instead of `slide-out-to-right-full` for swipe end).
- **Close button:** Make the `X` always visible (remove `opacity-0 group-hover:opacity-100`). Make it bigger (`h-5 w-5`), add a red circular background (`bg-destructive rounded-full p-0.5 text-white`). Remove hover opacity transition.
- **Padding:** Reduce toast padding from `p-6 pr-8` to `p-4 pr-8`, and `pb-7` to `pb-5` for a more compact height.

### 2. Edit Lesson — Dialog Instead of Full Page

**File:** `src/pages/Schedule.tsx`

- Add an edit dialog (similar to the add dialog) with state: `isEditClassOpen`, `editClass` (holds the class data being edited), and `editClassDay` (which day it's on).
- When clicking a lesson card (both week and day view), instead of `navigate(/edit-class/${id})`, open the edit dialog with that class's data pre-filled.
- The edit dialog contains: name, room, start time, end time (same layout as add), plus "Spara ändringar" and "Radera lektion" buttons. Reuse the save/delete logic from `EditClass.tsx`.
- `EditClass.tsx` remains untouched.

### 3. Add Lesson Button — 80% Opacity on Background Only

**File:** `src/pages/Schedule.tsx` (line ~802-807)

Change the floating button so the blue background is 80% opacity but the plus icon stays fully opaque:
- Replace `bg-primary` with `bg-primary/80` on the button.
- The `Plus` icon inherits full opacity naturally since it's a child element and `bg-primary/80` only affects the background color's alpha.

### 4. Time Inputs — Equal Split Grid Layout

**Files:** `src/pages/Schedule.tsx` (add dialog, lines 832-852), and the new edit dialog

Replace the current `flex items-start gap-[85px]` / `gap-[70px]` with `w-[100px]` inputs → use `grid grid-cols-2 gap-4` where each input is full-width within its column. Remove the fixed `w-[100px]` from the inputs. This makes start and end time fields equal width, matching the other full-width inputs, while being nicely split side by side.

### 5. Summary of Files Changed

| File | Changes |
|------|---------|
| `src/components/ui/toast.tsx` | Swipe animations, close button styling, padding |
| `src/components/ui/toaster.tsx` | `swipeDirection="up"` on ToastProvider |
| `src/pages/Schedule.tsx` | Edit dialog, add button opacity, time input grid layout |

No changes to: `EditClass.tsx`, `Upload.tsx`, `tailwind.config.ts`, or any other files.

