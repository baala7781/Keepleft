# ADR-010: Portable route stickers and photo videos

Accepted for the 0.1.2 test milestone, revised after the user's clarification: the share
overlay is the animated recorded route, not a 3D city. A lazily loaded Canvas2D composition
projects recorded samples into a local ENU frame and fits the complete shape to a square.
The 12-second clock contains a time-compressed, nine-second replay and short start/end holds.
The original samples, gaps, out-and-back visits and stored statistics are unchanged.

No map, buildings, place lookup or network access is needed for story creation. Standalone
GIFs have a transparent background and contain only the route with a moving runner symbol;
no coordinates, photo, activity identifier, place names or stats are embedded. An unnamed
route can still be recognizable, so the UI asks the user to review before sharing.

Photos are decoded locally, resized and composited into a 720×1280 canvas. Android's
native MediaCodec/MediaMuxer adapter encodes sequential JPEG frames to H.264 MP4 in private
cache storage. One frame is in flight at a time. The native share sheet opens only on
the explicit Share video button. No album-wide permission, backend or photo upload is used.
Browser builds use MediaRecorder with capability-tested MP4/WebM. Export can be cancelled;
backgrounding cancels the foreground composition and removes partial native output.

The gifenc MIT encoder writes 480×480 transparent looping GIFs (180 frames, 12 seconds).
One-bit transparency is intentional; white keyline details remain opaque. Frame disposal
restores transparency rather than accumulating old runner markers. Android saves a private
GIF cache file and shares it only on request. Editing-app GIF support is not guaranteed.

Recording remains native and separate. Story creation is unavailable during active/paused
capture. The map render loop suspends while the story studio is open. Saved activities,
native SQLite schema, package identity and signing identity are unchanged.

Tradeoffs: one template, generic runner symbol, no audio, no personal likeness, no 3D
cinematic export, no cloud render. Android encoder support and live GPS still require
physical device acceptance; bridge doubles and JVM colour tests do not prove hardware support.

0.1.3 interaction update: photo placement is a two-dimensional position and size in the
720×1280 export coordinate frame. Dragging the route and its resize handle updates that
same transform in preview and export. Pointer capture handles touch/mouse; keyboard arrows
and Home provide an alternative. Bounds keep the overlay reachable inside the photo.
Editing outlines/handles are DOM-only and never enter the exported canvas. Standalone GIFs
remain centred and transparent; cross-app long-press sticker copying remains deferred.
