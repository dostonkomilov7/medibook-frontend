#!/usr/bin/env python3
"""
Prefixes every top-level CSS selector in a file with a page-scope
ancestor class, so the file can never again collide with another
page's same-named classes — without touching any JSX/TSX.

Left untouched (can't be meaningfully scoped, or would break if scoped):
  - :root / html / body / * (and *::before / *::after) — kept global
  - @keyframes ... { ... } bodies — copied verbatim (0%/50%/to are
    keyframe selectors, not elements)
  - @font-face { ... } bodies — copied verbatim (no selector at all)
  - @media (...) { ... } prelude lines — left as-is; selectors INSIDE
    are recursively prefixed the same way

Usage: scope_css.py <input.css> <prefix-class> > output.css
"""
import re
import sys

RESERVED = {"html", "body", ":root", "*", "*::before", "*::after"}
ATRULE_VERBATIM = ("@keyframes", "@font-face", "@-webkit-keyframes")
ATRULE_RECURSE = ("@media", "@supports")
COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)


def sniff(text):
    """Text to use for deciding what kind of rule this is — with CSS
    comments stripped, so a `/* section header */` right before an
    `@media` (or `.sidebar`) doesn't hide the at-rule keyword from a
    plain startswith() check."""
    return COMMENT_RE.sub("", text).strip()


def prefix_selector_list(text, prefix, self_class):
    # Preserve blank-line separation between rules (readability), even
    # though we're about to strip the rest of the leading whitespace.
    stripped_left = text.lstrip()
    leading_ws = text[: len(text) - len(stripped_left)]
    nl_count = leading_ws.count("\n")
    lead = "\n\n" if nl_count >= 2 else ("\n" if nl_count == 1 else "")
    body = text.strip()
    if not body:
        return lead

    # A comment sitting in this text (e.g. an old disabled rule kept
    # for reference, like `/* .modal-overlay { ...rgba(a, b, c)... } */`)
    # can contain commas of its own — those must never be treated as
    # selector-list separators. Stash comments behind placeholders for
    # the split below, then restore them verbatim afterward.
    stashed = []

    def stash(m):
        stashed.append(m.group(0))
        return f"\x00{len(stashed) - 1}\x00"

    protected = COMMENT_RE.sub(stash, body)
    parts = [p.strip() for p in protected.split(",")]
    placeholder_re = re.compile(r"\x00\d+\x00")
    out = []
    for p in parts:
        collapsed = " ".join(p.split())  # normalize internal whitespace/newlines
        # Compare against the comment-free text — a stashed comment
        # placeholder sitting in `collapsed` (e.g. a `/* section
        # header */` right before this selector) would otherwise stop
        # it ever equaling `self_class` and the check below would
        # never fire.
        bare = " ".join(placeholder_re.sub("", collapsed).split())
        # `self_class` (the wrapper's own class, e.g. ".page-home") is
        # itself a valid selector some rules legitimately need to
        # target directly — a rule that moved off `body` onto the
        # wrapper, say. Prefixing it would produce ".page-home
        # .page-home", which only matches a nested copy of the
        # wrapper inside itself. Leave it — and anything already
        # starting with it, like ".page-home.some-modifier" — alone.
        if bare in RESERVED or bare == self_class or bare.startswith(self_class + ".") or bare.startswith(self_class + ":"):
            out.append(collapsed)
        else:
            out.append(f"{prefix} {collapsed}")
    joined = ",\n".join(out)
    for idx, c in enumerate(stashed):
        joined = joined.replace(f"\x00{idx}\x00", c)
    return lead + joined


def find_comment_end(css, i):
    """css[i:i+2] is '/*'. Return the index just past the matching '*/',
    or len(css) if unterminated."""
    end = css.find("*/", i + 2)
    return len(css) if end == -1 else end + 2


def process(css, prefix):
    self_class = prefix  # e.g. ".page-home" — the wrapper's own class
    out = []
    i = 0
    n = len(css)
    # stack of "verbatim" (bool): True = copying a rule body / keyframes
    # / font-face body untouched; False = accumulating a selector (top
    # level or inside @media/@supports)
    stack = []
    pending = []

    def emit(s):
        out.append(s)

    while i < n:
        c = css[i]
        # A `{`/`}` inside a /* comment */ (e.g. old disabled rules kept
        # for reference) must never be mistaken for real CSS structure —
        # copy the whole comment through in one jump before the brace
        # logic below ever sees its contents.
        if c == "/" and css[i : i + 2] == "/*":
            end = find_comment_end(css, i)
            comment_text = css[i:end]
            if not stack or stack[-1] is False:
                pending.append(comment_text)
            else:
                out.append(comment_text)
            i = end
            continue
        if not stack or stack[-1] is False:
            # accumulating a selector / at-rule prelude
            if c == "{":
                sel = "".join(pending)
                stripped = sniff(sel)
                if stripped.startswith(ATRULE_VERBATIM):
                    emit(sel + "{")
                    stack.append(True)
                elif stripped.startswith(ATRULE_RECURSE):
                    emit(sel + "{")
                    stack.append(False)
                elif stripped.startswith("@"):
                    # unknown at-rule (e.g. @import) — leave verbatim, no body assumed but be safe
                    emit(sel + "{")
                    stack.append(True)
                else:
                    emit(prefix_selector_list(sel, prefix, self_class) + " {")
                    stack.append(False)
                pending = []
                i += 1
                continue
            elif c == "}":
                # closes a @media/@supports container (or stray top-level)
                emit("".join(pending))
                emit("}")
                pending = []
                if stack:
                    stack.pop()
                i += 1
                continue
            else:
                pending.append(c)
                i += 1
                continue
        else:
            # verbatim mode: copy until matching close, tracking nested
            # braces — comments get the same jump-over treatment so a
            # brace inside one can't be mistaken for real nesting here
            # either (e.g. a commented-out declaration inside a rule).
            depth = 1
            buf = []
            while i < n and depth > 0:
                c = css[i]
                if c == "/" and css[i : i + 2] == "/*":
                    end = find_comment_end(css, i)
                    buf.append(css[i:end])
                    i = end
                    continue
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        i += 1
                        break
                buf.append(c)
                i += 1
            emit("".join(buf))
            emit("}")
            stack.pop()
            continue
    # any trailing pending (trailing whitespace/comments after last rule)
    if pending:
        emit("".join(pending))
    return "".join(out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: scope_css.py <input.css> <prefix-class>", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        css = f.read()
    sys.stdout.write(process(css, "." + sys.argv[2]))
