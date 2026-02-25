

## Problem

On iPhone, the native `type="time"` inputs render much taller and bigger than intended. iOS applies its own styling to time inputs, ignoring the `h-10` (40px) constraint. On desktop they look fine and proportional, but on mobile they blow up in size.

Both dialogs (Add and Edit) have the exact same code for time inputs, so both are affected on phone. The desktop screenshots show the desired look.

## Root Cause

iOS Safari applies large default styling to `input[type="time"]` elements, including extra padding and a larger tap target. The `h-10` class is not sufficient to override this on iOS. The input needs explicit `-webkit-appearance: none` and tighter control over padding and font size to prevent iOS from inflating it.

## Fix

### File: `src/index.css`

Add iOS-specific styling for time inputs to force them to match the height and proportions of regular text inputs:

```css
input[type="time"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  min-height: 0;
  height: 2.5rem; /* h-10 = 40px */
  font-size: 0.875rem;
  line-height: 1.25rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
```

This goes alongside the existing `input[type="time"]::-webkit-calendar-picker-indicator` rules already in `index.css`.

### No changes needed to `Schedule.tsx`

The HTML structure and classes are already identical between both dialogs. The fix is purely CSS -- forcing iOS to respect the same dimensions as regular inputs.

