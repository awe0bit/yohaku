import ExpoModulesCore
import UIKit

extension UIView {
  var duoParentViewController: UIViewController? {
    var responder: UIResponder? = next
    while let current = responder {
      if let controller = current as? UIViewController { return controller }
      responder = current.next
    }
    return nil
  }

  func duoEmbed(_ child: UIViewController) {
    guard window != nil, child.parent == nil, let parent = duoParentViewController else { return }
    parent.addChild(child)
    child.view.frame = bounds
    addSubview(child.view)
    child.didMove(toParent: parent)
    if #available(iOS 27.1, *) {
      parent.setNeedsUpdateOfVerticalBarConfiguration()
    }
  }
}

// Yoga still holds the frame from the React parent; a UIKit container can size the
// view differently, so the container's size has to flow back into Yoga.
class DuoSizedView: ExpoView {
  private var appliedSize: CGSize?

  func fitYoga(to size: CGSize) {
    guard size.width > 0, size != appliedSize else { return }
    appliedSize = size
    setStyleSize(NSNumber(value: Double(size.width)), height: NSNumber(value: Double(size.height)))
  }
}

final class DuoHostedController: UIViewController {
  private weak var hosted: UIView?

  init(hosting view: UIView) {
    hosted = view
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  override func loadView() {
    view = hosted ?? UIView()
  }

  @available(iOS 27.1, *)
  override var childForPreferredVerticalBarBehavior: UIViewController? {
    children.last
  }
}

class DuoHingeView: ExpoView {
  // Unfolding always passes through a partial opening, and the first layout on the
  // inner display lands before any hinge callback, so anything short of fully open
  // reads as the book posture. The status is shared so new views start from it.
  private static var lastStatus = "unknown"

  // Folded, the column takes the book page's width so the right page of a partial
  // unfold shows the same lines at the same scroll offset; it is learned from the
  // inner display, since the outer one has no hinge to measure.
  private static var bookPageWidth: CGFloat?

  private(set) var docked = DuoHingeView.lastStatus != "fullyOpen"
  private var status = DuoHingeView.lastStatus
  private var unfoldingFrom: CGSize?
  private var settledSizes: (view: CGSize, window: CGSize)?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    if #available(iOS 27.1, *) {
      addInteraction(
        UIHingeInteraction { [weak self] _, update in
          self?.hingeChanged(update.hinge)
        })
    }
  }

  func dockingDidChange() {}

  func columnWidth(fitting safeWidth: CGFloat, maxWidth: CGFloat) -> CGFloat {
    let width = min(maxWidth, safeWidth)
    guard status == "closed", let page = Self.bookPageWidth else { return width }
    return min(width, page)
  }

  func learnBookPage(division: CGRect) {
    Self.bookPageWidth = bounds.width - safeAreaInsets.right - division.maxX
  }

  // The active division registers after the hinge callback fires, so inactive
  // regions have to be included to read the hinge frame at that moment.
  func hingeDivision() -> CGRect? {
    guard #available(iOS 27.1, *) else { return nil }
    return reservedRegions(kind: .division, options: .includeInactive)
      .map(\.frame)
      .first { $0.minX > bounds.minX && $0.maxX < bounds.maxX }
  }

  // A display move resizes the window before this view, and leaving closed drops the
  // outer display's status column before the window moves at all. Layouts in either
  // gap are transitional, so the last settled layout holds until this view resizes.
  var holdsTransitionalLayout: Bool {
    guard let windowSize = window?.bounds.size else { return false }
    if let size = unfoldingFrom {
      if bounds.size == size { return true }
      unfoldingFrom = nil
    }
    if let settled = settledSizes, windowSize != settled.window, bounds.size == settled.view {
      return true
    }
    settledSizes = (bounds.size, windowSize)
    return false
  }

  @available(iOS 27.1, *)
  private func hingeChanged(_ hinge: UIHinge?) {
    let status: String
    switch hinge?.status {
    case .closed: status = "closed"
    case .partiallyOpen: status = "partiallyOpen"
    case .fullyOpen: status = "fullyOpen"
    default: status = "unknown"
    }
    Self.lastStatus = status
    if self.status == "closed", status != "closed" {
      unfoldingFrom = bounds.size
    } else if status == "closed" {
      unfoldingFrom = nil
    }
    if self.status != status { setNeedsLayout() }
    self.status = status
    let next = status != "fullyOpen"
    guard next != docked else { return }
    docked = next
    dockingDidChange()
  }
}
