import ExpoModulesCore
import UIKit

final class DuoPaneView: DuoSizedView {
  var placement = "primary"

  private(set) lazy var controller = DuoPaneController(pane: self)
}

// The pane sits inside plain views the arrangement owns, so UIKit's frame and the
// one Fabric writes from Yoga never fight over the same view. The holder keeps the
// pane clear of the horizontal safe area, which the trailing status column claims.
final class DuoPaneController: UIViewController {
  private weak var pane: DuoPaneView?
  private let holder = UIView()

  init(pane: DuoPaneView) {
    self.pane = pane
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.addSubview(holder)
    if let pane { holder.addSubview(pane) }
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let insets = view.safeAreaInsets
    holder.frame = view.bounds.inset(
      by: UIEdgeInsets(top: 0, left: insets.left, bottom: 0, right: insets.right))
    pane?.fitYoga(to: holder.bounds.size)
  }
}

final class DuoArrangementView: ExpoView {
  private var arrangement: UIViewController?
  private var panes: [DuoPaneView] = []

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    if #available(iOS 27.1, *) {
      let arrangement = UIArrangementViewController()
      arrangement.updateArrangement(.split.axes(.horizontal))
      self.arrangement = arrangement
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if let arrangement { duoEmbed(arrangement) }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    arrangement?.view.frame = bounds
  }

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard arrangement != nil, let pane = childComponentView as? DuoPaneView else {
      super.mountChildComponentView(childComponentView, index: index)
      return
    }
    panes.append(pane)
    sync()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let pane = childComponentView as? DuoPaneView, panes.contains(where: { $0 === pane })
    else {
      super.unmountChildComponentView(childComponentView, index: index)
      return
    }
    panes.removeAll { $0 === pane }
    pane.removeFromSuperview()
    sync()
  }

  private func sync() {
    guard #available(iOS 27.1, *), let arrangement = arrangement as? UIArrangementViewController
    else { return }
    let slots: [(String, UIArrangementViewController.ViewPlacement)] = [
      ("primary", .primary), ("secondary", .secondary),
    ]
    for (name, placement) in slots {
      let controller = panes.first { $0.placement == name }?.controller
      guard arrangement.viewController(for: placement) !== controller else { continue }
      arrangement.setViewController(controller, for: placement)
    }
  }
}
