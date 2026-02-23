

## Root Cause

There are **two separate problems** causing the toast to be too low and have a double-animation:

### 1. Double safe-area offset
The `body` already has `padding-top: env(safe-area-inset-top)` (line 116 of `index.css`). The toast viewport then adds `top: calc(var(--safe-area-top) + 24px)` which includes the safe-area **again**. Since the toast is `position: fixed`, the body padding doesn't affect it — but the CSS variable `--safe-area-top` is still `env(safe-area-inset-top)`. So the toast is offset by safe-area + 24px from the true viewport top, which is correct for fixed positioning. The issue is actually that 24px is too much gap. Reduce to something smaller like 8px.

### 2. Two competing animations on close
`tailwindcss-animate` implements `animate-in`/`animate-out` by combining multiple CSS animation keyframes. When the toast closes, both `fade-out-80` and `slide-out-to-top-5` run as separate animations. They have slightly different timings, causing the visible "fade slightly, pause, then slide away" effect. The fix is to **remove the separate slide animations entirely** and only use the fade, OR combine them into a single custom keyframe animation that does both fade + translate in one smooth motion.

## Fix

**File: `src/components/ui/toast.tsx`**

1. **Reduce top offset** from `24px` to `8px` so the toast sits closer to the notch: `top-[calc(var(--safe-area-top)+8px)]`

2. **Remove the conflicting dual animations** — strip out all `slide-in-from-*` and `slide-out-to-*` classes and `animate-in`/`animate-out`. Replace with a single custom CSS animation class that handles both fade and translate together.

**File: `src/index.css`**

3. **Add two custom keyframes** that combine fade + translateY into one smooth animation:

```css
@keyframes toast-slide-in {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes toast-slide-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-100%); }
}
```

Then in `toast.tsx`, replace the `animate-in`/`animate-out`/`fade-out-80`/`slide-*` classes with:
- `data-[state=open]:animate-[toast-slide-in_0.3s_ease-out]`
- `data-[state=closed]:animate-[toast-slide-out_0.2s_ease-in_forwards]`

This gives **one single animation** for enter and one for exit — no more competing keyframes.

## Summary

| File | Change |
|------|--------|
| `src/components/ui/toast.tsx` | Reduce top offset to 8px; replace dual animate-in/out + slide + fade with single custom animations |
| `src/index.css` | Add `toast-slide-in` and `toast-slide-out` keyframes combining opacity + translateY |

