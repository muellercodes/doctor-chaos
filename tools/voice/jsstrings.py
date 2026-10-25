"""Pull string literals out of a JS file, with the name of the call or const they sit in.

Good enough for this codebase: handles comments, '...', "...", `...${...}...`, and
regex literals (guessed from the previous token).
"""
import re
import sys

REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^') | {''}
KEYWORDS_BEFORE_REGEX = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw'}


def scan(src):
    """Yield (kind, text, context) where kind is 'str' or 'tpl'.
    For 'tpl', text is a list of static parts (expressions removed) and a flag if it had expressions."""
    i, n = 0, len(src)
    out = []
    stack = []  # (char, name) for ( [ {
    last_tok = ''
    last_word = ''
    ident_before = ''
    const_name = ''

    def ctx():
        calls = [nm for ch, nm in stack if ch == '(' and nm]
        return {'calls': calls, 'const': const_name}

    while i < n:
        c = src[i]
        if c in ' \t\r\n':
            i += 1
            continue
        if src.startswith('//', i):
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in '\'"':
            j = i + 1
            buf = []
            while j < n and src[j] != c:
                if src[j] == '\\':
                    nxt = src[j + 1]
                    buf.append({'n': '\n', 't': '\t'}.get(nxt, nxt))
                    j += 2
                    continue
                buf.append(src[j])
                j += 1
            out.append(('str', ''.join(buf), ctx()))
            i = j + 1
            last_tok = 'v'
            continue
        if c == '`':
            j = i + 1
            parts, buf, had_expr = [], [], False
            while j < n and src[j] != '`':
                if src[j] == '\\':
                    buf.append(src[j + 1])
                    j += 2
                    continue
                if src.startswith('${', j):
                    had_expr = True
                    parts.append(''.join(buf))
                    buf = ['\x00']  # marks where an expression was
                    depth = 1
                    j += 2
                    while j < n and depth:
                        if src[j] == '{':
                            depth += 1
                        elif src[j] == '}':
                            depth -= 1
                        elif src[j] in '\'"`':
                            q = src[j]
                            j += 1
                            while j < n and src[j] != q:
                                j += 2 if src[j] == '\\' else 1
                        j += 1
                    continue
                buf.append(src[j])
                j += 1
            parts.append(''.join(buf))
            out.append(('tpl', parts, ctx(), had_expr))
            i = j + 1
            last_tok = 'v'
            continue
        if c == '/':
            prev = last_tok
            if prev in REGEX_PREV or last_word in KEYWORDS_BEFORE_REGEX and prev == 'w':
                # regex literal
                j = i + 1
                in_class = False
                while j < n:
                    if src[j] == '\\':
                        j += 2
                        continue
                    if src[j] == '[':
                        in_class = True
                    elif src[j] == ']':
                        in_class = False
                    elif src[j] == '/' and not in_class:
                        break
                    elif src[j] == '\n':
                        break
                    j += 1
                j += 1
                while j < n and src[j].isalpha():
                    j += 1
                i = j
                last_tok = 'v'
                continue
            i += 1
            last_tok = '/'
            continue
        m = re.match(r'[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*', src[i:])
        if m:
            w = m.group(0)
            i += len(w)
            last_word = w.split('.')[-1]
            ident_before = w
            last_tok = 'w'
            if w in ('const', 'let', 'var') and not stack:
                m2 = re.match(r'\s*([A-Za-z_$][\w$]*)', src[i:])
                if m2:
                    const_name = m2.group(1)
            continue
        if c.isdigit():
            m = re.match(r'[\d.xXa-fA-F_eE]+', src[i:])
            i += len(m.group(0))
            last_tok = 'v'
            continue
        if c in '([{':
            stack.append((c, ident_before if (c == '(' and last_tok == 'w') else ''))
            ident_before = ''
            last_tok = c
            i += 1
            continue
        if c in ')]}':
            if stack:
                stack.pop()
            last_tok = 'v' if c in ')]' else '}'
            i += 1
            continue
        if src.startswith('=>', i):
            last_tok = '='
            i += 2
            continue
        last_tok = c
        ident_before = ''
        i += 1
    return out


if __name__ == '__main__':
    for kind, text, ctx, *rest in scan(open(sys.argv[1]).read()):
        print(kind, repr(text)[:100], ctx)
