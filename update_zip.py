import re

with open('components/ReportDisplay.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { PublishableAnalysisReport } from './PublishableAnalysisReport';",
                          "import { PublishableAnalysisReport, generateHTMLReportString } from './PublishableAnalysisReport';")

# 2. Append youtubeScript to markdown report
# Find where the markdown generation ends
old_md_return = "return mdReport.trim();"
new_md_return = """if (summaryReportData.youtubeScript) {
      mdReport += `## YouTube Video Script\\n${summaryReportData.youtubeScript}\\n\\n`;
    }
    return mdReport.trim();"""
content = content.replace(old_md_return, new_md_return)

# 3. Increase timeout and quality for `toPng` in auto-archive section
auto_archive_png = """const ringsBase64 = await toPng(ringsElement, { backgroundColor: '#1e293b' });"""
content = content.replace("ringsBase64 = await toPng(ringsElement, { backgroundColor: '#1e293b' });",
                          "ringsBase64 = await toPng(ringsElement, { backgroundColor: '#1e293b', pixelRatio: 2 });")
content = content.replace("morphoBase64 = await toPng(morphoElement, { backgroundColor: '#1e293b' });",
                          "morphoBase64 = await toPng(morphoElement, { backgroundColor: '#1e293b', pixelRatio: 2 });")


# 4. Improve `toPng` in handleDownloadZip
old_zip_png_rings = """        // Delay slightly to ensure rendering
        await new Promise(r => setTimeout(r, 100));
        const ringsDataUrl = await toPng(ringsElement, { backgroundColor: '#1e293b' });"""
new_zip_png_rings = """        // Delay slightly to ensure rendering and fonts loaded
        await new Promise(r => setTimeout(r, 500));
        const ringsDataUrl = await toPng(ringsElement, { backgroundColor: '#1e293b', pixelRatio: 2, skipFonts: true });"""
content = content.replace(old_zip_png_rings, new_zip_png_rings)

old_zip_png_morpho = "const morphoDataUrl = await toPng(morphoElement, { backgroundColor: '#1e293b' });"
new_zip_png_morpho = "const morphoDataUrl = await toPng(morphoElement, { backgroundColor: '#1e293b', pixelRatio: 2, skipFonts: true });"
content = content.replace(old_zip_png_morpho, new_zip_png_morpho)

# 5. Add HTML to ZIP
old_zip_md = "zip.file(`${safeTitle}_report.md`, markdownContent);"
new_zip_md = """zip.file(`${safeTitle}_report.md`, markdownContent);
      
      // 1.2 Add HTML Report
      const htmlContent = generateHTMLReportString(title, layerAnalyses, summaryReportData, overallScore, morphokineticsAnalysis, personnelData, financialAnalysisData);
      zip.file(`${safeTitle}_report.html`, htmlContent);"""
content = content.replace(old_zip_md, new_zip_md)

with open('components/ReportDisplay.tsx', 'w') as f:
    f.write(content)
print("Updated ReportDisplay.tsx")
