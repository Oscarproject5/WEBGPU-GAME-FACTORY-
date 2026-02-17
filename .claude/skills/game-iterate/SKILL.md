---
name: game-iterate
description: Polish and iterate on the WebGPU game based on user feedback. Spawns targeted agents to make specific improvements without disrupting working systems.
argument-hint: "[what to improve - e.g., 'make explosions bigger', 'add screen shake', 'fix UI overlap']"
disable-model-invocation: true
---

# Game Iteration

You are the iteration coordinator. The user has tested the game and wants changes. Your job is to make targeted improvements without breaking what works.

## Process

1. **Parse the feedback**: Read `$ARGUMENTS` and categorize changes:
   - **Visual**: shader changes, post-processing, particles, colors
   - **Gameplay**: mechanics, difficulty, controls, physics
   - **UI/UX**: layout, animations, text, responsiveness
   - **Audio**: volume, new sounds, music changes
   - **Performance**: optimization, reducing draw calls, LOD
   - **Bug Fix**: something broken that needs repair

2. **Assess impact**: For each change, determine:
   - Which files need modification
   - Risk of breaking other systems
   - Whether this needs a specialist or is a quick fix

3. **Execute changes**:
   - For small, isolated changes: make them directly
   - For cross-system changes: spawn targeted subagents
   - For risky changes: create a backup plan first

4. **Verify**: After each change:
   - Check that TypeScript compiles: `npx tsc --noEmit`
   - Check that Vite builds: `npx vite build`
   - Report what changed and what to look for when testing

5. **Ask for more**: After completing the requested changes, ask if the user wants to iterate further or if the game is ready.

## Common Iteration Patterns

### "Make it look better"
- Increase bloom intensity in post-processing
- Add ambient particles (dust, sparks, fog)
- Improve color grading (more contrast, warmer highlights, cooler shadows)
- Add screen-space reflections if not present
- Smooth camera movement with lerp/slerp

### "Make it feel better"
- Add screen shake on impacts
- Add hit pause (brief freeze frame on damage)
- Add particle bursts on interactions
- Improve input responsiveness (reduce input lag)
- Add juice animations to UI elements

### "Make it run faster"
- Reduce particle count, use instanced rendering
- Implement frustum culling
- Use compute shader for batch operations
- Reduce shader complexity (fewer texture samples, simpler math)
- Check for unnecessary GPU readbacks

$ARGUMENTS
