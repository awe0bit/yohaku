import Foundation
import JavaScriptCore
import SDWebImage
import SDWebImageSVGCoder
import UIKit

actor MermaidEngine {
  static let shared = MermaidEngine()
  static let version = "pele-1.6.0-native-1"

  private var context: JSContext?

  func render(source: String, bg: String, fg: String, scale: CGFloat) throws -> UIImage {
    let context = try loadContext()
    context.exception = nil
    let result = context.objectForKeyedSubscript("yohakuRenderMermaid")?.call(withArguments: [source])
    if let exception = context.exception { throw RenderError.failed(exception.toString()) }
    guard let result, let svg = result.forProperty("svg")?.toString(),
          let width = result.forProperty("width")?.toDouble(),
          let height = result.forProperty("height")?.toDouble(),
          width.isFinite, height.isFinite, width > 0, height > 0,
          width * height * Double(scale * scale) <= 32_000_000
    else { throw RenderError.failed("Diagram is too large to render") }
    let normalized = try MermaidSVG.normalize(svg, bg: bg, fg: fg)
    guard let image = SDImageSVGCoder.shared.decodedImage(with: Data(normalized.utf8), options: nil)
    else { throw RenderError.failed("Diagram SVG could not be decoded") }
    let size = CGSize(width: width, height: height)
    let format = UIGraphicsImageRendererFormat()
    format.scale = scale
    format.opaque = true
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      (UIColor(richHex: bg) ?? .white).setFill()
      UIRectFill(CGRect(origin: .zero, size: size))
      image.draw(in: CGRect(origin: .zero, size: size))
    }
  }

  private func loadContext() throws -> JSContext {
    if let context { return context }
    guard let url = Bundle(for: ResourceToken.self).url(forResource: "YohakuMermaid", withExtension: "bundle"),
          let bundle = Bundle(url: url),
          let script = bundle.url(forResource: "pele", withExtension: "js"),
          let context = JSContext()
    else { throw RenderError.failed("Diagram engine is missing") }
    let measure: @convention(block) (String, Double, Int) -> Double = { text, size, style in
      let base = UIFont(name: style & 4 != 0 ? "CourierNewPSMT" : "ArialMT", size: size)
        ?? UIFont.systemFont(ofSize: size)
      var traits = base.fontDescriptor.symbolicTraits
      if style & 1 != 0 { traits.insert(.traitBold) }
      if style & 2 != 0 { traits.insert(.traitItalic) }
      let font = base.fontDescriptor.withSymbolicTraits(traits).map { UIFont(descriptor: $0, size: size) } ?? base
      return (text as NSString).size(withAttributes: [.font: font]).width
    }
    context.setObject(measure, forKeyedSubscript: "yohakuMeasureText" as NSString)
    context.evaluateScript(try String(contentsOf: script, encoding: .utf8))
    context.evaluateScript("""
      function yohakuRenderMermaid(source) {
        return pele.render(source, {
          fontFamily: 'ArialMT', fontFamilyMono: 'CourierNewPSMT', responsive: false,
          links: false, images: false, measurer: { width: yohakuMeasureText }
        });
      }
      """)
    if let exception = context.exception { throw RenderError.failed(exception.toString()) }
    self.context = context
    return context
  }

  private final class ResourceToken: NSObject {}

  private enum RenderError: Error, LocalizedError {
    case failed(String?)

    var errorDescription: String? {
      switch self { case .failed(let message): return message ?? "Diagram render failed" }
    }
  }
}
