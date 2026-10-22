import Foundation

enum DuoDevice {
  private static let modelIdentifiers: Set<String> = ["iPhone19,4"]

  static var isDuo: Bool {
    modelIdentifiers.contains(modelIdentifier)
  }

  private static var modelIdentifier: String {
    if let simulated = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] {
      return simulated
    }
    var info = utsname()
    uname(&info)
    return withUnsafeBytes(of: &info.machine) { bytes in
      String(decoding: bytes.prefix { $0 != 0 }, as: UTF8.self)
    }
  }
}
