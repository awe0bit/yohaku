import UIKit

@available(iOS 27.1, *)
final class DuoMainPageController: UIViewController, DuoSpikeArrangementPage {
  private let primary: UIViewController
  private let secondary = DuoSpikeSurfaceController(
    module: "DuoSpikePane", props: ["pane": "secondary"])
  private let arrangement = UIArrangementViewController()

  init(primary: UIViewController) {
    self.primary = primary
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) { fatalError() }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    title = "Main page"
    arrangement.setViewController(primary, for: .primary)
    arrangement.setViewController(secondary, for: .secondary)
    arrangement.updateArrangement(.split.axes(.horizontal))
    addChild(arrangement)
    arrangement.view.frame = view.bounds
    arrangement.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(arrangement.view)
    arrangement.didMove(toParent: self)
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    DuoLabLog.write(
      "main page primary=\(DuoLabLog.rect(primary.viewIfLoaded)) secondary=\(DuoLabLog.rect(secondary.viewIfLoaded)) primarySafe=\(primary.viewIfLoaded.map { NSCoder.string(for: $0.safeAreaInsets) } ?? "nil")"
    )
  }
}

final class DuoMainSpikeCenter: NSObject, UINavigationControllerDelegate {
  static let shared = DuoMainSpikeCenter()

  private var navigation: UINavigationController?

  func install() {
    guard #available(iOS 27.1, *) else {
      DuoLabLog.write("main install skipped: iOS < 27.1")
      return
    }
    guard navigation == nil else {
      DuoLabLog.write("main install skipped: already installed")
      return
    }
    let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    guard let window = scene?.windows.first(where: \.isKeyWindow) ?? scene?.windows.first,
      let main = window.rootViewController
    else {
      DuoLabLog.write("main install skipped: no root")
      return
    }
    if let presented = main.presentedViewController {
      DuoLabLog.write("main install skipped: \(type(of: presented)) is presented")
      return
    }
    let nav = UINavigationController(rootViewController: DuoMainPageController(primary: main))
    nav.delegate = self
    nav.setNavigationBarHidden(true, animated: false)
    window.rootViewController = nil
    window.rootViewController = nav
    navigation = nav
    DuoLabLog.write("main installed root=\(type(of: main)) window=\(NSCoder.string(for: window.bounds))")
  }

  func pushOuter(label: String) {
    let page = DuoSpikeSurfaceController(module: "DuoSpikeFull", props: ["label": label], title: label)
    navigation?.pushViewController(page, animated: true)
  }

  func popOuter() {
    navigation?.popViewController(animated: true)
  }

  func report() {
    let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    var chain: [String] = []
    var presenter = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
    while let current = presenter {
      chain.append(String(describing: type(of: current)))
      presenter = current.presentedViewController
    }
    DuoLabLog.write(
      "main report windows=\(scene?.windows.count ?? 0) chain=\(chain.joined(separator: " > "))")
  }

  func navigationController(
    _ navigationController: UINavigationController,
    willShow viewController: UIViewController,
    animated: Bool
  ) {
    navigationController.setNavigationBarHidden(
      viewController is DuoSpikeArrangementPage, animated: animated)
  }
}
