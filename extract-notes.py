#!/usr/bin/env python3
"""
Simple script to extract handwritten notes from a PDF using Claude.

Usage:
    ANTHROPIC_API_KEY="your-key" python extract-notes.py ~/Downloads/ligration.pdf

The extracted text will be printed to the terminal - copy and paste it into History Hub.
"""
import sys
import base64
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: ANTHROPIC_API_KEY='your-key' python extract-notes.py <pdf-or-image-file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: Set ANTHROPIC_API_KEY environment variable")
        print("Example: ANTHROPIC_API_KEY='sk-ant-...' python extract-notes.py file.pdf")
        sys.exit(1)
    
    print(f"Reading {filepath}...", file=sys.stderr)
    
    # Convert PDF to images or read image directly
    with open(filepath, "rb") as f:
        file_bytes = f.read()
    
    if filepath.lower().endswith('.pdf'):
        try:
            import pymupdf
        except ImportError:
            try:
                import fitz as pymupdf
            except ImportError:
                print("Error: Install PyMuPDF first: pip install PyMuPDF")
                sys.exit(1)
        
        print("Converting PDF pages to images...", file=sys.stderr)
        images = []
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        for i, page in enumerate(doc):
            print(f"  Page {i+1}...", file=sys.stderr)
            mat = pymupdf.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            images.append(("image/png", pix.tobytes("png")))
        doc.close()
    else:
        # Single image
        ext = filepath.lower().split('.')[-1]
        media_type = {"png": "image/png", "gif": "image/gif", "webp": "image/webp"}.get(ext, "image/jpeg")
        images = [(media_type, file_bytes)]
    
    print(f"Sending {len(images)} page(s) to Claude for transcription...", file=sys.stderr)
    
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    
    all_text = []
    for i, (media_type, img_bytes) in enumerate(images):
        print(f"  Transcribing page {i+1}...", file=sys.stderr)
        b64 = base64.b64encode(img_bytes).decode('utf-8')
        
        response = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=4096,
            system=(
                "You are a handwriting transcription assistant. "
                "Carefully read and transcribe ALL handwritten text visible in the image. "
                "Preserve the structure: keep paragraphs, bullet points, and line breaks. "
                "If text is unclear, make your best guess and continue. "
                "Output ONLY the transcribed text, nothing else."
            ),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": b64}
                        },
                        {"type": "text", "text": f"Transcribe all handwritten text from this image (page {i+1}):"}
                    ]
                }
            ],
        )
        
        text = response.content[0].text
        if text and text.strip():
            all_text.append(text.strip())
    
    print("\n" + "="*50, file=sys.stderr)
    print("EXTRACTED TEXT (copy this into History Hub):", file=sys.stderr)
    print("="*50 + "\n", file=sys.stderr)
    
    # Print the actual text to stdout
    print("\n\n".join(all_text))

if __name__ == "__main__":
    main()
