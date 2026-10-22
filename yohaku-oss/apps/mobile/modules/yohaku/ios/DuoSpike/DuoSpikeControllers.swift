import UIKit

protocol DuoSpikeArrangementPage: UIViewController {}

final class DuoSpikeSurfaceController: UIViewController {
  private let module: String
  private let props: [String: Any]

  init(module: String, props: [String: Any], title: String? = nil) {
    self.module = module
    self.props = props
    super.init(nibName: nil, bundle: nil)
    self.title = title
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  override func loadView() {
    let surface = YohakuSurfaces.make?(module, props) ?? UIView()
    surface.backgroundColor = .systemBackground
    view = surface
  }
}

@available(iOS 27.1, *)
final class DuoSpikePageController: UIViewController, DuoSpikeArrangementPage {
  private let primary = DuoSpikeSurfaceController(module: "DuoSpikePane", props: ["pane": "primary"])
  private let secondary = DuoSpikeSurfaceController(
    module: "DuoSpikePane", props: ["pane": "secondary"])
  private let arrangement = UIArrangementViewController()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    title = "Duo page"
    navigationItem.rightBarButtonItem = UIBarButtonItem(systemItem: .add)
    navigationItem.rightBarButtonItem?.accessibilityLabel = "outer add"
    arrangement.setViewController(primary, for: .primary)
    arrangement.setViewController(secondary, for: .secondary)
    arrangement.updateArrangement(.split.axes(.horizontal))
    addChild(arrangement)
    arrangement.view.frame = view.bounds
    arrangement.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(arrangement.view)
    arrangement.didMove(toParent: self)
  }
}

final class DuoSpikeUnsupportedController: UIViewController, DuoSpikeArrangementPage {
  var onClose: (() -> Void)?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    let label = UILabel()
    label.text = "UIArrangementViewController requires iOS 27.1"
    label.textAlignment = .center
    label.numberOfLines = 0
    let close = UIButton(
      configuration: .bordered(),
      primaryAction: UIAction(title: "Close") { [weak self] _ in self?.onClose?() })
    let stack = UIStackView(arrangedSubviews: [label, close])
    stack.axis = .vertical
    stack.spacing = 16
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.layoutMarginsGuide.leadingAnchor),
    ])
  }
}

final class DuoSpikeCenter: NSObject, UINavigationControllerDelegate {
  static let shared = DuoSpikeCenter()

  private var navigation: UINavigationController?
  private var outerBarOnPage = false

  func present() {
    guard navigation == nil, let presenter = topPresenter() else { return }
    let root: UIViewController
    if #available(iOS 27.1, *) {
      root = DuoSpikePageController()
    } else {
      let fallback = DuoSpikeUnsupportedController()
      fallback.onClose = { [weak self] in self?.dismiss() }
      root = fallback
    }
    let nav = UINavigationController(rootViewController: root)
    nav.delegate = self
    nav.modalPresentationStyle = .fullScreen
    nav.setNavigationBarHidden(true, animated: false)
    navigation = nav
    presenter.present(nav, animated: true)
  }

  func pushOuter(label: String) {
    let page = DuoSpikeSurfaceController(module: "DuoSpikeFull", props: ["label": label], title: label)
    navigation?.pushViewController(page, animated: true)
  }

  func setOuterBarOnPage(_ visible: Bool) {
    outerBarOnPage = visible
    guard let navigation, let top = navigation.topViewController else { return }
    navigation.setNavigationBarHidden(
      top is DuoSpikeArrangementPage && !visible, animated: true)
  }

  func popOuter() {
    navigation?.popViewController(animated: true)
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
    navigationController.setNavigationBarHidden(
      viewController is DuoSpikeArrangementPage && !outerBarOnPage, animated: animated)
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
