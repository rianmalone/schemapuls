

## Problem Found

There's a **version mismatch** between the deployed edge function and the repo code:

1. **The deployed `validate-code` function is not the same as what's in the repo.** The edge function logs show logging like `[validate-code] Action: redeem, Device: undefined...` — that logging code doesn't exist in the repo version. The deployed version also returns `{"hasAccess": true}` for the "check" action, while the repo version returns `{"success": hasAccess}`.

2. **The `Device: undefined` error** in the logs means the deployed edge function is trying to read the device ID with a different field name than what the client sends. The client sends `deviceId` (camelCase) but the deployed version likely expects `device_id` (snake_case), or vice versa.

3. **The client-side `checkServerAccess` in `App.tsx`** checks `data?.success` (line 30), but the deployed function returns `hasAccess` — so this is also misaligned.

## Fix

**1. Update the edge function** to include proper logging and return consistent field names. Ensure it destructures both `deviceId` and `device_id` to handle either format (since the Android app built with Codex may send either).

**2. Update `App.tsx` `checkServerAccess`** to check both `data?.hasAccess` and `data?.success` for compatibility, or settle on one.

**3. Redeploy the edge function** so the deployed code matches the repo.

### Edge function changes:
- Add `console.log` for debugging
- Destructure body flexibly: `const deviceIdValue = body.deviceId || body.device_id`
- Return `{ hasAccess: true/false }` for "check" (matching what the client expects)
- Keep returning `{ success: true/false }` for "redeem" (matching CodeEntry.tsx)

### App.tsx change:
- Line 30: change `data?.success` to `data?.hasAccess` to match the edge function's "check" response

