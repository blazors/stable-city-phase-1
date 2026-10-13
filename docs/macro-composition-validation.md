# Stage 4 macro composition

Stage 4 keeps the locked StableCity core, river equations, four bridges and metropolitan world boundary unchanged. The Overview camera retreats to show both river banks, the central park corridor, the two secondary skyline peaks and the softened green city edge in one frame. Linear scene fog and the water distance haze receive the same Overview-only distance compensation; Mega Showcase keeps its previous camera and fog behavior.

Outer density is still deterministic. Selected non-garden, non-tower parcels replace one generic mass with two smaller offset masses; the result is 288 outer buildings for the default and validation seeds, compared with the 291-building Stage 3 baseline. The small net reduction comes from reserving the continuous northern green buffer, while the paired parcels add local building-group rhythm. Each resulting mass owns one aligned roof and terrace. The northern buffer and central park clearing prevent the additional rhythm from filling every void.

Quality presets never remove land, roads, parks, bridges or base buildings. Balanced and Low only use stable prefix samples for trees, windows and waterfront lights; Low also removes non-tower roof terraces. This keeps the city silhouette and navigation landmarks stable while reducing peripheral detail.

Automated validation covers four seeds, protected-core and river clearance, bridge spans, density budget, attached roofs and terraces, northern green buffer, two-building parcel presence, wide Overview framing, camera far/orbit bounds, fog compensation and quality-detail contracts. Browser validation must still inspect Overview in clear day/sunset/night and haze, plus Mega day/night, because passing geometry and projection checks does not establish visual quality.
