import UIKit

enum DuoLabLog {
  static func write(_ message: String) {
    NSLog("[DuoLab] %@", message)
  }

  static func rect(_ view: UIView?) -> String {
    guard let view, let window = view.window else { return "nil" }
    let r = view.convert(view.bounds, to: window)
    return "{\(Int(r.minX.rounded())),\(Int(r.minY.rounded())),\(Int(r.width.rounded())),\(Int(r.height.rounded()))}"
  }

  static func insets(_ i: UIEdgeInsets) -> String {
    "t\(Int(i.top)) l\(Int(i.left)) b\(Int(i.bottom)) r\(Int(i.right))"
  }
}

final class DuoLabNavLogger: NSObject, UINavigationControllerDelegate {
  let name: String

  init(name: String) {
    self.name = name
  }

  func navigationController(
    _ navigationController: UINavigationController,
    willShow viewController: UIViewController,
    animated: Bool
  ) {
    let interactive = navigationController.transitionCoordinator?.isInteractive ?? false
    DuoLabLog.write(
      "nav \(name) willShow \(viewController.title ?? "-") count=\(navigationController.viewControllers.count) interactive=\(interactive)"
    )
  }
}

final class DuoLabContentController: UIViewController {
  let name: String
  let depth: Int
  let field = UITextField()
  private var lastLog = ""
  private var didAutoPush = false

  init(name: String, depth: Int) {
    self.name = name
    self.depth = depth
    super.init(nibName: nil, bundle: nil)
    title = "\(name) \(depth)"
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    navigationItem.largeTitleDisplayMode = depth == 1 ? .always : .never
    let star = UIBarButtonItem(image: UIImage(systemName: "star"), style: .plain, target: nil, action: nil)
    star.accessibilityLabel = "\(name) star \(depth)"
    navigationItem.rightBarButtonItem = star
    if depth == 1 {
      let search = UISearchController(searchResultsController: nil)
      search.searchBar.accessibilityLabel = "\(name) search"
      navigationItem.searchController = search
      navigationItem.hidesSearchBarWhenScrolling = false
    }
    let tool = UIBarButtonItem(title: "Tool \(name)", style: .plain, target: nil, action: nil)
    tool.accessibilityLabel = "\(name) tool \(depth)"
    let share = UIBarButtonItem(systemItem: .action)
    share.accessibilityLabel = "\(name) share \(depth)"
    toolbarItems = [tool, .flexibleSpace(), share]

    let label = UILabel()
    label.text = "\(name) depth \(depth)"
    label.font = .preferredFont(forTextStyle: .headline)
    label.accessibilityLabel = "\(name) content \(depth)"
    field.placeholder = "\(name) field"
    field.borderStyle = .roundedRect
    field.accessibilityLabel = "\(name) field \(depth)"
    let stack = UIStackView(arrangedSubviews: [label, field])
    stack.axis = .vertical
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
    ])
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard depth == 1, !didAutoPush, let navigationController else { return }
    didAutoPush = true
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self, weak navigationController] in
      guard let self, let navigationController else { return }
      navigationController.pushViewController(
        DuoLabContentController(name: self.name, depth: 2), animated: true)
    }
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let nav = navigationController
    let line =
      "layout \(name) d\(depth) view=\(DuoLabLog.rect(view)) safe=\(DuoLabLog.insets(view.safeAreaInsets)) bar=\(DuoLabLog.rect(nav?.navigationBar)) toolbar=\(nav?.isToolbarHidden == false ? DuoLabLog.rect(nav?.toolbar) : "hidden") search=\(DuoLabLog.rect(navigationItem.searchController?.searchBar))"
    guard line != lastLog else { return }
    lastLog = line
    DuoLabLog.write(line)
  }
}

final class DuoLabPresentedController: UIViewController {
  let style: String
  let source: String
  private var lastLog = ""

  init(style: String, source: String) {
    self.style = style
    self.source = source
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .secondarySystemBackground
    let label = UILabel()
    label.text = "\(style) from \(source)"
    label.accessibilityLabel = "presented \(style) from \(source)"
    label.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(label)
    NSLayoutConstraint.activate([
      label.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
      label.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
    ])
    preferredContentSize = CGSize(width: 320, height: 240)
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let line =
      "presented \(style) from \(source) frame=\(DuoLabLog.rect(view)) container=\(DuoLabLog.rect(presentationController?.containerView)) safe=\(DuoLabLog.insets(view.safeAreaInsets)) actualStyle=\(presentationController?.presentationStyle.rawValue ?? -1)"
    guard line != lastLog else { return }
    lastLog = line
    DuoLabLog.write(line)
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    DuoLabLog.write("presented \(style) from \(source) disappeared beingDismissed=\(isBeingDismissed)")
  }
}

@available(iOS 27.1, *)
final class DuoLabPageController: UIViewController, DuoSpikeArrangementPage {
  let mode: String
  let arrangement = UIArrangementViewController()
  private(set) var primary: UIViewController!
  private(set) var secondary: UIViewController!
  private var loggers: [DuoLabNavLogger] = []
  private var lastLog = ""

  init(mode: String) {
    self.mode = mode
    super.init(nibName: nil, bundle: nil)
    title = "Lab \(mode)"
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  private func makeNav(_ name: String) -> UINavigationController {
    let nav = UINavigationController(rootViewController: DuoLabContentController(name: name, depth: 1))
    nav.navigationBar.prefersLargeTitles = true
    nav.setToolbarHidden(false, animated: false)
    let logger = DuoLabNavLogger(name: name)
    loggers.append(logger)
    nav.delegate = logger
    return nav
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    primary = makeNav("primary")
    if mode == "splitvc" {
      let split = UISplitViewController(style: .doubleColumn)
      split.setViewController(makeNav("sv-sidebar"), for: .primary)
      split.setViewController(makeNav("sv-detail"), for: .secondary)
      secondary = split
    } else {
      secondary = makeNav("secondary")
    }
    arrangement.setViewController(primary, for: .primary)
    arrangement.setViewController(secondary, for: .secondary)
    switch mode {
    case "split":
      arrangement.updateArrangement(.split)
    case "fraction":
      var split = UISplitArrangement.split
      var properties = split.defaultViewProperties
      properties.width.preferred = .fractional(0.35)
      split.setViewProperties(properties, for: .primary)
      arrangement.updateArrangement(split.axes(.horizontal))
    case "overlay":
      arrangement.updateArrangement(.overlay)
    case "overlay-h":
      arrangement.updateArrangement(.overlay.axes(.horizontal))
    case "overlay-edge":
      var overlay = UIOverlayArrangement.overlay
      var properties = overlay.defaultViewProperties
      properties.edge = .trailing
      overlay.setViewProperties(properties, for: .secondary)
      arrangement.updateArrangement(overlay)
    default:
      arrangement.updateArrangement(.split.axes(.horizontal))
    }
    addChild(arrangement)
    arrangement.view.frame = view.bounds
    arrangement.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(arrangement.view)
    arrangement.didMove(toParent: self)
  }

  private func describe(_ placement: UIArrangementViewController.ViewPlacement, _ vc: UIViewController?) -> String {
    guard let state = arrangement.state(for: placement) else { return "state=nil frame=\(DuoLabLog.rect(vc?.view))" }
    let axis = state.splitAxis == .horizontal ? "h" : state.splitAxis == .vertical ? "v" : "\(state.splitAxis.rawValue)"
    return "frame=\(DuoLabLog.rect(vc?.view)) hidden=\(state.isHidden) z=\(state.zIndex) axis=\(axis)"
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let line =
      "page \(mode) bounds=\(DuoLabLog.rect(view)) safe=\(DuoLabLog.insets(view.safeAreaInsets)) primary[\(describe(.primary, primary))] secondary[\(describe(.secondary, secondary))]"
    guard line != lastLog else { return }
    lastLog = line
    DuoLabLog.write(line)
  }

  func navigation(for pane: String) -> UINavigationController? {
    if pane == "primary" { return primary as? UINavigationController }
    if let split = secondary as? UISplitViewController {
      return split.viewController(for: .secondary) as? UINavigationController
    }
    return secondary as? UINavigationController
  }
}

final class DuoLabCenter: NSObject, UINavigationControllerDelegate {
  static let shared = DuoLabCenter()

  private var navigation: UINavigationController?
  private weak var page: UIViewController?
  private var observing = false

  func present(mode: String) {
    guard #available(iOS 27.1, *) else { return }
    if navigation != nil { dismiss() }
    observeKeyboard()
    let lab = DuoLabPageController(mode: mode)
    page = lab
    let nav: UINavigationController
    if mode == "pushed" {
      let root = DuoLabContentController(name: "outer-root", depth: 0)
      nav = UINavigationController(rootViewController: root)
      nav.delegate = self
      nav.modalPresentationStyle = .fullScreen
      topPresenter()?.present(nav, animated: true) {
        nav.pushViewController(lab, animated: true)
      }
    } else {
      nav = UINavigationController(rootViewController: lab)
      nav.delegate = self
      nav.modalPresentationStyle = .fullScreen
      nav.setNavigationBarHidden(true, animated: false)
      topPresenter()?.present(nav, animated: true)
    }
    navigation = nav
    DuoLabLog.write("present mode=\(mode)")
  }

  func presentFromPane(pane: String, style: String) {
    guard #available(iOS 27.1, *), let lab = page as? DuoLabPageController,
      let nav = lab.navigation(for: pane), let top = nav.topViewController
    else {
      DuoLabLog.write("presentFromPane missing pane=\(pane)")
      return
    }
    let presented = DuoLabPresentedController(style: style, source: pane)
    switch style {
    case "page": presented.modalPresentationStyle = .pageSheet
    case "form": presented.modalPresentationStyle = .formSheet
    case "full": presented.modalPresentationStyle = .fullScreen
    case "popover":
      presented.modalPresentationStyle = .popover
      presented.popoverPresentationController?.sourceItem = top.navigationItem.rightBarButtonItem
    default: presented.modalPresentationStyle = .automatic
    }
    top.present(presented, animated: true)
  }

  func dismissPresented() {
    guard #available(iOS 27.1, *), let lab = page as? DuoLabPageController else { return }
    for pane in ["primary", "secondary"] {
      lab.navigation(for: pane)?.topViewController?.presentedViewController?.dismiss(animated: true)
    }
  }

  func focus(pane: String) {
    guard #available(iOS 27.1, *), let lab = page as? DuoLabPageController,
      let top = lab.navigation(for: pane)?.topViewController as? DuoLabContentController
    else { return }
    top.field.becomeFirstResponder()
  }

  func blur() {
    navigation?.view.endEditing(true)
  }

  func popPane(pane: String) {
    guard #available(iOS 27.1, *), let lab = page as? DuoLabPageController else { return }
    lab.navigation(for: pane)?.popViewController(animated: true)
  }

  func dismiss() {
    navigation?.dismiss(animated: true)
    navigation = nil
  }

  func navigationController(
    _ navigationController: UINavigationController,
    willShow viewController: UIViewController,
    animated: Bool
  ) {
    let interactive = navigationController.transitionCoordinator?.isInteractive ?? false
    DuoLabLog.write(
      "nav outer willShow \(viewController.title ?? "-") count=\(navigationController.viewControllers.count) interactive=\(interactive)"
    )
    navigationController.setNavigationBarHidden(viewController is DuoSpikeArrangementPage, animated: animated)
  }

  private func observeKeyboard() {
    guard !observing else { return }
    observing = true
    NotificationCenter.default.addObserver(
      forName: UIResponder.keyboardWillChangeFrameNotification, object: nil, queue: .main
    ) { note in
      let end = (note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue ?? .zero
      let screen = (note.object as? UIScreen)?.bounds ?? .zero
      DuoLabLog.write(
        "keyboard end={\(Int(end.minX)),\(Int(end.minY)),\(Int(end.width)),\(Int(end.height))} screen={\(Int(screen.width)),\(Int(screen.height))}"
      )
    }
  }

  private func topPresenter() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    var presenter = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
    while let next = presenter?.presentedViewController {
      presenter = next
    }
    return presenter
  }
}
