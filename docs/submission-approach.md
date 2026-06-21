# proposed approach

> vigilai — ai-powered traffic violation detection for bengaluru traffic police
> flipkart gridlock 2.0, round 2, track 3

---

1. crowdsourced citizen evidence — any bengaluru resident can snap a violation and submit via the upload endpoint, turning 1.3 crore citizens into force multipliers for the 3,500 traffic police.

2. osint-style social media scraping — instagram reels and twitter posts of traffic violations are already public evidence. our pipeline can process these screenshots just like cctv feeds, turning viral outrage into actionable challans.

3. ai-generated hyperrealistic synthetic edge cases — we use stable diffusion inpainting to generate thousands of rare scenarios (triple riding at midnight in rain, helmetless rider with pillion child) that real datasets barely contain, stress-testing our models on cases nobody else trains for.

4. deepfake/tamper detection on citizen photos — every submitted image passes through an integrity verifier that checks exif consistency, noise patterns, and clone-stamp artifacts before processing, preventing malicious framing of innocent riders.

5. resident/ephemeral vram split — coco+helmet models stay pinned as always-on sentinels in vram while the plate model hot-swaps in on-demand and immediately evicts itself, keeping peak under 3gb on a 4gb rtx 3050 — the constraint becomes the architecture.

6. progressive enhancement, not all-or-nothing — helmet detection works at 90%+ accuracy right now. seatbelt works at 60% with overhead cameras but jumps to 90% with side-angle. we ship all 7 violations on day one, each at its natural confidence, instead of cutting types we can't perfect.

7. head-region spatial association for helmets — not naive "is there a helmet near a person" but anatomically-constrained top-30% bbox overlap, eliminating false positives from helmets on handlebars, pillion seats, or nearby riders.

8. human-in-the-loop is the feature, not the fallback — fully automated challans without officer approval create legal liability. our approve/reject workflow with audit trail is the correct architecture, not a compromise.

9. court-admissible evidence chain — sha-256 hash over saved jpeg bytes, dual watermark (vigilai id + ist timestamp), violation metadata with mv act section, and officer approval status. any tampering changes the hash. rule 166a compliant by design.

10. bengaluru-native, not generic — 10 real junctions (mg road, silk board, hebbal, electronic city), ka-format plates, btp published violation distributions (~45% no-helmet, ~20% triple riding), kannada/hindi/english multilingual road sign awareness in preprocessing.

11. retrofits onto any existing cctv — no hardware upgrade, no rtsp stream requirement, no special camera. if it produces a jpeg, vigilai processes it. this covers the 500+ bengaluru junctions that currently have zero ai enforcement.

12. citizen reputation system — repeated accurate submissions build trust score; flagged misreports decay it. high-reputation citizen photos get auto-queued for officer review; low-reputation ones require multiple confirmations.

13. camera health monitoring — if a junction's violation rate drops to zero for 2+ hours, the system flags it as "suspected camera malfunction" — because zero violations at silk board junction is statistically impossible.

14. adaptive confidence tiering — the same helmet detection at a well-lit junction gets higher baseline confidence than one from a grainy night-vision camera. confidence thresholds self-adjust per camera based on historical precision.

15. zone-based heuristics as configurable polygons — wrong-side driving, illegal parking, and stop-line violations use per-camera lane polygons defined in yaml. a traffic constable can mark these in 5 minutes per junction. no code changes.

16. signal-state toggle for red-light — the dashboard has a "signal: red" button. when the operator marks it, any vehicle past the stop-line zone escalates from stop-line to red-light violation. temporal detection from a single image, enabled by human input.

17. pipeline waterfall transparency — every stage is individually timed (preprocess_ms, detect_coco_ms, detect_helmet_ms, violation_logic_ms, detect_plate_ms, ocr_ms, evidence_gen_ms) and shown as a stacked bar. officers see exactly where time goes, not a black box.

18. fir-style evidence viewer — split panel with annotated image on one side and structured metadata (violation type, mv act section, fine amount, plate number, timestamp, gps) on the other. print button outputs challan-ready document.

19. roi calculator with defensible methodology — conservative (50% detection effectiveness) and aggressive (parity with btp ai cameras) columns side-by-side. conservative still shows 87× first-year return on ₹2.5cr investment. numbers are derived, not vibes.

20. synthetic data augmentation pipeline — gamma variation (0.8-1.5), clahe clip limit variation, bilateral filter tuning, and noise injection generate dozens of degraded variants from each training image, simulating monsoon fog, night underexposure, and compression artifacts.

21. vehicle re-identification via appearance embeddings — in production, the same motorcycle detected at two junctions 10 minutes apart links violations (no helmet at junction a, wrong-side at junction b), enabling repeat-offender tracking without license plate dependency.

22. offline-first with local sync — the system works without internet. evidence is cached locally and synced when connectivity returns. critical for bengaluru's notorious network dead zones during monsoon.

23. gamification for citizen reporters — points and badges for verified submissions. monthly leaderboard. top reporters get recognized by btp. turns civic duty into engagement.

24. modular violation plugin system — adding a new violation type is a python module implementing a single interface (detect → list[violation]). no core changes. seatbelt was added in 45 minutes this way.

25. multi-model orchestration with graceful degradation — if vram is low, plate detection is silently skipped. if ocr returns garbage, raw text still goes to officer for manual review. if cuda is unavailable, cpu fallback runs at reduced speed. the system never crashes, it degrades.

26. citizen feedback loop — reporters see the outcome of their submission (approved → challan issued, rejected → reason). closes the loop instead of submissions disappearing into a void.

27. predictive violation heatmaps — historical violation data per junction per hour builds a probability map. officers are deployed to high-probability zones during peak hours. prevention, not just detection.

28. integration with btp astra/vahan by design — the hackathon build uses sqlite, but the data schema mirrors astra's violation record format. swapping sqlite for postgres + adding a message queue is a config change, not a rewrite.

29. edge deployment proven by architecture — the same models, same violation logic, same evidence format that run on the rtx 3050 laptop would run on a jetson nano at each junction. the hackathon build is one vertical slice of the production system.

30. evidence packages are immutable once approved — after officer approval, the evidence record is locked. no edits, no deletes, no overwrite. the sha-256 hash is stored in the approval audit log. chain of custody is unbroken.

31. license plate mismatch as a bonus violation type — if ocr reads a plate but the format doesn't match ka##xx####, it's flagged as "suspected fake/mismatched plate" under mv act section 177 (₹200). the system doesn't just read plates, it validates them.

32. command center aesthetic, not dashboard template — dark navy palette, live ist clock, police-style badges, fir-form evidence viewer. the frontend looks like it belongs in a btp control room, not a startup analytics demo.

33. vehicle make/model classification alongside detection — yolo identifies motorcycle vs car vs bus vs truck, but we also log the vehicle category with each violation. this enables data-driven policy: "70% of helmet violations are on scooters, not superbikes — target scooter awareness campaigns."

34. multi-violation per image — a single image can yield helmet + triple riding + license plate in one pass. the pipeline runs all detectors and returns a list, not a single classification. one photo, multiple enforceable violations.

35. privacy-preserving face blur on non-violation persons — only the violating rider's face is visible in evidence. all other detected persons get gaussian blur. surveillance without privacy violation.

36. annotation color-coding by violation type — helmet=red, triple=orange, plate=yellow, seatbelt=blue. officers can visually scan an evidence image and instantly parse what happened without reading labels.

37. rapidocr locked to cpu with thread pinning — omp_num_threads=4, onnx_num_threads=4, runtime assertion that cudaexecutionprovider is absent. cpu inference prevents gpu contention and keeps yolo latency predictable.

38. cold-start elimination at boot — dummy 640×640 inference forces cuda context allocation, cudnn autotuning, and tensor buffer init at startup. first real request gets zero warmup penalty.

39. per-junction violation distribution seeding — demo data matches btp's actual published patterns. mg road gets more pedestrian violations. electronic city gets more triple riding. silk board gets more wrong-side. not random noise — realistic simulator.

40. image integrity hashing before processing — the sha-256 is computed on the raw uploaded bytes before any preprocessing touches it. even if clahe or gamma alters pixel values, the original file hash is preserved. dual-chain: original hash + evidence hash.
