import UIKit
import WebKit
import AVFoundation

/// Kino for iPhone and iPad: the same web app as the browser, in its own full screen window, with what a browser tab can't do:
/// sound with the silent switch on, background audio, downloads that stay (no "Add to Home Screen" first), a service worker for opening with no connection.
final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    static let site: URL = {
        #if DEBUG
        // For testing against a server on this Mac: SIMCTL_CHILD_KINO_URL=http://127.0.0.1:8123 xcrun simctl launch ...
        if let u = ProcessInfo.processInfo.environment["KINO_URL"], let url = URL(string: u) { return url }
        #endif
        return URL(string: "https://kino.reece.page")!
    }()
    private var web: WKWebView!
    static weak var current: WebViewController?
    func go(_ route: String) { web.evaluateJavaScript("location.hash = \(String(reflecting: route))") }
    func reloadPage() { web.reload() }
    func history(_ n: Int) { web.evaluateJavaScript("history.go(\(n))") }
    private let failView = UIView()
    private let failText = UILabel()

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var prefersHomeIndicatorAutoHidden: Bool { false }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        Self.current = self

        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()  // stays between launches: the sign in, the downloads, the offline copy of the site
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []  // sound and the next episode start by themselves
        cfg.allowsAirPlayForMediaPlayback = true
        cfg.allowsPictureInPictureMediaPlayback = true
        cfg.limitsNavigationsToAppBoundDomains = Self.site.scheme == "https"  // lets the site use a service worker, with kino.reece.page in WKAppBoundDomains
        cfg.applicationNameForUserAgent = "KinoiOS/1.0"
        // The site treats a home screen app differently (no pinch zoom, its own status area): this window is that
        let js = """
        try { Object.defineProperty(navigator, 'standalone', { get: () => true }); } catch (e) {}
        window.KinoIOS = { version: '1.0', platform: 'ios' };
        """
        cfg.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        web = WKWebView(frame: .zero, configuration: cfg)
        web.translatesAutoresizingMaskIntoConstraints = false
        web.navigationDelegate = self
        web.uiDelegate = self
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never  // the page handles the notch and the home bar itself
        web.scrollView.bounces = false
        web.allowsBackForwardNavigationGestures = false
        web.allowsLinkPreview = false
        if #available(iOS 16.4, *) { web.isInspectable = true }
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.topAnchor), web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        buildFailView()
        load()
    }

    private func load() {
        failView.isHidden = true
        web.load(URLRequest(url: Self.site, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 20))
    }

    // MARK: no connection and nothing saved yet
    private func buildFailView() {
        failView.backgroundColor = .black
        failView.translatesAutoresizingMaskIntoConstraints = false
        failView.isHidden = true
        let title = UILabel(); title.text = "Can't reach Kino"; title.textColor = .white; title.font = .systemFont(ofSize: 22, weight: .bold); title.textAlignment = .center
        failText.textColor = UIColor(white: 1, alpha: 0.6); failText.font = .systemFont(ofSize: 15); failText.numberOfLines = 0; failText.textAlignment = .center
        var conf = UIButton.Configuration.filled(); conf.title = "Try Again"; conf.baseBackgroundColor = .white; conf.baseForegroundColor = .black; conf.cornerStyle = .capsule
        let retry = UIButton(configuration: conf, primaryAction: UIAction { [weak self] _ in self?.load() })
        let stack = UIStackView(arrangedSubviews: [title, failText, retry]); stack.axis = .vertical; stack.spacing = 14; stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        failView.addSubview(stack); view.addSubview(failView)
        NSLayoutConstraint.activate([
            failView.topAnchor.constraint(equalTo: view.topAnchor), failView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            failView.leadingAnchor.constraint(equalTo: view.leadingAnchor), failView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.centerYAnchor.constraint(equalTo: failView.centerYAnchor), stack.leadingAnchor.constraint(equalTo: failView.leadingAnchor, constant: 32), stack.trailingAnchor.constraint(equalTo: failView.trailingAnchor, constant: -32),
        ])
    }

    private func showFail(_ error: Error) {
        let ns = error as NSError
        if ns.code == NSURLErrorCancelled { return }
        failText.text = ns.code == NSURLErrorNotConnectedToInternet ? "There's no connection right now. Your downloads are in the Downloads page once Kino opens." : ns.localizedDescription
        failView.isHidden = false
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showFail(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showFail(error) }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        failView.isHidden = true
        #if DEBUG
        print("KINO didFinish", webView.url?.absoluteString ?? "")
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) {
            webView.evaluateJavaScript("document.title + ' | ' + location.href + ' | ' + document.body.innerText.slice(0,200) + ' | sw=' + ('serviceWorker' in navigator)") { r, e in print("KINO probe", r ?? "nil", e ?? "") }
        }
        #endif
    }
    // The web content process was stopped for memory: start it again instead of leaving a white screen
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { web.reload() }

    // MARK: links: Kino stays in the app, anything else opens in Safari
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        // Things the page embeds (the YouTube trailer player) load inside the page, only real links out of Kino go to Safari
        if let tf = action.targetFrame, !tf.isMainFrame { return decisionHandler(.allow) }
        if let host = url.host, host == Self.site.host || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" { return decisionHandler(.allow) }
        if url.scheme == "http" || url.scheme == "https" || url.scheme == "mailto" || url.scheme == "tel" {
            UIApplication.shared.open(url)
            return decisionHandler(.cancel)
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if url.host == Self.site.host { webView.load(action.request) } else { UIApplication.shared.open(url) }
        }
        return nil
    }

    // MARK: the page's own alert, confirm and prompt boxes
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
        present(a, animated: true)
    }
    // Camera, microphone and location aren't used, so nothing is asked for
    @available(iOS 15.0, *)
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) { decisionHandler(.deny) }
}
