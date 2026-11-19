from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image, ImageFont
from pypdf import PdfReader
fontpath='tmp/pdfs/ABeeZee.ttf'
pdfmetrics.registerFont(TTFont('School',fontpath))
pdfmetrics.registerFont(TTFont('Label',fontpath))
im=Image.open('tmp/pdfs/reference.png')
w,h=im.size
im.crop((int(w*.34),int(h*.15),int(w*.66),int(h*.28))).save('tmp/pdfs/car.png')
measure=ImageFont.truetype(fontpath,1000)
size=(40/3)/(-measure.getbbox('a',anchor='ls')[1]/1000)
capheight=size*(-measure.getbbox('A',anchor='ls')[1]/1000)
out='output/pdf/Auto-car-ABeeZee-A4.pdf'
c=canvas.Canvas(out,pagesize=A4)
c.setTitle('Auto / car | ABeeZee')
c.setAuthor('')
W,H=A4
c.setFont('Label',11)
c.setFillGray(.25)
c.drawString(37,H-37,'Meine ersten Wörter')
c.setFont('Label',10)
c.drawRightString(W-37,H-37,'Name: ____________________')
c.drawImage('tmp/pdfs/car.png',W/2-82,H-174,width=164,height=96,preserveAspectRatio=True,anchor='c',mask='auto')
c.setFillGray(.25)
c.setFont('Label',10)
c.drawCentredString(W/2,H-194,'Erst nachspuren. Dann selbst schreiben.')
lefts=[37,312]
words=['Auto','car']
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
    c.setFont('School',27)
    c.drawString(x+76,H-232,word)
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
            c.setFont('School',size)
            c.drawString(linex+13,baseline,word)
c.setFillGray(.5)
c.setFont('Label',8)
c.drawCentredString(W/2,33,'ABeeZee  •  Auto / car  •  Druckgröße: 100 %')
c.showPage()
c.save()
r=PdfReader(out)
assert len(r.pages)==1
assert abs(float(r.pages[0].mediabox.width)-595.276)<.1
print(out)
