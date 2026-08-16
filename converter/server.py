#!/usr/bin/env python3
"""deck-converter: POST /convert (multipart 'file') -> JSON {ok, count, pages:[jpeg base64,...]}.
Hỗ trợ .pdf (poppler) và .pptx/.ppt/.odp (LibreOffice -> pdf -> poppler). Xác thực bằng header x-token."""
import os, subprocess, base64, tempfile, glob
from flask import Flask, request, jsonify

TOKEN = os.environ.get('CONVERTER_TOKEN', '')
PORT = int(os.environ.get('PORT', '8630'))
DOC_EXT = ('pptx', 'ppt', 'odp', 'key')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 80 * 1024 * 1024  # 80MB


@app.get('/healthz')
def health():
    return 'ok'


@app.post('/convert')
def convert():
    if TOKEN and request.headers.get('x-token') != TOKEN:
        return jsonify(ok=False, error='unauthorized'), 401
    f = request.files.get('file')
    if not f or not f.filename:
        return jsonify(ok=False, error='no file'), 400
    try:
        dpi = max(72, min(int(request.form.get('dpi', '150')), 200))
    except ValueError:
        dpi = 150
    name = f.filename
    ext = (name.rsplit('.', 1)[-1] if '.' in name else '').lower()

    with tempfile.TemporaryDirectory() as td:
        src = os.path.join(td, 'in.' + (ext or 'bin'))
        f.save(src)

        if ext in DOC_EXT:
            r = subprocess.run(
                ['soffice', '--headless', '--nologo', '--nofirststartwizard',
                 '--convert-to', 'pdf', '--outdir', td, src],
                capture_output=True, timeout=180, env={**os.environ, 'HOME': td})
            pdfs = glob.glob(os.path.join(td, '*.pdf'))
            if not pdfs:
                return jsonify(ok=False, error='convert-failed',
                               detail=(r.stderr or r.stdout).decode('utf-8', 'ignore')[:400]), 500
            pdf = pdfs[0]
        elif ext == 'pdf':
            pdf = src
        else:
            return jsonify(ok=False, error='unsupported extension: ' + (ext or '?')), 400

        outbase = os.path.join(td, 'page')
        subprocess.run(
            ['pdftoppm', '-jpeg', '-r', str(dpi), '-scale-to-x', '1600', '-scale-to-y', '-1', pdf, outbase],
            capture_output=True, timeout=180)
        imgs = sorted(glob.glob(outbase + '*.jpg'))
        pages = []
        for p in imgs:
            with open(p, 'rb') as fh:
                pages.append(base64.b64encode(fh.read()).decode('ascii'))
        if not pages:
            return jsonify(ok=False, error='no pages rendered'), 500
        return jsonify(ok=True, count=len(pages), pages=pages)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, threaded=True)
