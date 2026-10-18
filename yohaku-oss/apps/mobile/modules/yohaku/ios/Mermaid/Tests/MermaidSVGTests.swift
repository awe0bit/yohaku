import AppKit
import Foundation
import JavaScriptCore
import Testing
@testable import MermaidCore

struct MermaidSVGTests {
  private func render(_ source: String, dark: Bool = false) throws -> String {
    let directory = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
    let context = try #require(JSContext())
    context.evaluateScript(try String(contentsOf: directory.appendingPathComponent("Resources/pele.js"), encoding: .utf8))
    let result = context.objectForKeyedSubscript("pele")?.forProperty("render")?.call(withArguments: [
      source, ["responsive": false, "fontFamily": "Arial", "links": false, "images": false],
    ])
    #expect(context.exception == nil)
    let svg = try #require(result?.forProperty("svg")?.toString())
    return try MermaidSVG.normalize(svg, bg: dark ? "#171717" : "#ffffff", fg: dark ? "#fafafa" : "#262626")
  }

  @Test func rendersSupportedDiagramTypesInBothThemes() throws {
    let diagrams = [
      "graph TD\n A[开始] --> B{判断}\n B -->|是| C[结束]",
      "sequenceDiagram\n participant 用户\n participant API\n 用户->>API: 请求\n API-->>用户: 响应",
      "classDiagram\n class Node {\n +String type\n +clone() Node\n }",
      "stateDiagram-v2\n [*] --> Idle\n Idle --> Done\n Done --> [*]",
      "erDiagram\n USER ||--o{ POST : writes",
      "pie title 技术栈\n \"Swift\" : 60\n \"TypeScript\" : 40",
      "gantt\n title 项目进度\n dateFormat YYYY-MM-DD\n section 开发\n 实现 :2026-10-01, 7d",
      "xychart-beta\n title \"Downloads\"\n x-axis [Jan, Feb]\n bar [10, 20]",
    ]
    for source in diagrams {
      for dark in [false, true] {
        let svg = try render(source, dark: dark)
        let image = try #require(NSImage(data: Data(svg.utf8)))
        var bounds = NSRect(origin: .zero, size: image.size)
        #expect(image.cgImage(forProposedRect: &bounds, context: nil, hints: nil) != nil)
        #expect(!svg.contains("var("))
        #expect(!svg.contains("color-mix("))
      }
    }
  }

  @Test func preservesPositionedTitlesAndMixedStyleLabels() throws {
    let svg = try render("flowchart TD\n A[\"`**粗体** and *italic*<br/>第二行`\"] --> B[\"literal var(--example) & text\"]")
    #expect(svg.contains("粗体"))
    #expect(svg.contains("第二行"))
    #expect(svg.contains("literal var(--example) &amp; text"))
    #expect(svg.contains("font-weight=\"bold\""))
    #expect(svg.contains("font-style=\"italic\""))
  }

  @Test func drawsPositionedSpanTextAtItsIntendedLocation() throws {
    let input = """
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" font-family="Arial" font-size="20">
        <rect width="200" height="120" fill="#fff"/>
        <text fill="#000" text-anchor="middle"><tspan x="100" y="65">TEST</tspan></text>
      </svg>
      """
    let svg = try MermaidSVG.normalize(input, bg: "#fff", fg: "#000")
    let image = try #require(NSImage(data: Data(svg.utf8)))
    var bounds = NSRect(origin: .zero, size: image.size)
    let cg = try #require(image.cgImage(forProposedRect: &bounds, context: nil, hints: nil))
    let bitmap = NSBitmapImageRep(cgImage: cg)
    var ink = 0
    for y in (bitmap.pixelsHigh / 3)..<(bitmap.pixelsHigh * 2 / 3) {
      for x in (bitmap.pixelsWide / 3)..<(bitmap.pixelsWide * 2 / 3) {
        if let color = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB), color.redComponent < 0.5 { ink += 1 }
      }
    }
    #expect(ink > 20)
  }

  @Test func nativeBoldAndItalicChangeTheRenderedPixels() throws {
    func pixels(_ style: String) throws -> Data {
      let input = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"120\" font-family=\"Arial\" font-size=\"24\"><rect width=\"200\" height=\"120\" fill=\"#fff\"/><text x=\"100\" y=\"65\" text-anchor=\"middle\" \(style)>Test</text></svg>"
      let svg = try MermaidSVG.normalize(input, bg: "#fff", fg: "#000")
      let image = try #require(NSImage(data: Data(svg.utf8)))
      var bounds = NSRect(origin: .zero, size: image.size)
      let cg = try #require(image.cgImage(forProposedRect: &bounds, context: nil, hints: nil))
      return try #require(cg.dataProvider?.data) as Data
    }
    let plain = try pixels("")
    #expect(try pixels("font-weight=\"bold\"") != plain)
    #expect(try pixels("font-style=\"italic\"") != plain)
  }

  @Test func resolvesNestedSubgraphColorsAndEscapesTextOnce() throws {
    let svg = try render("flowchart TD\n subgraph Outer\n subgraph Inner\n A[\"x & y\"] --> B\n end\n end", dark: true)
    #expect(!svg.contains("color-mix("))
    #expect(svg.contains("x &amp; y"))
    #expect(!svg.contains("&amp;amp;"))
  }

  @Test func rejectsInvalidXML() {
    #expect(throws: (any Error).self) { try MermaidSVG.normalize("<svg>", bg: "#fff", fg: "#111") }
  }

  @Test func rejectsMalformedColorsWithoutCrashing() {
    for weight in ["1..2", "101", String(repeating: "9", count: 400)] {
      #expect(throws: (any Error).self) {
        try MermaidSVG.normalize("<svg fill=\"color-mix(in srgb,#fff \(weight)%,#000)\"></svg>", bg: "#fff", fg: "#111")
      }
    }
  }

  @Test func rejectsInvalidNativeFontSizes() {
    for size in ["0", "-5", String(repeating: "9", count: 400)] {
      #expect(throws: (any Error).self) {
        try MermaidSVG.normalize("<svg><text x=\"0\" y=\"20\" font-size=\"\(size)\">text</text></svg>", bg: "#fff", fg: "#111")
      }
    }
  }
}
