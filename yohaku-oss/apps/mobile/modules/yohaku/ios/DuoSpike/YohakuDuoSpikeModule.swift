import ExpoModulesCore

public class YohakuDuoSpikeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YohakuDuoSpike")

    Function("isArrangementAvailable") { () -> Bool in
      if #available(iOS 27.1, *) { return true }
      return false
    }

    AsyncFunction("present") {
      DuoSpikeCenter.shared.present()
    }.runOnQueue(.main)

    AsyncFunction("pushOuter") { (label: String) in
      DuoSpikeCenter.shared.pushOuter(label: label)
    }.runOnQueue(.main)

    AsyncFunction("setOuterBarOnPage") { (visible: Bool) in
      DuoSpikeCenter.shared.setOuterBarOnPage(visible)
    }.runOnQueue(.main)

    AsyncFunction("popOuter") {
      DuoSpikeCenter.shared.popOuter()
    }.runOnQueue(.main)

    AsyncFunction("lab") { (action: String, first: String, second: String) in
      let lab = DuoLabCenter.shared
      switch action {
      case "present": lab.present(mode: first)
      case "sheet": lab.presentFromPane(pane: first, style: second)
      case "unsheet": lab.dismissPresented()
      case "focus": lab.focus(pane: first)
      case "blur": lab.blur()
      case "pop": lab.popPane(pane: first)
      case "close": lab.dismiss()
      default: DuoLabLog.write("unknown action \(action)")
      }
    }.runOnQueue(.main)

    AsyncFunction("main") { (action: String) in
      let main = DuoMainSpikeCenter.shared
      switch action {
      case "install": main.install()
      case "outer": main.pushOuter(label: "outer over main")
      case "pop": main.popOuter()
      case "report": main.report()
      default: DuoLabLog.write("unknown main action \(action)")
      }
    }.runOnQueue(.main)

    AsyncFunction("dismiss") {
      DuoSpikeCenter.shared.dismiss()
    }.runOnQueue(.main)
  }
}
