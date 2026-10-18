// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "YohakuMermaid",
  platforms: [.macOS(.v13)],
  targets: [
    .target(
      name: "MermaidCore",
      path: ".",
      exclude: ["MermaidDomain.swift", "MermaidEngine.swift", "Tests", "README.md"],
      sources: ["MermaidSVG.swift"],
      resources: [.copy("Resources")]
    ),
    .testTarget(name: "MermaidCoreTests", dependencies: ["MermaidCore"], path: "Tests"),
  ]
)
