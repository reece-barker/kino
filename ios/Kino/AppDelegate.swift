import UIKit
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Playback category: sound plays with the silent switch on, carries on with the screen locked and works with AirPlay
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)
        return true
    }

    // MARK: the Mac menu bar (File, View, Go), with shortcuts. On an iPad with a keyboard these show under holding Cmd
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard builder.system == .main else { return }
        func go(_ title: String, _ route: String, _ key: String, _ mods: UIKeyModifierFlags = .command) -> UIKeyCommand {
            UIKeyCommand(title: title, action: #selector(goRoute(_:)), input: key, modifierFlags: mods, propertyList: route)
        }
        let file = UIMenu(title: "", options: .displayInline, children: [
            go("Home", "#/home", "1"), go("Search", "#/search", "f"), go("Downloads", "#/downloads", "d", [.command, .shift]),
        ])
        builder.insertChild(file, atStartOfMenu: .file)
        let view = UIMenu(title: "", options: .displayInline, children: [
            UIKeyCommand(title: "Reload", action: #selector(reloadPage), input: "r", modifierFlags: .command),
            UIKeyCommand(title: "Back", action: #selector(pageBack), input: "[", modifierFlags: .command),
            UIKeyCommand(title: "Forward", action: #selector(pageForward), input: "]", modifierFlags: .command),
        ])
        builder.insertChild(view, atStartOfMenu: .view)
        let goMenu = UIMenu(title: "Go", children: [
            go("Home", "#/home", "1"), go("Movies", "#/movies", "2"), go("TV Shows", "#/shows", "3"), go("Live TV", "#/live", "4"),
            go("My List", "#/mylist", "5"), go("History", "#/history", "6"), go("Settings", "#/settings", ",")
        ])
        builder.insertSibling(goMenu, afterMenu: .view)
    }
    @objc func goRoute(_ sender: UICommand) { if let r = sender.propertyList as? String { WebViewController.current?.go(r) } }
    @objc func reloadPage() { WebViewController.current?.reloadPage() }
    @objc func pageBack() { WebViewController.current?.history(-1) }
    @objc func pageForward() { WebViewController.current?.history(1) }

    // iOS wakes the app to finish what a background download was doing
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        NativeDownloads.backgroundCompletion = completionHandler
        _ = NativeDownloads.shared
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        try? AVAudioSession.sharedInstance().setActive(true)
    }
}

/// The window belongs to a scene (iOS needs apps to be built this way now)
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let ws = scene as? UIWindowScene else { return }
        let w = UIWindow(windowScene: ws)
        w.backgroundColor = .black
        w.rootViewController = WebViewController()
        w.makeKeyAndVisible()
        window = w
    }
}
