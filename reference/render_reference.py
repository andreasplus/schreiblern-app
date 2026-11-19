import math
import json
import argparse
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import ImageFont
from pypdf import PdfReader,PdfWriter
BASE = Path(__file__).resolve().parent
fontpath=str(BASE / 'assets' / 'ABeeZee.ttf')
pdfmetrics.registerFont(TTFont('School',fontpath))
pdfmetrics.registerFont(TTFont('Label',fontpath))
measure=ImageFont.truetype(fontpath,1000)
size=(40/3)/(-measure.getbbox('a',anchor='ls')[1]/1000)
W,H=A4
pairs=[('Auto','car'),('blau','blue'),('Haus','house'),('Maus','mouse'),('Tisch','table'),('Ball','ball'),('Hund','dog'),('Katze','cat'),('Fisch','fish'),('Kuh','cow'),('Ei','egg'),('Milch','milk'),('Brot','bread'),('Apfel','apple'),('Banane','banana'),('rot','red'),('grün','green'),('gelb','yellow'),('Sonne','sun'),('Mond','moon'),('Stern','star'),('Bett','bed'),('Hand','hand'),('Buch','book'),('Mama','mom')]
nums=list(zip(['eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn'],['one','two','three','four','five','six','seven','eight','nine','ten']))
colors={'blau':'#3286df','rot':'#e74941','grün':'#53a861','gelb':'#ffda38'}
def illustration(c,word,n=None):
 c.saveState()
 c.translate(W/2,H-127)
 c.setLineWidth(2.5)
 c.setStrokeColorRGB(.16,.22,.25)
 def fill(col): c.setFillColor(col)
 def ellipse(x,y,rx,ry,col):
  fill(col)
  c.ellipse(x-rx,y-ry,x+rx,y+ry,stroke=1,fill=1)
 def rect(x,y,w,h,col):
  fill(col)
  c.roundRect(x,y,w,h,4,stroke=1,fill=1)
 def poly(points,col):
  fill(col)
  p=c.beginPath()
  p.moveTo(*points[0])
  for pt in points[1:]: p.lineTo(*pt)
  p.close()
  c.drawPath(p,stroke=1,fill=1)
 def line(x,y,a,b): c.line(x,y,a,b)
 def eyes(y=4):
  for x in [-15,15]: ellipse(x,y,2,3,'#263940')
 if n is not None:
  c.setFont('School',65)
  fill('#263940')
  c.drawCentredString(0,0,str(n))
  for i in range(n):
   x=((i%5)-(min(n,5)-1)/2)*21
   y=-20-(i//5)*18
   ellipse(x,y,5,5,'#4792c2')
 elif word=='Auto':
  c.drawImage(str(BASE / 'assets' / 'car.png'),-82,-47,width=164,height=96,preserveAspectRatio=True,mask='auto')
 elif word in colors: ellipse(0,0,42,42,colors[word])
 elif word=='Haus':
  rect(-42,-38,84,62,'#ffdf9a')
  poly([(-52,24),(0,64),(52,24)],'#e87758')
  rect(-9,-38,20,35,'#ab754e')
  for x in [-28,22]: rect(x,1,17,17,'#b6e2ef')
 elif word=='Tisch':
  rect(-65,9,130,15,'#c99662')
  for x in [-52,44]: rect(x,-43,9,52,'#c99662')
 elif word in ['Maus','Hund','Katze','Kuh']:
  if word=='Maus':
   for x in [-32,32]: ellipse(x,30,21,22,'#b5bac0')
   for x in [-32,32]: ellipse(x,30,12,13,'#ecc6c9')
   ellipse(0,-1,43,37,'#b5bac0')
  elif word=='Hund':
   for x in [-37,37]: ellipse(x,0,18,39,'#956546')
   ellipse(0,0,39,39,'#d4a879')
  elif word=='Katze':
   poly([(-38,16),(-40,51),(-12,32)],'#e0ae70')
   poly([(38,16),(40,51),(12,32)],'#e0ae70')
   ellipse(0,0,42,35,'#e0ae70')
  else:
   for x in [-44,44]: ellipse(x,20,20,11,'#f0e8dc')
   for x in [-24,24]: poly([(x-6,33),(x,58),(x+7,32)],'#e8cc94')
   ellipse(0,0,40,40,'#f9f6ed')
   ellipse(-22,20,10,13,'#384248')
  eyes()
  if word=='Kuh':
   ellipse(0,-19,28,16,'#e5b1b3')
   for x in [-10,10]: ellipse(x,-19,2,3,'#555555')
  else:
   ellipse(0,-12,6,4,'#634b4b')
   if word in ['Maus','Katze']:
    for side in [-1,1]:
     for dy in [-6,1,8]: line(side*13,-13,side*50,-13+dy)
 elif word=='Ball':
  ellipse(0,0,43,43,'#ef8c55')
  c.arc(-43,-43,43,43,10,160)
  line(-40,-14,40,14)
 elif word=='Fisch':
  poly([(27,0),(65,33),(65,-33)],'#edb04e')
  ellipse(-8,0,48,29,'#6abed3')
  ellipse(-32,7,3,3,'#263940')
  poly([(-3,27),(14,45),(23,21)],'#edb04e')
 elif word=='Ei': ellipse(0,0,31,44,'#fff4da')
 elif word=='Milch':
  rect(-27,-43,54,71,'#f6fafb')
  poly([(-27,28),(-12,48),(27,48),(27,28)],'#a9d8ef')
  rect(-18,-18,36,29,'#a9d8ef')
  c.setFont('School',12)
  fill('#263940')
  c.drawCentredString(0,-8,'Milch')
 elif word=='Brot':
  rect(-58,-28,116,57,'#d19b55')
  for x in [-31,-5,21]:
   c.setStrokeColorRGB(.57,.35,.14)
   c.setLineWidth(5)
   line(x,12,x+10,23)
 elif word=='Apfel':
  ellipse(-17,-3,30,35,'#e96251')
  ellipse(17,-3,30,35,'#e96251')
  c.setLineWidth(5)
  line(0,26,4,47)
  ellipse(18,43,16,7,'#6ea05e')
 elif word=='Banane':
  fill('#ffdc52')
  p=c.beginPath()
  p.moveTo(-55,32)
  p.curveTo(-45,-64,41,-71,62,23)
  p.curveTo(28,-22,-17,-28,-55,32)
  p.close()
  c.drawPath(p,stroke=1,fill=1)
  line(-55,32,-58,42)
 elif word=='Sonne':
  for i in range(12):
   a=i*math.pi/6
   line(39*math.cos(a),39*math.sin(a),53*math.cos(a),53*math.sin(a))
  ellipse(0,0,29,29,'#ffcf43')
 elif word=='Mond':
  fill('#f4d466')
  p=c.beginPath()
  p.moveTo(21,43)
  p.curveTo(-65,50,-65,-50,21,-43)
  p.curveTo(-17,-23,-17,23,21,43)
  p.close()
  c.drawPath(p,stroke=1,fill=1)
 elif word=='Stern':
  pts=[]
  for i in range(10):
   a=math.pi/2+i*math.pi/5
   r=49 if i%2==0 else 22
   pts.append((r*math.cos(a),r*math.sin(a)))
  poly(pts,'#ffcf43')
 elif word=='Bett':
  rect(-60,-18,120,26,'#a9cbd8')
  rect(-61,-31,8,70,'#b4865b')
  rect(53,-31,8,51,'#b4865b')
  rect(-49,8,31,16,'#fff5df')
  rect(-17,8,70,19,'#73b5c9')
 elif word=='Hand':
  fill('#f0c8a7')
  p=c.beginPath()
  p.moveTo(-17,-49)
  p.lineTo(-20,-24)
  p.curveTo(-40,-8,-58,3,-49,12)
  p.curveTo(-43,18,-29,4,-23,2)
  p.lineTo(-25,39)
  p.curveTo(-25,53,-12,53,-11,39)
  p.lineTo(-10,14)
  p.lineTo(-8,54)
  p.curveTo(-7,66,6,66,6,53)
  p.lineTo(7,14)
  p.lineTo(11,45)
  p.curveTo(13,58,25,55,24,42)
  p.lineTo(22,10)
  p.lineTo(29,30)
  p.curveTo(34,41,44,37,40,25)
  p.lineTo(31,-11)
  p.curveTo(28,-25,22,-27,21,-49)
  p.close()
  c.drawPath(p,stroke=1,fill=1)
 elif word=='Buch':
  poly([(-57,-31),(-57,34),(-8,29),(0,23),(8,29),(57,34),(57,-31),(8,-36),(0,-42),(-8,-36)],'#fff6db')
  line(0,-40,0,23)
  for yy in [-20,-7,6,19]:
   line(-47,yy,-13,yy-4)
   line(13,yy-4,47,yy)
 elif word=='Blitz':
  poly([(-2,54),(34,54),(9,10),(32,10),(-29,-58),(-13,-7),(-35,-7)],'#ffd129')
 elif word=='Mama':
  ellipse(0,6,40,49,'#865c43')
  ellipse(0,7,28,33,'#f1c5a5')
  ellipse(-16,33,16,10,'#865c43')
  eyes(9)
  c.arc(-10,-10,10,3,190,160)
  fill('#bb87bb')
  p=c.beginPath()
  p.moveTo(-43,-57)
  p.curveTo(-38,-13,38,-13,43,-57)
  p.close()
  c.drawPath(p,stroke=1,fill=1)
 c.restoreState()


def columns(c,de,en,number=None):
    lefts=[37,312]
    words=[de,en]
    langs=['DEUTSCH','ENGLISCH']
    for x,word,lang in zip(lefts,words,langs):
        fx,fy,fw,fh=x,H-229,29,18
        if lang=='DEUTSCH':
            for i,color in enumerate([(1,.8,0),(.82,0,0),(0,0,0)]):
                c.setFillColorRGB(*color)
                c.rect(fx,fy+i*fh/3,fw,fh/3,stroke=0,fill=1)
        else:
            c.setFillColorRGB(.02,.12,.36)
            c.rect(fx,fy,fw,fh,stroke=0,fill=1)
            c.saveState()
            clip=c.beginPath()
            clip.rect(fx,fy,fw,fh)
            c.clipPath(clip,stroke=0,fill=0)
            c.setStrokeColorRGB(1,1,1)
            c.setLineWidth(4)
            c.line(fx,fy,fx+fw,fy+fh)
            c.line(fx,fy+fh,fx+fw,fy)
            c.setStrokeColorRGB(.78,.04,.14)
            c.setLineWidth(1.5)
            c.line(fx,fy-.5,fx+fw,fy+fh-.5)
            c.line(fx,fy+fh-.5,fx+fw,fy-.5)
            c.setFillColorRGB(1,1,1)
            c.rect(fx,fy+fh/2-3,fw,6,stroke=0,fill=1)
            c.rect(fx+fw/2-3,fy,6,fh,stroke=0,fill=1)
            c.setFillColorRGB(.78,.04,.14)
            c.rect(fx,fy+fh/2-1.8,fw,3.6,stroke=0,fill=1)
            c.rect(fx+fw/2-1.8,fy,3.6,fh,stroke=0,fill=1)
            c.restoreState()
        c.setFillGray(.08)
        c.setFont('School',min(27,160/pdfmetrics.stringWidth(word,'School',1)))
        c.drawString(x+76,H-232,word)
        if number is not None:
            c.drawString(x+207,H-232,str(number))
        for row in range(6):
            baseline=H-302-row*78
            top=baseline+80/3
            middle=baseline+40/3
            bottom=baseline-40/3
            housex=x
            linex=x+22
            end=x+246
            c.setStrokeGray(.55)
            c.setLineWidth(.65)
            for yy in [top,middle,baseline,bottom]:
                c.line(linex,yy,end,yy)
            c.setStrokeGray(.35)
            c.setLineWidth(.85)
            p=c.beginPath()
            p.moveTo(housex,bottom)
            p.lineTo(housex,middle)
            p.lineTo(housex+11,top)
            p.lineTo(linex,middle)
            p.lineTo(linex,bottom)
            p.close()
            c.drawPath(p)
            c.line(housex,middle,linex,middle)
            c.line(housex,baseline,linex,baseline)
            c.rect(housex+7,baseline,8,10,stroke=1,fill=0)
            c.line(housex+5,bottom+5,housex+16,bottom+5)
            c.line(housex+8,bottom+8,housex+14,bottom+8)
            if row<3:
                c.setFillGray(.79)
                c.setFont('School',min(size,170/pdfmetrics.stringWidth(word,'School',1)))
                c.drawString(linex+13,baseline,word)
                if number is not None:
                    c.setFont('School',size)
                    c.drawString(x+207,baseline,str(number))

def render(entries, output):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output), pagesize=A4)
    c.setTitle('Schreibseiten | ABeeZee')
    for entry in entries:
        de, en = entry['de'], entry['en']
        number = entry.get('number')
        c.setFont('Label', 11)
        c.setFillGray(.25)
        c.drawString(37, H-37, 'Meine ersten Zahlen' if number else 'Meine ersten Wörter')
        c.setFont('Label', 10)
        c.drawRightString(W-37, H-37, 'Name: ____________________')
        illustration(c, entry.get('pictogram_key', de), number)
        columns(c, de, en, number)
        c.setFillGray(.5)
        c.setFont('Label', 8)
        c.drawCentredString(W/2, 33, f'ABeeZee  •  {de} / {en}  •  Druckgröße: 100 %')
        c.showPage()
    c.save()
    result = PdfReader(str(output))
    assert len(result.pages) == len(entries)
    for page in result.pages:
        assert abs(float(page.mediabox.width)-595.276) < .1
        assert abs(float(page.mediabox.height)-841.890) < .1
    print(f'{len(entries)} Seiten: {output}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Portable PDF-Layoutreferenz, keine WebApp')
    parser.add_argument('--output', default='generated/schreibseiten.pdf')
    parser.add_argument('--word', help='Einzelnes deutsches Wort')
    parser.add_argument('--english', help='Englische Übersetzung für ein neues Wort')
    parser.add_argument('--pictogram', help='Vorhandener Bildschlüssel, etwa Blitz oder Haus')
    args = parser.parse_args()
    entries = json.loads((BASE.parent / 'data' / 'seed-words.json').read_text(encoding='utf-8'))
    if args.word:
        matches = [e for e in entries if e['de'].casefold() == args.word.casefold()]
        if not matches and not args.english:
            parser.error('Wort unbekannt. Bitte --english angeben. Es erfolgt keine automatische Übersetzung.')
        entries = matches or [{'de': args.word, 'en': args.english, 'pictogram_key': args.pictogram or ''}]
    else:
        entries = [e for e in entries if e.get('set') != 'extra']
    if args.pictogram:
        for entry in entries:
            entry['pictogram_key'] = args.pictogram
    render(entries, args.output)
