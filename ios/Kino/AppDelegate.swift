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
