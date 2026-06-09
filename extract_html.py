import re

with open('components/PublishableAnalysisReport.tsx', 'r') as f:
    content = f.read()

# 1. Extract the body of generateBlogHTML
pattern = r'const generateBlogHTML = \(\) => \{\n(.*?)\n  \};\n\n  return \(\n    <div className="fixed'
match = re.search(pattern, content, re.DOTALL)
if not match:
    print("Match failed!")
    exit(1)

body = match.group(1)

# Modify the body slightly to add youtubeScript if present
youtube_script_html = """
        ${summaryReport.youtubeScript ? `
        <section style="margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #fff1f2, #ffe4e6); border-radius: 10px; border: 2px solid #e11d48;">
            <h2 style="color: #be123c; font-size: 1.6em; margin-bottom: 20px; text-align: center;">▶️ YouTube Video Script</h2>
            <div style="font-family: monospace; white-space: pre-wrap; color: #881337; line-height: 1.8; background: white; padding: 20px; border-radius: 8px; border: 1px solid #fda4af;">
                ${summaryReport.youtubeScript}
            </div>
        </section>
        ` : ''}
"""

body = body.replace('        <footer class="footer">', youtube_script_html + '\n        <footer class="footer">')

# Create the new standalone function
new_function = f"""
export const generateHTMLReportString = (
  movieTitle: string,
  layerAnalyses: LayerAnalysisData[],
  summaryReport: SummaryReportData,
  overallScore: number | null,
  morphokineticsAnalysis?: MorphokineticsAnalysis,
  personnelData?: PersonnelData,
  financialData?: FinancialAnalysisData
) => {{
{body}
}};
"""

# 2. Insert new function at the top (after imports)
content = content.replace("export const PublishableAnalysisReport", new_function + "\nexport const PublishableAnalysisReport")

# 3. Remove original generateBlogHTML from inside the component
content = content.replace(match.group(0), '  return (\n    <div className="fixed')

# 4. Replace generateBlogHTML() calls with generateHTMLReportString(...)
content = content.replace('generateBlogHTML()', 'generateHTMLReportString(movieTitle, layerAnalyses, summaryReport, overallScore, morphokineticsAnalysis, personnelData, financialData)')

with open('components/PublishableAnalysisReport.tsx', 'w') as f:
    f.write(content)
print("Success!")
