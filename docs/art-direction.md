# Art direction v2 — immersive garden

User correction: the first version was insufficiently beautiful; use shaders, WebGL and Magic UI; remove the upper menu.

**Current visual thesis:** a cinematic moonlit garden where an Italian palazzo meets Indian dance, with midnight teal shadows, champagne gold light and coral lotus flowers.

**Current content plan:** full-screen cover with an oversized personal greeting; four visually distinct interactive scenes; a glowing sealed letter and birthday ritual. No upper header or menu. Chapter navigation stays at the bottom.

**Current interaction thesis:** actual WebGL light ribbons and luminous motes respond to pointer and touch; Magic UI Aurora Text and Shimmer Button patterns create animated type and a luminous invitation; scene transitions and the growing lotus give actions a visible result.

Acceptance for this revision: no upper menu; shader canvas initializes when WebGL is available; pointer input changes the shader; audio remains opt-in; reduced motion renders static atmosphere; lack of WebGL keeps the full postcard usable; mobile layout has no horizontal overflow.

Current cover: `assets/moonlit-garden.png`, created with the built-in ImageGen tool on 4 November 2026. The dancer is anonymous, not a portrait.

Prompt used for the current cover:

> Use case: illustration-story. Create a breathtaking cinematic fantasy garden panorama for a personal birthday web experience, wide landscape 3:2, a single coherent scene not a collage, no text anywhere. Magical twilight on an Italian palazzo terrace blended with graceful Indian palace arches. Midnight teal water, deep forest green shadows, warm glowing golden lanterns, fine luminous floating flower petals, a few pink lotus flowers in the reflective pond, grand orange trees and wisteria arch framing the right side, distant Italian hills under a luminous moon. On the far right under a beautiful arch an elegant tiny anonymous woman in a flowing coral-pink and gold Indian dance costume dancing, exquisitely graceful silhouette, no identifiable portrait. Rich dimensional cinematic digital matte painting, refined storybook realism with tactile painterly texture, premium art directed movie title backdrop, not cartoon, not vector, not flat gouache. Strong chiaroscuro, luminous mist, dreamy romantic night garden. Composition: entire left 40 percent very dark deep midnight teal negative space with only a little soft subtle foliage and mist, intentionally calm for a huge overlaid cream typographic title. Right 60 percent ornate gorgeous architecture, lanterns, flowers, dancer and reflective water. Great sense of depth and magical wonder. Color palette restrained luxurious dark teal, blackened emerald, champagne gold and dusty coral. No text, no logos, no borders, no UI elements, no watermarks.

## Original sunny scene — retained inside the dance chapter

**Visual thesis:** an intimate illustrated travel journal, painted in terracotta, olive and sun-warmed ivory, where an Italian garden meets Indian dance.

**Content plan:** a cover addressed to Sasha; four playful interactive chapters; a personal letter, birthday candles and an endless pocket of wishes.

**Interaction thesis:** a staggered cover entrance; soft page-turn reveals and chapter progress; a growing lotus and a short celebratory confetti burst. All movement respects reduced-motion preferences.

## Illustration

- Asset: `assets/sunlit-italy.png`.
- Created with the built-in ImageGen tool, 4 November 2026.
- The illustrated dancer is an anonymous fictional figure, not a portrait of Sasha.
- No external image requests are made by the site.

Prompt used:

> Use case: illustration-story. Asset type: a premium panoramic illustration for an intimate birthday postcard website, landscape 3:2. Primary request: a sunny dreamlike meeting of Italy and Indian dance, warm and joyful, editorial travel-journal art. Scene: a terracotta Tuscan villa with sage shutters and arched loggia on a sunny Italian hillside, orange and lemon branches overhead, distant cypress trees, a small lotus pond in the foreground. On the right side, one elegant tiny stylized anonymous female classical Indian dancer in a flowing warm coral and golden skirt dancing on a terrace, no portrait likeness and no identifiable face. Art direction: sophisticated hand-painted gouache and fine pencil details on warm ivory textured paper, muted warm ochre, burnt orange, soft olive, dusty pink, cream. Richly detailed image on the right two thirds, gently feathering into nearly plain ivory paper on the left third so website heading can overlap the calm area. Large warm sun, a few tiny flower petals and delicate Indian floral ornament integrated in the architecture, restrained beautiful composition. Not a UI mockup. No text, no letters, no watermark, no border, no collage. Atmospheric golden hour, generous depth, elegant European illustrated book cover.

## Typography

Cormorant Garamond for the expressive serif headings and Manrope for controls and body text. Both are served locally; their SIL Open Font Licenses are included in `assets/`.
