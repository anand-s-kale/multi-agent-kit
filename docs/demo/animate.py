"""Animated explainer of the real 2026-10-25 multi-agent run. Numbers are from that run.
Pipes raw frames to ffmpeg -> out.mp4.   Usage: python animate.py out.mp4 [only_scene_index_for_preview]
"""
import math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 15
F = "C:/Windows/Fonts/"
def font(name, size): return ImageFont.truetype(F + name, size)
H1, H2, B, S, XS = font("segoeuib.ttf", 46), font("segoeuib.ttf", 30), font("segoeuib.ttf", 22), font("segoeui.ttf", 20), font("segoeui.ttf", 16)
MONO, MONOB = font("consola.ttf", 19), font("consolab.ttf", 19)

BG, PANEL, LINE = (17, 17, 20), (32, 32, 38), (60, 60, 70)
FG, DIM, OK, WARN = (236, 236, 240), (150, 150, 162), (74, 222, 128), (250, 204, 21)
OPUS, SONNET, CODEX, GEMINI = (217, 119, 87), (240, 170, 130), (16, 185, 129), (96, 150, 250)


def clamp(x): return max(0.0, min(1.0, x))
def ease(x): x = clamp(x); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def prog(t, a, b): return ease((t - a) / (b - a))
def mix(c1, c2, k): return tuple(int(a + (b - a) * k) for a, b in zip(c1, c2))


def ctext(d, xy, s, f, fill=FG): d.text(xy, s, font=f, fill=fill, anchor="mm")


def check(d, x, y, r=11, col=OK):
    d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    d.line([(x - r * .45, y), (x - r * .1, y + r * .4), (x + r * .5, y - r * .35)], fill=BG, width=3)


def spinner(d, x, y, t, col):
    for i in range(8):
        a = i / 8 * 2 * math.pi + t * 6
        k = (i / 8)
        d.ellipse([x + 10 * math.cos(a) - 2.5, y + 10 * math.sin(a) - 2.5, x + 10 * math.cos(a) + 2.5, y + 10 * math.sin(a) + 2.5], fill=mix(BG, col, k))


def caption(d, s, k=1.0):
    ctext(d, (W // 2, 52), s, H2, mix(BG, FG, k))


def bar(d, x, y, w, label, pct, col, note="", k=1.0, scale=100):
    d.text((x, y), label, font=B, fill=mix(BG, FG, k), anchor="lm")
    bx, bw = x + 230, w - 230 - 150
    d.rounded_rectangle([bx, y - 14, bx + bw, y + 14], 7, fill=PANEL)
    fill = bw * clamp(pct / scale)
    if fill > 1: d.rounded_rectangle([bx, y - 14, bx + max(14, fill), y + 14], 7, fill=col)
    d.text((bx + bw + 16, y), f"{pct:.1f}%".replace(".0%", "%"), font=B, fill=mix(BG, FG, k), anchor="lm")
    if note: d.text((bx, y + 30), note, font=XS, fill=mix(BG, DIM, k), anchor="lm")


# ---------- scenes: each draws on d at local time t (seconds) ----------
def s_title(d, t):
    k = prog(t, 0, .8)
    ctext(d, (W // 2, H // 2 - 50), "You pay for 3 AI coding plans.", H1, mix(BG, FG, k))
    ctext(d, (W // 2, H // 2 + 20), "You only really use one.", H1, mix(BG, OPUS, prog(t, 1.2, 2)))
    ctext(d, (W // 2, H // 2 + 90), "Every plan's 5-hour and weekly quota expires, used or not.", S, mix(BG, DIM, prog(t, 2.2, 3)))


def s_before(d, t):
    caption(d, "Step 1 · Claude Code reads every agent's quota", prog(t, 0, .6))
    d.text((140, 130), "$ mak status", font=MONOB, fill=mix(BG, OPUS, prog(t, .3, .8)))
    g = prog(t, 1, 3)
    rows = [("Claude (lead)", 64 * g, OPUS, "weekly limit · resets in 2 days"),
            ("Codex", 0 * g, CODEX, "weekly limit · 5-hour window about to reset"),
            ("Gemini (Antigravity)", .1 * g, GEMINI, "weekly limit")]
    for i, (lab, p, c, n) in enumerate(rows):
        bar(d, 140, 220 + i * 105, 1000, lab, p, c, n, prog(t, .6 + i * .3, 1.2 + i * .3))
    k = prog(t, 3.6, 4.4)
    ctext(d, (W // 2, 590), "Claude is 64% through its week.  Codex and Gemini are almost untouched.", B, mix(BG, WARN, k))
    ctext(d, (W // 2, 630), "That unused quota is money you've already paid for.", S, mix(BG, DIM, k))


def s_prompt(d, t):
    caption(d, "Step 2 · You give Claude one task", prog(t, 0, .6))
    d.rounded_rectangle([140, 200, 1140, 420], 14, fill=PANEL)
    msg = "Build a `mak log` command for this repo. Check which agents have quota and split the work between them."
    n = int(len(msg) * clamp((t - .6) / 2.6))
    words, lines, cur = msg[:n].split(" "), [], ""
    for w_ in words:
        if len(cur) + len(w_) > 62: lines.append(cur); cur = ""
        cur += w_ + " "
    lines.append(cur)
    d.text((180, 240), "You", font=B, fill=OPUS)
    for i, l in enumerate(lines): d.text((180, 290 + i * 36), l, font=font("segoeui.ttf", 26), fill=FG)
    if t > 3.4:
        ctext(d, (W // 2, 500), "No routing engine. Claude decides, using the quota facts.", B, mix(BG, DIM, prog(t, 3.4, 4)))


LEAD = (W // 2, 175)
WORK = [  # name, colour, x, task, reason
    ("Claude Sonnet", SONNET, 230, "writes the code", "cheaper Claude model, good at specs"),
    ("Codex", CODEX, 640, "writes 12 tests", "0% used · 5h window expires soon"),
    ("Gemini", GEMINI, 1050, "reviews design + docs", "~0% used · different model family"),
]
WY = 450


def node(d, cx, cy, w, h, title, sub, col, k=1.0, sub2=""):
    d.rounded_rectangle([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], 16, fill=mix(BG, PANEL, k), outline=mix(BG, col, k), width=3)
    ctext(d, (cx, cy - (22 if sub2 else 14)), title, B, mix(BG, col, k))
    ctext(d, (cx, cy + (8 if sub2 else 16)), sub, S, mix(BG, FG, k))
    if sub2: ctext(d, (cx, cy + 36), sub2, XS, mix(BG, DIM, k))


def packet(d, a, b, p, col):
    if 0 < p < 1:
        x, y = a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=col)


def s_dispatch(d, t):
    caption(d, "Step 3 · Claude hands each part to the best agent with spare quota", prog(t, 0, .6))
    node(d, *LEAD, 380, 90, "Claude Opus · lead", "plans, routes, reviews, merges", OPUS, prog(t, .2, .8))
    done_at = [6.0, 8.2, 3.6]
    for i, (name, col, x, task, why) in enumerate(WORK):
        k = prog(t, .8 + i * .25, 1.4 + i * .25)
        start = (LEAD[0], LEAD[1] + 45); end = (x, WY - 62)
        lp = prog(t, 1.4 + i * .3, 2.2 + i * .3)
        if lp > 0: d.line([start, (start[0] + (end[0] - start[0]) * lp, start[1] + (end[1] - start[1]) * lp)], fill=LINE, width=3)
        packet(d, start, end, (t - 1.6 - i * .3) / 1.0, col)
        node(d, x, WY, 340, 120, name, task, col, k, why)
        sy = WY + 95
        if t > 2.6 + i * .3 and t < done_at[i]:
            spinner(d, x - 50, sy, t, col); d.text((x - 30, sy), "working…", font=S, fill=DIM, anchor="lm")
        if name == "Codex" and 4.8 < t < 6.6:
            d.text((x, sy + 34), "sandbox blocked it → Claude retried", font=XS, fill=WARN, anchor="mm")
        if t >= done_at[i]:
            check(d, x - 40, sy); d.text((x - 20, sy), "done", font=B, fill=OK, anchor="lm")
    ctext(d, (W // 2, 680), "All three run in parallel, each in its own git worktree.", S, mix(BG, DIM, prog(t, 2.5, 3.2)))


def s_merge(d, t):
    caption(d, "Step 4 · Claude checks the work, merges, and gets it reviewed", prog(t, 0, .6))
    node(d, *LEAD, 380, 90, "Claude Opus · lead", "plans, routes, reviews, merges", OPUS)
    for i, (name, col, x, task, why) in enumerate(WORK):
        node(d, x, WY, 340, 120, name, task, col, 1.0 - .88 * prog(t, 1.0, 1.8), why)
        packet(d, (x, WY - 62), (LEAD[0], LEAD[1] + 45), (t - .3 - i * .25) / 1.0, col)
    steps = [(1.6, OK, "Sonnet's code + Codex's tests merged"),
             (2.6, OK, "12 / 12 tests pass on the first run"),
             (3.8, WARN, "Cross-model review: 4 bugs found"),
             (5.2, OK, "Claude fixes them → 15 / 15 tests pass")]
    k0 = prog(t, 1.2, 1.8)
    if k0 > 0:
        d.rounded_rectangle([290, 250, 990, 610], 16, fill=mix(BG, PANEL, k0))
    for i, (at, col, s) in enumerate(steps):
        k = prog(t, at, at + .5)
        if k > 0:
            y = 300 + i * 80
            if col == OK: check(d, 340, y, 13, mix(PANEL, OK, k))
            else: ctext(d, (340, y), "!", H2, mix(PANEL, WARN, k))
            d.text((375, y), s, font=font("segoeuib.ttf", 26), fill=mix(PANEL, FG, k), anchor="lm")


def s_log(d, t):
    caption(d, "Step 5 · Every hand-off is logged with the agent's quota at that moment", prog(t, 0, .6))
    d.rounded_rectangle([90, 120, 1190, 470], 14, fill=PANEL)
    d.text((120, 150), "$ mak log", font=MONOB, fill=OPUS)
    rows = [("#", "time (UTC)", "agent", "model", "quota at dispatch", "task"),
            ("1", "18:03", "claude", "sonnet", "5h 8% | 7d 64%", "cross-model review coordinator"),
            ("2", "18:03", "codex", "-", "5h 1% | 7d 1%", "independent review of the diff"),
            ("3", "18:03", "antigravity", "gemini-3.8-flash-high", "5h 0.2% | 7d 0.1%", "independent review of the diff")]
    xs = [120, 160, 290, 430, 680, 890]
    for i, r in enumerate(rows):
        k = prog(t, .6 + i * .6, 1.0 + i * .6)
        for x, c in zip(xs, r): d.text((x, 210 + i * 50), c, font=MONOB if i == 0 else MONO, fill=mix(PANEL, DIM if i == 0 else FG, k))
    ctext(d, (W // 2, 560), "So you can always see who did what, and how much quota they had left.", B, mix(BG, DIM, prog(t, 3.2, 3.8)))


def s_after(d, t):
    caption(d, "Result · quota that would have expired did real work", prog(t, 0, .6))
    g = prog(t, 1, 3)
    cards = [("Codex", CODEX, "weekly quota used", 0, 1, "wrote 12 tests + reviewed"),
             ("Gemini", GEMINI, "5-hour quota used", .2, 1.1, "reviewed design, drafted docs"),
             ("Claude Opus", OPUS, "kept for", None, None, "planning, decisions, final review")]
    for i, (n, col, what, a, b, did) in enumerate(cards):
        x = 230 + i * 410; k = prog(t, .4 + i * .3, 1 + i * .3)
        d.rounded_rectangle([x - 180, 170, x + 180, 520], 18, fill=mix(BG, PANEL, k), outline=mix(BG, col, k), width=3)
        ctext(d, (x, 215), n, H2, mix(BG, col, k))
        ctext(d, (x, 265), what, S, mix(BG, DIM, k))
        if a is None:
            ctext(d, (x, 355), "the hard parts", font("segoeuib.ttf", 40), mix(BG, FG, k))
        else:
            v = a + (b - a) * g
            ctext(d, (x, 355), f"{a:g}% → {v:.1f}%", font("segoeuib.ttf", 48), mix(BG, FG, k))
        ctext(d, (x, 460), did, S, mix(BG, FG, k))
    ctext(d, (W // 2, 600), "Feature built, tested and reviewed by three vendors' models in one session.", B, mix(BG, FG, prog(t, 3.4, 4)))


def s_end(d, t):
    k = prog(t, 0, .8)
    ctext(d, (W // 2, 250), "multi-agent-kit", H1, mix(BG, FG, k))
    ctext(d, (W // 2, 320), "Claude Code leads. Every subscription you pay for gets used.", B, mix(BG, DIM, k))
    ctext(d, (W // 2, 420), "github.com/anand-s-kale/multi-agent-kit", font("segoeuib.ttf", 30), mix(BG, OPUS, prog(t, .6, 1.4)))
    ctext(d, (W // 2, 660), "Animated from a real run on 2026-10-25. All numbers are from that run.", XS, mix(BG, DIM, prog(t, 1, 1.8)))


SCENES = [(s_title, 4), (s_before, 6), (s_prompt, 4.5), (s_dispatch, 10), (s_merge, 7.5), (s_log, 5.5), (s_after, 6.5), (s_end, 4.5)]

if __name__ == "__main__":
    out = sys.argv[1]
    only = int(sys.argv[2]) if len(sys.argv) > 2 else None
    if only is not None:  # preview: save the last frame of one scene, plus an optional time
        fn, dur = SCENES[only]
        t = float(sys.argv[3]) if len(sys.argv) > 3 else dur - .05
        im = Image.new("RGB", (W, H), BG); fn(ImageDraw.Draw(im), t); im.save(out); sys.exit()
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for fn, dur in SCENES:
        for i in range(int(dur * FPS)):
            t = i / FPS
            im = Image.new("RGB", (W, H), BG); fn(ImageDraw.Draw(im), t)
            fade = min(1, t / .35, (dur - t) / .35)  # fade in/out between scenes
            if fade < 1: im = Image.blend(Image.new("RGB", (W, H), BG), im, max(0, fade))
            ff.stdin.write(im.tobytes())
    ff.stdin.close(); ff.wait()
    print(out, sum(d for _, d in SCENES), "s")
