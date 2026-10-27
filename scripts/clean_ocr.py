#!/usr/bin/env python3
import json,re,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
items=sorted((root/"content/cards").glob("*.json"))
weak=0
for p in items:
    c=json.loads(p.read_text("utf-8"))
    raw=c.get("composition","")
    if not raw:continue
    lines=[]
    suspect=False
    for line in raw.splitlines():
        match=re.match(r'^(\s*[-*]\s+)(.*)$',line)
        if match:
            pre,s=match.groups()
            s=re.sub(r'^(?:[›»«®¢©‚]|[eоoс›])\s+', '',s).strip()
            s=re.sub(r'^[›»«®¢©‚]\s*','',s).strip()
            line=pre+s
        if re.search(r'[A-Z]{3,}\s+[A-Z]{3,}|[A-Za-z]{4,}\s+[А-Яа-я]|[А-Яа-я]\s+[A-Za-z]{4,}',line):
            suspect=True
        if re.search(r'[›»«®¢©‚]',line):suspect=True
        lines.append(line)
    c["composition"]="\n".join(lines)
    # OCR confidence is only indicative; preserve both source and review flag.
    c["compositionNeedsReview"]=bool(c.get("compositionNeedsReview") or suspect)
    if c["compositionNeedsReview"]:weak+=1
    p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+"\n","utf-8")
print("Cleaned:",len(items),"flagged:",weak)
