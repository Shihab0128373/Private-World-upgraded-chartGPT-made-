# Private World upgrade — test checklist

## Phase 1 — Museum
1. Create a room and enter the museum. Confirm the player starts in the photo-free foyer.
2. Walk through the open entrance into the four signed gallery sections.
3. Confirm all 29 seeded photos load and can be opened by clicking/tapping them.
4. Check the high ceiling, columns, sculptures, planters, benches, rugs, floor inlays and frame lighting.
5. Open Photos and upload/move a photo. Confirm the 16-per-section capacity is shown and photos refresh for both players.

## Phase 2 — Collaborative art
1. Open the room on two devices/browsers and press **Art** on both.
2. Draw from each device. Confirm strokes appear on the other device while drawing.
3. Change colour and brush size; test eraser, Undo and Clear.
4. Press **Hang in museum**. Close the studio and confirm the new artwork appears in the museum photo collection for both players.
5. Restart/redeploy with the Render persistent disk attached and confirm the saved artwork remains.

## Phase 3 — Garden and circuit
1. Both players travel to the Garden. Open **Race** and select different vehicle styles.
2. Start a race. Confirm both clients receive the same server countdown and are placed at the start line.
3. Drive with WASD on desktop or the existing joystick on mobile. Confirm each player sees the other vehicle moving.
4. Complete the four checkpoints twice. Confirm the server reports checkpoint progress and finish times, then displays the winner/results.
5. Press **Rematch** and repeat. Try starting while the other player is outside the Garden; the server should reject the request.

## Regression / mobile
1. Verify Create Room, invite link/code, Join Room, reconnect/resume and the two-player limit.
2. Verify text chat, voice controls, gestures, character customization, Photos, house travel and existing movement/look controls.
3. Test a narrow mobile viewport in portrait and landscape. Check the joystick, touch look, Art canvas pointer drawing, photo viewer and Race panel.
4. Test Graphics = Low on a phone. Check frame rate and verify no extra shadow maps are required for the museum decoration.

## Validation performed here
- `node --check` passed for `server/index.js` and every `public/js/*.js` file.
- Static HTML check passed: all new feature element IDs exist and no duplicate IDs were found.
- Full browser / two-device / Render runtime testing still needs to be performed after deployment; dependencies were not installed in this environment.
