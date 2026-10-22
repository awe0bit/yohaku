import ExpoModulesCore
import UIKit

final class DuoArticleSlotView: DuoColumnView {}

final class DuoArticleFrameView: DuoHingeView {
  private struct Layout: Equatable {
    var mode: String
    var body: Span
    var aside: Span
    var content: Span
  }

  private struct Span: Equatable {
    var x: CGFloat
    var width: CGFloat
  }

  private static let contentWidth: CGFloat = 600
  private static let asideGap: CGFloat = 40
  private static let asideWidth: CGFloat = 170
  private static let groupMargin: CGFloat = 20

  let onLayoutMode = EventDispatcher()
  var asideAvailable = false {
    didSet { report() }
  }
  private var lastLayout: Layout?

  override func layoutSubviews() {
    super.layoutSubviews()
    report()
  }

  override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    setNeedsLayout()
  }

  override func dockingDidChange() {
    for case let slot as DuoArticleSlotView in subviews {
      slot.glideNextMove()
    }
    report()
  }

  private func currentLayout() -> Layout {
    let safeMinX = safeAreaInsets.left
    let safeMaxX = bounds.width - safeAreaInsets.right
    let division = hingeDivision()
    if let division { learnBookPage(division: division) }
    if docked, let division, division.minX > safeMinX, division.maxX < safeMaxX {
      let bodyWidth = safeMaxX - division.maxX
      return Layout(
        mode: "book",
        body: Span(x: division.maxX, width: bodyWidth),
        aside: Span(x: safeMinX, width: division.minX - safeMinX),
        content: Span(x: 0, width: bodyWidth))
    }
    let group = Self.contentWidth + Self.asideGap + Self.asideWidth
    let safeWidth = safeMaxX - safeMinX
    let body = Span(x: 0, width: bounds.width)
    guard asideAvailable, safeWidth >= group + Self.groupMargin * 2 else {
      let width = columnWidth(fitting: safeWidth, maxWidth: Self.contentWidth)
      return Layout(
        mode: "single",
        body: body,
        aside: Span(x: safeMinX, width: 0),
        content: Span(x: safeMinX + (safeWidth - width) / 2, width: width))
    }
    let left = safeMinX + (safeWidth - group) / 2
    return Layout(
      mode: "flat",
      body: body,
      aside: Span(x: left + Self.contentWidth + Self.asideGap, width: Self.asideWidth),
      content: Span(x: left, width: Self.contentWidth))
  }

  private func report() {
    guard bounds.width > 0, !holdsTransitionalLayout else { return }
    let layout = currentLayout()
    guard layout != lastLayout else { return }
    lastLayout = layout
    onLayoutMode([
      "asideLeft": Double(layout.aside.x),
      "asideWidth": Double(layout.aside.width),
      "bodyLeft": Double(layout.body.x),
      "bodyWidth": Double(layout.body.width),
      "contentLeft": Double(layout.content.x),
      "contentWidth": Double(layout.content.width),
      "mode": layout.mode,
    ])
  }
}
