import ExpoModulesCore
import UIKit

// Positions come from Yoga so Pressable hit regions match the screen; the glide
// only animates the jump Yoga already made, from the old spot to the new one.
class DuoColumnView: ExpoView {
  var crossfades = false
  private var glideDeadline: Date?
  private var resting: (minX: CGFloat, width: CGFloat)?

  func glideNextMove() {
    glideDeadline = Date().addingTimeInterval(0.6)
  }

  override var center: CGPoint {
    didSet { setNeedsLayout() }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let now = (minX: center.x - bounds.width / 2, width: bounds.width)
    defer { resting = now }
    guard let previous = resting, let deadline = glideDeadline, deadline > Date(),
      abs(previous.minX - now.minX) > 0.5 || abs(previous.width - now.width) > 0.5
    else { return }
    glideDeadline = nil
    if crossfades {
      alpha = 0
      UIView.animate(
        springDuration: 0.3, bounce: 0, initialSpringVelocity: 0, delay: 0.3, options: []
      ) { self.alpha = 1 }
      return
    }
    transform = CGAffineTransform(translationX: previous.minX - now.minX, y: 0)
    UIView.animate(springDuration: 0.45, bounce: 0) { self.transform = .identity }
  }
}

final class DuoReadableView: DuoHingeView {
  let onColumnFrame = EventDispatcher()
  private let clip = UIView()
  private let slider = UIView()
  private var maxWidth = CGFloat.greatestFiniteMagnitude
  private var lastFrame: (left: CGFloat, width: CGFloat)?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    // A widening column glides in from where the narrow one sat, so it can reach
    // past the trailing status column mid-slide unless it is clipped.
    clip.clipsToBounds = true
    clip.addSubview(slider)
    addSubview(clip)
  }

  func setMaxWidth(_ value: Double?) {
    maxWidth = value.map { CGFloat($0) } ?? .greatestFiniteMagnitude
    report()
  }

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    slider.insertSubview(childComponentView, at: index)
    report()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    clip.frame = CGRect(
      x: safeAreaInsets.left, y: 0,
      width: max(0, bounds.width - safeAreaInsets.left - safeAreaInsets.right),
      height: bounds.height)
    slider.frame = CGRect(
      x: -safeAreaInsets.left, y: 0, width: bounds.width, height: bounds.height)
    report()
  }

  override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    setNeedsLayout()
  }

  override func dockingDidChange() {
    for case let column as DuoColumnView in slider.subviews {
      column.glideNextMove()
    }
    report()
  }

  private func targetFrame() -> (left: CGFloat, width: CGFloat) {
    let safeMinX = safeAreaInsets.left
    let safeMaxX = bounds.width - safeAreaInsets.right
    let safeWidth = max(0, safeMaxX - safeMinX)
    let division = hingeDivision()
    if let division { learnBookPage(division: division) }
    let centeredWidth = columnWidth(fitting: safeWidth, maxWidth: maxWidth)
    guard docked, let division, division.maxX < safeMaxX else {
      return (left: safeMinX + (safeWidth - centeredWidth) / 2, width: centeredWidth)
    }
    return (left: division.maxX, width: safeMaxX - division.maxX)
  }

  private func report() {
    guard bounds.width > 0, !holdsTransitionalLayout else { return }
    let frame = targetFrame()
    guard lastFrame.map({ $0 != frame }) ?? true else { return }
    lastFrame = frame
    onColumnFrame(["left": Double(frame.left), "width": Double(frame.width)])
  }
}
