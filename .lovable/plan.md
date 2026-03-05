

Here's a ready-to-use prompt you can paste into your Android branch to apply all the recent changes (excluding the iOS time input CSS fix):

---

**Prompt:**

Make the following changes across the project:

**1. Toast notification system overhaul:**
- In `src/components/ui/toast.tsx`: Move the toast viewport to top-center, positioned 8px below the safe area (`top-[calc(var(--safe-area-top)+8px)]`). Change swipe direction to up. Replace default Radix animations with custom `animate-[toast-slide-in_0.3s_ease-out]` for open and `animate-[toast-slide-out_0.2s_ease-in_forwards]` for closed. Remove the close (X) button from toasts entirely. Add `relative pb-5` to the Toast root for progress bar space.
- In `src/components/ui/toaster.tsx`: Set `swipeDirection="up"` and `duration={3000}` on ToastProvider. Add a `ToastProgressBar` component that renders an absolutely positioned bar at the bottom of each toast — it's a 4px tall primary-colored bar that shrinks from full width to zero over 3000ms using a `animate-shrink-width` animation with `transform-origin: right`.
- In `src/index.css`: Add two keyframes — `toast-slide-in` (from opacity 0 + translateY(-100%) to opacity 1 + translateY(0)) and `toast-slide-out` (reverse of slide-in).
- In `src/hooks/use-toast.ts`: Set `TOAST_REMOVE_DELAY` to 3000ms.

**2. Color selection ring clipping fix:**
- In the Schedule page where the color selection buttons are rendered (both Add and Edit lesson dialogs), remove `overflow-hidden` from the color button container div and add `py-1` padding instead. This prevents the focus/selection ring (`ring-2 ring-offset-2`) on the selected color button from being clipped.

**3. Responsive time inputs in Edit Lesson dialog:**
- In the Edit Lesson dialog on the Schedule page, change the time input widths from hardcoded `w-[157px]` to `w-full` so they scale proportionally with the dialog width, matching the Add Lesson dialog behavior.

