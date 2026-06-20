import fpdf
import io

pdf = fpdf.FPDF()
pdf.add_page()
pdf.set_font('Helvetica', 'B', 16)
pdf.cell(0, 10, 'Hello')

try:
    buf = io.BytesIO()
    res = pdf.output(buf)
    print("Output with buffer:", type(res))
    print("Buffer length:", len(buf.getvalue()))
except Exception as e:
    print("Exception with buffer:", e)

try:
    res = pdf.output()
    print("Output without buffer:", type(res))
    print("Length:", len(res))
except Exception as e:
    print("Exception without buffer:", e)
