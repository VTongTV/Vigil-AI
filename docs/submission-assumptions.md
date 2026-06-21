# assumptions

> vigilai — ai-powered traffic violation detection for bengaluru traffic police
> flipkart gridlock 2.0, round 2, track 3

---

1. single-image processing is sufficient because 90% of cctv enforcement systems capture frames, not streams — temporal analysis adds complexity without core detection gain.

2. 4gb vram constraint is a feature, not a limitation — it forces lean model selection (yolov8n) that runs 3-5× faster than larger variants and deploys on ₹25k edge devices instead of ₹2l server gpus.

3. on-demand plate model loading assumes violation density is <15% of images — the load-infer-unload cycle fires rarely enough that the ~200ms overhead is negligible in practice.

4. head-region spatial association (top 30%) assumes overhead and 45° camera angles typical of indian traffic intersections — anatomical proportions are consistent across these viewing geometries.

5. iou threshold of 0.15 for helmet association is deliberately low — indian plate/helmet bboxes from yolov8n are often loosely fitted. a higher threshold would miss valid detections.

6. helmet model trained on indian traffic data generalizes well — bengaluru helmet styles (half-face, open-face, modular) are well-represented in the training distribution.

7. sqlite is sufficient for hackathon scope (thousands of violations) with clear migration path to postgresql for production — zero config means zero demo setup friction.

8. confidence discount factors (0.7× seatbelt, 0.75× stop-line, 0.8× wrong-side) assume conservative enforcement posture — better to under-promise and over-deliver on accuracy.

9. zone-based heuristics for parking and wrong-side assume per-camera calibration is a one-time cost (~15 min/junction) — traffic police already maintain camera positioning records.

10. human-in-the-loop is not a compromise but the correct architecture — fully automated challans without officer approval create legal liability under indian evidence law.

11. rapidocr on cpu (4 threads) is fast enough — indian plates are short (8-10 chars), the regex validator post-filters garbage, keeping ocr latency under 100ms per plate.

12. bengaluru traffic patterns (high motorcycle density, mixed vehicle types, lane encroachment) make helmet and triple riding the highest-value violations — justifying their p0/p1 priority.

13. 10mb image size limit covers 95% of existing bengaluru junction cameras — cctv captures at 1080p or lower, and citizen phone photos at full resolution fall well within this.

14. sha-256 evidence hashing assumes court admissibility requires tamper-evident proof — a simple hash is sufficient for demo; production would add blockchain anchoring or digital signatures.

15. roi calculator assumes fine recovery is the primary metric police care about — a transparent formula (violations/day × fine × capture rate) is more convincing than opaque projections.

16. mapmyindia tiles as primary + cartodb dark fallback assumes india-specific map accuracy matters more than visual consistency — the fallback ensures zero demo-day failures.

17. seatbelt best-effort assumes it improves dramatically with side-angle cameras — we prove the architecture works, not that we achieve 95% from overhead. side-angle deployment path is clear.

18. stop-line/red-light as heuristics assumes judges value breadth (7/7 violation types) over depth (perfect accuracy on 3 types) — a working prototype that detects all types is stronger than a polished subset.

19. demo images seeded at real bengaluru junctions create more evaluator trust than synthetic test data — real coordinates, real plate formats, real violation distributions.

20. preprocessing pipeline (clahe + denoise + gamma) assumes indian cctv quality issues are consistent — low-light during monsoon, compression artifacts, and glare are universal, not edge cases.

21. confidence tiers (high/medium/low/review) assume officers need quick triage not raw floats — four tiers let them batch-process efficiently rather than interpreting decimal scores.

22. mv act fine amounts (₹500 helmet, ₹1000 triple riding, etc.) are current as of 2026 — the demo references specific sections for legal credibility and enforcement readiness.

23. production architecture (edge → cloud → btp astra/vahan) assumes scalability is proven by design — the hackathon build is one vertical slice with identical models and evidence format.

24. zustand over context api assumes the dashboard has enough state (violations, filters, map selection, signal toggle) that a minimal store is cleaner than prop-drilling.

25. shadcn/ui over mui assumes copy-paste components with zero runtime cost matter — frontend loads fast on low-spec demo laptops at the hackathon venue.

26. the system returning zero violations from a clean image is a strong signal — absence of hallucination is a feature. evaluators will test this and we pass by design.

27. wrong-side lane polygons configured per camera are a reasonable deployment cost — a traffic constable marks them in 5 minutes using the yaml config editor. no ml expertise required.

28. evidence generation assumes annotated images with bboxes, labels, and hashes are sufficient for court admissibility in karnataka — no video clip or audio required at this enforcement stage.

29. dual-model vram strategy (coco+helmet resident, plate on-demand) assumes the load/unload cycle is stable under repeated calls — pytorch cuda caching prevents fragmentation for models under 1gb.

30. graceful cpu fallback if cuda is unavailable — the system degrades to slower inference rather than refusing to start. works on any machine, not just gpus.

31. analytics dashboard assumes 6 key metrics (total violations, approval rate, breakdown, camera heatmap, hourly trends, fine recovery) cover what a traffic inspector actually looks at — no vanity metrics.

32. no bytetrack or temporal tracking is assumed unnecessary — the system processes uploaded images, not live feeds. adding tracking doubles pipeline complexity with zero detection improvement.

33. citizen-submitted photos assume the preprocessing pipeline can normalize smartphone variability — auto-focus, flash, portrait mode, and varying resolutions are handled by clahe + denoise + gamma.

34. social media screenshots assume platform compression artifacts are addressable — whatsapp's aggressive compression (70% quality) and instagram's re-encoding are partially recovered by bilateral filtering.

35. ai-generated synthetic edge cases assume realism gap is acceptable for stress-testing — models don't need photorealistic training data, they need structurally correct violation configurations that expose failure modes.

36. tamper detection on citizen photos assumes most manipulation is amateur (screenshots of screenshots, crop+paste) — professional deepfakes require a more sophisticated detector that's a production roadmap item.

37. the "signal: red" toggle assumes an operator at the command center has real-time signal information — this is how btp actually operates. the toggle mirrors existing workflow.

38. evidence immutability after approval assumes no legal requirement to delete — indian evidence law preserves شنالchlons in the system, not removes them.

39. the 10 demo junctions assume these represent bengaluru's diversity — it junctions (electronic city), commercial (mg road), bottleneck (silk board), highway (hebbal flyover). not cherry-picked.

40. modular violation plugin system assumes new violation types follow the same detect → list[violation] interface — this worked for seatbelt (added in 45 min) and will work for future types like mobile-phone usage or dark-tinted windows.
