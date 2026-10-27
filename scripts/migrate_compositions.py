#!/usr/bin/env python3
"""One-time OCR import of historical PNG recipes into editable Markdown.
The source images remain in the repository for audit and rollback.
"""
import csv, io, json, re, subprocess, statistics, pathlib, collections
from PIL import Image, ImageOps

ROOT=pathlib.Path(__file__).resolve().parents[1]
CARDS=ROOT/"content/cards"
REPORT=[]
def extract(path):
    im=Image.open(path).convert("RGB")
    W,H=im.size
    # Focus on the recipe body: omit red ornamental border and heading.
    crop=im.crop((int(.08*W),int(.115*H),int(.92*W),int(.91*H)))
    # Black text remains; red decoration is outside the crop.
    gray=ImageOps.grayscale(crop)
    bw=gray.point(lambda v:0 if v<180 else 255)
    data=subprocess.run(["tesseract","stdin","stdout","-l","rus+eng","--psm","6","tsv"],
         input=None,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,
         check=True,cwd=str(ROOT),text=False) if False else None
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        bw.save(tmp.name)
        result=subprocess.run(["tesseract",tmp.name,"stdout","-l","rus+eng","--psm","6","tsv"],
              stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,check=True)
    rows=list(csv.DictReader(io.StringIO(result.stdout.decode("utf-8","replace")),delimiter="\t"))
    groups=collections.defaultdict(list)
    for v in rows:
        word=v.get("text","").strip()
        if not word:continue
        try: conf=float(v.get("conf","-1"))
        except ValueError:continue
        if conf<0:continue
        key=(v["block_num"],v["par_num"],v["line_num"])
        groups[key].append((int(v["left"]),int(v["top"]),int(v["width"]),int(v["height"]),word,conf))
    lines=[]
    for group in groups.values():
        group.sort(key=lambda x:x[0])
        txt=" ".join(z[4] for z in group).strip()
        x=min(z[0] for z in group)
        y=min(z[1] for z in group)
        height=max(z[3] for z in group)
        mean=statistics.mean(z[5] for z in group)
        txt=re.sub(r"^[•●°*oО0-]+\s*","",txt).strip()
        if not txt:continue
        lines.append((y,x,height,txt,mean))
    lines.sort(key=lambda x:x[0])
    outputs=[]
    details=[]
    prev_y=None
    for y,x,h,txt,conf in lines:
        # Pixel-based marker detection, relative to the crop (600+ wide).
        center=int(y+h*0.54)
        def marks(a,b):
            x1=max(0,int(a*W)-int(.08*W))
            x2=min(bw.width,int(b*W)-int(.08*W))
            y1=max(0,center-10);y2=min(bw.height,center+12)
            return sum(1 for yy in range(y1,y2) for xx in range(x1,x2) if bw.getpixel((xx,yy))<100)
        main=marks(.095,.142)>18
        sub=marks(.160,.205)>16
        rel_y=y+int(.115*H)
        # A second line of a long heading may extend into the crop.
        if not outputs and rel_y<196 and not main and not sub and x>190:
            continue
        if sub and not main:
            outputs.append("  - "+txt);kind="nested"
        elif main:
            outputs.append("- "+txt);kind="item"
        elif txt.startswith("(") and outputs:
            outputs.append("  *"+txt+"*");kind="note"
        elif x>175 and not outputs:
            outputs.append("> "+txt);kind="center"
        elif x>175 and prev_y is not None and (rel_y-prev_y)>56:
            outputs.append("> "+txt);kind="center"
        elif outputs and prev_y is not None and (rel_y-prev_y)<72:
            outputs[-1]+=" "+txt;kind="continuation"
        else:
            outputs.append("- "+txt);kind="item_implicit"
        prev_y=rel_y
        details.append({"y":rel_y,"x":x+int(.08*W),"kind":kind,"confidence":round(conf,1),"text":txt})
    # Remove an occasional stray border fragment from the OCR.
    md="\n".join(outputs).strip()
    score=round(statistics.mean(z[4] for z in lines),1) if lines else 0
    return md,score,details

for file in sorted(CARDS.glob("*.json")):
    card=json.loads(file.read_text(encoding="utf-8"))
    back=card.get("back","").lstrip("/")
    src=ROOT/back
    if not src.is_file():
        REPORT.append({"id":card.get("id",file.stem),"error":"missing source image","path":back})
        continue
    md,conf,details=extract(src)
    if not md:
        REPORT.append({"id":card.get("id",file.stem),"error":"no text recognized","path":back})
        continue
    # All content becomes editable; original image remains for review.
    card["composition"]=md
    card["compositionSource"]=card.get("back","")
    card["compositionOcrConfidence"]=conf
    card["compositionNeedsReview"]= conf < 76
    file.write_text(json.dumps(card,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    REPORT.append({"id":card.get("id",file.stem),"title":card["title"],"confidence":conf,
                   "review":card["compositionNeedsReview"],"lines":len(details),"ocr":md,"detail":details})
report=ROOT/"migration-report.json"
report.write_text(json.dumps({"total":len(REPORT),
           "recognized":sum("ocr" in v for v in REPORT),
           "reviewNeeded":sum(bool(v.get("review")) for v in REPORT),
           "entries":REPORT},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Recognized",sum("ocr" in v for v in REPORT),"of",len(REPORT),
      "need review",sum(bool(v.get("review")) for v in REPORT))
