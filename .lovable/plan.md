

## Problem

The toast appears too low on iPhone because the `slide-in-from-top-full` animation starts from `translateY(-100%)` — which is relative to the **viewport top**, not the toast viewport's position. So the toast first slides to where -100% puts it (near the notch), then snaps down to its actual position at `top: safe-area + 24px + p-4`. This creates a "double swipe" effect: one animation to enter, then visually it jumps.

The `slide-out-to-top-full` exit has the same mismatch — it slides to viewport top first, creating two visual movements.

## Fix

**File: `src/components/ui/toast.tsx`**

1. **Remove the `p-4` padding from the viewport** — this adds 16px of extra offset on top of the already-accounted `safe-area + 24px`. Change to `p-4 pt-0` (keep side/bottom padding, remove top padding that pushes toasts down).

2. **Replace `slide-in-from-top-full` / `slide-out-to-top-full`** with smaller translate animations that don't overshoot. Use `slide-in-from-top-5` and `slide-out-to-top-5` (or a custom small translateY like `-20px`) so the toast slides in a short distance from above its resting position, rather than flying from the very top of the screen.

Specifically in the `toastVariants` cva string (line 26), change:
- `data-[state=closed]:slide-out-to-top-full` → `data-[state=closed]:slide-out-to-top-5`
- `data-[state=open]:slide-in-from-top-full` → `data-[state=open]:slide-in-from-top-5`

And change the viewport className (line 17) top padding from `p-4` to `px-4 pb-4` so there's no extra top spacing pushing the toast lower than intended.

## Summary

| File | Change |
|------|--------|
| `src/components/ui/toast.tsx` | Remove top padding from viewport; use short slide animations instead of full-screen ones |

