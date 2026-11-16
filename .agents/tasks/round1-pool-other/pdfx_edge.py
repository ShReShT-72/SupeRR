import re, zlib, sys

def load(path):
    data = open(path, 'rb').read()
    objs = {}
    for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj(.*?)endobj', data, re.S):
        objs[int(m.group(1))] = m.group(3)
    return data, objs

def stream(body):
    m = re.search(rb'stream\r?\n(.*?)\r?\nendstream', body, re.S)
    if not m:
        return None
    raw = m.group(1)
    if b'FlateDecode' in body.split(b'stream')[0]:
        try:
            return zlib.decompress(raw)
        except Exception:
            try:
                return zlib.decompressobj().decompress(raw)
            except Exception:
                return None
    return raw

def parse_cmap(s):
    mp = {}
    for blk in re.findall(rb'beginbfchar(.*?)endbfchar', s, re.S):
        for a, b in re.findall(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            mp[int(a, 16)] = bytes.fromhex(b.decode()).decode('utf-16-be', 'replace')
    for blk in re.findall(rb'beginbfrange(.*?)endbfrange', s, re.S):
        for a, b, c in re.findall(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            a, b = int(a, 16), int(b, 16)
            base = int(c, 16)
            for i in range(a, b + 1):
                mp[i] = chr(base + i - a)
    return mp

data, objs = load(sys.argv[1])
# fonts: map font obj -> cmap
fontmaps = {}
for n, body in objs.items():
    if b'/Type/Font' in body.replace(b' ', b'') and b'/ToUnicode' in body:
        m = re.search(rb'/ToUnicode\s+(\d+)\s+0\s+R', body)
        if m:
            st = stream(objs[int(m.group(1))])
            if st:
                fontmaps[n] = parse_cmap(st)
# pages in order
pages = []
def walk(n):
    body = objs[n]
    if re.search(rb'/Type\s*/Pages', body):
        kids = re.search(rb'/Kids\s*\[(.*?)\]', body, re.S).group(1)
        for k in re.findall(rb'(\d+)\s+0\s+R', kids):
            walk(int(k))
    elif re.search(rb'/Type\s*/Page\b', body):
        pages.append(n)
root = None
for n, body in objs.items():
    if re.search(rb'/Type\s*/Pages', body) and b'/Parent' not in body:
        root = n
walk(root)
print('pages', len(pages), file=sys.stderr)

def page_fonts(body):
    res = {}
    m = re.search(rb'/Font\s*<<(.*?)>>', body, re.S)
    if not m:
        m2 = re.search(rb'/Resources\s+(\d+)\s+0\s+R', body)
        if m2:
            rb = objs[int(m2.group(1))]
            m = re.search(rb'/Font\s*<<(.*?)>>', rb, re.S)
            if not m:
                m3 = re.search(rb'/Font\s+(\d+)\s+0\s+R', rb)
                if m3:
                    fb = objs[int(m3.group(1))]
                    for nm, num in re.findall(rb'/(\w+)\s+(\d+)\s+0\s+R', fb):
                        res[nm.decode()] = int(num)
                    return res
    if m:
        for nm, num in re.findall(rb'/(\w+)\s+(\d+)\s+0\s+R', m.group(1)):
            res[nm.decode()] = int(num)
    return res

for pi, pn in enumerate(pages, 1):
    body = objs[pn]
    fonts = page_fonts(body)
    cont = re.search(rb'/Contents\s*(\[.*?\]|\d+\s+0\s+R)', body, re.S).group(1)
    refs = [int(x) for x in re.findall(rb'(\d+)\s+0\s+R', cont)]
    content = b''
    for r in refs:
        s = stream(objs[r])
        if s:
            content += s + b'\n'
    out = []
    cur = {}
    lasty = None
    tokens = re.finditer(rb'/(\w+)\s+[\d.]+\s+Tf|\[(.*?)\]\s*TJ|<([0-9A-Fa-f]*)>\s*Tj|\((.*?)(?<!\\)\)\s*Tj|([\d.\-]+)\s+([\d.\-]+)\s+Td|[\d.\-]+\s+[\d.\-]+\s+[\d.\-]+\s+[\d.\-]+\s+([\d.\-]+)\s+([\d.\-]+)\s+Tm|\bET\b|T\*', content, re.S)
    mp = {}
    def dec(hexs):
        h = hexs.decode()
        res = ''
        # assume 2-byte codes if mapping keys exceed 255 else 1 byte
        step = 4
        for i in range(0, len(h), step):
            code = int(h[i:i+step], 16)
            res += mp.get(code, '?')
        return res
    for t in tokens:
        if t.group(1):
            fn = fonts.get(t.group(1).decode())
            mp = fontmaps.get(fn, {})
        elif t.group(2) is not None:
            arr = t.group(2)
            s = ''
            for part in re.finditer(rb'<([0-9A-Fa-f]*)>|\(((?:\\.|[^\\)])*)\)|(-?[\d.]+)', arr):
                if part.group(1) is not None:
                    s += dec(part.group(1))
                elif part.group(2) is not None:
                    s += part.group(2).decode('latin1')
                elif part.group(3) is not None:
                    try:
                        if float(part.group(3)) < -200:
                            s += ' '
                    except: pass
            out.append(s)
        elif t.group(3) is not None:
            out.append(dec(t.group(3)))
        elif t.group(4) is not None:
            out.append(t.group(4).decode('latin1'))
        elif t.group(5) is not None:
            try:
                if abs(float(t.group(6))) > 0.5:
                    out.append('\n')
            except: pass
        elif t.group(7) is not None:
            out.append('\n')
        elif t.group(0) == b'ET':
            out.append('\n')
        elif t.group(0) == b'T*':
            out.append('\n')
    print('=== PAGE', pi, '===')
    print(''.join(out))

