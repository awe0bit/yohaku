import ExpoModulesCore
import UIKit

struct DuoImageSource: Record {
  @Field var uri = ""
  @Field var scale: Double = 1
  @Field var width: Double?
  @Field var height: Double?
}

final class DuoTabView: ExpoView {
  private(set) lazy var controller = DuoHostedController(hosting: self)
  private var renderingMode: UIImage.RenderingMode = .alwaysTemplate
  private var icon: DuoImageSource?
  private var selectedIcon: DuoImageSource?
  private var inactiveTint: UIColor?
  private var loadedIcon: UIImage?

  func setTitle(_ title: String) {
    controller.tabBarItem.title = title
  }

  func setSystemImage(_ name: String?) {
    guard let name else { return }
    controller.tabBarItem.image = UIImage(systemName: name)
  }

  func setSelectedSystemImage(_ name: String?) {
    controller.tabBarItem.selectedImage = name.flatMap { UIImage(systemName: $0) }
  }

  func setIconRenderingMode(_ mode: String) {
    renderingMode = mode == "original" ? .alwaysOriginal : .alwaysTemplate
    reloadIcons()
  }

  func setIcon(_ source: DuoImageSource?) {
    icon = source
    reloadIcons()
  }

  func setSelectedIcon(_ source: DuoImageSource?) {
    selectedIcon = source
    reloadIcons()
  }

  func setInactiveTint(_ color: UIColor?) {
    inactiveTint = color
    applyIcon()
  }

  private func applyIcon() {
    guard let loadedIcon else { return }
    if let inactiveTint, renderingMode == .alwaysTemplate {
      controller.tabBarItem.image = loadedIcon.withTintColor(inactiveTint, renderingMode: .alwaysOriginal)
    } else {
      controller.tabBarItem.image = loadedIcon
    }
  }

  private func reloadIcons() {
    DuoImageLoader.load(icon, renderingMode: renderingMode) { [weak self] image in
      guard let self, let image else { return }
      loadedIcon = image
      applyIcon()
    }
    DuoImageLoader.load(selectedIcon ?? icon, renderingMode: renderingMode) { [weak self] image in
      guard let image else { return }
      self?.controller.tabBarItem.selectedImage = image
    }
  }
}

enum DuoImageLoader {
  static func load(
    _ source: DuoImageSource?,
    renderingMode: UIImage.RenderingMode,
    completion: @escaping @MainActor (UIImage?) -> Void
  ) {
    guard let source, let url = URL(string: source.uri) else { return }
    let scale = CGFloat(source.scale)
    let size = source.width.flatMap { width in
      source.height.map { CGSize(width: width, height: $0) }
    }
    URLSession.shared.dataTask(with: url) { data, _, _ in
      let decoded = data.flatMap { UIImage(data: $0, scale: scale) }
      Task { @MainActor in
        completion(decoded.map { fitted($0, to: size).withRenderingMode(renderingMode) })
      }
    }.resume()
  }

  private static func fitted(_ image: UIImage, to size: CGSize?) -> UIImage {
    guard let size, image.size != size else { return image }
    let format = UIGraphicsImageRendererFormat.preferred()
    format.scale = image.scale
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
  }
}

final class DuoTabsView: ExpoView, UITabBarControllerDelegate {
  let onTabSelect = EventDispatcher()
  private let tabs = UITabBarController()
  private var items: [DuoTabView] = []
  private var selectedIndex = 0
  private var inactiveTint: UIColor?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    tabs.delegate = self
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    duoEmbed(tabs)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    tabs.view.frame = bounds
  }

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let item = childComponentView as? DuoTabView else { return }
    item.setInactiveTint(inactiveTint)
    items.insert(item, at: min(index, items.count))
    sync()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    items.removeAll { $0 === childComponentView }
    sync()
  }

  func setTintColor(_ color: UIColor?) {
    tabs.view.tintColor = color
    tabs.tabBar.tintColor = color
  }

  func setInactiveTintColor(_ color: UIColor?) {
    inactiveTint = color
    tabs.tabBar.unselectedItemTintColor = color
    items.forEach { $0.setInactiveTint(color) }
  }

  func setSelectedIndex(_ index: Int) {
    selectedIndex = index
    if index < items.count, tabs.selectedIndex != index {
      tabs.selectedIndex = index
    }
  }

  private func sync() {
    tabs.setViewControllers(items.map(\.controller), animated: false)
    if selectedIndex < items.count {
      tabs.selectedIndex = selectedIndex
    }
  }

  func tabBarController(
    _ tabBarController: UITabBarController,
    didSelect viewController: UIViewController
  ) {
    onTabSelect(["index": tabBarController.selectedIndex])
  }
}
