from PIL import Image, ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parents[1]
im=Image.open(root/"images/Pizza/10.png").convert("RGB")
w,h=im.size
if (w,h)!=(800,1200):
    raise ValueError(f"Unexpected source resolution {w}x{h}")
d=ImageDraw.Draw(im)
# Remove the original recipe and heading, preserve every red pixel of the frame.
d.rectangle((116,54,683,113),fill="white")
d.rectangle((78,115,720,1091),fill="white")
d.rectangle((117,1092,682,1139),fill="white")
out=root/"images/composition-background.png"
out.parent.mkdir(exist_ok=True)
im.save(out,optimize=True)
print("Prepared original GARAGE frame:",out)
