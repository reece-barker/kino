import UIKit
import WebKit
import AVKit

/// Downloads that belong to the app, not to the web view: iOS carries on with them with the screen locked or the app closed, and the files sit in the
/// app's own folder (not browser storage that can be cleared). The page asks through `webkit.messageHandlers.kinoDL`, one message per command, and gets an answer back.
///  start {id,url,total}  status {id}  pause {id}  remove {id}  text {id,n,body}  play {id,start,title,subtitle}  usage {}
final class NativeDownloads: NSObject, URLSessionDownloadDelegate, WKScriptMessageHandlerWithReply {
    static let shared = NativeDownloads()
    static var backgroundCompletion: (() -> Void)?

    private struct Live { var got: Int64 = 0; var total: Int64 = 0; var speed: Double = 0; var t0 = Date(); var b0: Int64 = 0; var error: String?; var gone = false }
    private var live: [String: Live] = [:]
    private var session: URLSession!
    private weak var web: WKWebView?
    private weak var host: UIViewController?
    private let q = DispatchQueue(label: "kino.downloads")

    let folder: URL = {
        let base = try! FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var dir = base.appendingPathComponent("KinoDownloads", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var v = URLResourceValues(); v.isExcludedFromBackup = true  // big copies the server can make again aren't worth filling iCloud with
        try? dir.setResourceValues(v)
        return dir
    }()
    private func file(_ id: String) -> URL { folder.appendingPathComponent("\(id).mp4") }
    private func partial(_ id: String) -> URL { folder.appendingPathComponent("\(id).resume") }
    private func clean(_ id: String) -> String { id.filter { $0.isLetter || $0.isNumber } }

    override init() {
        super.init()
        let cfg = URLSessionConfiguration.background(withIdentifier: "page.reece.kino.downloads")
        cfg.sessionSendsLaunchEvents = true
        cfg.isDiscretionary = false
        cfg.waitsForConnectivity = true
        cfg.allowsCellularAccess = true
        session = URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
    }

    func attach(web: WKWebView, host: UIViewController) { self.web = web; self.host = host }

    // MARK: messages from the page
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let m = message.body as? [String: Any], let cmd = m["cmd"] as? String else { return replyHandler(nil, "bad message") }
        let id = clean(m["id"] as? String ?? "")
        switch cmd {
        case "start": start(id, url: m["url"] as? String ?? "", total: (m["total"] as? NSNumber)?.int64Value ?? 0, reply: replyHandler)
        case "status": status(id, reply: replyHandler)
        case "pause": pause(id, reply: replyHandler)
        case "remove": remove(id, reply: replyHandler)
        case "text":
            let n = (m["n"] as? NSNumber)?.intValue ?? 0
            try? (m["body"] as? String ?? "").write(to: folder.appendingPathComponent("\(id).\(n).vtt"), atomically: true, encoding: .utf8)
            replyHandler(["ok": true], nil)
        case "play": play(id, m, reply: replyHandler)
        case "usage": replyHandler(["bytes": usage()], nil)
        default: replyHandler(nil, "unknown command")
        }
    }

    // MARK: downloading
    private func start(_ id: String, url: String, total: Int64, reply: @escaping (Any?, String?) -> Void) {
        if FileManager.default.fileExists(atPath: file(id).path) { return reply(["state": "done"], nil) }
        guard let u = URL(string: url), !id.isEmpty else { return reply(nil, "bad address") }
        session.getAllTasks { [weak self] tasks in
            guard let self = self else { return }
            if let t = tasks.first(where: { $0.taskDescription == id }), t.state == .running || t.state == .suspended {
                if t.state == .suspended { t.resume() }
                return reply(["state": "downloading"], nil)
            }
            self.q.sync { var l = self.live[id] ?? Live(); l.total = max(l.total, total); l.error = nil; l.gone = false; l.t0 = Date(); l.b0 = l.got; self.live[id] = l }
            // The sign in lives in the web view's cookies: a background download has to carry them itself
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
                let host = u.host ?? ""
                let header = cookies.filter { host == $0.domain || host.hasSuffix($0.domain.hasPrefix(".") ? String($0.domain.dropFirst()) : "." + $0.domain) || $0.domain == host }
                    .map { "\($0.name)=\($0.value)" }.joined(separator: "; ")
                var req = URLRequest(url: u)
                req.setValue(header, forHTTPHeaderField: "Cookie")
                req.setValue("1", forHTTPHeaderField: "X-Kino")
                req.setValue("KinoiOS/1.0", forHTTPHeaderField: "User-Agent")
                let task: URLSessionDownloadTask
                if let data = try? Data(contentsOf: self.partial(id)) { task = self.session.downloadTask(withResumeData: data); try? FileManager.default.removeItem(at: self.partial(id)) }
                else { task = self.session.downloadTask(with: req) }
                task.taskDescription = id
                task.resume()
                reply(["state": "downloading"], nil)
            }
        }
    }

    private func status(_ id: String, reply: @escaping (Any?, String?) -> Void) {
        if let attrs = try? FileManager.default.attributesOfItem(atPath: file(id).path) {
            let size = (attrs[.size] as? NSNumber)?.int64Value ?? 0
            return reply(["state": "done", "got": size, "total": size, "speed": 0], nil)
        }
        session.getAllTasks { [weak self] tasks in
            guard let self = self else { return }
            let t = tasks.first(where: { $0.taskDescription == id })
            var l = self.q.sync { self.live[id] ?? Live() }
            if let t = t { l.got = max(l.got, t.countOfBytesReceived); if t.countOfBytesExpectedToReceive > 0 { l.total = t.countOfBytesExpectedToReceive } }
            var state = "interrupted"
            if l.gone { state = "gone" }
            else if let e = l.error { state = "failed"; _ = e }
            else if let t = t, t.state == .running || t.state == .suspended { state = l.got > 0 ? "downloading" : "waiting" }
            reply(["state": state, "got": l.got, "total": l.total, "speed": l.speed, "error": l.error ?? ""], nil)
        }
    }

    private func pause(_ id: String, reply: @escaping (Any?, String?) -> Void) {
        session.getAllTasks { [weak self] tasks in
            guard let self = self, let t = tasks.first(where: { $0.taskDescription == id }) as? URLSessionDownloadTask else { return reply(["ok": true], nil) }
            t.cancel(byProducingResumeData: { data in
                if let data = data { try? data.write(to: self.partial(id)) }
                reply(["ok": true], nil)
            })
        }
    }

    private func remove(_ id: String, reply: @escaping (Any?, String?) -> Void) {
        session.getAllTasks { [weak self] tasks in
            guard let self = self else { return }
            tasks.filter { $0.taskDescription == id }.forEach { $0.cancel() }
            self.q.sync { _ = self.live.removeValue(forKey: id) }
            if let all = try? FileManager.default.contentsOfDirectory(at: self.folder, includingPropertiesForKeys: nil) {
                all.filter { $0.lastPathComponent.hasPrefix(id + ".") }.forEach { try? FileManager.default.removeItem(at: $0) }
            }
            reply(["ok": true], nil)
        }
    }

    private func usage() -> Int64 {
        let all = (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.fileSizeKey])) ?? []
        return all.reduce(0) { $0 + Int64((try? $1.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) }
    }

    // MARK: URLSession
    func urlSession(_ s: URLSession, downloadTask t: URLSessionDownloadTask, didWriteData n: Int64, totalBytesWritten w: Int64, totalBytesExpectedToWrite e: Int64) {
        guard let id = t.taskDescription else { return }
        q.sync {
            var l = live[id] ?? Live()
            l.got = w; if e > 0 { l.total = e }
            let dt = Date().timeIntervalSince(l.t0)
            if dt >= 1 { l.speed = Double(w - l.b0) / dt; if dt > 8 { l.t0 = Date(); l.b0 = w } }
            live[id] = l
        }
    }

    func urlSession(_ s: URLSession, downloadTask t: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let id = t.taskDescription else { return }
        let code = (t.response as? HTTPURLResponse)?.statusCode ?? 200
        if code >= 400 {
            q.sync { var l = live[id] ?? Live(); if code == 404 || code == 409 { l.gone = true } else { l.error = code == 401 || code == 403 ? "Not allowed, sign in again" : "The server answered \(code)" }; live[id] = l }
            return
        }
        try? FileManager.default.removeItem(at: file(id))
        do { try FileManager.default.moveItem(at: location, to: file(id)) }
        catch { q.sync { var l = live[id] ?? Live(); l.error = "Couldn't save the file: \(error.localizedDescription)"; live[id] = l } }
    }

    func urlSession(_ s: URLSession, task t: URLSessionTask, didCompleteWithError error: Error?) {
        guard let id = t.taskDescription, let error = error else { return }
        let ns = error as NSError
        if ns.code == NSURLErrorCancelled { return }
        // A dropped connection leaves a place to carry on from: the page sees "interrupted" and starts it again
        if let data = ns.userInfo[NSURLSessionDownloadTaskResumeData] as? Data { try? data.write(to: partial(id)) }
        else if ns.code != NSURLErrorNotConnectedToInternet && ns.code != NSURLErrorNetworkConnectionLost && ns.code != NSURLErrorTimedOut {
            q.sync { var l = live[id] ?? Live(); l.error = ns.localizedDescription; live[id] = l }
        }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async { NativeDownloads.backgroundCompletion?(); NativeDownloads.backgroundCompletion = nil }
    }

    // MARK: playing a saved copy in the system player (lock screen controls, AirPlay and picture in picture come with it)
    private var playerReply: ((Any?, String?) -> Void)?
    private var playerDelegate: PlayerEnd?
    private func play(_ id: String, _ m: [String: Any], reply: @escaping (Any?, String?) -> Void) {
        guard FileManager.default.fileExists(atPath: file(id).path) else { return reply(nil, "That download isn't on this device any more") }
        guard let host = host else { return reply(nil, "no window") }
        let item = AVPlayerItem(url: file(id))
        let meta = AVMutableMetadataItem(); meta.identifier = .commonIdentifierTitle; meta.value = (m["title"] as? String ?? "") as NSString
        let sub = AVMutableMetadataItem(); sub.identifier = .iTunesMetadataTrackSubTitle; sub.value = (m["subtitle"] as? String ?? "") as NSString
        item.externalMetadata = [meta, sub]
        let player = AVPlayer(playerItem: item)
        player.allowsExternalPlayback = true
        let vc = LocalPlayerVC()
        vc.player = player
        vc.allowsPictureInPicturePlayback = true
        vc.canStartPictureInPictureAutomaticallyFromInline = true
        let start = (m["start"] as? NSNumber)?.doubleValue ?? 0
        let end = PlayerEnd(player: player) { pos, dur in reply(["pos": pos, "dur": dur], nil) }
        playerDelegate = end
        vc.onGone = { end.finish() }
        vc.modalPresentationStyle = .fullScreen
        host.present(vc, animated: true) {
            if start > 5 { player.seek(to: CMTime(seconds: start, preferredTimescale: 600)) }
            player.play()
        }
    }
}

/// Answers the page with where the person got to once the player is closed
private final class PlayerEnd: NSObject {
    let player: AVPlayer
    private var done: ((Double, Double) -> Void)?
    private var obs: NSObjectProtocol?
    init(player: AVPlayer, done: @escaping (Double, Double) -> Void) {
        self.player = player; self.done = done
        super.init()
        obs = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: player.currentItem, queue: .main) { [weak self] _ in self?.finish(atEnd: true) }
    }
    func finish(atEnd: Bool = false) {
        guard let d = done else { return }
        done = nil
        let dur = player.currentItem?.duration.seconds ?? 0
        let pos = atEnd ? dur : player.currentTime().seconds
        player.pause()
        d(pos.isFinite ? pos : 0, dur.isFinite ? dur : 0)
        if let o = obs { NotificationCenter.default.removeObserver(o) }
    }
}

final class LocalPlayerVC: AVPlayerViewController {
    var onGone: (() -> Void)?
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if isBeingDismissed || presentingViewController == nil { onGone?(); onGone = nil }
    }
}
