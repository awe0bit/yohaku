import ExpoModulesCore
import UIKit

struct DuoBarMenuAction: Record {
  @Field var id = ""
  @Field var title = ""
  @Field var systemImage: String?
  @Field var group: String?
}

struct DuoBarItem: Record {
  @Field var id = ""
  @Field var systemImage = ""
  @Field var label = ""
  @Field var menu: [DuoBarMenuAction] = []
}

final class DuoScreenView: DuoSizedView {
  let onBarItem = EventDispatcher()
  var routeKey = ""
  var presentation = "push"
  var animation = "default"
  var headerShown = true
  var detents: [Double] = []
  var grabberVisible = false
  var largestUndimmedDetentIndex: Int?

  var isModal: Bool { presentation != "push" }

  override func layoutSubviews() {
    super.layoutSubviews()
    if let container = superview?.bounds.size { fitYoga(to: container) }
  }

  private(set) lazy var controller: DuoHostedController = {
    let controller = DuoHostedController(hosting: self)
    controller.navigationItem.largeTitleDisplayMode = .never
    return controller
  }()

  func setTitle(_ title: String) {
    controller.navigationItem.title = title
  }

  func setTitleHidden(_ hidden: Bool) {
    controller.navigationItem.titleView = hidden ? UIView() : nil
  }

  func setHeaderShown(_ shown: Bool) {
    headerShown = shown
    guard let navigation = controller.navigationController,
      navigation.topViewController === controller
    else { return }
    navigation.setNavigationBarHidden(!shown, animated: false)
  }

  func setBarItems(_ items: [DuoBarItem]) {
    controller.navigationItem.rightBarButtonItems = items.map(barButton)
  }

  private func barButton(_ item: DuoBarItem) -> UIBarButtonItem {
    let image = UIImage(systemName: item.systemImage)
    let button: UIBarButtonItem
    if item.menu.isEmpty {
      button = UIBarButtonItem(
        image: image,
        primaryAction: UIAction { [weak self] _ in self?.onBarItem(["id": item.id]) })
    } else {
      button = UIBarButtonItem(image: image, menu: menu(item.menu))
    }
    button.accessibilityLabel = item.label
    return button
  }

  private func menu(_ actions: [DuoBarMenuAction]) -> UIMenu {
    var groups: [(String?, [UIAction])] = []
    for action in actions {
      let element = UIAction(
        title: action.title, image: action.systemImage.flatMap { UIImage(systemName: $0) }
      ) { [weak self] _ in self?.onBarItem(["id": action.id]) }
      if let last = groups.last, last.0 == action.group {
        groups[groups.count - 1].1.append(element)
      } else {
        groups.append((action.group, [element]))
      }
    }
    if groups.count == 1 { return UIMenu(children: groups[0].1) }
    return UIMenu(children: groups.map { UIMenu(options: .displayInline, children: $0.1) })
  }
}

private final class DuoModalGroup {
  let navigation: UINavigationController
  let root: DuoScreenView
  private let touches = YohakuDuoTouchBridge()

  init(navigation: UINavigationController, root: DuoScreenView) {
    self.navigation = navigation
    self.root = root
    touches.attach(to: navigation.view)
  }

  deinit {
    touches.detach()
  }
}

final class DuoStackView: ExpoView, UINavigationControllerDelegate,
  UIAdaptivePresentationControllerDelegate
{
  let onNativePop = EventDispatcher()
  let onTransition = EventDispatcher()
  private let navigation = UINavigationController()
  private var screens: [DuoScreenView] = []
  private var modals: [DuoModalGroup] = []
  private var presenting = false
  private let popGesture = DuoPopGestureDelegate()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    configure(navigation)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    duoEmbed(navigation)
    sync()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    navigation.view.frame = bounds
  }

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let screen = childComponentView as? DuoScreenView else { return }
    screens.insert(screen, at: min(index, screens.count))
    sync()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    screens.removeAll { $0 === childComponentView }
    sync()
  }

  private func configure(_ navigation: UINavigationController) {
    navigation.delegate = self
    popGesture.navigations.add(navigation)
    let appearance = UINavigationBarAppearance()
    appearance.configureWithTransparentBackground()
    navigation.navigationBar.standardAppearance = appearance
    navigation.navigationBar.scrollEdgeAppearance = appearance
    navigation.navigationBar.compactAppearance = appearance
  }

  private func groups() -> [[DuoScreenView]] {
    var result: [[DuoScreenView]] = [[]]
    for screen in screens {
      if screen.isModal, !result[0].isEmpty {
        result.append([screen])
      } else {
        result[result.count - 1].append(screen)
      }
    }
    return result
  }

  private func sync() {
    guard window != nil, !presenting else { return }
    let groups = groups()
    setStack(navigation, groups[0])
    let wanted = Array(groups.dropFirst())

    var kept = 0
    while kept < modals.count, kept < wanted.count, modals[kept].root === wanted[kept].first {
      kept += 1
    }
    if kept < modals.count {
      let dismissed = modals[kept]
      modals.removeSubrange(kept...)
      presenting = true
      dismissed.navigation.presentingViewController?.dismiss(animated: true) { [weak self] in
        self?.presenting = false
        self?.sync()
      }
      return
    }
    for index in 0..<kept {
      setStack(modals[index].navigation, wanted[index])
    }
    guard kept < wanted.count, let root = wanted[kept].first else { return }
    let modal = makeModal(root)
    setStack(modal, wanted[kept])
    let host = modals.last?.navigation ?? navigation
    modals.append(DuoModalGroup(navigation: modal, root: root))
    presenting = true
    emitTransition(root, phase: "start", closing: false)
    host.present(modal, animated: root.animation != "none") { [weak self] in
      self?.presenting = false
      self?.emitTransition(root, phase: "end", closing: false)
      self?.sync()
    }
  }

  private func claimPopGesture(_ navigation: UINavigationController) {
    navigation.loadViewIfNeeded()
    var recognizers = [navigation.interactivePopGestureRecognizer]
    if #available(iOS 26.0, *) {
      recognizers.append(navigation.interactiveContentPopGestureRecognizer)
    }
    for case let recognizer? in recognizers where recognizer.delegate !== popGesture {
      recognizer.delegate = popGesture
    }
  }

  private func setStack(_ navigation: UINavigationController, _ group: [DuoScreenView]) {
    claimPopGesture(navigation)
    let desired = group.map(\.controller)
    guard navigation.viewControllers != desired else { return }
    let animated =
      navigation.view.window != nil && !navigation.viewControllers.isEmpty
      && group.last?.animation != "none"
    navigation.setViewControllers(desired, animated: animated)
    if !animated, let top = group.last {
      navigation.setNavigationBarHidden(!top.headerShown, animated: false)
    }
  }

  private func makeModal(_ root: DuoScreenView) -> UINavigationController {
    let modal = UINavigationController()
    configure(modal)
    switch root.presentation {
    case "fullScreenModal":
      modal.modalPresentationStyle = .fullScreen
    case "formSheet":
      modal.modalPresentationStyle = .formSheet
      if let sheet = modal.sheetPresentationController {
        configureSheet(sheet, for: root)
      }
    default:
      modal.modalPresentationStyle = .pageSheet
    }
    modal.presentationController?.delegate = self
    return modal
  }

  private func configureSheet(_ sheet: UISheetPresentationController, for screen: DuoScreenView) {
    let fractions = screen.detents.isEmpty ? [1] : screen.detents
    let detents: [UISheetPresentationController.Detent] = fractions.enumerated().map {
      index, fraction in
      if fraction >= 1 { return .large() }
      return .custom(identifier: .init("duo-\(index)")) { context in
        context.maximumDetentValue * fraction
      }
    }
    sheet.detents = detents
    sheet.prefersGrabberVisible = screen.grabberVisible
    if let index = screen.largestUndimmedDetentIndex, index < detents.count {
      sheet.largestUndimmedDetentIdentifier = detents[index].identifier
    }
  }

  private func nativeCount() -> Int {
    navigation.viewControllers.count + modals.reduce(0) { $0 + $1.navigation.viewControllers.count }
  }

  private func emitTransition(_ screen: DuoScreenView?, phase: String, closing: Bool) {
    guard let screen, !screen.routeKey.isEmpty else { return }
    onTransition(["closing": closing, "key": screen.routeKey, "phase": phase])
  }

  private func screen(for controller: UIViewController?) -> DuoScreenView? {
    (controller as? DuoHostedController)?.view as? DuoScreenView
  }

  func navigationController(
    _ navigationController: UINavigationController,
    willShow viewController: UIViewController,
    animated: Bool
  ) {
    let incoming = screen(for: viewController)
    navigationController.setNavigationBarHidden(
      !(incoming?.headerShown ?? true), animated: animated)
    let outgoing = navigationController.transitionCoordinator?.viewController(forKey: .from)
    emitTransition(incoming, phase: "start", closing: false)
    if outgoing !== viewController {
      emitTransition(screen(for: outgoing), phase: "start", closing: true)
    }
    navigationController.transitionCoordinator?.animate(alongsideTransition: nil) {
      [weak self] context in
      guard !context.isCancelled else { return }
      self?.emitTransition(self?.screen(for: outgoing), phase: "end", closing: true)
    }
  }

  func navigationController(
    _ navigationController: UINavigationController,
    didShow viewController: UIViewController,
    animated: Bool
  ) {
    emitTransition(screen(for: viewController), phase: "end", closing: false)
    let shown = nativeCount()
    guard shown < screens.count else { return }
    onNativePop(["count": screens.count - shown])
  }

  func navigationController(
    _ navigationController: UINavigationController,
    animationControllerFor operation: UINavigationController.Operation,
    from fromVC: UIViewController,
    to toVC: UIViewController
  ) -> UIViewControllerAnimatedTransitioning? {
    let fades = [fromVC, toVC].contains { screen(for: $0)?.animation == "fade" }
    return fades ? DuoFadeTransition() : nil
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    guard
      let index = modals.firstIndex(where: {
        $0.navigation === presentationController.presentedViewController
      }),
      let rootIndex = screens.firstIndex(where: { $0 === modals[index].root })
    else { return }
    let root = modals[index].root
    modals.removeSubrange(index...)
    emitTransition(root, phase: "end", closing: true)
    onNativePop(["count": screens.count - rootIndex])
  }
}

private final class DuoPopGestureDelegate: NSObject, UIGestureRecognizerDelegate {
  let navigations = NSHashTable<UINavigationController>.weakObjects()

  func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard
      let owner = navigations.allObjects.first(where: { $0.view === gestureRecognizer.view }),
      owner.viewControllers.count > 1, owner.transitionCoordinator == nil
    else { return false }
    guard gestureRecognizer !== owner.interactivePopGestureRecognizer,
      let pan = gestureRecognizer as? UIPanGestureRecognizer, let view = pan.view
    else { return true }
    let translation = pan.translation(in: view)
    if translation != .zero, translation.x <= abs(translation.y) { return false }
    let touched = view.hitTest(pan.location(in: view), with: nil)
    return !canScrollLeft(from: touched, below: view)
  }

  private func canScrollLeft(from view: UIView?, below root: UIView) -> Bool {
    var current = view
    while let candidate = current, candidate !== root {
      if let scroll = candidate as? UIScrollView,
        scroll.contentSize.width > scroll.bounds.width + 1,
        scroll.contentOffset.x > -scroll.adjustedContentInset.left + 1
      {
        return true
      }
      current = candidate.superview
    }
    return false
  }
}

private final class DuoFadeTransition: NSObject, UIViewControllerAnimatedTransitioning {
  func transitionDuration(using context: UIViewControllerContextTransitioning?) -> TimeInterval {
    0.2
  }

  func animateTransition(using context: UIViewControllerContextTransitioning) {
    guard let to = context.view(forKey: .to) else {
      context.completeTransition(!context.transitionWasCancelled)
      return
    }
    let from = context.view(forKey: .from)
    if let toController = context.viewController(forKey: .to) {
      to.frame = context.finalFrame(for: toController)
    }
    to.alpha = 0
    context.containerView.addSubview(to)
    UIView.animate(
      withDuration: transitionDuration(using: context),
      animations: {
        to.alpha = 1
        from?.alpha = 0
      },
      completion: { _ in
        from?.alpha = 1
        context.completeTransition(!context.transitionWasCancelled)
      })
  }
}
